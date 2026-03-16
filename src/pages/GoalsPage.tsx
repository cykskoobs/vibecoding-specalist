import { useMemo, useState } from "react";
import { useAppData } from "../context/AppDataContext";
import { goalProgress, rollingAverageWeight } from "../lib/calculations";
import { todayISO } from "../lib/date";
import type { GoalType } from "../types";

export function GoalsPage(): JSX.Element {
  const { goals, exercises, workoutEntries, bodyweightLogs, activeWeekPlan, weekTemplates, saveGoal, completeGoal, removeGoal, addBodyweightLog, settings } = useAppData();
  const [type, setType] = useState<GoalType>("strength");
  const [targetValue, setTargetValue] = useState(100);
  const [targetDate, setTargetDate] = useState(todayISO());
  const [exerciseId, setExerciseId] = useState("");
  const [label, setLabel] = useState("New goal");
  const [bodyweight, setBodyweight] = useState("");
  const [bodyweightDate, setBodyweightDate] = useState(todayISO());

  const template = weekTemplates.find((item) => item.id === activeWeekPlan?.templateId);
  const plannedDays = template?.days.length ?? 0;
  const completedDays = activeWeekPlan?.completedDays.length ?? 0;

  const rollingAverage = useMemo(() => rollingAverageWeight(bodyweightLogs), [bodyweightLogs]);

  async function onSaveGoal(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await saveGoal({
      type,
      targetValue,
      targetDate,
      exerciseId: type === "strength" ? exerciseId : undefined,
      label
    });
  }

  async function onAddBodyweight(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!bodyweight) {
      return;
    }

    await addBodyweightLog(bodyweightDate, Number(bodyweight));
    setBodyweight("");
  }

  return (
    <section className="stack">
      <h2>Goals</h2>
      <article className="card">
        <h3>Create Goal</h3>
        <form className="stack" onSubmit={onSaveGoal}>
          <label>
            Goal label
            <input value={label} onChange={(event) => setLabel(event.target.value)} />
          </label>
          <div className="row">
            <label>
              Type
              <select value={type} onChange={(event) => setType(event.target.value as GoalType)}>
                <option value="strength">Strength</option>
                <option value="bodyweight">Bodyweight</option>
                <option value="consistency">Consistency</option>
              </select>
            </label>
            <label>
              Target value
              <input type="number" step="0.1" value={targetValue} onChange={(event) => setTargetValue(Number(event.target.value))} />
            </label>
            <label>
              Target date
              <input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
            </label>
          </div>
          {type === "strength" ? (
            <label>
              Exercise
              <select value={exerciseId} onChange={(event) => setExerciseId(event.target.value)}>
                <option value="">Select exercise</option>
                {exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button type="submit">Add Goal</button>
        </form>
      </article>

      <article className="card">
        <h3>Bodyweight Logs</h3>
        <form className="row" onSubmit={onAddBodyweight}>
          <input type="date" value={bodyweightDate} onChange={(event) => setBodyweightDate(event.target.value)} />
          <input
            type="number"
            step="0.1"
            value={bodyweight}
            onChange={(event) => setBodyweight(event.target.value)}
            placeholder={`Weight (${settings.unitSystem})`}
          />
          <button type="submit">Add</button>
        </form>
        <p className="muted">Rolling 7-day average: {rollingAverage ? `${rollingAverage} ${settings.unitSystem}` : "No data"}</p>
      </article>

      <article className="card">
        <h3>Goal Progress</h3>
        <ul className="list">
          {goals.map((goal) => (
            <li key={goal.id}>
              <div className="row spread">
                <span>
                  <strong>{goal.label}</strong> ({goal.type}) - {goal.status}
                </span>
                <span>{goalProgress(goal, workoutEntries, bodyweightLogs, plannedDays, completedDays)}%</span>
              </div>
              <div className="row">
                {goal.status === "active" ? (
                  <button type="button" onClick={() => completeGoal(goal.id)}>
                    Mark complete
                  </button>
                ) : null}
                <button type="button" onClick={() => removeGoal(goal.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
