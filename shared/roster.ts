import type { Envelope } from "@jigjoy/mozaik-network/envelope"
import type { PeerManifest } from "@jigjoy/mozaik-network/peer-manifest"
import type { PeerJoined, PeerLeft, PeerWelcomed } from "./messages"

/** Who is in a network: kept up from `peer.welcomed`, `peer.joined` and `peer.left`. */
export class Roster {
	private readonly peers = new Map<string, PeerManifest>()

	/** Returns who joined or left, for whoever wants to tell. */
	update(envelope: Envelope<unknown>): { joined?: PeerManifest; left?: PeerManifest } {
		switch (envelope.type) {
			case "peer.welcomed": {
				this.peers.clear()
				for (const peer of (envelope as PeerWelcomed).payload.peers) this.peers.set(peer.id, peer)
				return {}
			}
			case "peer.joined": {
				const joined = (envelope as PeerJoined).payload
				this.peers.set(joined.id, joined)
				return { joined }
			}
			case "peer.left": {
				const { peerId } = (envelope as PeerLeft).payload
				const left = this.peers.get(peerId)
				this.peers.delete(peerId)
				return { left }
			}
			default:
				return {}
		}
	}

	/** Everyone in the network but `exceptId`. */
	all(exceptId?: string): PeerManifest[] {
		return [...this.peers.values()].filter((peer) => peer.id !== exceptId)
	}

	/** People and models use names: the peer that joined last with that name, ignoring case. */
	find(name: string, exceptId?: string): PeerManifest | undefined {
		const wanted = name.trim().replace(/^@/, "").toLowerCase()
		return this.all(exceptId)
			.reverse()
			.find((peer) => peer.name.toLowerCase() === wanted)
	}

	nameOf(id: string): string {
		return this.peers.get(id)?.name ?? id
	}
}

const rosters = new Map<string, Roster>()

/** One roster per network: every peer of this process in that network sees the same people. */
export function rosterOf(networkId: string): Roster {
	let roster = rosters.get(networkId)
	if (!roster) {
		roster = new Roster()
		rosters.set(networkId, roster)
	}
	return roster
}
