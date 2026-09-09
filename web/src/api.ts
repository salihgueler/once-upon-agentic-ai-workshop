import type { CharacterStats, DiceRoll, StoryOutput } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseRolls(value: unknown): DiceRoll[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) =>
    isRecord(entry) &&
    typeof entry["dice_type"] === "string" &&
    typeof entry["result"] === "number" &&
    typeof entry["reason"] === "string"
      ? [{ dice_type: entry["dice_type"], result: entry["result"], reason: entry["reason"] }]
      : [],
  );
}

function parseStory(value: unknown): StoryOutput {
  if (!isRecord(value) || typeof value["response"] !== "string") {
    throw new Error("The Game Master returned an invalid response.");
  }
  return {
    response: value["response"],
    action_suggestions: Array.isArray(value["action_suggestions"])
      ? value["action_suggestions"].filter((item): item is string => typeof item === "string")
      : [],
    details: typeof value["details"] === "string" ? value["details"] : "",
    dice_rolls: parseRolls(value["dice_rolls"]),
  };
}

export async function sendInquiry(question: string): Promise<StoryOutput> {
  const response = await fetch("/api/inquire", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!response.ok) throw new Error(`Request failed: ${String(response.status)}`);
  return parseStory((await response.json()) as unknown);
}

export async function fetchUser(userName: string): Promise<CharacterStats> {
  const response = await fetch(`/api/user/${encodeURIComponent(userName)}`);
  if (!response.ok) throw new Error(`Request failed: ${String(response.status)}`);
  return (await response.json()) as CharacterStats;
}
