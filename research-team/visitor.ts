import { logMessage } from "../shared/log"
import { Member } from "../shared/member"
import { fromTo } from "../shared/waiting"
import { visitorPolicy } from "./policy"
import { replies } from "./replies"

/** A team of agents can take a while. */
const ANSWER_TIMEOUT_MS = 10 * 60_000

/** Joins as a person, asks one peer one thing, and leaves with the answer. */
export async function askOnce(peerName: string, question: string): Promise<string> {
	const you = await Member.create({ name: "you", role: "user", policy: visitorPolicy })
	await you.join()

	try {
		const peer = you.roster.find(peerName, you.id)
		if (!peer) throw new Error(`There is no peer named "${peerName}" in the network`)

		const reply = replies.wait(fromTo(peer.id, you.id), ANSWER_TIMEOUT_MS)
		logMessage(you.name, peer.name, question)
		await you.send(question, peer.id)
		return (await reply.promise).text
	} finally {
		await you.leave()
	}
}
