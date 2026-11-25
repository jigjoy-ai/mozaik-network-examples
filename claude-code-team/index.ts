// Claude Code works with Mozaik agents: a reviewer and a tester join the network a Claude Code
// session is on, and the session hands them work as it codes.
//
//   npm run claude-code-team
//
// Then, in Claude Code started with the Mozaik network plugin and joined to the same network:
//
//   > Ask the reviewer on the network to review the change you just made, and the tester which
//     tests it needs. Apply what you agree with.
//
// Claude sends each of them a message with the code. The answer comes back to the session like
// any other peer's, and Claude decides what to do with it. Anyone else can join too: a person
// with `npm run human`, or more Claude Code sessions.
import { initAgentModule } from "@jigjoy/mozaik-agent"
import { AgentPeer } from "../shared/agent-peer"
import { leaveOnExit, run } from "../shared/env"
import "./commands"
import "./conditions"
import "./input-resolvers"
import { agentPolicy } from "./policy"

run(async () => {
	initAgentModule()

	const reviewer = await AgentPeer.join({
		name: "reviewer",
		policy: agentPolicy,
		instruction:
			"You are a code reviewer. A coding agent or a person sends you code or a diff, often with what it " +
			"is for. Review it for bugs, unsafe or risky changes, and missing error handling, most important " +
			"first, in at most seven points. Name the line or function each point is about. Say so when it " +
			"looks right. You see only what you are sent: ask for what is missing instead of guessing.",
	})
	const tester = await AgentPeer.join({
		name: "tester",
		policy: agentPolicy,
		instruction:
			"You design tests. A coding agent or a person sends you code, often with what it is for. Answer " +
			"with the test cases it needs: for each, a name, what it checks, and the input it uses. Cover " +
			"the edge cases and the ways it can fail. Write the code of a test only when you are asked to.",
	})

	console.log("Joined the network: reviewer, tester.")
	console.log("Ask them for work from a Claude Code session on the same network. Ctrl+C to stop.")
	leaveOnExit([reviewer, tester])
})
