import { z } from "zod";

/**
 * The shape the Game Master must return. Passing this to the agent as
 * `structuredOutputSchema` makes the SDK validate the model's output against it
 * and hand back a typed object on `result.structuredOutput` — no JSON parsing,
 * no markdown-fence stripping, no regex.
 */
export const diceRollSchema = z.object({
  dice_type: z.string().describe("The die used, e.g. 'd20'"),
  result: z.number().describe("The rolled total"),
  reason: z.string().describe("Why the roll was made, e.g. 'attack roll'"),
});

export const gameMasterSchema = z.object({
  response: z.string().describe("The narrative response, in the Game Master's voice"),
  action_suggestions: z
    .array(z.string())
    .describe("A few next actions the player could take"),
  details: z.string().describe("Brief summary of which tools or agents were used"),
  dice_rolls: z
    .array(diceRollSchema)
    .describe("Every dice roll performed while answering"),
});

/** Typed view of a validated Game Master response. */
export type GameMasterResponse = z.infer<typeof gameMasterSchema>;
