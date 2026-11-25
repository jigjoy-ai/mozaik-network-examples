import { Command } from "@jigjoy/mozaik-rule-engine"
import type { CommandContract } from "@jigjoy/mozaik-rule-engine"
import type { Envelope } from "@jigjoy/mozaik-network/envelope"
import { rosterOf } from "../../shared/roster"

/** Keeps up with who is in the network, so the agents can find each other by name. */
@Command({ name: "update-roster" })
export class UpdateRoster implements CommandContract<Envelope<unknown>, void> {
	invoke(envelope: Envelope<unknown>): void {
		rosterOf(envelope.networkId).update(envelope)
	}
}
