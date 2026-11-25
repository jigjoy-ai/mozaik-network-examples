import { Command } from "@jigjoy/mozaik-rule-engine"
import type { CommandContract } from "@jigjoy/mozaik-rule-engine"
import type { Message } from "../../shared/messages"
import { terminal } from "../terminal"

@Command({ name: "show-message" })
export class ShowMessage implements CommandContract<Message, void> {
	invoke(message: Message): void {
		terminal.print(`${message.senderName}${message.to ? " (to you)" : ""}: ${message.text}`)
	}
}
