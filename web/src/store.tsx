import { useCallback, useMemo, useState, type ReactNode } from "react";
import { GameContext } from "./game-context";
import type { StoryOutput } from "./types";

export function GameProvider({ children }: { children: ReactNode }) {
  const [characterName, setCharacterName] = useState("");
  const [initialResponse, setInitialResponse] = useState<StoryOutput | null>(null);

  const setGame = useCallback((name: string, initial: StoryOutput) => {
    setCharacterName(name);
    setInitialResponse(initial);
  }, []);
  const reset = useCallback(() => {
    setCharacterName("");
    setInitialResponse(null);
  }, []);
  const value = useMemo(
    () => ({ characterName, initialResponse, setGame, reset }),
    [characterName, initialResponse, setGame, reset],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
