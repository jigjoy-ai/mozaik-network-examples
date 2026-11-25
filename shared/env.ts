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
	if (link) return link

	// In .env, an unquoted # starts a comment: the invite after it is cut off.
	if (!value.includes("nt_")) {
		throw new Error(
			`MOZAIK_INVITE has no invite in it, only ${value}. ` +
				`Put the link in quotes in .env: MOZAIK_INVITE="https://network.app.jigjoy.ai#nt_…"`,
		)
	}
	throw new Error("MOZAIK_INVITE is not an invite link. It looks like https://network.app.jigjoy.ai#nt_…")
}

/** Runs `main`, and prints what went wrong without a stack trace if it fails. */
export function run(main: () => Promise<unknown>): void {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : error)
		process.exit(1)
	})
}

/** Leaves the network on Ctrl+C, so the others see the peers go. */
export function leaveOnExit(peers: Array<{ leave(): Promise<void> }>): void {
	const stop = () => {
		void Promise.allSettled(peers.map((peer) => peer.leave())).finally(() => process.exit(0))
	}
	process.once("SIGINT", stop)
	process.once("SIGTERM", stop)
}
