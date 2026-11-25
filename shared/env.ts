import "dotenv/config"
import { HOSTED_NETWORK, readInviteLink } from "@jigjoy/mozaik-network/invite-link"
import type { InviteLink } from "@jigjoy/mozaik-network/invite-link"

/** The model the agents run on: one of @jigjoy/mozaik-agent's models. */
export const MODEL = process.env.MODEL || "claude-sonnet-5-5"

/** The network the examples join, from MOZAIK_INVITE. */
export function inviteLink(): InviteLink {
	const value = process.env.MOZAIK_INVITE
	if (!value) {
		throw new Error("Set MOZAIK_INVITE to the invite link of a network. `npm run network` makes one.")
	}

	const link = readInviteLink(value, process.env.NETWORK_ORIGIN || HOSTED_NETWORK)
	if (!link) throw new Error(`MOZAIK_INVITE is not an invite link: ${value}`)
	return link
}

/** Leaves the network on Ctrl+C, so the others see the peers go. */
export function leaveOnExit(leave: () => Promise<void>): void {
	const stop = () => {
		void leave()
			.catch(() => {})
			.finally(() => process.exit(0))
	}
	process.once("SIGINT", stop)
	process.once("SIGTERM", stop)
}

/** One line of what happened, short enough to follow several agents in one terminal. */
export function log(from: string, to: string, text: string): void {
	const line = text.replace(/\s+/g, " ").trim()
	console.log(`\x1b[2m[${from} → ${to}]\x1b[0m ${line.length > 200 ? `${line.slice(0, 200)}…` : line}`)
}
