import { createInterface } from "node:readline"

/** The terminal of the person on the network: what arrives is printed above what they are typing. */
class Terminal {
	private readonly lines = createInterface({ input: process.stdin, output: process.stdout })

	/** The peer id of the person, so they aren't told that they joined. */
	selfId = ""

	start(name: string, onLine: (line: string) => void, onClose: () => void): void {
		this.lines.setPrompt(`${name}> `)
		this.lines.on("line", (line) => onLine(line.trim()))
		this.lines.on("close", onClose)
		this.lines.prompt()
	}

	print(line: string): void {
		process.stdout.write(`\r\x1b[2K${line}\n`)
		this.lines.prompt(true)
	}

	dim(line: string): void {
		this.print(`\x1b[2m${line}\x1b[0m`)
	}

	prompt(): void {
		this.lines.prompt()
	}

	close(): void {
		this.lines.close()
	}
}

export const terminal = new Terminal()
