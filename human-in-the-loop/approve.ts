import type { ToolCallItem } from "@jigjoy/mozaik-agent"
import type { AgentPeer } from "../shared/agent-peer"
import { logReceived } from "../shared/log"
import type { Message } from "../shared/messages"
import { fromTo } from "../shared/waiting"
import { approvals } from "./approvals"
import { findInvoice } from "./invoices"

/** How long a payment waits at its breakpoint for a person to answer. */
const APPROVAL_TIMEOUT_MS = 10 * 60_000

/**
 * Every payment waits at its tool call breakpoint until a person on the network answers. Looking
 * at the invoices doesn't. The one who asked approves, unless APPROVER names someone else.
 */
export async function approve(call: ToolCallItem, request: Message, accountant: AgentPeer): Promise<true | string> {
	if (call.toolName !== "pay_invoice") return true

	const { invoice_id } = JSON.parse(call.toolArguments) as { invoice_id: string }
	const invoice = findInvoice(invoice_id)
	if (!invoice) return `there is no invoice ${invoice_id}`

	const approver = process.env.APPROVER
		? accountant.find(process.env.APPROVER)
		: { id: request.senderId, name: request.senderName }
	if (!approver) return `${process.env.APPROVER}, who approves payments, is not in the network`

	const amount = invoice.amount.toLocaleString("en", { minimumFractionDigits: 2 })
	const question = [
		`Approve paying ${invoice.id}: ${amount} ${invoice.currency} to ${invoice.vendor}, due ${invoice.due}?`,
		approver.id === request.senderId ? "" : `${request.senderName} asked for it.`,
		`Answer "yes" to pay it; anything else declines.`,
	]
		.filter(Boolean)
		.join(" ")

	const decision = approvals.wait(fromTo(approver.id, accountant.id), APPROVAL_TIMEOUT_MS)
	try {
		await accountant.send(approver.id, question)
		const { approved, answer } = await decision.promise
		logReceived(approver, accountant.name, answer)
		return approved ? true : `${approver.name} declined it: "${answer}"`
	} catch (error) {
		decision.cancel()
		return `${approver.name} didn't answer: ${error instanceof Error ? error.message : error}`
	}
}
