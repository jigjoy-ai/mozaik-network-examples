import { Condition, ConditionContract } from "@jigjoy/mozaik-rule-engine"
import type { Envelope } from "@jigjoy/mozaik-network/envelope"

/** The network refused something the peer sent. */
@Condition({ name: "refusal" })
export class Refusal extends ConditionContract<Envelope<unknown>> {
	isSatisfiedBy(envelope: Envelope<unknown>): boolean {
		return envelope.type === "error"
	}
}
