import { resolveAgentModule } from "@jigjoy/mozaik-agent"
import type { Agent, ContextItem, ToolCallItem, ToolDefinition } from "@jigjoy/mozaik-agent"
import { commandRegistry } from "@jigjoy/mozaik-rule-engine"
import type { PolicyDefinition } from "@jigjoy/mozaik-rule-engine"
import { join, leave, sendMessage } from "@jigjoy/mozaik-network"
import { NetworkClient } from "@jigjoy/mozaik-network/network-client"
import type { Peer } from "@jigjoy/mozaik-network/peer"
import { SendLimit } from "@jigjoy/mozaik-network/send-limit"
import type { Envelope } from "@jigjoy/mozaik-network/envelope"
import { inviteLink, log, MODEL } from "./env"
import { replies } from "./replies"
import { Roster } from "./roster"
// Registers the conditions and input resolvers the rules below name.
import "./rules"
import type { Membership, Message } from "./rules"
import { runLoop } from "./run-loop"

/** How long an agent waits for another peer to answer it. */
const ANSWER_TIMEOUT_MS = 5 * 60_000

/** A tool of one agent. It is given the agent's peer, so it can ask the others in the network. */
export type AgentTool = {
	definition: ToolDefinition
	invoke(args: Record<string, any>, self: AgentPeer): Promise<unknown> | unknown
}

export type AgentPeerOptions = {
	/** What the others in the network see the agent as. */
	name: string
	/** What the agent is told about its job. */
	instruction: string
	tools?: AgentTool[]
	/** One of @jigjoy/mozaik-agent's models. MODEL by default. */
	model?: string
	/** Holds a tool call at its breakpoint until it is decided: `true` runs it, a string is why it doesn't. */
	approve?(call: ToolCallItem, request: Message, self: AgentPeer): Promise<true | string>
}

/** The peers of this process, so a message between two of them is logged once, by the sender. */
export const local = new Set<string>()

/**
 * A @jigjoy/mozaik-agent agent that is a peer in the network of MOZAIK_INVITE.
 *
 * Its rules:
 *
 * | Condition            | Input resolver | Command                                            | Priority |
 * | -------------------- | -------------- | -------------------------------------------------- | -------- |
 * | `reply.awaited`      | `message`      | hand the answer to the tool that asked for it       | 1        |
 * | `message.direct`     | `message`      | run a Loop of the agent and answer whoever asked   | 10       |
 * | `membership.changed` | `envelope`     | keep up with who is in the network                 | 20       |
 * | `request.refused`    | `envelope`     | say what the network refused                       | 20       |
 *
 * A message to everyone matches no rule: an agent answers when it is spoken to, so agents that
 * hear each other don't keep each other talking.
 */
export class AgentPeer {
	readonly roster: Roster
	private readonly limit = new SendLimit()

	private constructor(
		readonly agent: Agent,
		readonly peer: Peer,
		readonly networkId: string,
		private readonly options: AgentPeerOptions,
	) {
		this.roster = new Roster(peer.id)
	}

	get name(): string {
		return this.options.name
	}

	static async join(options: AgentPeerOptions): Promise<AgentPeer> {
		const link = inviteLink()
		const tools = options.tools ?? []
		const module = resolveAgentModule()
		const agent = await module.createAgent({
			name: options.name,
			instruction: options.instruction,
			tools: tools.map((tool) => tool.definition),
		})

		// Commands and tools are registered by name for the whole process: the agent's id keeps
		// those of several agents apart.
		const command = (what: string) => `${options.name}#${agent.id}:${what}`
		const policy: PolicyDefinition = {
			rules: [
				{ condition: "reply.awaited", inputResolver: "message", command: command("reply"), priority: 1 },
				{ condition: "message.direct", inputResolver: "message", command: command("answer"), priority: 10 },
				{ condition: "membership.changed", inputResolver: "envelope", command: command("roster"), priority: 20 },
				{ condition: "request.refused", inputResolver: "envelope", command: command("refused"), priority: 20 },
			],
		}

		const client = new NetworkClient({ origin: link.origin })
		const peer = await client.createPeer({
			name: options.name,
			role: "agent",
			capabilities: ["message"],
			invite: link.invite,
			policy,
		})
		if (!peer.invitedTo) throw new Error("The network didn't say which network the invite is for")

		const self = new AgentPeer(agent, peer, peer.invitedTo, options)
		local.add(peer.id)

		for (const tool of tools) {
			module.registerTool(self.toolKey(tool.definition.name), { invoke: (args) => tool.invoke(args, self) })
		}

		commandRegistry.register(command("reply"), {
			invoke: (message: Message) => {
				self.logIncoming(message)
				replies.deliver(peer.id, message.senderId, message.text)
			},
		})
		commandRegistry.register(command("answer"), {
			// Not awaited: a peer gets its envelopes one at a time, and a Loop that asks another
			// peer something has to be able to receive the answer while it waits.
			invoke: (message: Message) => void self.answer(message),
		})
		commandRegistry.register(command("roster"), {
			invoke: (envelope: Envelope<any>) => self.roster.update(envelope as Membership),
		})
		commandRegistry.register(command("refused"), {
			invoke: (envelope: Envelope<{ message: string }>) =>
				console.warn(`[${options.name}] the network refused: ${envelope.payload.message}`),
		})

		await join(peer, self.networkId, client)
		return self
	}

