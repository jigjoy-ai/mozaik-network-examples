import type { Message } from "../shared/messages"
import { Waiting } from "../shared/waiting"

/** The answers ask_peer calls wait for, by who they are from and to. */
export const replies = new Waiting<Message>()
