import type { PolicyDefinition } from "@jigjoy/mozaik-rule-engine"

/**
 * How the reviewer and the tester react to what arrives: a direct message, from a Claude Code
 * session or anyone else, starts a Loop whose answer goes back to the sender. A message to
 * everyone matches no rule.
 */
export const agentPolicy: PolicyDefinition = {
	rules: [
		{ condition: "direct-message", inputResolver: "message", command: "answer-with-loop" },
		{ condition: "membership-change", inputResolver: "envelope", command: "update-roster" },
		{ condition: "refusal", inputResolver: "envelope", command: "report-refusal" },
	],
}
