/** Pure dice logic, shared by the MCP tool. No I/O here so it is easy to test. */

export interface RollResult {
  rolls: number[];
  total: number;
  faces: number;
  count: number;
}

/**
 * Roll `count` dice each with `faces` sides.
 * @throws if faces or count are below 1.
 */
export function rollDice(faces: number, count: number): RollResult {
  if (faces < 1) throw new Error("A die must have at least 1 face");
  if (count < 1) throw new Error("Must roll at least 1 die");

  const rolls = Array.from(
    { length: count },
    () => Math.floor(Math.random() * faces) + 1,
  );
  const total = rolls.reduce((sum, roll) => sum + roll, 0);
  return { rolls, total, faces, count };
}
