// A person on the network, in a terminal: what the others say shows up here, and what you type
// is sent. Use it to talk to the agents, approve what they ask, or watch the network.
//
//   npm run human -- ana
//
//   @lead what is a CRDT?     a message to the peer named lead only
//   hello everyone            a message to everyone
//   /peers                    who is in the network
//   /quit                     leave
import { createInterface } from "node:readline"
import { commandRegistry } from "@jigjoy/mozaik-rule-engine"
import { join, leave, sendMessage } from "@jigjoy/mozaik-network"
import { NetworkClient } from "@jigjoy/mozaik-network/network-client"
import type { Envelope } from "@jigjoy/mozaik-network/envelope"
import { inviteLink, leaveOnExit } from "./env"
import { Roster } from "./roster"
import "./rules"
import type { Membership, Message, MessageSent } from "./rules"

async function main() {
	const name = process.argv[2] || process.env.MOZAIK_NAME || "you"
	const link = inviteLink()
	const client = new NetworkClient({ origin: link.origin })

	const peer = await client.createPeer({
		name,
		role: "user",
		capabilities: ["message"],
		invite: link.invite,
		policy: {
			rules: [
				{ condition: "message.direct", inputResolver: "message", command: "human:show" },
				{ condition: "message.public", inputResolver: "message", command: "human:show" },
				{ condition: "membership.changed", inputResolver: "envelope", command: "human:roster" },
				{ condition: "request.refused", inputResolver: "envelope", command: "human:refused" },
			],
		},
	})
	if (!peer.invitedTo) throw new Error("The network didn't say which network the invite is for")
	const networkId = peer.invitedTo
	const roster = new Roster(peer.id)

	const terminal = createInterface({ input: process.stdin, output: process.stdout, prompt: `${name}> ` })
	const print = (line: string) => {
		// Above what is being typed, which stays as it was.
		process.stdout.write(`\r\x1b[2K${line}\n`)
		terminal.prompt(true)
	}

	commandRegistry.register("human:show", {
		invoke: (message: Message) => print(`${message.senderName}${message.to ? " (to you)" : ""}: ${message.text}`),
	})
	commandRegistry.register("human:roster", {
		invoke: (envelope: Envelope<any>) => {
			const { joined, left } = roster.update(envelope as Membership)
			if (joined && joined.id !== peer.id) print(`\x1b[2m${joined.name} joined\x1b[0m`)
			if (left) print(`\x1b[2m${left.name} left\x1b[0m`)

			if (envelope.type === "peer.welcomed") {
				for (const said of (envelope.payload.messages ?? []) as MessageSent[]) {
					print(`\x1b[2m${said.payload.senderName ?? said.senderId}: ${said.payload.message}\x1b[0m`)
				}
				print(`Joined as ${name}. In the network: ${roster.others().map((p) => p.name).join(", ") || "nobody yet"}.`)
				print(`\x1b[2mType "@name message" to one peer, anything else to everyone, /peers, /quit.\x1b[0m`)
			}
		},
	})
	commandRegistry.register("human:refused", {
		invoke: (envelope: Envelope<{ message: string }>) => print(`The network refused that: ${envelope.payload.message}`),
	})

	await join(peer, networkId, client)
	const quit = () => leave(peer, networkId)
	leaveOnExit(quit)

	terminal.on("line", (line) => {
		void typed(line.trim()).catch((error) => print(`${error instanceof Error ? error.message : error}`))
	})
	terminal.on("close", () => void quit().finally(() => process.exit(0)))
	terminal.prompt()

	async function typed(line: string): Promise<void> {
		if (!line) return terminal.prompt()
		if (line === "/quit") return terminal.close()
		if (line === "/peers") {
			const others = roster.others()
			return print(others.length ? others.map((p) => `${p.name} (${p.id})`).join("\n") : "Nobody else is here.")
		}

		const direct = line.match(/^@(\S+)\s+([\s\S]+)$/)
		if (direct) {
			const to = roster.byName(direct[1])
			if (!to) return print(`Nobody named ${direct[1]} is here. /peers lists who is.`)
			await sendMessage(peer, networkId, direct[2], to.id)
		} else {
			await sendMessage(peer, networkId, line)
		}
		terminal.prompt()
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error)
	process.exit(1)
})
