import { useMemo, useState } from "react";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function CalculatorsPage(): JSX.Element {
  const [weightKg, setWeightKg] = useState(78);
  const [heightCm, setHeightCm] = useState(178);
  const [age, setAge] = useState(27);
  const [sex, setSex] = useState<"male" | "female">("male");
  const [activityFactor, setActivityFactor] = useState(1.55);
  const [liftWeight, setLiftWeight] = useState(70);
  const [liftReps, setLiftReps] = useState(8);

  const bmi = useMemo(() => {
    const meters = heightCm / 100;
    return Number((weightKg / (meters * meters)).toFixed(1));
  }, [weightKg, heightCm]);

  const bmr = useMemo(() => {
    const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
    return Math.round(base + (sex === "male" ? 5 : -161));
  }, [weightKg, heightCm, age, sex]);

  const tdee = useMemo(() => Math.round(bmr * activityFactor), [bmr, activityFactor]);

  const oneRepMax = useMemo(() => Math.round(liftWeight * (1 + liftReps / 30)), [liftWeight, liftReps]);

  const hydrationLiters = useMemo(() => Number((weightKg * 0.035).toFixed(2)), [weightKg]);

  const bmiLabel = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Healthy" : bmi < 30 ? "Overweight" : "Obese";

  return (
    <section className="stack">
      <h2>Calculators</h2>
      <p className="muted">Use these to tune your plan before logging training and nutrition.</p>

      <article className="card interactive-lift">
        <h3>Body Metrics</h3>
        <div className="row">
          <label>
            Weight (kg)
            <input type="number" min="35" max="220" value={weightKg} onChange={(event) => setWeightKg(clamp(Number(event.target.value), 35, 220))} />
          </label>
          <label>
            Height (cm)
            <input type="number" min="130" max="230" value={heightCm} onChange={(event) => setHeightCm(clamp(Number(event.target.value), 130, 230))} />
          </label>
          <label>
            Age
            <input type="number" min="14" max="90" value={age} onChange={(event) => setAge(clamp(Number(event.target.value), 14, 90))} />
          </label>
          <label>
            Sex
            <select value={sex} onChange={(event) => setSex(event.target.value as "male" | "female")}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>
        </div>
        <div className="metric-grid">
          <div>
            <p className="metric-label">BMI</p>
            <p className="metric-value">{bmi}</p>
            <p className="muted">{bmiLabel}</p>
          </div>
          <div>
            <p className="metric-label">BMR</p>
            <p className="metric-value">{bmr} kcal</p>
            <p className="muted">Basal calories/day</p>
          </div>
          <div>
            <p className="metric-label">Hydration</p>
            <p className="metric-value">{hydrationLiters} L</p>
            <p className="muted">Daily water estimate</p>
          </div>
        </div>
      </article>

      <article className="card interactive-lift">
        <h3>Calorie Planner</h3>
        <label>
          Activity Level
          <input
            type="range"
            min="1.2"
            max="1.9"
            step="0.05"
            value={activityFactor}
            onChange={(event) => setActivityFactor(Number(event.target.value))}
          />
        </label>
        <p>Activity factor: {activityFactor.toFixed(2)}</p>
        <div className="metric-grid">
          <div>
            <p className="metric-label">Maintenance</p>
            <p className="metric-value">{tdee} kcal</p>
          </div>
          <div>
            <p className="metric-label">Lean Bulk</p>
            <p className="metric-value">{tdee + 250} kcal</p>
          </div>
          <div>
            <p className="metric-label">Cut</p>
            <p className="metric-value">{Math.max(1200, tdee - 400)} kcal</p>
          </div>
        </div>
      </article>

      <article className="card interactive-lift">
        <h3>1RM Strength Estimator</h3>
        <div className="row">
          <label>
            Working Weight (kg)
            <input type="number" min="5" max="500" value={liftWeight} onChange={(event) => setLiftWeight(clamp(Number(event.target.value), 5, 500))} />
          </label>
          <label>
            Reps Performed
            <input type="number" min="1" max="20" value={liftReps} onChange={(event) => setLiftReps(clamp(Number(event.target.value), 1, 20))} />
          </label>
        </div>
        <div className="metric-grid">
          <div>
            <p className="metric-label">Estimated 1RM</p>
            <p className="metric-value">{oneRepMax} kg</p>
          </div>
          <div>
            <p className="metric-label">85% Working Set</p>
            <p className="metric-value">{Math.round(oneRepMax * 0.85)} kg</p>
          </div>
          <div>
            <p className="metric-label">70% Volume Set</p>
            <p className="metric-value">{Math.round(oneRepMax * 0.7)} kg</p>
          </div>
        </div>
      </article>
    </section>
  );
}
