import { useMemo, useState } from "react";
import { useAppData } from "../context/AppDataContext";
import { addDays, getWeekStart, todayISO } from "../lib/date";
import type { WeekTemplate } from "../types";

export function WeekPlannerPage(): JSX.Element {
  const { weekTemplates, activeWeekPlan, exercises, settings, activateWeekTemplate, toggleCompletedDay, reassignDay, updateCarryOverNotes, saveWeekTemplate } = useAppData();
  const [selectedTemplateId, setSelectedTemplateId] = useState(activeWeekPlan?.templateId ?? "template-3");
  const [weekStartDate, setWeekStartDate] = useState(getWeekStart(todayISO(), settings.weekStartDay));

  const activeTemplate = useMemo(
    () => weekTemplates.find((item) => item.id === (activeWeekPlan?.templateId ?? selectedTemplateId)),
    [weekTemplates, activeWeekPlan, selectedTemplateId]
  );

  async function addDay(template: WeekTemplate): Promise<void> {
    const next = {
      ...template,
      days: [...template.days, { id: `d${template.days.length + 1}`, name: `Day ${template.days.length + 1}`, exerciseIds: [] }]
    };
    await saveWeekTemplate(next);
  }

  return (
    <section className="stack">
      <h2>Week Planner</h2>
      <article className="card">
        <h3>Activate Weekly Template</h3>
        <div className="row">
          <select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
            {weekTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          <input type="date" value={weekStartDate} onChange={(event) => setWeekStartDate(event.target.value)} />
          <button type="button" onClick={() => activateWeekTemplate(selectedTemplateId, weekStartDate)}>
            Set Active Week
          </button>
        </div>
      </article>

      <article className="card">
        <h3>Template Editor (3-5 Day Rotation)</h3>
        <div className="stack">
          {weekTemplates.map((template) => (
            <div key={template.id} className="inner-card">
              <div className="row spread">
                <strong>{template.name}</strong>
                <button type="button" onClick={() => addDay(template)} disabled={template.days.length >= 5}>
                  Add day
                </button>
              </div>
              <ul className="list">
                {template.days.map((day, index) => (
                  <li key={day.id}>
                    Day {index + 1}: {day.name} ({day.exerciseIds.length} exercise(s))
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </article>

      {activeTemplate && activeWeekPlan ? (
        <article className="card">
          <h3>Active Week: {activeTemplate.name}</h3>
          <p className="muted">Week starts {activeWeekPlan.weekStartDate}. You can reassign workout dates manually.</p>
          <ul className="list">
            {activeTemplate.days.map((day, index) => {
              const assignedDate = activeWeekPlan.dayAssignments[day.id] ?? addDays(activeWeekPlan.weekStartDate, index);
              const completed = activeWeekPlan.completedDays.includes(assignedDate);
              return (
                <li key={day.id}>
                  <div className="row spread">
                    <span>
                      <strong>{day.name}</strong> - {day.exerciseIds.map((id) => exercises.find((exercise) => exercise.id === id)?.name).filter(Boolean).join(", ") || "No exercises"}
                    </span>
                    <button type="button" onClick={() => toggleCompletedDay(assignedDate)}>
                      {completed ? "Mark Incomplete" : "Mark Complete"}
                    </button>
                  </div>
                  <div className="row">
                    <label>
                      Assigned date
                      <input type="date" value={assignedDate} onChange={(event) => reassignDay(day.id, event.target.value)} />
                    </label>
                  </div>
                </li>
              );
            })}
          </ul>
          <label>
            Carry-over notes
            <textarea
              value={activeWeekPlan.carryOverNotes}
              onChange={(event) => updateCarryOverNotes(event.target.value)}
              placeholder="Missed anything this week?"
            />
          </label>
        </article>
      ) : null}
    </section>
  );
}
