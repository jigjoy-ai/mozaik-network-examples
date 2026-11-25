import { Waiting } from "../shared/waiting"

/** What a person answered when asked to approve a payment. */
export type Decision = {
	agentId: string
	approverId: string
	approved: boolean
	answer: string
}

/** The approvals the accountant waits for, by who approves and which agent asked. */
export const approvals = new Waiting<Decision>()
