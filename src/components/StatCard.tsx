interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
}

export function StatCard({ title, value, subtitle }: StatCardProps): JSX.Element {
  return (
    <article className="card stat-card">
      <h3>{title}</h3>
      <p className="stat-value">{value}</p>
      {subtitle ? <p className="muted">{subtitle}</p> : null}
    </article>
  );
}
