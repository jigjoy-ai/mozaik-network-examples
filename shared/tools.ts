import type { AgentTool } from "./agent-peer"

/** Lets an agent ask another peer in the network something, and read its answer. */
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
	invoke: async ({ peer, message }, self) => {
		try {
			return await self.ask(peer, message)
		} catch (error) {
			return `Could not ask ${peer}: ${error instanceof Error ? error.message : error}`
		}
	},
}

/** Who is in the network now. */
export const listPeers: AgentTool = {
	definition: {
		name: "list_peers",
		description: "List the other peers in the network now: their names and what they can do.",
		parameters: { type: "object", properties: {}, additionalProperties: false },
		strict: true,
	},
	invoke: (_args, self) =>
		self.roster.others().map((peer) => ({ name: peer.name, capabilities: peer.capabilities })),
}
