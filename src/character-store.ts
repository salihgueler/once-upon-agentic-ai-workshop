import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "characters.json");

export interface Stats {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface InventoryItem {
  item_name: string;
  quantity: number;
}

export interface Character {
  character_id: string;
  name: string;
  character_class: string;
  race: string;
  gender: string;
  level: number;
  experience: number;
  stats: Stats;
  inventory: InventoryItem[];
  created_at: string;
}

interface CharactersDB {
  characters: Record<string, Character>;
}

function readDB(): CharactersDB {
  if (!fs.existsSync(DB_PATH)) return { characters: {} };
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8")) as CharactersDB;
}

function writeDB(db: CharactersDB): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

export function listCharacters(): Character[] {
  return Object.values(readDB().characters);
}

export function findCharacter(name: string): Character | undefined {
  return listCharacters().find((c) => c.name.toLowerCase() === name.toLowerCase());
}

export interface NewCharacter {
  name: string;
  character_class: string;
  race: string;
  gender: string;
  stats: Stats;
}

export function saveCharacter(input: NewCharacter): Character {
  const character: Character = {
    character_id: randomUUID(),
    ...input,
    level: 1,
    experience: 0,
    inventory: [
      { item_name: "Starting Equipment Pack", quantity: 1 },
      { item_name: "Gold Pieces", quantity: 100 },
    ],
    created_at: new Date().toISOString(),
  };
  const db = readDB();
  db.characters[character.character_id] = character;
  writeDB(db);
  return character;
}
