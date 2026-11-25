// A team of three agents that work one question together, over the network.
//
// The lead is asked the question. It asks the researcher for the facts, writes a draft, has the
// critic review it, and answers with the revised version. Each agent is a peer of its own: what
// they say to each other goes through the network, so any other peer could take part.
//
//   npm run research-team -- "Should a small team use CRDTs or operational transforms?"
//
// Without a question the team stays in the network: ask the lead from `npm run human`, or from a
// Claude Code session on the same network.
import { initAgentModule } from "@jigjoy/mozaik-agent"
import { AgentPeer } from "../shared/agent-peer"
import { leaveOnExit } from "../shared/env"
import { askPeer, listPeers } from "../shared/tools"
import { Visitor } from "../shared/visitor"

async function main() {
	initAgentModule()

	const team = [
		await AgentPeer.join({
			name: "researcher",
			instruction:
				"You are a researcher. You are asked for the facts about a topic. Answer with the key facts, " +
				"trade-offs and numbers that matter, as a short list. Say plainly what you are not sure of.",
		}),
		await AgentPeer.join({
			name: "critic",
			instruction:
				"You are a critic. You are sent a draft answer and the question it answers. Point out what is " +
				"wrong, missing or unsupported, most important first, in at most five points. Don't rewrite it.",
		}),
		await AgentPeer.join({
			name: "lead",
			instruction:
				"You lead a small research team on the network. When you are asked a question: " +
				"1. ask the researcher for the facts you need, with ask_peer; " +
				"2. write a draft answer from them; " +
				"3. send the critic the question and the draft, with ask_peer; " +
				"4. answer with the draft revised by what the critic said, in at most 200 words. " +
				"Each peer sees only what you send it, so include what it needs.",
			tools: [askPeer, listPeers],
		}),
	]
	console.log(`The team joined the network: ${team.map((agent) => agent.name).join(", ")}.`)

	const question = process.argv.slice(2).join(" ").trim()
	if (!question) {
		console.log("Ask the lead from `npm run human` (type `@lead your question`). Ctrl+C to stop.")
		return leaveOnExit(() => Promise.all(team.map((agent) => agent.leave())).then(() => {}))
	}

	const you = await Visitor.join("you")
	const answer = await you.ask("lead", question)
	console.log(`\n${answer}\n`)

	await Promise.all([you, ...team].map((peer) => peer.leave()))
	process.exit(0)
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error)
	process.exit(1)
})
