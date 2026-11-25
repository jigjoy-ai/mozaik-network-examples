import type { Envelope } from "@jigjoy/mozaik-network/envelope"
import type { PeerManifest } from "@jigjoy/mozaik-network/peer-manifest"

// What the network sends a peer. Every envelope has a `type`; these are the ones the examples use.

export type MessageSent = Envelope<{ message: string; senderName?: string; to?: string }>
export type PeerWelcomed = Envelope<{ peers: PeerManifest[]; messages: MessageSent[] }>
export type PeerJoined = Envelope<PeerManifest>
export type PeerLeft = Envelope<{ peerId: string }>
export type Refusal = Envelope<{ code: string; message: string }>

/** A message, as the commands work with it. */
export type Message = {
	networkId: string
	senderId: string
	senderName: string
	/** The peer it was sent to. A message to everyone has none. */
	to?: string
	text: string
}

export function isMessage(envelope: Envelope<unknown>): envelope is MessageSent {
	return envelope.type === "message.sent"
}

/** The network gives a message with `to` only to the peer it names. */
export function isDirectMessage(envelope: Envelope<unknown>): envelope is MessageSent {
	return isMessage(envelope) && envelope.payload.to !== undefined
}

export function toMessage(envelope: MessageSent): Message {
	return {
		networkId: envelope.networkId,
		senderId: envelope.senderId,
		senderName: envelope.payload.senderName ?? envelope.senderId,
		to: envelope.payload.to,
		text: envelope.payload.message,
	}
}
