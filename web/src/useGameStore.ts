import { useContext } from "react";
import { GameContext, type GameState } from "./game-context";

export function useGameStore(): GameState {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGameStore must be inside GameProvider");
  return context;
}
