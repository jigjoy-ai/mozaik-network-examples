/**
 * Answers peers are waiting for. A peer that asks another one something registers here before it
 * sends, and the `reply.awaited` condition sends the answer back here instead of starting a new loop.
 */
class Replies {
	private readonly waiting = new Map<string, Array<(text: string) => void>>()

	isAwaited(recipientId: string, senderId: string): boolean {
		return (this.waiting.get(key(recipientId, senderId))?.length ?? 0) > 0
	}

	/**
	 * The next direct message `senderId` sends to `recipientId`, or a rejection after `timeoutMs`.
	 * Call it before sending the question, so an answer that comes quickly is not missed.
	 */
	waitFor(recipientId: string, senderId: string, timeoutMs: number): { answer: Promise<string>; cancel(): void } {
		const k = key(recipientId, senderId)
		let settle: (text: string) => void = () => {}
		let timer: ReturnType<typeof setTimeout> | undefined

		const answer = new Promise<string>((resolve, reject) => {
			settle = (text: string) => {
				clearTimeout(timer)
				resolve(text)
			}
			timer = setTimeout(() => {
				this.remove(k, settle)
				reject(new Error(`No answer within ${Math.round(timeoutMs / 1000)}s`))
			}, timeoutMs)
		})
		this.waiting.set(k, [...(this.waiting.get(k) ?? []), settle])

		return {
			answer,
			cancel: () => {
				clearTimeout(timer)
				this.remove(k, settle)
			},
		}
	}

	/** Hands the answer to the first one waiting for it. */
	deliver(recipientId: string, senderId: string, text: string): void {
		const k = key(recipientId, senderId)
		const [first, ...rest] = this.waiting.get(k) ?? []
		if (rest.length > 0) this.waiting.set(k, rest)
		else this.waiting.delete(k)
		first?.(text)
	}

	private remove(k: string, settle: (text: string) => void): void {
		const left = (this.waiting.get(k) ?? []).filter((waiting) => waiting !== settle)
		if (left.length > 0) this.waiting.set(k, left)
		else this.waiting.delete(k)
	}
}

function key(recipientId: string, senderId: string): string {
	return `${recipientId}<-${senderId}`
}

export const replies = new Replies()
