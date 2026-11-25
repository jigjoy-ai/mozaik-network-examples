/**
 * Callers waiting for something that arrives later as a message: an answer, an approval. A command
 * settles what a rule's condition saw was awaited. Whoever waits first gets the first one.
 */
export class Waiting<T> {
	private readonly queues = new Map<string, Array<(value: T) => void>>()

	has(key: string): boolean {
		return (this.queues.get(key)?.length ?? 0) > 0
	}

	/** Start waiting before sending the question, so an answer that comes quickly isn't missed. */
	wait(key: string, timeoutMs: number): { promise: Promise<T>; cancel(): void } {
		let settle!: (value: T) => void
		let timer!: ReturnType<typeof setTimeout>

		const promise = new Promise<T>((resolve, reject) => {
			settle = (value) => {
				clearTimeout(timer)
				resolve(value)
			}
			timer = setTimeout(() => {
				this.drop(key, settle)
				reject(new Error(`no answer within ${Math.round(timeoutMs / 1000)}s`))
			}, timeoutMs)
		})
		this.queues.set(key, [...(this.queues.get(key) ?? []), settle])

		const cancel = () => {
			clearTimeout(timer)
			this.drop(key, settle)
		}
		return { promise, cancel }
	}

	settle(key: string, value: T): void {
		const [first] = this.queues.get(key) ?? []
		if (!first) return

		this.drop(key, first)
		first(value)
	}

	private drop(key: string, waiter: (value: T) => void): void {
		const left = (this.queues.get(key) ?? []).filter((queued) => queued !== waiter)
		if (left.length > 0) this.queues.set(key, left)
		else this.queues.delete(key)
	}
}

/** What `recipientId` waits for from `senderId`. */
export function fromTo(senderId: string, recipientId: string): string {
	return `${senderId}->${recipientId}`
}
