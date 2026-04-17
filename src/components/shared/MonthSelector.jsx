// ══════════════════════════════════════════════
// 📅 Selector de mes con ciclo financiero
// ══════════════════════════════════════════════
import { formatMonthLabel, MS } from "../../utils/format.js";
import { getCycleDates } from "../../utils/cycle.js";

export default function MonthSelector({ selectedMonth, setSelectedMonth, allMonths, compact }) {
  return (
    <select
      value={selectedMonth}
      onChange={(e) => setSelectedMonth(e.target.value)}
      style={{
        padding: compact ? "8px 12px" : "10px 14px",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-default)",
        background: "var(--bg-surface)",
        color: "var(--text-primary)",
        fontSize: 13,
        fontWeight: 600,
        fontFamily: "inherit",
        cursor: "pointer",
        width: compact ? "auto" : "100%",
        maxWidth: compact ? "auto" : "100%",
        marginBottom: compact ? 0 : 16,
        outline: "none",
        appearance: "none",
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239a9a9a' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
        backgroundSize: "14px",
        paddingRight: 32,
      }}
    >
      {allMonths.map((m) => {
        const { start, end } = getCycleDates(m);
        const [, sm, sd] = start.split("-");
        const [, em, ed] = end.split("-");
        return (
          <option key={m} value={m}>
            {formatMonthLabel(m)} · {parseInt(sd)} {MS[parseInt(sm) - 1]} → {parseInt(ed)} {MS[parseInt(em) - 1]}
          </option>
        );
      })}
    </select>
  );
}
