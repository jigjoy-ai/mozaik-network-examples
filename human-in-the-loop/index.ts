// Human in the loop: an agent that pays invoices only when a person on the network says yes.
//
// The accountant may look at the invoices whenever it likes, but a call to pay_invoice stops at
// the Loop's tool call breakpoint. The accountant asks a person on the network to approve it, and
// the Loop stays paused there until the answer arrives: "yes" runs the call, anything else
// declines it and the model is told why.
//
//   npm run human-in-the-loop          the accountant joins the network
//   npm run human -- ana               you join it, in another terminal
//
//   ana> @accountant pay the invoices that are overdue
//   accountant (to you): Approve paying INV-1042: 1,840.00 EUR to Northwind Hosting? ...
//   ana> @accountant yes
//
// The one who asked approves, unless APPROVER names someone else in the network: another person,
// or a Claude Code session that is told what to approve.
import { initAgentModule } from "@jigjoy/mozaik-agent"
import { AgentPeer } from "../shared/agent-peer"
import { leaveOnExit } from "../shared/env"
import { approve, tools } from "./accountant"

async function main() {
	initAgentModule()

	const accountant = await AgentPeer.join({
		name: "accountant",
		instruction:
			"You are the accountant of a small company. You look after its invoices: you can list them and pay them. " +
			"Every payment needs a person's approval, which pay_invoice asks for by itself: don't ask for it " +
			"yourself. When a payment is declined, don't try it again. Finish with what you paid and what you didn't.",
		tools,
		approve,
	})

	console.log(`The accountant joined the network. Payments are approved by ${process.env.APPROVER || "whoever asks for them"}.`)
	console.log("Talk to it from `npm run human` (type `@accountant pay what is overdue`). Ctrl+C to stop.")
	leaveOnExit(() => accountant.leave())
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error)
	process.exit(1)
})
