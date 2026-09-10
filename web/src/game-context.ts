import { createContext } from "react";
import type { StoryOutput } from "./types";

export interface GameState {
  characterName: string;
  initialResponse: StoryOutput | null;
  setGame: (name: string, initial: StoryOutput) => void;
  reset: () => void;
}

export const GameContext = createContext<GameState | null>(null);
