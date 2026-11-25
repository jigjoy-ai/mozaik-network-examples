import { Command } from "@jigjoy/mozaik-rule-engine"
import type { CommandContract } from "@jigjoy/mozaik-rule-engine"
import { fromTo } from "../../shared/waiting"
import { approvals } from "../approvals"
import type { Decision } from "../approvals"

/** Hands the decision to the payment that waits at its breakpoint for it. */
@Command({ name: "decide-approval" })
export class DecideApproval implements CommandContract<Decision, void> {
	invoke(decision: Decision): void {
		approvals.settle(fromTo(decision.approverId, decision.agentId), decision)
	}
}
