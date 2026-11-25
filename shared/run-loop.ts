import { resolveAgentModule } from "@jigjoy/mozaik-agent"
import type { ContextItem, InstructionRecord, ToolCallItem, ToolDefinition } from "@jigjoy/mozaik-agent"

/** How many inferences one Loop may take: a model that keeps calling tools is stopped. */
const MAX_INFERENCES = 12
/** Anthropic requires an output limit on every request. */
const MAX_OUTPUT_TOKENS = 2048

export type RunLoopParams = {
	loopId: string
	model: string
	context: ContextItem[]
	tools: ToolDefinition[]
	/** The name a tool is registered under, for the name the model knows it by. */
	toolName(name: string): string
	/** `true` runs the call; a string is why it doesn't run. */
	approve?(call: ToolCallItem): Promise<true | string>
}

/**
 * Drives a Loop until the model answers with text.
 *
 * Mozaik Agent sets no breakpoints by itself. Here every inference and tool call is put at the
 * Loop's breakpoint and advanced from there, so the Loop records what was done, and a tool call
 * can wait at its breakpoint for as long as `approve` takes.
 */
export async function runLoop(params: RunLoopParams): Promise<string> {
	const context = [...params.context]
	const tools = params.tools.length > 0 ? params.tools : undefined

	for (let step = 0; step < MAX_INFERENCES; step++) {
		const items = await infer(params.loopId, {
			model: params.model,
			maxOutputTokens: MAX_OUTPUT_TOKENS,
			tools,
			context: { items: [...context] },
		})
		context.push(...items)

		const calls = items.filter((item): item is ToolCallItem => item.type === "tool_call")
		if (calls.length === 0) return end(params.loopId, textOf(items))

		// A Loop holds one pending instruction, so the calls run one at a time. Every call needs a
		// result, or the provider refuses the next request: a declined call gets the reason.
		for (const call of calls) {
			const verdict = params.approve ? await params.approve(call) : true
			const result =
				verdict === true
					? await callTool(params.loopId, params.toolName(call.toolName), call.toolArguments)
					: `Not run: ${verdict}`

			context.push({ type: "tool_call_result", requestId: call.requestId, result: { type: "input_text", text: result } })
		}
	}

	return end(params.loopId, `I stopped after ${MAX_INFERENCES} steps without an answer.`)
}

async function infer(loopId: string, parameters: Extract<InstructionRecord, { type: "inference" }>["parameters"]) {
	const result = await advance(loopId, { type: "inference", parameters })
	if (result?.type !== "inference_output") throw new Error("Expected the result of an inference")
	return result.items
}

async function callTool(loopId: string, toolName: string, toolArguments: string): Promise<string> {
	const result = await advance(loopId, { type: "tool_call", parameters: { toolName, toolArguments } })
	if (result?.type !== "tool_call_output") throw new Error("Expected the result of a tool call")
	return result.result
}

/** Puts the instruction at the Loop's breakpoint, runs it, and returns what it gave. */
async function advance(loopId: string, instruction: InstructionRecord): Promise<InstructionRecord["result"]> {
	const { setBreakpoint, advanceLoop, getLoop } = resolveAgentModule()

	await setBreakpoint({ loopId, instruction })
	await advanceLoop({ loopId })

	const { completedInstructions } = await getLoop(loopId)
	return completedInstructions.at(-1)?.result
}

async function end(loopId: string, answer: string): Promise<string> {
	await resolveAgentModule().endLoop({ loopId, message: answer })
	return answer
}

function textOf(items: ContextItem[]): string {
	return items
		.flatMap((item) => (item.type === "model_message" ? [item.text] : []))
		.join("\n")
		.trim()
}
