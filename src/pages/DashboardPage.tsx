import { useMemo } from "react";
import { StatCard } from "../components/StatCard";
import { useAppData } from "../context/AppDataContext";
import { classifyDietAdherence, goalProgress } from "../lib/calculations";
import { todayISO } from "../lib/date";

export function DashboardPage(): JSX.Element {
  const { activeWeekPlan, weekTemplates, dietDays, goals, settings, workoutEntries, bodyweightLogs } = useAppData();

  const today = todayISO();
  const todayDiet = dietDays.find((day) => day.date === today);
  const template = weekTemplates.find((item) => item.id === activeWeekPlan?.templateId);

  const completedThisWeek = activeWeekPlan?.completedDays.length ?? 0;
  const plannedDays = template?.days.length ?? 0;
  const completionPct = plannedDays === 0 ? 0 : Math.round((completedThisWeek / plannedDays) * 100);

  const todayPlan = useMemo(() => {
    if (!activeWeekPlan || !template) {
      return "No active week selected";
    }

    const day = template.days.find((item) => activeWeekPlan.dayAssignments[item.id] === today);
    return day ? day.name : "Rest / Unassigned";
  }, [activeWeekPlan, template, today]);

  const activeGoals = goals.filter((goal) => goal.status === "active");
  const avgGoalProgress =
    activeGoals.length === 0
      ? 0
      : Math.round(
          activeGoals.reduce((acc, goal) => acc + goalProgress(goal, workoutEntries, bodyweightLogs, plannedDays, completedThisWeek), 0) /
            activeGoals.length
        );

  return (
    <section className="stack">
      <h2>Dashboard</h2>
      <div className="grid">
        <StatCard title="Today Plan" value={todayPlan} subtitle={today} />
        <StatCard title="Weekly Completion" value={`${completionPct}%`} subtitle={`${completedThisWeek}/${plannedDays || "-"} days`} />
        <StatCard
          title="Diet Adherence"
          value={todayDiet ? classifyDietAdherence(todayDiet, settings) : "Not logged"}
          subtitle={todayDiet ? `${todayDiet.caloriesActual}/${todayDiet.calorieTarget} kcal` : "Add diet log for today"}
        />
        <StatCard title="Active Goal Progress" value={`${avgGoalProgress}%`} subtitle={`${activeGoals.length} active goal(s)`} />
      </div>
    </section>
  );
}
