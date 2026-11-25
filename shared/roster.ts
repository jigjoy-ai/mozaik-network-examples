import type { PeerManifest } from "@jigjoy/mozaik-network/peer-manifest"
import type { Membership } from "./rules"

/** Who is in the network, as one peer sees it: kept up from `peer.welcomed`, `peer.joined` and `peer.left`. */
export class Roster {
	private readonly peers = new Map<string, PeerManifest>()

	constructor(private readonly selfId: string) {}

	/** Returns what changed, for whoever wants to tell. */
	update(envelope: Membership): { joined?: PeerManifest; left?: PeerManifest } {
		if (envelope.type === "peer.welcomed") {
			this.peers.clear()
			for (const peer of envelope.payload.peers ?? []) this.peers.set(peer.id, peer)
			return {}
		}

		if (envelope.type === "peer.joined" && envelope.payload.id) {
			const peer = envelope.payload as PeerManifest
			this.peers.set(peer.id, peer)
			return { joined: peer }
		}

		if (envelope.type === "peer.left" && envelope.payload.peerId) {
			const left = this.peers.get(envelope.payload.peerId)
			this.peers.delete(envelope.payload.peerId)
			return { left }
		}

		return {}
	}

	/** The others in the network. */
	others(): PeerManifest[] {
		return [...this.peers.values()].filter((peer) => peer.id !== this.selfId)
	}

	/** Names are what people and models use: the most recent peer of that name, ignoring case. */
	byName(name: string): PeerManifest | undefined {
		const wanted = name.trim().replace(/^@/, "").toLowerCase()
		return this.others()
			.reverse()
			.find((peer) => peer.name.toLowerCase() === wanted)
	}

	nameOf(id: string): string {
		return this.peers.get(id)?.name ?? id
	}
}
