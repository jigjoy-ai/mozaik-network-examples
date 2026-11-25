import type { PolicyDefinition } from "@jigjoy/mozaik-rule-engine"

/** A person sees everything: what is said to them and to everyone, and who comes and goes. */
export const humanPolicy: PolicyDefinition = {
	rules: [
		{ condition: "direct-message", inputResolver: "message", command: "show-message" },
		{ condition: "public-message", inputResolver: "message", command: "show-message" },
		{ condition: "welcome", inputResolver: "envelope", command: "show-welcome" },
		{ condition: "someone-joined-or-left", inputResolver: "envelope", command: "show-membership" },
		{ condition: "refusal", inputResolver: "envelope", command: "show-refusal" },
	],
}
