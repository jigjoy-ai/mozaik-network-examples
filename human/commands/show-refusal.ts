import { Command } from "@jigjoy/mozaik-rule-engine"
import type { CommandContract } from "@jigjoy/mozaik-rule-engine"
import type { Refusal } from "../../shared/messages"
import { terminal } from "../terminal"

@Command({ name: "show-refusal" })
export class ShowRefusal implements CommandContract<Refusal, void> {
	invoke(refusal: Refusal): void {
		terminal.print(`The network refused that: ${refusal.payload.message}`)
	}
}
