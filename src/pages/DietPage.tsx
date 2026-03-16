import { useEffect, useMemo, useState } from "react";
import { useAppData } from "../context/AppDataContext";
import { classifyDietAdherence } from "../lib/calculations";
import { todayISO } from "../lib/date";

export function DietPage(): JSX.Element {
  const { dietDays, settings, saveDietDay } = useAppData();
  const [date, setDate] = useState(todayISO());

  const existing = useMemo(() => dietDays.find((day) => day.date === date), [dietDays, date]);
  const [calorieTarget, setCalorieTarget] = useState(2300);
  const [proteinTarget, setProteinTarget] = useState(150);
  const [caloriesActual, setCaloriesActual] = useState(0);
  const [proteinActual, setProteinActual] = useState(0);
  const [mealNotes, setMealNotes] = useState("");

  useEffect(() => {
    setCalorieTarget(existing?.calorieTarget ?? 2300);
    setProteinTarget(existing?.proteinTarget ?? 150);
    setCaloriesActual(existing?.caloriesActual ?? 0);
    setProteinActual(existing?.proteinActual ?? 0);
    setMealNotes(existing?.mealNotes ?? "");
  }, [existing]);

  async function onSave(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    await saveDietDay({
      date,
      calorieTarget,
      proteinTarget,
      caloriesActual,
      proteinActual,
      mealNotes
    });
  }

  return (
    <section className="stack">
      <h2>Diet</h2>
      <article className="card">
        <h3>Daily Macro Targets + Notes</h3>
        <form className="stack" onSubmit={onSave}>
          <label>
            Date
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <div className="row">
            <label>
              Calorie Target
              <input type="number" value={calorieTarget} onChange={(event) => setCalorieTarget(Number(event.target.value))} />
            </label>
            <label>
              Protein Target (g)
              <input type="number" value={proteinTarget} onChange={(event) => setProteinTarget(Number(event.target.value))} />
            </label>
          </div>
          <div className="row">
            <label>
              Calories Actual
              <input type="number" value={caloriesActual} onChange={(event) => setCaloriesActual(Number(event.target.value))} />
            </label>
            <label>
              Protein Actual (g)
              <input type="number" value={proteinActual} onChange={(event) => setProteinActual(Number(event.target.value))} />
            </label>
          </div>
          <label>
            Meal Notes
            <textarea value={mealNotes} onChange={(event) => setMealNotes(event.target.value)} placeholder="Meals, cravings, wins, adjustments" />
          </label>
          <button type="submit">Save Diet Day</button>
        </form>
        {existing ? <p className="muted">Current status: {classifyDietAdherence(existing, settings)}</p> : null}
      </article>
    </section>
  );
}
