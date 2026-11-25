import { localPeers } from "./member"

/** One line per message, short enough to follow several agents in one terminal. */
export function logMessage(from: string, to: string, text: string): void {
	const line = text.replace(/\s+/g, " ").trim()
	const short = line.length > 200 ? `${line.slice(0, 200)}…` : line
	console.log(`\x1b[2m[${from} → ${to}]\x1b[0m ${short}`)
}

/** A message from a peer of another process. One from this process was logged when it was sent. */
export function logReceived(sender: { id: string; name: string }, recipientName: string, text: string): void {
	if (!localPeers.has(sender.id)) logMessage(sender.name, recipientName, text)
}
