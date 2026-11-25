import { Command } from "@jigjoy/mozaik-rule-engine"
import type { CommandContract } from "@jigjoy/mozaik-rule-engine"
import type { Envelope } from "@jigjoy/mozaik-network/envelope"
import { rosterOf } from "../../shared/roster"
import { terminal } from "../terminal"

/** Says who joined or left. */
@Command({ name: "show-membership" })
export class ShowMembership implements CommandContract<Envelope<unknown>, void> {
	invoke(envelope: Envelope<unknown>): void {
		const { joined, left } = rosterOf(envelope.networkId).update(envelope)
		if (joined && joined.id !== terminal.selfId) terminal.dim(`${joined.name} joined`)
		if (left) terminal.dim(`${left.name} left`)
	}
}
