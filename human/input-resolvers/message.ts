import { InputResolver } from "@jigjoy/mozaik-rule-engine"
import type { InputResolverContract } from "@jigjoy/mozaik-rule-engine"
import { toMessage } from "../../shared/messages"
import type { Message, MessageSent } from "../../shared/messages"

/** Reads who sent the message, to whom, and what it says. */
@InputResolver({ name: "message" })
export class MessageResolver implements InputResolverContract<MessageSent, Message> {
	async resolve(envelope: MessageSent): Promise<Message> {
		return toMessage(envelope)
	}
}
