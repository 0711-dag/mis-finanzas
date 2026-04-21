// ══════════════════════════════════════════════
// 🏷️ CategoriesOverview (v2)
// Modal con el mini-informe de categorías del ciclo:
//  - fila por categoría con barra proporcional
//  - desglose pagado / pendiente por categoría
//  - cuotas de deuda aparte (no cuentan como categoría de usuario)
//  - "Sin categoría" si corresponde
//
// v2: agrupa por categoryId y lee el label fresco desde data.categories,
// por lo que renombrar una categoría se refleja inmediatamente aquí.
// ══════════════════════════════════════════════
import { fmt } from "../utils/format.js";
import { formatMonthLabelWithCycle } from "../utils/cycle.js";
import { calcCategoriesOverview } from "../utils/categoriesOverview.js";

// Extrae el emoji inicial de "🏠 Vivienda"
function extractEmoji(label) {
  if (!label || typeof label !== "string") return "📦";
  const first = label.trim().split(/\s+/)[0];
  if (/[a-záéíóúñA-ZÁÉÍÓÚÑ]/.test(first || "")) return "📦";
  return first || "📦";
}

// Extrae el nombre (sin emoji)
function extractName(label) {
  if (!label || typeof label !== "string") return "";
  const parts = label.trim().split(/\s+/);
  if (parts.length > 1 && !/[a-záéíóúñA-ZÁÉÍÓÚÑ]/.test(parts[0])) {
    return parts.slice(1).join(" ");
  }
  return parts.join(" ");
}

export default function CategoriesOverview({ data, selectedMonth, onClose }) {
  const overview = calcCategoriesOverview(data, selectedMonth);
  const { categorias, sinCategoria, cuotasDeuda, totalCiclo } = overview;

  const maxTotal = Math.max(
    ...categorias.map((c) => c.total),
    sinCategoria.total,
    cuotasDeuda.total,
    1
  );

  const pctDe = (monto) => (totalCiclo > 0 ? (monto / totalCiclo) * 100 : 0);

  const vacio = totalCiclo === 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__title">🏷️ Categorías del ciclo</div>
          <button className="modal__close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className="modal__body">
          <div style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            marginBottom: 14,
            lineHeight: 1.4,
          }}>
            {formatMonthLabelWithCycle(selectedMonth)}
          </div>

          {vacio ? (
            <div style={{
              padding: 30,
              textAlign: "center",
              color: "var(--text-secondary)",
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
              <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                Sin gastos en este ciclo
              </div>
              <div style={{ fontSize: 12 }}>
                Cuando añadas gastos fijos o variables, los verás aquí agrupados por categoría.
              </div>
            </div>
          ) : (
            <>
              <div style={{
                background: "var(--bg-surface)",
                borderRadius: "var(--radius-md)",
                padding: 14,
                marginBottom: 14,
                border: "1px solid var(--border-subtle)",
              }}>
                <div style={{
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                  marginBottom: 4,
                }}>
                  Gasto total del ciclo
                </div>
                <div style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                  fontFeatureSettings: "'tnum'",
                }}>
                  {fmt(totalCiclo)}
                </div>
                <div style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  marginTop: 2,
                }}>
                  {categorias.length} {categorias.length === 1 ? "categoría con gasto" : "categorías con gasto"}
                  {sinCategoria.total > 0 && " · incluye movimientos sin categorizar"}
                  {cuotasDeuda.total > 0 && " · incluye cuotas de deuda"}
                </div>
              </div>

              <div style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: 0.06,
                marginBottom: 8,
              }}>
                Por categoría
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                {categorias.map((c) => (
                  <CategoryRow
                    key={c.categoryId}
                    emoji={extractEmoji(c.categoria)}
                    nombre={extractName(c.categoria) || c.categoria}
                    total={c.total}
                    pendiente={c.pendiente}
                    items={c.items}
                    pct={pctDe(c.total)}
                    barPct={(c.total / maxTotal) * 100}
                    color="var(--accent)"
                  />
                ))}

                {sinCategoria.total > 0 && (
                  <CategoryRow
                    emoji="❓"
                    nombre="Sin categoría"
                    total={sinCategoria.total}
                    pendiente={sinCategoria.pendiente}
                    items={sinCategoria.items}
                    pct={pctDe(sinCategoria.total)}
                    barPct={(sinCategoria.total / maxTotal) * 100}
                    color="var(--text-tertiary)"
                    muted
                  />
                )}
              </div>

              {cuotasDeuda.total > 0 && (
                <>
                  <div style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--text-tertiary)",
                    textTransform: "uppercase",
                    letterSpacing: 0.06,
                    marginBottom: 8,
                    marginTop: 4,
                  }}>
                    Deudas (no se categorizan)
                  </div>
                  <CategoryRow
                    emoji="💳"
                    nombre="Cuotas de deuda"
                    total={cuotasDeuda.total}
                    pendiente={cuotasDeuda.pendiente}
                    items={cuotasDeuda.items}
                    pct={pctDe(cuotasDeuda.total)}
                    barPct={(cuotasDeuda.total / maxTotal) * 100}
                    color="var(--warning)"
                  />
                </>
              )}

              <div style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                marginTop: 12,
                lineHeight: 1.5,
                padding: "8px 10px",
                background: "var(--bg-subtle)",
                borderRadius: "var(--radius-sm)",
              }}>
                💡 El gasto incluye pagos ya realizados y pagos pendientes del ciclo. Los gastos variables cuentan siempre como ya ejecutados.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryRow({ emoji, nombre, total, pendiente, items, pct, barPct, color, muted }) {
  return (
    <div style={{
      background: "var(--bg-surface)",
      border: `1px solid var(--border-subtle)`,
      borderRadius: "var(--radius-sm)",
      padding: "10px 12px",
      opacity: muted ? 0.85 : 1,
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
        marginBottom: 6,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>{emoji}</span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {nombre}
            </div>
            <div style={{
              fontSize: 10,
              color: "var(--text-tertiary)",
              marginTop: 1,
            }}>
              {items} {items === 1 ? "movimiento" : "movimientos"}
              {pendiente > 0 && (
                <> · <span style={{ color: "var(--warning-text)", fontWeight: 600 }}>
                  {fmt(pendiente)} pendiente
                </span></>
              )}
            </div>
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: "var(--text-primary)",
            fontFeatureSettings: "'tnum'",
            letterSpacing: "-0.01em",
          }}>
            {fmt(total)}
          </div>
          <div style={{
            fontSize: 10,
            color: "var(--text-tertiary)",
            fontFeatureSettings: "'tnum'",
          }}>
            {pct.toFixed(0)}% del ciclo
          </div>
        </div>
      </div>

      <div className="progress" style={{ height: 4 }}>
        <div
          className="progress__fill"
          style={{
            width: `${Math.min(100, barPct)}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );
}
