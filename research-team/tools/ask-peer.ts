import type { AgentTool } from "../../shared/agent-peer"
import { fromTo } from "../../shared/waiting"
import { replies } from "../replies"

const ANSWER_TIMEOUT_MS = 5 * 60_000

/** Sends another peer a message and waits for its answer. */
export const askPeer: AgentTool = {
	definition: {
		name: "ask_peer",
		description:
			"Send a message to another peer in the network, by name, and wait for its answer. " +
			"The peer can be another agent, a person, or a Claude Code session.",
		parameters: {
			type: "object",
			properties: {
				peer: { type: "string", description: "The name of the peer, as the network shows it" },
				message: { type: "string", description: "What to ask or tell it. It sees nothing else of your work." },
			},
			required: ["peer", "message"],
			additionalProperties: false,
		},
		strict: true,
	},

	async invoke({ peer, message }, agent) {
		const other = agent.find(peer)
		if (!other) {
			const names = agent.others().map((p) => p.name)
			return `There is no peer named "${peer}". In the network: ${names.join(", ") || "nobody"}.`
		}

		const reply = replies.wait(fromTo(other.id, agent.id), ANSWER_TIMEOUT_MS)
		try {
			await agent.send(other.id, message)
			return (await reply.promise).text
		} catch (error) {
			reply.cancel()
			return `${other.name} didn't answer: ${error instanceof Error ? error.message : error}`
		}
	},
}
