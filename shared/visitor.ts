import { commandRegistry } from "@jigjoy/mozaik-rule-engine"
import { join, leave, sendMessage } from "@jigjoy/mozaik-network"
import { NetworkClient } from "@jigjoy/mozaik-network/network-client"
import type { Peer } from "@jigjoy/mozaik-network/peer"
import type { Envelope } from "@jigjoy/mozaik-network/envelope"
import { local } from "./agent-peer"
import { inviteLink, log } from "./env"
import { replies } from "./replies"
import { Roster } from "./roster"
import "./rules"
import type { Membership, Message } from "./rules"

/** How long a visitor waits for its answer: a team of agents can take a while. */
const ANSWER_TIMEOUT_MS = 10 * 60_000

/**
 * A person's peer that asks one thing and goes: what an example runs when it is given a question
 * on the command line, in place of typing it in `npm run human`.
 */
export class Visitor {
	private constructor(
		private readonly peer: Peer,
		private readonly networkId: string,
		private readonly roster: Roster,
		private readonly name: string,
	) {}

	static async join(name = "you"): Promise<Visitor> {
		const link = inviteLink()
		const client = new NetworkClient({ origin: link.origin })
		const command = (what: string) => `visitor#${name}:${what}`
		const peer = await client.createPeer({
			name,
			role: "user",
			capabilities: ["message"],
			invite: link.invite,
			policy: {
				rules: [
					{ condition: "reply.awaited", inputResolver: "message", command: command("reply") },
					{ condition: "membership.changed", inputResolver: "envelope", command: command("roster") },
				],
			},
		})
		if (!peer.invitedTo) throw new Error("The network didn't say which network the invite is for")

		const roster = new Roster(peer.id)
		local.add(peer.id)
		commandRegistry.register(command("reply"), {
			invoke: (message: Message) => replies.deliver(peer.id, message.senderId, message.text),
		})
		commandRegistry.register(command("roster"), {
			invoke: (envelope: Envelope<any>) => roster.update(envelope as Membership),
		})

		await join(peer, peer.invitedTo, client)
		return new Visitor(peer, peer.invitedTo, roster, name)
	}

	async ask(peerName: string, text: string): Promise<string> {
		const other = this.roster.byName(peerName)
		if (!other) throw new Error(`No peer named "${peerName}" in the network`)

		const waiting = replies.waitFor(this.peer.id, other.id, ANSWER_TIMEOUT_MS)
		log(this.name, other.name, text)
		await sendMessage(this.peer, this.networkId, text, other.id)
		return await waiting.answer
	}

	leave(): Promise<void> {
		return leave(this.peer, this.networkId)
	}
}
