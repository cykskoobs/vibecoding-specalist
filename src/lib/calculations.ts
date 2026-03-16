import type {
  AppSettings,
  BestLift,
  BodyweightLog,
  DietAdherence,
  DietDay,
  Goal,
  WorkoutEntry
} from "../types";

function sessionType(entry: WorkoutEntry): "normal" | "pr" {
  return entry.sessionType ?? "normal";
}

export function classifyDietAdherence(day: DietDay, settings: AppSettings): DietAdherence {
  const calorieDiff = Math.abs(day.caloriesActual - day.calorieTarget);
  const proteinDiff = Math.abs(day.proteinActual - day.proteinTarget);

  if (calorieDiff <= settings.onTrackCalorieDelta && proteinDiff <= settings.onTrackProteinDelta) {
    return "on track";
  }

  if (calorieDiff <= settings.nearTrackCalorieDelta && proteinDiff <= settings.nearTrackProteinDelta) {
    return "near target";
  }

  return "off target";
}

export function bestLiftForExercise(entries: WorkoutEntry[], exerciseId: string): BestLift | null {
  const matching = entries.filter((entry) => entry.exerciseId === exerciseId);
  if (matching.length === 0) {
    return null;
  }

  matching.sort((a, b) => {
    if (b.weight !== a.weight) {
      return b.weight - a.weight;
    }
    return b.reps - a.reps;
  });

  const top = matching[0];
  return {
    exerciseId,
    weight: top.weight,
    reps: top.reps
  };
}

export function latestNormalLift(entries: WorkoutEntry[], exerciseId: string): BestLift | null {
  const latest = entries
    .filter((entry) => entry.exerciseId === exerciseId && sessionType(entry) === "normal")
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  if (!latest) {
    return null;
  }

  return {
    exerciseId,
    weight: latest.weight,
    reps: latest.reps
  };
}

export function prLiftForExercise(entries: WorkoutEntry[], exerciseId: string): BestLift | null {
  const prs = entries.filter((entry) => entry.exerciseId === exerciseId && sessionType(entry) === "pr");
  if (prs.length === 0) {
    return bestLiftForExercise(entries, exerciseId);
  }

  prs.sort((a, b) => {
    if (b.weight !== a.weight) {
      return b.weight - a.weight;
    }
    return b.reps - a.reps;
  });

  return {
    exerciseId,
    weight: prs[0].weight,
    reps: prs[0].reps
  };
}

export function rollingAverageWeight(logs: BodyweightLog[], windowSize = 7): number | null {
  if (logs.length === 0) {
    return null;
  }

  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const window = sorted.slice(Math.max(0, sorted.length - windowSize));
  const total = window.reduce((acc, entry) => acc + entry.weight, 0);
  return Number((total / window.length).toFixed(2));
}

export function completedWorkoutDays(entries: WorkoutEntry[], weekStartDate: string): number {
  const set = new Set(entries.filter((entry) => entry.date >= weekStartDate).map((entry) => entry.date));
  return set.size;
}

export function goalProgress(
  goal: Goal,
  workouts: WorkoutEntry[],
  bodyweightLogs: BodyweightLog[],
  plannedDays: number,
  weekCompletedDays: number
): number {
  if (goal.type === "strength") {
    if (!goal.exerciseId) {
      return 0;
    }
    const best = bestLiftForExercise(workouts, goal.exerciseId);
    if (!best) {
      return 0;
    }
    return Math.min(100, Math.round((best.weight / goal.targetValue) * 100));
  }

  if (goal.type === "bodyweight") {
    const avg = rollingAverageWeight(bodyweightLogs);
    if (!avg) {
      return 0;
    }
    return Math.min(100, Math.round((avg / goal.targetValue) * 100));
  }

  if (plannedDays <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((weekCompletedDays / plannedDays) * 100));
}
