// A person on the network, in a terminal: what the others say shows up here, and what you type
// is sent. Use it to talk to the agents, approve what they ask, or watch the network.
//
//   npm run human -- ana
//
//   @lead what is a CRDT?     a message to the peer named lead only
//   hello everyone            a message to everyone
//   /peers                    who is in the network
//   /quit                     leave
import { leaveOnExit, run } from "../shared/env"
import { Member } from "../shared/member"
import "./commands"
import "./conditions"
import "./input-resolvers"
import { humanPolicy } from "./policy"
import { terminal } from "./terminal"

run(async () => {
	const name = process.argv[2] || process.env.MOZAIK_NAME || "you"
	const you = await Member.create({ name, role: "user", policy: humanPolicy })
	terminal.selfId = you.id

	await you.join()
	leaveOnExit([you])

	const typed = async (line: string): Promise<void> => {
		if (!line) return terminal.prompt()
		if (line === "/quit") return terminal.close()
		if (line === "/peers") {
			const others = you.roster.all(you.id).map((peer) => `${peer.name} (${peer.id})`)
			return terminal.print(others.join("\n") || "Nobody else is here.")
		}

		const direct = line.match(/^@(\S+)\s+([\s\S]+)$/)
		if (!direct) {
			await you.send(line)
			return terminal.prompt()
		}

		const peer = you.roster.find(direct[1], you.id)
		if (!peer) return terminal.print(`Nobody named ${direct[1]} is here. /peers lists who is.`)
		await you.send(direct[2], peer.id)
		terminal.prompt()
	}

	terminal.start(
		name,
		(line) => void typed(line).catch((error) => terminal.print(String(error instanceof Error ? error.message : error))),
		() => void you.leave().finally(() => process.exit(0)),
	)
})
