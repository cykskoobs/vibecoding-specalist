import { useState } from "react";
import { useAppData } from "../context/AppDataContext";

export function SettingsPage(): JSX.Element {
  const { settings, saveSettings } = useAppData();
  const [draft, setDraft] = useState(settings);

  async function onSave(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await saveSettings(draft);
  }

  return (
    <section className="stack">
      <h2>Settings</h2>
      <article className="card">
        <h3>Tracking Preferences</h3>
        <form className="stack" onSubmit={onSave}>
          <div className="row">
            <label>
              Unit System
              <select value={draft.unitSystem} onChange={(event) => setDraft((current) => ({ ...current, unitSystem: event.target.value as "kg" | "lb" }))}>
                <option value="kg">kg</option>
                <option value="lb">lb</option>
              </select>
            </label>
            <label>
              Week Start Day
              <select
                value={draft.weekStartDay}
                onChange={(event) => setDraft((current) => ({ ...current, weekStartDay: event.target.value as "monday" | "sunday" }))}
              >
                <option value="monday">Monday</option>
                <option value="sunday">Sunday</option>
              </select>
            </label>
          </div>
          <h4>Diet Adherence Thresholds</h4>
          <div className="row">
            <label>
              On-track kcal delta
              <input
                type="number"
                value={draft.onTrackCalorieDelta}
                onChange={(event) => setDraft((current) => ({ ...current, onTrackCalorieDelta: Number(event.target.value) }))}
              />
            </label>
            <label>
              Near-target kcal delta
              <input
                type="number"
                value={draft.nearTrackCalorieDelta}
                onChange={(event) => setDraft((current) => ({ ...current, nearTrackCalorieDelta: Number(event.target.value) }))}
              />
            </label>
          </div>
          <div className="row">
            <label>
              On-track protein delta (g)
              <input
                type="number"
                value={draft.onTrackProteinDelta}
                onChange={(event) => setDraft((current) => ({ ...current, onTrackProteinDelta: Number(event.target.value) }))}
              />
            </label>
            <label>
              Near-target protein delta (g)
              <input
                type="number"
                value={draft.nearTrackProteinDelta}
                onChange={(event) => setDraft((current) => ({ ...current, nearTrackProteinDelta: Number(event.target.value) }))}
              />
            </label>
          </div>
          <button type="submit">Save Settings</button>
        </form>
      </article>
    </section>
  );
}
