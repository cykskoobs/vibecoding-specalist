import { useMemo, useState } from "react";
import { useAppData } from "../context/AppDataContext";
import { latestNormalLift, prLiftForExercise } from "../lib/calculations";
import { todayISO } from "../lib/date";
import type { WorkoutSessionType } from "../types";

const APPROVED_WORKOUTS = new Set([
  "Rear Deltoid Flies",
  "Front Raises",
  "Side Raises",
  "Shoulder Press",
  "Bicep Curls",
  "Tricep Pushdowns",
  "Chest Press",
  "Lat Pulldown",
  "Chest Flies",
  "Cable Rows",
  "Dips for Chest",
  "Pull Ups",
  "Leg Extensions",
  "Leg Press",
  "Squats",
  "Hamstring Curls",
  "Calf Raise",
  "Hammer Curls",
  "Incline Chest Press",
  "Lateral Raises",
  "Shrugs",
  "Barbell Row",
  "Back Extensions"
]);

const EXERCISE_GROUP_ORDER = [
  "Shoulders & Arms",
  "Chest & Back",
  "Legs",
  "Chest & Shoulders",
  "Back & Biceps"
] as const;

export function WorkoutsPage(): JSX.Element {
  const { exercises, workoutEntries, addWorkoutEntry, settings } = useAppData();
  const [date, setDate] = useState(todayISO());
  const [exerciseId, setExerciseId] = useState("");
  const [weight, setWeight] = useState("0");
  const [reps, setReps] = useState("10");
  const [sets, setSets] = useState("3");
  const [sessionType, setSessionType] = useState<WorkoutSessionType>("normal");
  const [notes, setNotes] = useState("");

  const allowedExercises = useMemo(
    () => exercises.filter((exercise) => APPROVED_WORKOUTS.has(exercise.name)),
    [exercises]
  );

  const groupedExercises = useMemo(() => {
    const grouped = EXERCISE_GROUP_ORDER.map((groupName) => ({
      groupName,
      items: allowedExercises.filter((exercise) => exercise.muscleGroup === groupName).sort((a, b) => a.name.localeCompare(b.name))
    }));
    return grouped.filter((group) => group.items.length > 0);
  }, [allowedExercises]);

  const selectedHistory = useMemo(
    () => workoutEntries.filter((entry) => entry.exerciseId === exerciseId).sort((a, b) => b.date.localeCompare(a.date)),
    [exerciseId, workoutEntries]
  );

  async function onLogWorkout(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!exerciseId) {
      return;
    }

    await addWorkoutEntry({
      date,
      exerciseId,
      weight: Number(weight),
      reps: Number(reps),
      sets: Number(sets),
      notes,
      sessionType
    });

    setNotes("");
  }

  return (
    <section className="stack">
      <h2>Workouts</h2>
      <p className="muted">Track each movement as a normal set or a PR/Max set. Only your approved workout list is selectable.</p>

      <article className="card">
        <h3>Log Workout Set</h3>
        <form className="stack" onSubmit={onLogWorkout}>
          <label>
            Date
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <label>
            Exercise
            <select value={exerciseId} onChange={(event) => setExerciseId(event.target.value)}>
              <option value="">Select exercise</option>
              {groupedExercises.map((group) => (
                <optgroup key={group.groupName} label={group.groupName}>
                  {group.items.map((exercise) => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <div className="row">
            <label>
              Set Type
              <select value={sessionType} onChange={(event) => setSessionType(event.target.value as WorkoutSessionType)}>
                <option value="normal">Normal</option>
                <option value="pr">PR / Max</option>
              </select>
            </label>
            <label>
              Weight ({settings.unitSystem})
              <input type="number" min="0" step="0.5" value={weight} onChange={(event) => setWeight(event.target.value)} />
            </label>
            <label>
              Reps
              <input type="number" min="1" value={reps} onChange={(event) => setReps(event.target.value)} />
            </label>
            <label>
              Sets
              <input type="number" min="1" value={sets} onChange={(event) => setSets(event.target.value)} />
            </label>
          </div>
          <label>
            Notes
            <input type="text" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="How did this feel?" />
          </label>
          <button type="submit">Save Entry</button>
        </form>
      </article>

      <article className="card">
        <h3>Current Weight + PR/Max Board</h3>
        <div className="stack">
          {groupedExercises.map((group) => (
            <div key={group.groupName} className="inner-card">
              <h4>{group.groupName}</h4>
              <div className="table-wrap">
                <table className="tracker-table">
                  <thead>
                    <tr>
                      <th>Exercise</th>
                      <th>Current (Normal)</th>
                      <th>MAX / PR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((exercise) => {
                      const normal = latestNormalLift(workoutEntries, exercise.id);
                      const pr = prLiftForExercise(workoutEntries, exercise.id);
                      return (
                        <tr key={exercise.id}>
                          <td>{exercise.name}</td>
                          <td>{normal ? `${normal.weight} ${settings.unitSystem} x ${normal.reps}` : "-"}</td>
                          <td>{pr ? `${pr.weight} ${settings.unitSystem} x ${pr.reps}` : "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="card">
        <h3>Selected Exercise History</h3>
        {exerciseId ? null : <p className="muted">Select an exercise to inspect recent entries.</p>}
        <ul className="list">
          {selectedHistory.slice(0, 12).map((entry) => (
            <li key={entry.id}>
              <strong>{entry.date}</strong> - {entry.weight} {settings.unitSystem} x {entry.reps} ({entry.sets} sets) [{entry.sessionType ?? "normal"}]
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
