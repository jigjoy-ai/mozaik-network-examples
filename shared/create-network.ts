// Makes a network and prints its invite link: put it in .env as MOZAIK_INVITE.
//
//   npm run network                    on the hosted network, with MOZAIK_API_KEY
//   NETWORK_ORIGIN=http://localhost:3000 npm run network    on a network you run yourself
import "dotenv/config"
import { HOSTED_NETWORK, writeInviteLink } from "@jigjoy/mozaik-network/invite-link"
import { NetworkClient } from "@jigjoy/mozaik-network/network-client"

async function main() {
	const origin = (process.env.NETWORK_ORIGIN || HOSTED_NETWORK).replace(/\/+$/, "")
	const apiKey = process.env.MOZAIK_API_KEY || undefined
	if (origin === HOSTED_NETWORK && !apiKey) {
		throw new Error(
			"A network on the hosted Mozaik network is made with a Mozaik Cloud API key: set MOZAIK_API_KEY. " +
				"For a network you run yourself, set NETWORK_ORIGIN instead.",
		)
	}

	const client = new NetworkClient({ origin, apiKey })
	const name = process.argv[2] || "mozaik-network-examples"
	const network = await client.createNetwork({ name })
	const invite = await client.createInvite(network.id)

	console.log(`Network "${name}" (${network.id})\n`)
	console.log(`MOZAIK_INVITE=${writeInviteLink({ origin, invite })}`)
	console.log(`\nWhoever has the link can join, and their messages are counted against the network's owner.`)
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error)
	process.exit(1)
})
