import { NavLink, Outlet } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "Home" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/calculators", label: "Calculators" },
  { to: "/workouts", label: "Workouts" },
  { to: "/week-planner", label: "Planner" },
  { to: "/diet", label: "Diet" },
  { to: "/goals", label: "Goals" },
  { to: "/history", label: "History" },
  { to: "/settings", label: "Settings" }
];

export function Layout(): JSX.Element {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">TRAIN SMARTER</p>
          <h1>Momentum Lab</h1>
          <p>Build your physique with structured training, nutrition precision, and real progress signals.</p>
        </div>
      </header>
      <nav className="top-nav" aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === "/"} className={({ isActive }) => (isActive ? "active" : "") }>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
