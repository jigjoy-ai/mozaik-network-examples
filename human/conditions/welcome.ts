import { Condition, ConditionContract } from "@jigjoy/mozaik-rule-engine"
import type { Envelope } from "@jigjoy/mozaik-network/envelope"

/** The network let the peer in, with who is there and what was said lately. */
@Condition({ name: "welcome" })
export class Welcome extends ConditionContract<Envelope<unknown>> {
	isSatisfiedBy(envelope: Envelope<unknown>): boolean {
		return envelope.type === "peer.welcomed"
	}
}
