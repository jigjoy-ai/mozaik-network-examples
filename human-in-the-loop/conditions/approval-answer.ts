import { Condition, ConditionContract } from "@jigjoy/mozaik-rule-engine"
import type { Envelope } from "@jigjoy/mozaik-network/envelope"
import { isDirectMessage } from "../../shared/messages"
import { fromTo } from "../../shared/waiting"
import { approvals } from "../approvals"

/** A direct message from the person the agent asked to approve a payment: their decision. */
@Condition({ name: "approval-answer" })
export class ApprovalAnswer extends ConditionContract<Envelope<unknown>> {
	isSatisfiedBy(envelope: Envelope<unknown>): boolean {
		return isDirectMessage(envelope) && approvals.has(fromTo(envelope.senderId, envelope.payload.to!))
	}
}
