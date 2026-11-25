import { Condition, ConditionContract } from "@jigjoy/mozaik-rule-engine"
import type { Envelope } from "@jigjoy/mozaik-network/envelope"
import { isDirectMessage } from "../../shared/messages"
import { fromTo } from "../../shared/waiting"
import { replies } from "../replies"

/** A direct message from a peer this one asked something: the answer, not a new question. */
@Condition({ name: "awaited-reply" })
export class AwaitedReply extends ConditionContract<Envelope<unknown>> {
	isSatisfiedBy(envelope: Envelope<unknown>): boolean {
		return isDirectMessage(envelope) && replies.has(fromTo(envelope.senderId, envelope.payload.to!))
	}
}
