interface Point {
  label: string;
  value: number;
}

interface LineChartProps {
  title: string;
  points: Point[];
  unit?: string;
}

export function LineChart({ title, points, unit }: LineChartProps): JSX.Element {
  if (points.length === 0) {
    return (
      <article className="card">
        <h3>{title}</h3>
        <p className="muted">No data yet.</p>
      </article>
    );
  }

  const width = 320;
  const height = 140;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);

  const path = points
    .map((point, index) => {
      const x = (index / Math.max(1, points.length - 1)) * width;
      const y = height - ((point.value - min) / span) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <article className="card">
      <h3>{title}</h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="chart" role="img" aria-label={title}>
        <path d={path} fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
      <div className="chart-footer">
        <span>{points[0]?.label}</span>
        <span>
          {points[points.length - 1]?.value}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
    </article>
  );
}
