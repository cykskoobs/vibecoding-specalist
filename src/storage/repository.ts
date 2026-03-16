import { addDays, getWeekStart, todayISO } from "../lib/date";
import type {
  ActiveWeekPlan,
  AppSettings,
  BodyweightLog,
  DietDay,
  Exercise,
  Goal,
  WeekTemplate,
  WorkoutEntry,
  WorkoutSessionType
} from "../types";
import { deleteValue, getAll, getById, putValue } from "./db";

const APPROVED_EXERCISES: Array<Omit<Exercise, "id" | "createdAt">> = [
  { name: "Rear Deltoid Flies", muscleGroup: "Shoulders & Arms", isCustom: false, defaultUnit: "kg" },
  { name: "Front Raises", muscleGroup: "Shoulders & Arms", isCustom: false, defaultUnit: "kg" },
  { name: "Side Raises", muscleGroup: "Shoulders & Arms", isCustom: false, defaultUnit: "kg" },
  { name: "Shoulder Press", muscleGroup: "Shoulders & Arms", isCustom: false, defaultUnit: "kg" },
  { name: "Bicep Curls", muscleGroup: "Shoulders & Arms", isCustom: false, defaultUnit: "kg" },
  { name: "Tricep Pushdowns", muscleGroup: "Shoulders & Arms", isCustom: false, defaultUnit: "kg" },

  { name: "Chest Press", muscleGroup: "Chest & Back", isCustom: false, defaultUnit: "kg" },
  { name: "Lat Pulldown", muscleGroup: "Chest & Back", isCustom: false, defaultUnit: "kg" },
  { name: "Chest Flies", muscleGroup: "Chest & Back", isCustom: false, defaultUnit: "kg" },
  { name: "Cable Rows", muscleGroup: "Chest & Back", isCustom: false, defaultUnit: "kg" },
  { name: "Dips for Chest", muscleGroup: "Chest & Back", isCustom: false, defaultUnit: "kg" },
  { name: "Pull Ups", muscleGroup: "Chest & Back", isCustom: false, defaultUnit: "kg" },

  { name: "Leg Extensions", muscleGroup: "Legs", isCustom: false, defaultUnit: "kg" },
  { name: "Leg Press", muscleGroup: "Legs", isCustom: false, defaultUnit: "kg" },
  { name: "Squats", muscleGroup: "Legs", isCustom: false, defaultUnit: "kg" },
  { name: "Hamstring Curls", muscleGroup: "Legs", isCustom: false, defaultUnit: "kg" },
  { name: "Calf Raise", muscleGroup: "Legs", isCustom: false, defaultUnit: "kg" },
  { name: "Hammer Curls", muscleGroup: "Legs", isCustom: false, defaultUnit: "kg" },

  { name: "Incline Chest Press", muscleGroup: "Chest & Shoulders", isCustom: false, defaultUnit: "kg" },
  { name: "Lateral Raises", muscleGroup: "Chest & Shoulders", isCustom: false, defaultUnit: "kg" },
  { name: "Shrugs", muscleGroup: "Chest & Shoulders", isCustom: false, defaultUnit: "kg" },

  { name: "Barbell Row", muscleGroup: "Back & Biceps", isCustom: false, defaultUnit: "kg" },
  { name: "Back Extensions", muscleGroup: "Back & Biceps", isCustom: false, defaultUnit: "kg" }
];

const DEFAULT_SETTINGS: AppSettings = {
  id: "settings",
  unitSystem: "kg",
  weekStartDay: "monday",
  onTrackCalorieDelta: 150,
  nearTrackCalorieDelta: 300,
  onTrackProteinDelta: 10,
  nearTrackProteinDelta: 25
};

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function pickId(exercises: Exercise[], name: string): string {
  return exercises.find((exercise) => exercise.name === name)?.id ?? "";
}

