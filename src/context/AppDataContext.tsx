import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getWeekStart, todayISO } from "../lib/date";
import type {
  ActiveWeekPlan,
  AppSettings,
  BodyweightLog,
  DietDay,
  Exercise,
  Goal,
  WeekTemplate,
  WorkoutEntry
} from "../types";
import {
  buildWeekAssignments,
  createBodyweightLog,
  createDietDay,
  createGoal,
  createNewExercise,
  createWorkoutEntry,
  ensureSeedData,
  getActiveWeekPlan,
  getBodyweightLogs,
  getDietDays,
  getExercises,
  getGoals,
  getSettings,
  getWeekTemplates,
  getWorkoutEntries,
  upsertActiveWeekPlan,
  upsertBodyweightLog,
  upsertDietDay,
  upsertExercise,
  upsertGoal,
  upsertSettings,
  upsertWeekTemplate,
  upsertWorkoutEntry,
  deleteGoal
} from "../storage/repository";

interface AppDataContextValue {
  loading: boolean;
  exercises: Exercise[];
  workoutEntries: WorkoutEntry[];
  weekTemplates: WeekTemplate[];
  activeWeekPlan: ActiveWeekPlan | null;
  dietDays: DietDay[];
  goals: Goal[];
  bodyweightLogs: BodyweightLog[];
  settings: AppSettings;
  addExercise: (name: string, muscleGroup: string) => Promise<void>;
  updateExercise: (exercise: Exercise) => Promise<void>;
  addWorkoutEntry: (payload: Omit<WorkoutEntry, "id">) => Promise<void>;
  saveWeekTemplate: (template: WeekTemplate) => Promise<void>;
  activateWeekTemplate: (templateId: string, weekStartDate: string) => Promise<void>;
  toggleCompletedDay: (date: string) => Promise<void>;
  reassignDay: (dayId: string, date: string) => Promise<void>;
  updateCarryOverNotes: (notes: string) => Promise<void>;
  saveDietDay: (payload: Omit<DietDay, "id">) => Promise<void>;
  saveGoal: (payload: Omit<Goal, "id" | "status">) => Promise<void>;
  removeGoal: (goalId: string) => Promise<void>;
  completeGoal: (goalId: string) => Promise<void>;
  addBodyweightLog: (date: string, weight: number) => Promise<void>;
  saveSettings: (settings: AppSettings) => Promise<void>;
}

const defaultSettings: AppSettings = {
  id: "settings",
  unitSystem: "kg",
  weekStartDay: "monday",
  onTrackCalorieDelta: 150,
  nearTrackCalorieDelta: 300,
  onTrackProteinDelta: 10,
  nearTrackProteinDelta: 25
};

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

