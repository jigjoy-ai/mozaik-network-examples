import type { PolicyDefinition } from "@jigjoy/mozaik-rule-engine"

/**
 * How the accountant reacts to what arrives. The answer to an approval is also a direct message:
 * the smaller priority wins, so it goes to the payment that waits for it instead of starting a Loop.
 */
export const accountantPolicy: PolicyDefinition = {
	rules: [
		{ condition: "approval-answer", inputResolver: "approval-decision", command: "decide-approval", priority: 1 },
		{ condition: "direct-message", inputResolver: "message", command: "answer-with-loop", priority: 10 },
		{ condition: "membership-change", inputResolver: "envelope", command: "update-roster" },
		{ condition: "refusal", inputResolver: "envelope", command: "report-refusal" },
	],
}
