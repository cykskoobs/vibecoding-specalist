export type UnitSystem = "kg" | "lb";
export type WeekStartDay = "monday" | "sunday";
export type WorkoutSessionType = "normal" | "pr";

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  isCustom: boolean;
  defaultUnit: UnitSystem;
  createdAt: string;
}

export interface WorkoutEntry {
  id: string;
  date: string;
  exerciseId: string;
  weight: number;
  reps: number;
  sets: number;
  notes: string;
  sessionType?: WorkoutSessionType;
}

export interface WeekDayPlan {
  id: string;
  name: string;
  exerciseIds: string[];
}

export interface WeekTemplate {
  id: string;
  name: string;
  days: WeekDayPlan[];
}

export interface ActiveWeekPlan {
  id: "active";
  weekStartDate: string;
  templateId: string;
  completedDays: string[];
  carryOverNotes: string;
  dayAssignments: Record<string, string>;
}

export interface DietDay {
  id: string;
  date: string;
  calorieTarget: number;
  proteinTarget: number;
  caloriesActual: number;
  proteinActual: number;
  mealNotes: string;
}

export type GoalType = "strength" | "bodyweight" | "consistency";
export type GoalStatus = "active" | "completed";

export interface Goal {
  id: string;
  type: GoalType;
  targetValue: number;
  targetDate: string;
  status: GoalStatus;
  exerciseId?: string;
  label: string;
}

export interface BodyweightLog {
  id: string;
  date: string;
  weight: number;
}

export interface AppSettings {
  id: "settings";
  unitSystem: UnitSystem;
  weekStartDay: WeekStartDay;
  onTrackCalorieDelta: number;
  nearTrackCalorieDelta: number;
  onTrackProteinDelta: number;
  nearTrackProteinDelta: number;
}

export interface BestLift {
  exerciseId: string;
  weight: number;
  reps: number;
}

export type DietAdherence = "on track" | "near target" | "off target";
