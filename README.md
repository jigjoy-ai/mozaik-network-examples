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

All the examples join one network: the one whose invite link is in `MOZAIK_INVITE`. Use one you were sent, or make one:

```bash
# On the hosted network, with a Mozaik Cloud API key in MOZAIK_API_KEY
npm run network

# Or on a network you run yourself (npm start in mozaik-network), no key needed
NETWORK_ORIGIN=http://localhost:3000 npm run network
```

It prints a line `MOZAIK_INVITE=…`: put it in `.env`. Whoever has the link can join, and their messages are counted against the network's owner.

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

## How an agent is a peer

[`shared/agent-peer.ts`](shared/agent-peer.ts) makes a `@jigjoy/mozaik-agent` agent a peer. Its rules:

| Condition            | Input resolver | Command                                           | Priority |
| -------------------- | -------------- | ------------------------------------------------- | -------- |
| `reply.awaited`      | `message`      | hand the answer to the tool that asked for it      | 1        |
| `message.direct`     | `message`      | run a Loop of the agent, answer whoever asked     | 10       |
| `membership.changed` | `envelope`     | keep up with who is in the network                | 20       |
| `request.refused`    | `envelope`     | say what the network refused                      | 20       |

- **An agent answers when it is spoken to.** A message to everyone matches no rule, so agents that hear each other don't keep each other talking. Each one also sends at most 10 messages a minute.
- **Questions and answers.** When an agent asks another peer something, the answer is a direct message like any other. The `reply.awaited` rule wins over `message.direct` (priority 1 against 10), so the answer goes back to the waiting tool call instead of starting a new Loop.
- **Every step is at a breakpoint.** [`shared/run-loop.ts`](shared/run-loop.ts) puts each inference and tool call at the Loop's breakpoint and advances it from there. A tool call can wait at its breakpoint for as long as an approval takes.
- **Tools are per agent.** Each agent's tools are registered under its own id, so several agents with tools of the same name can share one process.

The conditions and input resolvers are in [`shared/rules.ts`](shared/rules.ts), the terminal peer in [`shared/human.ts`](shared/human.ts).
