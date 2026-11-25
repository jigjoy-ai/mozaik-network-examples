import type { AgentTool } from "../../shared/agent-peer"
import { invoices } from "../invoices"

export const listInvoices: AgentTool = {
	definition: {
		name: "list_invoices",
		description: "List the open and paid invoices, with their amounts and due dates.",
		parameters: { type: "object", properties: {}, additionalProperties: false },
		strict: true,
	},

	invoke() {
		return { today: new Date().toISOString().slice(0, 10), invoices }
	},
}
