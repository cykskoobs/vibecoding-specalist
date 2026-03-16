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

const DB_NAME = "gym-diet-tracker-db";
const DB_VERSION = 1;

export type StoreName =
  | "exercises"
  | "workoutEntries"
  | "weekTemplates"
  | "activeWeekPlan"
  | "dietDays"
  | "goals"
  | "bodyweightLogs"
  | "settings";

let dbPromise: Promise<IDBDatabase> | null = null;

function createStores(db: IDBDatabase): void {
  db.createObjectStore("exercises", { keyPath: "id" });
  db.createObjectStore("workoutEntries", { keyPath: "id" });
  db.createObjectStore("weekTemplates", { keyPath: "id" });
  db.createObjectStore("activeWeekPlan", { keyPath: "id" });
  db.createObjectStore("dietDays", { keyPath: "id" });
  db.createObjectStore("goals", { keyPath: "id" });
  db.createObjectStore("bodyweightLogs", { keyPath: "id" });
  db.createObjectStore("settings", { keyPath: "id" });
}

export async function openDB(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error ?? new Error("Unable to open IndexedDB"));

    request.onupgradeneeded = () => {
      const db = request.result;
      createStores(db);
    };

    request.onsuccess = () => resolve(request.result);
  });

  return dbPromise;
}

function tx<T>(storeName: StoreName, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const request = action(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error(`Request failed: ${storeName}`));
      })
  );
}

export async function getAll<T>(store: StoreName): Promise<T[]> {
  return tx(store, "readonly", (s) => s.getAll()) as Promise<T[]>;
}

export async function getById<T>(store: StoreName, id: string): Promise<T | undefined> {
  const value = await tx(store, "readonly", (s) => s.get(id));
  return value as T | undefined;
}

export async function putValue<T>(store: StoreName, value: T): Promise<void> {
  await tx(store, "readwrite", (s) => s.put(value));
}

export async function deleteValue(store: StoreName, id: string): Promise<void> {
  await tx(store, "readwrite", (s) => s.delete(id));
}

export async function clearStore(store: StoreName): Promise<void> {
  await tx(store, "readwrite", (s) => s.clear());
}

export function resetDBCacheForTests(): void {
  dbPromise = null;
}

export type SeedPayload = {
  exercises: Exercise[];
  weekTemplates: WeekTemplate[];
  settings: AppSettings;
  activeWeekPlan: ActiveWeekPlan;
  dietDays: DietDay[];
  goals: Goal[];
  bodyweightLogs: BodyweightLog[];
  workoutEntries: WorkoutEntry[];
};
