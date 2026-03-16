import { LineChart } from "../components/LineChart";
import { useAppData } from "../context/AppDataContext";

export function HistoryPage(): JSX.Element {
  const { workoutEntries, activeWeekPlan, weekTemplates, bodyweightLogs, settings } = useAppData();

  const exercisePoints = workoutEntries
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-12)
    .map((entry) => ({ label: entry.date, value: entry.weight }));

  const activeTemplate = weekTemplates.find((template) => template.id === activeWeekPlan?.templateId);
  const completionPoints =
    activeWeekPlan && activeTemplate
      ? [{ label: activeWeekPlan.weekStartDate, value: Math.round((activeWeekPlan.completedDays.length / activeTemplate.days.length) * 100) }]
      : [];

  const bodyweightPoints = bodyweightLogs
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-12)
    .map((log) => ({ label: log.date, value: log.weight }));

  return (
    <section className="stack">
      <h2>History</h2>
      <LineChart title="Exercise Progression (Recent Entries)" points={exercisePoints} unit={settings.unitSystem} />
      <LineChart title="Weekly Completion" points={completionPoints} unit="%" />
      <LineChart title="Bodyweight Trend" points={bodyweightPoints} unit={settings.unitSystem} />
    </section>
  );
}
