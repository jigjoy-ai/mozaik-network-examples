import { Command } from "@jigjoy/mozaik-rule-engine"
import type { CommandContract } from "@jigjoy/mozaik-rule-engine"
import type { Refusal } from "../../shared/messages"

/** Says what the network refused. */
@Command({ name: "report-refusal" })
export class ReportRefusal implements CommandContract<Refusal, void> {
	invoke(refusal: Refusal): void {
		console.warn(`The network refused a message: ${refusal.payload.message}`)
	}
}
