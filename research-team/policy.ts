import type { PolicyDefinition } from "@jigjoy/mozaik-rule-engine"

/**
 * How an agent of the team reacts to what arrives. An awaited reply is also a direct message: the
 * smaller priority wins, so it goes to the ask_peer call that waits for it instead of starting a Loop.
 * A message to everyone matches no rule, so agents that hear each other don't keep each other talking.
 */
export const agentPolicy: PolicyDefinition = {
	rules: [
		{ condition: "awaited-reply", inputResolver: "message", command: "deliver-reply", priority: 1 },
		{ condition: "direct-message", inputResolver: "message", command: "answer-with-loop", priority: 10 },
		{ condition: "membership-change", inputResolver: "envelope", command: "update-roster" },
		{ condition: "refusal", inputResolver: "envelope", command: "report-refusal" },
	],
}

/** The one who asks the question from the command line only waits for its answer. */
export const visitorPolicy: PolicyDefinition = {
	rules: [
		{ condition: "awaited-reply", inputResolver: "message", command: "deliver-reply" },
		{ condition: "membership-change", inputResolver: "envelope", command: "update-roster" },
	],
}
