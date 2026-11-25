import { Condition, ConditionContract } from "@jigjoy/mozaik-rule-engine"
import type { Envelope } from "@jigjoy/mozaik-network/envelope"

/** The peer was welcomed with who is there, or someone joined or left. */
@Condition({ name: "membership-change" })
export class MembershipChange extends ConditionContract<Envelope<unknown>> {
	isSatisfiedBy(envelope: Envelope<unknown>): boolean {
		return ["peer.welcomed", "peer.joined", "peer.left"].includes(envelope.type)
	}
}