	/** Sends a direct message to the peer named `name` and resolves with its answer. */
	async ask(name: string, text: string): Promise<string> {
		const other = this.roster.byName(name)
		if (!other) {
			const names = this.roster.others().map((peer) => peer.name)
			throw new Error(`No peer named "${name}" in the network. There are: ${names.join(", ") || "nobody"}.`)
		}
		return await this.askPeer(other.id, text)
	}

	/** Sends a direct message to the peer `peerId` and resolves with its answer. */
	async askPeer(peerId: string, text: string): Promise<string> {
		const waiting = replies.waitFor(this.peer.id, peerId, ANSWER_TIMEOUT_MS)
		try {
			await this.send(peerId, text)
		} catch (error) {
			waiting.cancel()
			throw error
		}
		return await waiting.answer
	}

	/** Sends a direct message, or one to everyone without `to`. */
	async send(to: string | undefined, text: string): Promise<void> {
		// Two agents that keep answering each other would run through the messages the network's owner pays for.
		this.limit.take()
		log(this.name, to ? this.roster.nameOf(to) : "everyone", text)
		await sendMessage(this.peer, this.networkId, text, to)
	}

	leave(): Promise<void> {
		return leave(this.peer, this.networkId)
	}

	private async answer(message: Message): Promise<void> {
		this.logIncoming(message)

		try {
			await this.send(message.senderId, await this.think(message))
		} catch (error) {
			// What went wrong stays here: the peer that asked is only told that it did.
			console.error(`[${this.name}]`, error)
			await this.send(message.senderId, "I ran into an error and couldn't answer.").catch(() => {})
		}
	}

	/** One Loop of the agent for one message. */
	private async think(message: Message): Promise<string> {
		const { createLoop } = resolveAgentModule()
		const others = this.roster.others().map((peer) => peer.name)
		const asked: ContextItem = { type: "user_message", text: `${message.senderName} says:\n${message.text}` }
		const context: ContextItem[] = [
			{
				type: "developer_message",
				text:
					`${this.options.instruction}\n\n` +
					`You are "${this.name}", a peer on a Mozaik network. ` +
					`The others in the network now: ${others.join(", ") || "nobody"}. ` +
					`Your answer is sent back to ${message.senderName} as a message.`,
			},
			...(await this.agent.memory.recall(message.text, message.senderId)),
			asked,
		]

		const loop = await createLoop({ agentId: this.agent.id, goal: message.text })
		const approve = this.options.approve
		const answer = await runLoop({
			loopId: loop.id,
			model: this.options.model ?? MODEL,
			context,
			tools: this.agent.tools,
			registeredName: (toolName) => this.toolKey(toolName),
			approve: approve && ((call) => approve(call, message, this)),
		})

		await this.agent.memory.remember([asked, { type: "model_message", text: answer }], message.senderId)
		return answer || "(no answer)"
	}

	private toolKey(toolName: string): string {
		return `${this.agent.id}/${toolName}`
	}

	private logIncoming(message: Message): void {
		if (!local.has(message.senderId)) log(message.senderName, this.name, message.text)
	}
}
