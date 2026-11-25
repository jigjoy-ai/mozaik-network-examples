import { join, leave, sendMessage } from "@jigjoy/mozaik-network"
import { NetworkClient } from "@jigjoy/mozaik-network/network-client"
import type { Peer } from "@jigjoy/mozaik-network/peer"
import type { PolicyDefinition } from "@jigjoy/mozaik-rule-engine"
import { inviteLink } from "./env"
import { rosterOf } from "./roster"
import type { Roster } from "./roster"

/** The peers of this process, so a message between two of them is logged once. */
export const localPeers = new Set<string>()

/** A peer in the network of MOZAIK_INVITE, whose policy says how it reacts to what arrives. */
export class Member {
	private constructor(
		readonly peer: Peer,
		readonly networkId: string,
		private readonly client: NetworkClient,
	) {}

	/** Makes the peer. It joins with `join()`, once whatever handles its messages is ready. */
	static async create(options: { name: string; role: "agent" | "user"; policy: PolicyDefinition }): Promise<Member> {
		const link = inviteLink()
		const client = new NetworkClient({ origin: link.origin })
		const peer = await client.createPeer({
			name: options.name,
			role: options.role,
			capabilities: ["message"],
			invite: link.invite,
			policy: options.policy,
		})
		if (!peer.invitedTo) throw new Error("The network didn't say which network the invite is for")

		localPeers.add(peer.id)
		return new Member(peer, peer.invitedTo, client)
	}

	get id(): string {
		return this.peer.id
	}

	get name(): string {
		return this.peer.getManifest().name
	}

	get roster(): Roster {
		return rosterOf(this.networkId)
	}

	join(): Promise<void> {
		return join(this.peer, this.networkId, this.client)
	}

	/** To one peer, or to everyone without `to`. */
	send(text: string, to?: string): Promise<void> {
		return sendMessage(this.peer, this.networkId, text, to)
	}

	leave(): Promise<void> {
		localPeers.delete(this.id)
		return leave(this.peer, this.networkId)
	}
}
