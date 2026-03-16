import { beforeEach, describe, expect, it } from "vitest";
import { getAll, openDB, putValue, resetDBCacheForTests } from "./db";

beforeEach(() => {
  indexedDB.deleteDatabase("gym-diet-tracker-db");
  resetDBCacheForTests();
});

describe("db CRUD", () => {
  it("opens DB and writes/reads objects", async () => {
    await openDB();
    await putValue("exercises", {
      id: "exercise-1",
      name: "Lat Pulldown",
      muscleGroup: "Back",
      isCustom: false,
      defaultUnit: "kg",
      createdAt: "2026-01-01"
    });

    const all = await getAll<{ id: string; name: string }>("exercises");
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe("Lat Pulldown");
  });
});
