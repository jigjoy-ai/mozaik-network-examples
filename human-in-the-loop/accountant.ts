import type { ToolCallItem } from "@jigjoy/mozaik-agent"
import type { AgentPeer, AgentTool } from "../shared/agent-peer"
import type { Message } from "../shared/rules"
import { findInvoice, invoices, pay } from "./invoices"

const listInvoices: AgentTool = {
	definition: {
		name: "list_invoices",
		description: "List the open and paid invoices, with their amounts and due dates.",
		parameters: { type: "object", properties: {}, additionalProperties: false },
		strict: true,
	},
	invoke: () => ({ today: new Date().toISOString().slice(0, 10), invoices }),
}

const payInvoice: AgentTool = {
	definition: {
		name: "pay_invoice",
		description: "Pay one open invoice in full. A person has to approve every payment first.",
		parameters: {
			type: "object",
			properties: { invoice_id: { type: "string", description: "The id of the invoice, like INV-1042" } },
			required: ["invoice_id"],
			additionalProperties: false,
		},
		strict: true,
	},
	invoke: ({ invoice_id }) => pay(invoice_id),
}

/** Every payment is held at its breakpoint until a person answers. Looking at invoices is not. */
export async function approve(call: ToolCallItem, request: Message, self: AgentPeer): Promise<true | string> {
	if (call.toolName !== "pay_invoice") return true

	const { invoice_id } = JSON.parse(call.toolArguments) as { invoice_id: string }
	const invoice = findInvoice(invoice_id)
	if (!invoice) return `there is no invoice ${invoice_id}`

	const approver = process.env.APPROVER ? self.roster.byName(process.env.APPROVER) : undefined
	if (process.env.APPROVER && !approver) return `${process.env.APPROVER}, who approves payments, is not in the network`
	const approverId = approver?.id ?? request.senderId
	const approverName = approver?.name ?? request.senderName

	const amount = invoice.amount.toLocaleString("en", { minimumFractionDigits: 2 })
	const question =
		`Approve paying ${invoice.id}: ${amount} ${invoice.currency} to ${invoice.vendor}, due ${invoice.due}? ` +
		`${approverId === request.senderId ? "" : `${request.senderName} asked for it. `}` +
		`Answer "yes" to pay it; anything else declines.`

	try {
		const answer = await self.askPeer(approverId, question)
		return /^\s*(y|yes)\b/i.test(answer) ? true : `${approverName} declined it: "${answer}"`
	} catch (error) {
		return `${approverName} didn't answer: ${error instanceof Error ? error.message : error}`
	}
}

export const tools = [listInvoices, payInvoice]
