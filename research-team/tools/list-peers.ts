import type { AgentTool } from "../../shared/agent-peer"

/** Who is in the network now. */
export const listPeers: AgentTool = {
	definition: {
		name: "list_peers",
		description: "List the other peers in the network now: their names and what they can do.",
		parameters: { type: "object", properties: {}, additionalProperties: false },
		strict: true,
	},

	invoke(_args, agent) {
		return agent.others().map((peer) => ({ name: peer.name, capabilities: peer.capabilities }))
	},
}
