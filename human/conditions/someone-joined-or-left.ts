import { Condition, ConditionContract } from "@jigjoy/mozaik-rule-engine"
import type { Envelope } from "@jigjoy/mozaik-network/envelope"

/** Another peer joined the network or left it. */
@Condition({ name: "someone-joined-or-left" })
export class SomeoneJoinedOrLeft extends ConditionContract<Envelope<unknown>> {
	isSatisfiedBy(envelope: Envelope<unknown>): boolean {
		return envelope.type === "peer.joined" || envelope.type === "peer.left"
	}
}
