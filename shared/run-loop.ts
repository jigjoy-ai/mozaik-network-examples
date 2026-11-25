import { resolveAgentModule } from "@jigjoy/mozaik-agent"
import type { ContextItem, InstructionRecord, ToolCallItem, ToolDefinition } from "@jigjoy/mozaik-agent"

/** How many inferences one request may take: a model that keeps calling tools is stopped. */
const MAX_INFERENCES = 12
// Anthropic requires an output limit on every request.
const MAX_OUTPUT_TOKENS = 2048

/** Says whether a tool call may run: `true`, or why it may not. */
export type Approve = (call: ToolCallItem) => Promise<true | string>

/**
 * Drives a Loop until the model answers with text.
 *
 * Mozaik Agent sets no breakpoints by itself: every inference and every tool call is put at the
 * Loop's breakpoint here and advanced from there, so the Loop keeps the record of what was done,
 * and `approve` can hold a tool call at its breakpoint for as long as a decision takes.
 */
export async function runLoop(params: {
	loopId: string
	model: string
	context: ContextItem[]
	tools: ToolDefinition[]
	/** The name a tool is registered under with the agent module, for the name the model knows it by. */
	registeredName: (toolName: string) => string
	approve?: Approve
}): Promise<string> {
	const { endLoop } = resolveAgentModule()
	const context = [...params.context]
	const tools = params.tools.length > 0 ? params.tools : undefined

	for (let inference = 0; inference < MAX_INFERENCES; inference++) {
		const output = await advance(params.loopId, {
			type: "inference",
			parameters: {
				model: params.model,
				maxOutputTokens: MAX_OUTPUT_TOKENS,
				tools,
				context: { items: [...context] },
			},
		})
		if (output?.type !== "inference_output") throw new Error("Expected the result of an inference")
		context.push(...output.items)

		const calls = output.items.filter((item): item is ToolCallItem => item.type === "tool_call")
		if (calls.length === 0) {
			const answer = output.items
				.flatMap((item) => (item.type === "model_message" ? [item.text] : []))
				.join("\n")
				.trim()
			await endLoop({ loopId: params.loopId, message: answer })
			return answer
		}

		// A Loop holds one pending instruction, so calls run one at a time. Every call needs a
		// result, or the provider refuses the next request: a declined call gets the reason.
		for (const call of calls) {
			const verdict = params.approve ? await params.approve(call) : true
			const result =
				verdict === true
					? await runTool(params.loopId, params.registeredName(call.toolName), call.toolArguments)
					: `Not run: ${verdict}`

			context.push({ type: "tool_call_result", requestId: call.requestId, result: { type: "input_text", text: result } })
		}
	}

	const answer = `I stopped after ${MAX_INFERENCES} steps without an answer.`
	await endLoop({ loopId: params.loopId, message: answer })
	return answer
}

async function runTool(loopId: string, toolName: string, toolArguments: string): Promise<string> {
	const output = await advance(loopId, { type: "tool_call", parameters: { toolName, toolArguments } })
	if (output?.type !== "tool_call_output") throw new Error("Expected the result of a tool call")
	return output.result
}

/** Puts the instruction at the Loop's breakpoint, runs it, and returns what it gave. */
async function advance(loopId: string, instruction: InstructionRecord): Promise<InstructionRecord["result"]> {
	const { setBreakpoint, advanceLoop, getLoop } = resolveAgentModule()

	await setBreakpoint({ loopId, instruction })
	await advanceLoop({ loopId })

	const { completedInstructions } = await getLoop(loopId)
	return completedInstructions[completedInstructions.length - 1]?.result
}
