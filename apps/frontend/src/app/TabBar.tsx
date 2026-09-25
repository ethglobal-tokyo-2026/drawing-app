import "./TabBar.css";

export type Tab = "draw" | "explore" | "board";

const TABS: { tab: Tab; label: string }[] = [
  { tab: "draw", label: "Draw" },
  { tab: "explore", label: "Explore" },
  { tab: "board", label: "You" },
];

export function TabBar({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map(({ tab, label }) => (
        <button
          key={tab}
          className={`tab tab-${tab} ${active === tab ? "on" : ""}`}
          aria-current={active === tab ? "page" : undefined}
          onClick={() => onChange(tab)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
