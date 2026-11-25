import type { AgentTool } from "../../shared/agent-peer"
import { pay } from "../invoices"

/** Every call waits at its breakpoint for a person's approval: see approve.ts. */
export const payInvoice: AgentTool = {
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

	invoke({ invoice_id }) {
		return pay(invoice_id)
	},
}
