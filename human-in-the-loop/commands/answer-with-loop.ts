import { Command } from "@jigjoy/mozaik-rule-engine"
import type { CommandContract } from "@jigjoy/mozaik-rule-engine"
import { agents } from "../../shared/agent-peer"
import type { Message } from "../../shared/messages"

/** The agent the message is for runs a Loop for it and answers whoever sent it. */
@Command({ name: "answer-with-loop" })
export class AnswerWithLoop implements CommandContract<Message, void> {
	invoke(message: Message): void {
		// Not awaited: a peer gets its envelopes one at a time, and a Loop that asks another peer
		// something has to be able to receive the answer while it waits.
		void agents.get(message.to!)?.answer(message)
	}
}