function createDefaultTemplates(exercises: Exercise[]): WeekTemplate[] {
  return [
    {
      id: "template-3",
      name: "3-day",
      days: [
        {
          id: "d1",
          name: "Shoulders & Arms",
          exerciseIds: [
            pickId(exercises, "Rear Deltoid Flies"),
            pickId(exercises, "Front Raises"),
            pickId(exercises, "Side Raises"),
            pickId(exercises, "Shoulder Press"),
            pickId(exercises, "Bicep Curls"),
            pickId(exercises, "Tricep Pushdowns")
          ].filter(Boolean)
        },
        {
          id: "d2",
          name: "Chest & Back",
          exerciseIds: [
            pickId(exercises, "Chest Press"),
            pickId(exercises, "Lat Pulldown"),
            pickId(exercises, "Chest Flies"),
            pickId(exercises, "Cable Rows"),
            pickId(exercises, "Dips for Chest"),
            pickId(exercises, "Pull Ups")
          ].filter(Boolean)
        },
        {
          id: "d3",
          name: "Legs",
          exerciseIds: [
            pickId(exercises, "Leg Extensions"),
            pickId(exercises, "Leg Press"),
            pickId(exercises, "Squats"),
            pickId(exercises, "Hamstring Curls"),
            pickId(exercises, "Calf Raise")
          ].filter(Boolean)
        }
      ]
    },
    {
      id: "template-4",
      name: "4-day",
      days: [
        {
          id: "d1",
          name: "Chest & Shoulders",
          exerciseIds: [
            pickId(exercises, "Incline Chest Press"),
            pickId(exercises, "Shoulder Press"),
            pickId(exercises, "Lateral Raises"),
            pickId(exercises, "Shrugs"),
            pickId(exercises, "Tricep Pushdowns")
          ].filter(Boolean)
        },
        {
          id: "d2",
          name: "Back & Biceps",
          exerciseIds: [
            pickId(exercises, "Rear Deltoid Flies"),
            pickId(exercises, "Barbell Row"),
            pickId(exercises, "Pull Ups"),
            pickId(exercises, "Bicep Curls"),
            pickId(exercises, "Hammer Curls"),
            pickId(exercises, "Back Extensions")
          ].filter(Boolean)
        },
        {
          id: "d3",
          name: "Legs",
          exerciseIds: [
            pickId(exercises, "Leg Extensions"),
            pickId(exercises, "Leg Press"),
            pickId(exercises, "Squats"),
            pickId(exercises, "Hamstring Curls"),
            pickId(exercises, "Calf Raise")
          ].filter(Boolean)
        },
        {
          id: "d4",
          name: "Chest & Back",
          exerciseIds: [pickId(exercises, "Chest Press"), pickId(exercises, "Lat Pulldown"), pickId(exercises, "Cable Rows")].filter(Boolean)
        }
      ]
    },
    {
      id: "template-5",
      name: "5-day",
      days: [
        {
          id: "d1",
          name: "Shoulders & Arms",
          exerciseIds: [
            pickId(exercises, "Rear Deltoid Flies"),
            pickId(exercises, "Front Raises"),
            pickId(exercises, "Side Raises"),
            pickId(exercises, "Shoulder Press"),
            pickId(exercises, "Bicep Curls"),
            pickId(exercises, "Tricep Pushdowns")
          ].filter(Boolean)
        },
        {
          id: "d2",
          name: "Chest & Back",
          exerciseIds: [
            pickId(exercises, "Chest Press"),
            pickId(exercises, "Lat Pulldown"),
            pickId(exercises, "Chest Flies"),
            pickId(exercises, "Cable Rows"),
            pickId(exercises, "Dips for Chest"),
            pickId(exercises, "Pull Ups"),
            pickId(exercises, "Rear Deltoid Flies")
          ].filter(Boolean)
        },
        {
          id: "d3",
          name: "Legs",
          exerciseIds: [
            pickId(exercises, "Leg Extensions"),
            pickId(exercises, "Leg Press"),
            pickId(exercises, "Squats"),
            pickId(exercises, "Hamstring Curls"),
            pickId(exercises, "Calf Raise"),
            pickId(exercises, "Hammer Curls")
          ].filter(Boolean)
        },
        {
          id: "d4",
          name: "Chest & Shoulders",
          exerciseIds: [
            pickId(exercises, "Incline Chest Press"),
            pickId(exercises, "Shoulder Press"),
            pickId(exercises, "Lateral Raises"),
            pickId(exercises, "Shrugs"),
            pickId(exercises, "Tricep Pushdowns")
          ].filter(Boolean)
        },
        {
          id: "d5",
          name: "Back & Biceps",
          exerciseIds: [
            pickId(exercises, "Rear Deltoid Flies"),
            pickId(exercises, "Barbell Row"),
            pickId(exercises, "Pull Ups"),
            pickId(exercises, "Bicep Curls"),
            pickId(exercises, "Hammer Curls"),
            pickId(exercises, "Back Extensions")
          ].filter(Boolean)
        }
      ]
    }
  ];
}

