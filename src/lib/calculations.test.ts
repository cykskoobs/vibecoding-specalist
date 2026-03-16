import { describe, expect, it } from "vitest";
import { bestLiftForExercise, classifyDietAdherence, goalProgress, rollingAverageWeight } from "./calculations";
import type { AppSettings, BodyweightLog, DietDay, Goal, WorkoutEntry } from "../types";

const settings: AppSettings = {
  id: "settings",
  unitSystem: "kg",
  weekStartDay: "monday",
  onTrackCalorieDelta: 100,
  nearTrackCalorieDelta: 250,
  onTrackProteinDelta: 10,
  nearTrackProteinDelta: 20
};

describe("classifyDietAdherence", () => {
  it("returns on track for close values", () => {
    const day: DietDay = {
      id: "2026-01-01",
      date: "2026-01-01",
      calorieTarget: 2200,
      proteinTarget: 150,
      caloriesActual: 2250,
      proteinActual: 156,
      mealNotes: ""
    };

    expect(classifyDietAdherence(day, settings)).toBe("on track");
  });

  it("returns near target before off target", () => {
    const day: DietDay = {
      id: "2026-01-02",
      date: "2026-01-02",
      calorieTarget: 2200,
      proteinTarget: 150,
      caloriesActual: 2430,
      proteinActual: 168,
      mealNotes: ""
    };

    expect(classifyDietAdherence(day, settings)).toBe("near target");
  });
});

describe("bestLiftForExercise", () => {
  it("applies weight then reps tie-break", () => {
    const entries: WorkoutEntry[] = [
      { id: "1", date: "2026-01-01", exerciseId: "lat", weight: 60, reps: 10, sets: 3, notes: "" },
      { id: "2", date: "2026-01-02", exerciseId: "lat", weight: 65, reps: 8, sets: 3, notes: "" },
      { id: "3", date: "2026-01-03", exerciseId: "lat", weight: 65, reps: 10, sets: 3, notes: "" }
    ];

    expect(bestLiftForExercise(entries, "lat")).toEqual({ exerciseId: "lat", weight: 65, reps: 10 });
  });
});

describe("goalProgress", () => {
  it("calculates strength progress", () => {
    const goal: Goal = {
      id: "goal1",
      type: "strength",
      targetValue: 80,
      targetDate: "2026-12-01",
      status: "active",
      exerciseId: "lat",
      label: "Lat Pulldown 80"
    };
    const entries: WorkoutEntry[] = [{ id: "1", date: "2026-01-01", exerciseId: "lat", weight: 60, reps: 8, sets: 3, notes: "" }];

    expect(goalProgress(goal, entries, [], 4, 2)).toBe(75);
  });

  it("calculates bodyweight rolling average progress", () => {
    const goal: Goal = {
      id: "goal2",
      type: "bodyweight",
      targetValue: 80,
      targetDate: "2026-12-01",
      status: "active",
      label: "80kg average"
    };
    const logs: BodyweightLog[] = [
      { id: "a", date: "2026-01-01", weight: 76 },
      { id: "b", date: "2026-01-02", weight: 78 },
      { id: "c", date: "2026-01-03", weight: 80 }
    ];

    expect(rollingAverageWeight(logs)).toBe(78);
    expect(goalProgress(goal, [], logs, 4, 2)).toBe(98);
  });

  it("calculates consistency progress", () => {
    const goal: Goal = {
      id: "goal3",
      type: "consistency",
      targetValue: 4,
      targetDate: "2026-12-01",
      status: "active",
      label: "4 workouts"
    };

    expect(goalProgress(goal, [], [], 4, 3)).toBe(75);
  });
});