export function AppDataProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workoutEntries, setWorkoutEntries] = useState<WorkoutEntry[]>([]);
  const [weekTemplates, setWeekTemplates] = useState<WeekTemplate[]>([]);
  const [activeWeekPlan, setActiveWeekPlan] = useState<ActiveWeekPlan | null>(null);
  const [dietDays, setDietDays] = useState<DietDay[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [bodyweightLogs, setBodyweightLogs] = useState<BodyweightLog[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  async function load(): Promise<void> {
    setLoading(true);
    await ensureSeedData();

    const [
      loadedExercises,
      loadedWorkoutEntries,
      loadedWeekTemplates,
      loadedActive,
      loadedDiet,
      loadedGoals,
      loadedBodyweight,
      loadedSettings
    ] = await Promise.all([
      getExercises(),
      getWorkoutEntries(),
      getWeekTemplates(),
      getActiveWeekPlan(),
      getDietDays(),
      getGoals(),
      getBodyweightLogs(),
      getSettings()
    ]);

    setExercises(loadedExercises);
    setWorkoutEntries(loadedWorkoutEntries);
    setWeekTemplates(loadedWeekTemplates);
    setActiveWeekPlan(loadedActive ?? null);
    setDietDays(loadedDiet);
    setGoals(loadedGoals);
    setBodyweightLogs(loadedBodyweight);
    setSettings(loadedSettings);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const value = useMemo<AppDataContextValue>(
    () => ({
      loading,
      exercises,
      workoutEntries,
      weekTemplates,
      activeWeekPlan,
      dietDays,
      goals,
      bodyweightLogs,
      settings,
      addExercise: async (name, muscleGroup) => {
        const next = createNewExercise(name, muscleGroup, settings.unitSystem);
        await upsertExercise(next);
        setExercises((current) => [...current, next]);
      },
      updateExercise: async (exercise) => {
        await upsertExercise(exercise);
        setExercises((current) => current.map((item) => (item.id === exercise.id ? exercise : item)));
      },
      addWorkoutEntry: async (payload) => {
        const next = createWorkoutEntry(payload);
        await upsertWorkoutEntry(next);
        setWorkoutEntries((current) => [...current, next]);
      },
      saveWeekTemplate: async (template) => {
        await upsertWeekTemplate(template);
        setWeekTemplates((current) => {
          const exists = current.some((item) => item.id === template.id);
          return exists ? current.map((item) => (item.id === template.id ? template : item)) : [...current, template];
        });
      },
      activateWeekTemplate: async (templateId, weekStartDate) => {
        const template = weekTemplates.find((item) => item.id === templateId);
        if (!template) {
          return;
        }

        const nextActive: ActiveWeekPlan = {
          id: "active",
          weekStartDate,
          templateId,
          completedDays: [],
          carryOverNotes: "",
          dayAssignments: buildWeekAssignments(template, weekStartDate)
        };
        await upsertActiveWeekPlan(nextActive);
        setActiveWeekPlan(nextActive);
      },
      toggleCompletedDay: async (date) => {
        if (!activeWeekPlan) {
          return;
        }

        const exists = activeWeekPlan.completedDays.includes(date);
        const completedDays = exists
          ? activeWeekPlan.completedDays.filter((item) => item !== date)
          : [...activeWeekPlan.completedDays, date];

        const updated = { ...activeWeekPlan, completedDays };
        await upsertActiveWeekPlan(updated);
        setActiveWeekPlan(updated);
      },
      reassignDay: async (dayId, date) => {
        if (!activeWeekPlan) {
          return;
        }

        const updated = {
          ...activeWeekPlan,
          dayAssignments: {
            ...activeWeekPlan.dayAssignments,
            [dayId]: date
          }
        };
        await upsertActiveWeekPlan(updated);
        setActiveWeekPlan(updated);
      },
      updateCarryOverNotes: async (notes) => {
        if (!activeWeekPlan) {
          return;
        }

        const updated = { ...activeWeekPlan, carryOverNotes: notes };
        await upsertActiveWeekPlan(updated);
        setActiveWeekPlan(updated);
      },
      saveDietDay: async (payload) => {
        const day = createDietDay(payload);
        await upsertDietDay(day);
        setDietDays((current) => {
          const exists = current.some((item) => item.id === day.id);
          return exists ? current.map((item) => (item.id === day.id ? day : item)) : [...current, day];
        });
      },
      saveGoal: async (payload) => {
        const goal = createGoal(payload);
        await upsertGoal(goal);
        setGoals((current) => [...current, goal]);
      },
      removeGoal: async (goalId) => {
        await deleteGoal(goalId);
        setGoals((current) => current.filter((item) => item.id !== goalId));
      },
      completeGoal: async (goalId) => {
        const target = goals.find((item) => item.id === goalId);
        if (!target) {
          return;
        }

        const updated: Goal = { ...target, status: "completed" };
        await upsertGoal(updated);
        setGoals((current) => current.map((item) => (item.id === goalId ? updated : item)));
      },
      addBodyweightLog: async (date, weight) => {
        const log = createBodyweightLog(date, weight);
        await upsertBodyweightLog(log);
        setBodyweightLogs((current) => [...current, log]);
      },
      saveSettings: async (nextSettings) => {
        await upsertSettings(nextSettings);
        setSettings(nextSettings);

        if (activeWeekPlan) {
          const today = todayISO();
          const weekStartDate = getWeekStart(today, nextSettings.weekStartDay);
          if (weekStartDate !== activeWeekPlan.weekStartDate) {
            const updated = { ...activeWeekPlan, weekStartDate };
            await upsertActiveWeekPlan(updated);
            setActiveWeekPlan(updated);
          }
        }
      }
    }),
    [
      loading,
      exercises,
      workoutEntries,
      weekTemplates,
      activeWeekPlan,
      dietDays,
      goals,
      bodyweightLogs,
      settings
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used inside AppDataProvider");
  }

  return context;
}
