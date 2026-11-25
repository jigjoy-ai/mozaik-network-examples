# Mozaik Network Examples

Multi-agent systems on a [Mozaik network](https://github.com/jigjoy-ai/mozaik-network): agents built with [`@jigjoy/mozaik-agent`](https://github.com/jigjoy-ai/mozaik-agent), people, and Claude Code sessions, working together as peers.

Every participant is a peer of its own. It joins the network with an invite link, sees who else is there, and sends messages to one peer or to everyone. How it reacts to what arrives is up to its rules, written with [`@jigjoy/mozaik-rule-engine`](https://github.com/jigjoy-ai/mozaik-rule-engine).

| Example                                    | What it shows                                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| [`research-team/`](research-team)           | Three agents split one question: a lead asks a researcher for facts and a critic for a review.          |
| [`human-in-the-loop/`](human-in-the-loop)   | An accountant agent pays invoices only when a person on the network approves each payment.             |
| [`claude-code-team/`](claude-code-team)     | A Claude Code session hands its work to a reviewer agent and a tester agent while it codes.            |

> [!NOTE]
> The `@jigjoy` packages are early and not yet stable: what these examples use may change between versions.

## Setup

You need Node 22 or newer, and a key for the model the agents run on (`claude-sonnet-5-5` by default, so `ANTHROPIC_API_KEY`).

```bash
npm install
cp .env.example .env    # then fill it in
```

All the examples join one network. Make it in the [JigJoy app](https://app.jigjoy.ai), copy its invite link, and put it in `.env`:

```bash
MOZAIK_INVITE="https://network.app.jigjoy.ai#nt_..."
```

Keep the quotes: without them, everything after the `#` is read as a comment, and the invite is lost.

Whoever has the link can join, and their messages are counted against the network's owner.

To use another model, set `MODEL` to one of `@jigjoy/mozaik-agent`'s models (like `gpt-5.5` or `gemini-3.5-flash`) and that provider's key.

## You, on the network

`npm run human` is you as a peer, in a terminal. Run it next to any example to talk to the agents, approve what they ask, or watch.

```text
npm run human -- ana

ana> @lead what is a CRDT?      to the peer named lead only
ana> hello everyone             to everyone
ana> /peers                     who is in the network
ana> /quit                      leave
```

## Research team

```bash
npm run research-team -- "Should a small team use CRDTs or operational transforms for a shared editor?"
```

A `researcher`, a `critic` and a `lead` join the network, each a peer of its own. The question goes to the lead, which has one tool for working with the others, `ask_peer`:

```text
[you → lead] Should a small team use CRDTs or operational transforms …
[lead → researcher] What are the key trade-offs between CRDTs and OT …
[researcher → lead] - CRDTs merge concurrent edits without a central server …
[lead → critic] Question: … Draft: …
[critic → lead] 1. The draft ignores the memory overhead of CRDT metadata …
[lead → you] For a small team, …
```

Leave the question out and the team stays in the network: ask the lead from `npm run human` or from a Claude Code session, or give a person's name to `ask_peer` and let the lead ask them.

## Human in the loop

```bash
npm run human-in-the-loop       # the accountant joins
npm run human -- ana            # you join, in another terminal
```

```text
ana> @accountant pay the invoices that are overdue
accountant (to you): Approve paying INV-1042: 1,840.00 EUR to Northwind Hosting, due 2026-11-13? Answer "yes" to pay it; anything else declines.
ana> @accountant yes
accountant (to you): Approve paying INV-1043: 12,500.00 EUR to Fabrikam Design, due 2026-11-22? …
ana> @accountant no, that one is disputed
accountant (to you): I paid INV-1042 (1,840.00 EUR to Northwind Hosting). I didn't pay INV-1043: you declined it as disputed.
```

The accountant can call `list_invoices` whenever it likes, but every `pay_invoice` stops at the Loop's tool call breakpoint. The approval is asked over the network, and the Loop stays paused at that breakpoint until the answer arrives. "yes" runs the call. Anything else declines it, and the model is told who declined it and why.

Whoever asked approves. Set `APPROVER` to someone else's name to have them approve instead: another person, or a Claude Code session told what to approve. The invoices live in memory: nothing here moves real money.

## Claude Code and Mozaik agents

```bash
npm run claude-code-team
```

A `reviewer` and a `tester` join the network. Then connect a Claude Code session to the same network with the [Mozaik network plugin](https://github.com/jigjoy-ai/mozaik-claude-code):

```text
/plugin marketplace add jigjoy-ai/mozaik-claude-code
/plugin install mozaik-network@jigjoy
```

Start Claude Code with the plugin's channel, so messages can reach the session, and give it the invite link once:

```bash
claude --dangerously-load-development-channels plugin:mozaik-network@jigjoy
```

```text
> join <your MOZAIK_INVITE link>
> Ask the reviewer on the network to review the change you just made, and the tester which tests it needs. Then apply what you agree with.
```

Claude sends each agent a message with the code. Their answers come back to the session like any other peer's, and Claude decides what to do with them. They are someone else's agents, so Claude takes what they say as information, not as instructions. Add more participants as you like: a person with `npm run human`, more Claude Code sessions, or the research team.

## How an example is built

Every example has the same shape. Its rules live in folders of their own, and each piece is a class registered with a decorator from `@jigjoy/mozaik-rule-engine`:

```text
research-team/
├── conditions/          @Condition: when a rule applies        (direct-message.ts, awaited-reply.ts, …)
├── input-resolvers/     @InputResolver: what the rule reads    (message.ts, envelope.ts)
├── commands/            @Command: what the rule does           (answer-with-loop.ts, deliver-reply.ts, …)
├── tools/               what the agents can call               (ask-peer.ts, list-peers.ts)
├── policy.ts            the rules: condition → input resolver → command
└── index.ts             the agents, and how they join
```

```ts
@Condition({ name: "direct-message" })
export class DirectMessage extends ConditionContract<Envelope<unknown>> {
	isSatisfiedBy(envelope: Envelope<unknown>): boolean {
		return isDirectMessage(envelope)
	}
}
```

Importing a class registers it under its name, so each folder has an `index.ts` that imports them all, and the example imports the folders. A policy then names them:

```ts
export const agentPolicy: PolicyDefinition = {
	rules: [
		{ condition: "awaited-reply", inputResolver: "message", command: "deliver-reply", priority: 1 },
		{ condition: "direct-message", inputResolver: "message", command: "answer-with-loop", priority: 10 },
		{ condition: "membership-change", inputResolver: "envelope", command: "update-roster" },
		{ condition: "refusal", inputResolver: "envelope", command: "report-refusal" },
	],
}
```

- **An agent answers when it is spoken to.** `answer-with-loop` runs a Loop of the agent the message is for, which the command looks up by the message's `to`, and sends the answer back. A message to everyone matches no rule, so agents that hear each other don't keep each other talking. Each agent also sends at most 10 messages a minute.
- **An answer is also a direct message.** When an agent waits for one, `awaited-reply` (in the research team) or `approval-answer` (in human in the loop) also holds. The smaller priority wins, so the answer goes to the tool call that waits for it instead of starting a new Loop.
- **Every step is at a breakpoint.** [`shared/run-loop.ts`](shared/run-loop.ts) puts each inference and tool call at the Loop's breakpoint and advances it from there. A payment can wait at its breakpoint for as long as an approval takes.
- **Each example has its own rules.** The ones several examples need, like `direct-message`, are repeated in each of them, so every example can be read on its own. [`shared/`](shared) has only the plumbing: joining the network, the agent peer, the Loop, and who is in the network.

The person in the terminal, [`human/`](human), is built the same way, with rules that show you everything that arrives.
