import type { WeekStartDay } from "../types";

const ISO_DATE_LEN = 10;

export function todayISO(): string {
  return new Date().toISOString().slice(0, ISO_DATE_LEN);
}

export function getWeekStart(dateISO: string, weekStartDay: WeekStartDay): string {
  const date = new Date(`${dateISO}T00:00:00`);
  const day = date.getDay();
  const dayOffset = weekStartDay === "monday" ? (day === 0 ? 6 : day - 1) : day;
  date.setDate(date.getDate() - dayOffset);
  return date.toISOString().slice(0, ISO_DATE_LEN);
}

export function addDays(dateISO: string, days: number): string {
  const date = new Date(`${dateISO}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, ISO_DATE_LEN);
}

export function withinWeek(dateISO: string, weekStartISO: string): boolean {
  const start = new Date(`${weekStartISO}T00:00:00`);
  const end = new Date(`${weekStartISO}T00:00:00`);
  end.setDate(end.getDate() + 7);
  const date = new Date(`${dateISO}T00:00:00`);
  return date >= start && date < end;
}
