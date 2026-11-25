import { InputResolver } from "@jigjoy/mozaik-rule-engine"
import type { InputResolverContract } from "@jigjoy/mozaik-rule-engine"
import type { MessageSent } from "../../shared/messages"
import type { Decision } from "../approvals"

/** "yes" approves; anything else declines, and is kept as the reason. */
@InputResolver({ name: "approval-decision" })
export class ApprovalDecisionResolver implements InputResolverContract<MessageSent, Decision> {
	async resolve(envelope: MessageSent): Promise<Decision> {
		const answer = envelope.payload.message.trim()
		return {
			agentId: envelope.payload.to!,
			approverId: envelope.senderId,
			approved: /^(y|yes)\b/i.test(answer),
			answer,
		}
	}
}
