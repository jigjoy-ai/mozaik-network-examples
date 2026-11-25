import "dotenv/config"
import { HOSTED_NETWORK, readInviteLink } from "@jigjoy/mozaik-network/invite-link"
import type { InviteLink } from "@jigjoy/mozaik-network/invite-link"

/** The model the agents run on: one of @jigjoy/mozaik-agent's models. */
export const MODEL = process.env.MODEL || "claude-sonnet-5-5"

/** The network the examples join, from MOZAIK_INVITE. */
export function inviteLink(): InviteLink {
	const value = process.env.MOZAIK_INVITE
	if (!value) {
		throw new Error("Set MOZAIK_INVITE in .env to the invite link of a network you made in the JigJoy app.")
	}

	const link = readInviteLink(value, HOSTED_NETWORK)
	if (!link) {
		// In .env, an unquoted # starts a comment: the invite after it is cut off.
		const cut = !value.includes("#") && !value.includes("nt_")
		throw new Error(
			cut
				? `MOZAIK_INVITE has no invite in it, only ${value}. Put the link in quotes in .env: ` +
						`MOZAIK_INVITE="https://network.app.jigjoy.ai#nt_…"`
				: `MOZAIK_INVITE is not an invite link. It looks like https://network.app.jigjoy.ai#nt_…`,
		)
	}
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
