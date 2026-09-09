import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { sendInquiry } from "../api";
import { useGameStore } from "../useGameStore";
import type { CharacterForm, ValidationErrors } from "../types";
import { CLASSES, formatInitPrompt, GENDERS, RACES, validateForm } from "../utils";
import "./NewGame.css";

export default function NewGame() {
  const navigate = useNavigate();
  const store = useGameStore();
  const [form, setForm] = useState<CharacterForm>({
    name: "",
    gender: "",
    race: "",
    characterClass: "",
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const update = (field: keyof CharacterForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setSubmitError(null);
    setLoading(true);
    const phases = [
      `⚒️ Forging ${form.name || "hero"}...`,
      `🛡️ ${form.race} ${form.characterClass} is spawning...`,
      "🌍 Building the realm...",
      "📜 The storyline unfolds...",
    ];
    let phaseIndex = 0;
    setLoadingPhase(phases[0] ?? "Forging your hero...");
    const interval = window.setInterval(() => {
      phaseIndex += 1;
      const phase = phases[phaseIndex];
      if (phase) setLoadingPhase(phase);
    }, 2500);

    try {
      const response = await sendInquiry(formatInitPrompt(form));
      window.clearInterval(interval);
      setLoadingPhase("✨ Your adventure begins!");
      store.setGame(form.name, response);
      await new Promise((resolve) => window.setTimeout(resolve, 600));
      await navigate(`/game/${encodeURIComponent(form.name)}`);
    } catch (error) {
      window.clearInterval(interval);
      setSubmitError(error instanceof Error ? error.message : "Failed to connect");
    } finally {
      setLoading(false);
    }
  }

  function field(
    id: string,
    label: string,
    key: keyof CharacterForm,
    options?: string[],
  ) {
    return (
      <div className="form-group">
        <label htmlFor={id} className="form-label">{label}</label>
        {options ? (
          <select
            id={id}
            className={`form-input${errors[key] ? " input-error" : ""}`}
            value={form[key]}
            onChange={(event) => { update(key, event.target.value); }}
          >
            <option value="" disabled>Choose {label.toLowerCase()}</option>
            {options.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        ) : (
          <input
            id={id}
            type="text"
            className={`form-input${errors[key] ? " input-error" : ""}`}
            placeholder={`Enter ${label.toLowerCase()}`}
            value={form[key]}
            onChange={(event) => { update(key, event.target.value); }}
          />
        )}
        {errors[key] ? <span className="field-error">{errors[key]}</span> : null}
      </div>
    );
  }

  return (
    <div className="new-game-view">
      <div className="form-card glass-card">
        <h1 className="form-title">⚔️ Forge Your Hero</h1>
        <p className="form-subtitle">Create a character and enter the realm</p>
        <form className="character-form" onSubmit={(event) => { void handleSubmit(event); }}>
          {submitError ? <div className="submit-error" role="alert">{submitError}</div> : null}
          {field("name", "Character Name", "name")}
          {field("gender", "Gender", "gender", GENDERS)}
          {field("race", "Race", "race", RACES)}
          {field("class", "Class", "characterClass", CLASSES)}
          <button type="submit" className="start-button" disabled={loading}>
            {loading ? loadingPhase : "Begin Adventure"}
          </button>
        </form>
      </div>
    </div>
  );
}
