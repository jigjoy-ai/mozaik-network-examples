import { Condition, ConditionContract, InputResolver, InputResolverContract } from "@jigjoy/mozaik-rule-engine"
import type { Envelope } from "@jigjoy/mozaik-network/envelope"
import type { PeerManifest } from "@jigjoy/mozaik-network/peer-manifest"
import { replies } from "./replies"

// The conditions and input resolvers every peer in these examples reacts by. They are registered
// once, by name, when this module is first imported: a peer's policy names them in its rules.

export type MessageSent = Envelope<{ message: string; senderName?: string; to?: string }>
export type Membership = Envelope<{ peers?: PeerManifest[]; peerId?: string } & Partial<PeerManifest>>

/** What a peer was sent: the text, who sent it, and to whom. */
export type Message = {
	networkId: string
	senderId: string
	senderName: string
	/** The peer it was sent to; none for a message to everyone. */
	to?: string
	text: string
}

function isMessage(envelope: Envelope<any>): envelope is MessageSent {
	return envelope.type === "message.sent"
}

@Condition({ name: "message.direct" })
export class MessageDirect extends ConditionContract<Envelope<any>> {
	// The network gives a message with `to` only to the peer it names.
	isSatisfiedBy(envelope: Envelope<any>) {
		return isMessage(envelope) && envelope.payload.to !== undefined
	}
}

@Condition({ name: "message.public" })
export class MessagePublic extends ConditionContract<Envelope<any>> {
	isSatisfiedBy(envelope: Envelope<any>) {
		return isMessage(envelope) && envelope.payload.to === undefined
	}
}

@Condition({ name: "reply.awaited" })
export class ReplyAwaited extends ConditionContract<Envelope<any>> {
	// A direct message from a peer this one is waiting on is an answer, not a new request.
	isSatisfiedBy(envelope: Envelope<any>) {
		return (
			isMessage(envelope) &&
			envelope.payload.to !== undefined &&
			replies.isAwaited(envelope.payload.to, envelope.senderId)
		)
	}
}

@Condition({ name: "membership.changed" })
export class MembershipChanged extends ConditionContract<Envelope<any>> {
	isSatisfiedBy(envelope: Envelope<any>) {
		return ["peer.welcomed", "peer.joined", "peer.left"].includes(envelope.type)
	}
}

@Condition({ name: "request.refused" })
export class RequestRefused extends ConditionContract<Envelope<any>> {
	// What the network refused arrives as an envelope of type `error`.
	isSatisfiedBy(envelope: Envelope<any>) {
		return envelope.type === "error"
	}
}

@InputResolver({ name: "message" })
export class MessageInput implements InputResolverContract<MessageSent, Message> {
	async resolve(envelope: MessageSent): Promise<Message> {
		return {
			networkId: envelope.networkId,
			senderId: envelope.senderId,
			senderName: envelope.payload.senderName ?? envelope.senderId,
			to: envelope.payload.to,
			text: envelope.payload.message,
		}
	}
}

@InputResolver({ name: "envelope" })
export class EnvelopeInput implements InputResolverContract<Envelope<any>, Envelope<any>> {
	async resolve(envelope: Envelope<any>): Promise<Envelope<any>> {
		return envelope
	}
}
