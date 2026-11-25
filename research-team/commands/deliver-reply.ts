import { Command } from "@jigjoy/mozaik-rule-engine"
import type { CommandContract } from "@jigjoy/mozaik-rule-engine"
import { logReceived } from "../../shared/log"
import type { Message } from "../../shared/messages"
import { rosterOf } from "../../shared/roster"
import { fromTo } from "../../shared/waiting"
import { replies } from "../replies"

/** Hands the answer to the ask_peer call that waits for it. */
@Command({ name: "deliver-reply" })
export class DeliverReply implements CommandContract<Message, void> {
	invoke(message: Message): void {
		const recipient = rosterOf(message.networkId).nameOf(message.to!)
		logReceived({ id: message.senderId, name: message.senderName }, recipient, message.text)
		replies.settle(fromTo(message.senderId, message.to!), message)
	}
}
