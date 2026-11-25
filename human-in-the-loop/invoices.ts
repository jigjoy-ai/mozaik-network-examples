// The company's invoices, kept in memory: nothing here moves real money.

export type Invoice = {
	id: string
	vendor: string
	amount: number
	currency: string
	due: string
	status: "open" | "paid"
}

function daysFromToday(days: number): string {
	return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)
}

export const invoices: Invoice[] = [
	{ id: "INV-1042", vendor: "Northwind Hosting", amount: 1840, currency: "EUR", due: daysFromToday(-12), status: "open" },
	{ id: "INV-1043", vendor: "Fabrikam Design", amount: 12500, currency: "EUR", due: daysFromToday(-3), status: "open" },
	{ id: "INV-1044", vendor: "Contoso Office Supplies", amount: 230.5, currency: "EUR", due: daysFromToday(9), status: "open" },
	{ id: "INV-1039", vendor: "Litware Licenses", amount: 990, currency: "EUR", due: daysFromToday(-30), status: "paid" },
]

export function findInvoice(id: string): Invoice | undefined {
	return invoices.find((invoice) => invoice.id.toLowerCase() === id.trim().toLowerCase())
}

export function pay(id: string): string {
	const invoice = findInvoice(id)
	if (!invoice) return `There is no invoice ${id}.`
	if (invoice.status === "paid") return `${invoice.id} was already paid.`

	invoice.status = "paid"
	return `Paid ${invoice.id}: ${invoice.amount} ${invoice.currency} to ${invoice.vendor}.`
}
