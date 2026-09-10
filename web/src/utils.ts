import type { CharacterForm, ValidationErrors } from "./types";

export function validateForm(form: CharacterForm): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!form.name.trim()) errors.name = "Character name is required";
  if (!form.gender) errors.gender = "Gender is required";
  if (!form.race) errors.race = "Race is required";
  if (!form.characterClass) errors.characterClass = "Class is required";
  return errors;
}

export function formatInitPrompt(form: CharacterForm): string {
  return `Create a new player named ${form.name} who is a ${form.gender} ${form.race} ${form.characterClass}. Welcome them, describe their surroundings, and create an atmosphere they can respond to. Keep the response under 100 words.`;
}

export const GENDERS = ["Male", "Female", "Non-binary"];
export const RACES = [
  "Human", "Elf", "Dwarf", "Halfling", "Gnome", "Half-Elf",
  "Half-Orc", "Tiefling", "Dragonborn",
];
export const CLASSES = [
  "Barbarian", "Bard", "Cleric", "Druid", "Fighter", "Monk",
  "Paladin", "Ranger", "Rogue", "Sorcerer", "Warlock", "Wizard",
];
