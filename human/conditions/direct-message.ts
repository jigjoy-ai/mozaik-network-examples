import { Condition, ConditionContract } from "@jigjoy/mozaik-rule-engine"
import type { Envelope } from "@jigjoy/mozaik-network/envelope"
import { isDirectMessage } from "../../shared/messages"

/** A message sent to this peer only. */
@Condition({ name: "direct-message" })
export class DirectMessage extends ConditionContract<Envelope<unknown>> {
	isSatisfiedBy(envelope: Envelope<unknown>): boolean {
		return isDirectMessage(envelope)
	}
}
