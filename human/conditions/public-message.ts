import { Condition, ConditionContract } from "@jigjoy/mozaik-rule-engine"
import type { Envelope } from "@jigjoy/mozaik-network/envelope"
import { isMessage } from "../../shared/messages"

/** A message to everyone in the network. */
@Condition({ name: "public-message" })
export class PublicMessage extends ConditionContract<Envelope<unknown>> {
	isSatisfiedBy(envelope: Envelope<unknown>): boolean {
		return isMessage(envelope) && envelope.payload.to === undefined
	}
}
