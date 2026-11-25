import { Command } from "@jigjoy/mozaik-rule-engine"
import type { CommandContract } from "@jigjoy/mozaik-rule-engine"
import type { PeerWelcomed } from "../../shared/messages"
import { rosterOf } from "../../shared/roster"
import { terminal } from "../terminal"

/** Shows what was said lately and who is there. */
@Command({ name: "show-welcome" })
export class ShowWelcome implements CommandContract<PeerWelcomed, void> {
	invoke(welcome: PeerWelcomed): void {
		const roster = rosterOf(welcome.networkId)
		roster.update(welcome)

		for (const said of welcome.payload.messages) {
			terminal.dim(`${said.payload.senderName ?? said.senderId}: ${said.payload.message}`)
		}
		const others = roster.all(terminal.selfId).map((peer) => peer.name)
		terminal.print(`In the network: ${others.join(", ") || "nobody yet"}.`)
		terminal.dim(`Type "@name message" to one peer, anything else to everyone, /peers, /quit.`)
	}
}
