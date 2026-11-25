import { InputResolver } from "@jigjoy/mozaik-rule-engine"
import type { InputResolverContract } from "@jigjoy/mozaik-rule-engine"
import type { Envelope } from "@jigjoy/mozaik-network/envelope"

/** The envelope as it arrived. */
@InputResolver({ name: "envelope" })
export class EnvelopeResolver implements InputResolverContract<Envelope<unknown>, Envelope<unknown>> {
	async resolve(envelope: Envelope<unknown>): Promise<Envelope<unknown>> {
		return envelope
	}
}
