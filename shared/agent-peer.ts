import { resolveAgentModule } from "@jigjoy/mozaik-agent"
import type { Agent, ContextItem, ToolCallItem, ToolDefinition } from "@jigjoy/mozaik-agent"
import type { PolicyDefinition } from "@jigjoy/mozaik-rule-engine"
import type { PeerManifest } from "@jigjoy/mozaik-network/peer-manifest"
import { SendLimit } from "@jigjoy/mozaik-network/send-limit"
import { MODEL } from "./env"
import { logMessage, logReceived } from "./log"
import { Member } from "./member"
import type { Message } from "./messages"
import type { Roster } from "./roster"
import { runLoop } from "./run-loop"

/** A tool of one agent. It is given the agent, so it can talk to the others in the network. */
export type AgentTool = {
	definition: ToolDefinition
	invoke(args: Record<string, any>, agent: AgentPeer): Promise<unknown> | unknown
}

/** Holds a tool call at its breakpoint until it is decided: `true` runs it, a string says why it doesn't. */
export type Approve = (call: ToolCallItem, request: Message, agent: AgentPeer) => Promise<true | string>

export type AgentPeerOptions = {
	/** What the others in the network see the agent as. */
	name: string
	/** What the agent is told about its job. */
	instruction: string
	/** How the agent's peer reacts to what arrives. */
	policy: PolicyDefinition
	tools?: AgentTool[]
	/** One of @jigjoy/mozaik-agent's models. MODEL by default. */
	model?: string
	approve?: Approve
}

/** The agents of this process, by peer id: a command finds the agent a message is for here. */
export const agents = new Map<string, AgentPeer>()

/** A @jigjoy/mozaik-agent agent that is a peer in the network of MOZAIK_INVITE. */
export class AgentPeer {
	// Two agents that keep answering each other would run through the messages the network's owner pays for.
	private readonly limit = new SendLimit()

	private constructor(
		readonly agent: Agent,
		private readonly member: Member,
		private readonly options: AgentPeerOptions,
	) {}

	static async join(options: AgentPeerOptions): Promise<AgentPeer> {
		const module = resolveAgentModule()
		const tools = options.tools ?? []
		const agent = await module.createAgent({
			name: options.name,
			instruction: options.instruction,
			tools: tools.map((tool) => tool.definition),
		})
		const member = await Member.create({ name: options.name, role: "agent", policy: options.policy })
		const self = new AgentPeer(agent, member, options)

		for (const tool of tools) {
			module.registerTool(self.toolName(tool.definition.name), { invoke: (args) => tool.invoke(args, self) })
		}

		agents.set(self.id, self)
		await member.join()
		return self
	}

	get id(): string {
		return this.member.id
	}

	get name(): string {
		return this.options.name
	}

	get roster(): Roster {
		return this.member.roster
	}

	/** The others in the network. */
	others(): PeerManifest[] {
		return this.roster.all(this.id)
	}

	/** The other peer named `name`. */
	find(name: string): PeerManifest | undefined {
		return this.roster.find(name, this.id)
	}

	async send(to: string, text: string): Promise<void> {
		this.limit.take()
		logMessage(this.name, this.roster.nameOf(to), text)
		await this.member.send(text, to)
	}

	/** Runs a Loop for the message, and sends the answer to whoever sent it. */
	async answer(message: Message): Promise<void> {
		logReceived({ id: message.senderId, name: message.senderName }, this.name, message.text)

		try {
			await this.send(message.senderId, await this.think(message))
		} catch (error) {
			// What went wrong stays here: the peer that asked is only told that it did.
			console.error(`[${this.name}]`, error)
			await this.send(message.senderId, "I ran into an error and couldn't answer.").catch(() => {})
		}
	}

	leave(): Promise<void> {
		agents.delete(this.id)
		return this.member.leave()
	}

	private async think(message: Message): Promise<string> {
		const asked: ContextItem = { type: "user_message", text: `${message.senderName} says:\n${message.text}` }
		const others = this.others().map((peer) => peer.name)
		const context: ContextItem[] = [
			{
				type: "developer_message",
				text: [
					this.options.instruction,
					`You are "${this.name}", a peer on a Mozaik network.`,
					`The others in the network now: ${others.join(", ") || "nobody"}.`,
					`Your answer is sent to ${message.senderName} as a message.`,
				].join("\n\n"),
			},
			...(await this.agent.memory.recall(message.text, message.senderId)),
			asked,
		]

		const loop = await resolveAgentModule().createLoop({ agentId: this.agent.id, goal: message.text })
		const { approve } = this.options
		const answer = await runLoop({
			loopId: loop.id,
			model: this.options.model ?? MODEL,
			context,
			tools: this.agent.tools,
			toolName: (name) => this.toolName(name),
			approve: approve && ((call) => approve(call, message, this)),
		})

		await this.agent.memory.remember([asked, { type: "model_message", text: answer }], message.senderId)
		return answer || "(no answer)"
	}

	/** Tools are registered for the whole process: the agent's id keeps those of several agents apart. */
	private toolName(name: string): string {
		return `${this.agent.id}/${name}`
	}
}
