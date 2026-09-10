/**
 * A tiny, self-contained slice of D&D 5e Basic Rules.
 *
 * This keeps the workshop runnable with zero downloads or vector databases.
 * Each entry is a keyword-tagged snippet with a page reference. If you want to
 * graduate to real retrieval, swap `lookupRule` for a LanceDB vector search —
 * the Rules Agent only depends on the function signature, not the data source.
 */

export interface Rule {
  topic: string;
  page: number;
  text: string;
  keywords: string[];
}

export const RULES: Rule[] = [
  {
    topic: "Ability Checks",
    page: 58,
    text: "To make an ability check, roll a d20 and add the relevant ability modifier. Compare the total to the Difficulty Class (DC). Meeting or exceeding the DC succeeds.",
    keywords: ["ability", "check", "dexterity", "strength", "dc", "d20", "modifier"],
  },
  {
    topic: "Saving Throws",
    page: 59,
    text: "A saving throw is a d20 roll plus the relevant ability modifier, made to resist a threat such as a spell, trap, or poison, against a DC set by the effect.",
    keywords: ["saving", "throw", "save", "resist", "spell", "poison"],
  },
  {
    topic: "Attack Rolls",
    page: 73,
    text: "To attack, roll a d20 and add your attack modifier. If the total meets or exceeds the target's Armor Class (AC), the attack hits and you roll damage.",
    keywords: ["attack", "roll", "hit", "armor", "class", "ac", "damage"],
  },
  {
    topic: "Advantage & Disadvantage",
    page: 57,
    text: "With advantage, roll two d20s and take the higher. With disadvantage, take the lower. They do not stack; you have one or the other, never multiple.",
    keywords: ["advantage", "disadvantage", "two", "d20", "higher", "lower"],
  },
  {
    topic: "Initiative",
    page: 73,
    text: "At the start of combat, every combatant rolls a Dexterity check for initiative. The DM orders turns from highest to lowest total.",
    keywords: ["initiative", "combat", "turn", "order", "dexterity"],
  },
  {
    topic: "Ability Score Generation",
    page: 12,
    text: "To generate ability scores, roll four d6, drop the lowest die, and total the remaining three. Do this six times, then assign the totals to your abilities.",
    keywords: ["ability", "score", "generate", "4d6", "drop", "lowest", "stats"],
  },
];

/** Score-and-rank the local rules by keyword overlap with the query. */
export function lookupRule(query: string): Rule | null {
  const words = query.toLowerCase().split(/\W+/).filter(Boolean);
  let best: Rule | null = null;
  let bestScore = 0;

  for (const rule of RULES) {
    const score = rule.keywords.reduce(
      (acc, kw) => acc + (words.includes(kw) ? 1 : 0),
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      best = rule;
    }
  }
  return bestScore > 0 ? best : null;
}