export async function ensureSeedData(): Promise<void> {
  const existingExercises = await getAll<Exercise>("exercises");
  const today = todayISO();

  const existingByName = new Set(existingExercises.map((exercise) => exercise.name));
  const missing = APPROVED_EXERCISES.filter((exercise) => !existingByName.has(exercise.name));

  if (existingExercises.length === 0 || missing.length > 0) {
    await Promise.all(
      missing.map((exercise) =>
        putValue("exercises", {
          ...exercise,
          id: uid("exercise"),
          createdAt: today
        } as Exercise)
      )
    );
  }

  const refreshedExercises = await getAll<Exercise>("exercises");
  const templates = createDefaultTemplates(refreshedExercises);

  const existingTemplates = await getAll<WeekTemplate>("weekTemplates");
  if (existingTemplates.length === 0) {
    await Promise.all(templates.map((template) => putValue("weekTemplates", template)));
  }

  const active = await getById<ActiveWeekPlan>("activeWeekPlan", "active");
  if (!active) {
    await putValue("activeWeekPlan", {
      id: "active",
      weekStartDate: getWeekStart(today, DEFAULT_SETTINGS.weekStartDay),
      templateId: "template-3",
      completedDays: [],
      carryOverNotes: "",
      dayAssignments: {}
    } as ActiveWeekPlan);
  }

  const settings = await getById<AppSettings>("settings", "settings");
  if (!settings) {
    await putValue("settings", DEFAULT_SETTINGS);
  }
}

export async function getExercises(): Promise<Exercise[]> {
  return getAll<Exercise>("exercises");
}

export async function upsertExercise(exercise: Exercise): Promise<void> {
  await putValue("exercises", exercise);
}

export async function getWorkoutEntries(): Promise<WorkoutEntry[]> {
  return getAll<WorkoutEntry>("workoutEntries");
}

export async function upsertWorkoutEntry(entry: WorkoutEntry): Promise<void> {
  await putValue("workoutEntries", entry);
}

export async function getWeekTemplates(): Promise<WeekTemplate[]> {
  return getAll<WeekTemplate>("weekTemplates");
}

export async function upsertWeekTemplate(template: WeekTemplate): Promise<void> {
  await putValue("weekTemplates", template);
}

export async function getActiveWeekPlan(): Promise<ActiveWeekPlan | undefined> {
  return getById<ActiveWeekPlan>("activeWeekPlan", "active");
}

export async function upsertActiveWeekPlan(active: ActiveWeekPlan): Promise<void> {
  await putValue("activeWeekPlan", active);
}

export async function getDietDays(): Promise<DietDay[]> {
  return getAll<DietDay>("dietDays");
}

export async function upsertDietDay(day: DietDay): Promise<void> {
  await putValue("dietDays", day);
}

export async function getGoals(): Promise<Goal[]> {
  return getAll<Goal>("goals");
}

export async function upsertGoal(goal: Goal): Promise<void> {
  await putValue("goals", goal);
}

export async function deleteGoal(goalId: string): Promise<void> {
  await deleteValue("goals", goalId);
}

export async function getBodyweightLogs(): Promise<BodyweightLog[]> {
  return getAll<BodyweightLog>("bodyweightLogs");
}

export async function upsertBodyweightLog(log: BodyweightLog): Promise<void> {
  await putValue("bodyweightLogs", log);
}

export async function getSettings(): Promise<AppSettings> {
  const settings = await getById<AppSettings>("settings", "settings");
  return settings ?? DEFAULT_SETTINGS;
}

export async function upsertSettings(settings: AppSettings): Promise<void> {
  await putValue("settings", settings);
}

export function createNewExercise(name: string, muscleGroup: string, defaultUnit: "kg" | "lb"): Exercise {
  return {
    id: uid("exercise"),
    name,
    muscleGroup,
    isCustom: true,
    defaultUnit,
    createdAt: todayISO()
  };
}

export function createWorkoutEntry(payload: Omit<WorkoutEntry, "id">): WorkoutEntry {
  return { ...payload, sessionType: (payload.sessionType ?? "normal") as WorkoutSessionType, id: uid("entry") };
}

export function createDietDay(payload: Omit<DietDay, "id">): DietDay {
  return { ...payload, id: payload.date };
}

export function createGoal(payload: Omit<Goal, "id" | "status">): Goal {
  return { ...payload, id: uid("goal"), status: "active" };
}

export function createBodyweightLog(date: string, weight: number): BodyweightLog {
  return { id: uid("bw"), date, weight };
}

export function buildWeekAssignments(template: WeekTemplate, weekStartDate: string): Record<string, string> {
  const assignments: Record<string, string> = {};
  template.days.forEach((day, index) => {
    assignments[day.id] = addDays(weekStartDate, index);
  });
  return assignments;
}
