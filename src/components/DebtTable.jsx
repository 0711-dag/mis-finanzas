import { useState } from "react";
import Section from "./Section.jsx";
import ActionButtons from "./shared/ActionButtons.jsx";
import { fmt, fmtDate, todayISO, monthKey, addMonths } from "../utils/format.js";
import { isDateInCycle } from "../utils/cycle.js";
import { isDebtFormReady, previewDebtPlan } from "../validation.js";

// Configuración visual de cada tipo de deuda
const DEBT_TYPE_CONFIG = {
  tarjeta: {
    label: "Tarjeta de crédito",
    icon: "💳",
    desc: "Saldo revolvente con límite. Interés alto.",
  },
  cuotas: {
    label: "Compra a cuotas",
    icon: "🛍️",
    desc: "Pago fijo mensual hasta completar.",
  },
  prestamo: {
    label: "Préstamo personal",
    icon: "🏦",
    desc: "Pago fijo mensual, normalmente con interés.",
  },
};

// Extrae el día del mes (1-31) de una fecha ISO "YYYY-MM-DD".
// Devuelve null si la fecha no es válida.
function getDayFromISO(iso) {
  if (!iso || typeof iso !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const day = parseInt(iso.split("-")[2], 10);
  if (isNaN(day) || day < 1 || day > 31) return null;
  return day;
}

// 🆕 Construye el "draft" pasado a los validadores a partir del state local.
// Lo extraemos para reusar en el botón (isDebtFormReady) y en el preview
// (previewDebtPlan), evitando que la lógica de conversión esté duplicada.
function buildDebtDraft(newRow) {
  return {
    tipo: newRow.tipo || "cuotas",
    entidad: newRow.entidad,
    fechaInicio: newRow.fechaInicio,
    saldoPendiente: parseFloat(newRow.saldoPendiente) || 0,
    proxCuota: parseFloat(newRow.proxCuota) || 0,
    totalCuotas: parseInt(newRow.totalCuotas) || 0,
    cuotaActual: 0,
    limiteCredito: parseFloat(newRow.limiteCredito) || 0,
    pagoMinimo: parseFloat(newRow.pagoMinimo) || 0,
    tasaInteres: parseFloat(newRow.tasaInteres) || 0,
  };
}

export default function DebtTable({
  data,
  addDebtWithPlan,
  deleteRow,
  saveRowEdit,
  selectedMonth,
  setAddingTo,
  addingTo,
  mobileMode,
  // 🆕 Callback opcional: si Dashboard lo provee, se usa para mostrar
  // un toast verde de éxito al crear la deuda. Si no, no hace nada
  // (retrocompatible con el resto de invocaciones del componente).
  onSuccessNotify,
}) {
  const [newRow, setNewRow] = useState({});
  const [editingRow, setEditingRow] = useState(null);
  // 🆕 Mostrar/ocultar el preview detallado de cuotas (toggleable).
  const [showPreview, setShowPreview] = useState(false);

  const debts = data.debts || [];
  const totalDebtPending = debts.reduce((s, d) => s + (d.saldoPendiente || 0), 0);
  const totalCuota = debts.reduce((s, d) => s + (d.proxCuota || 0), 0);

  const startRowEdit = (_s, item) => setEditingRow({ id: item.id, fields: { ...item } });
  const cancelRowEdit = () => setEditingRow(null);
  const handleSaveRowEdit = () => {
    if (!editingRow) return;
    saveRowEdit("debts", editingRow.id, editingRow.fields);
    setEditingRow(null);
  };
  const isRowEditing = (id) => editingRow?.id === id;
  const rowField = (field) => editingRow?.fields?.[field] ?? "";
  const setRowField = (field, val) =>
    setEditingRow((prev) => prev ? { ...prev, fields: { ...prev.fields, [field]: val } } : prev);

  const handleAdd = () => {
    setAddingTo("debts");
    setShowPreview(false);
    setNewRow({
      tipo: "cuotas",
      entidad: "",
      fechaInicio: todayISO(),
      saldoPendiente: "",
      proxCuota: "",
      totalCuotas: "",
      limiteCredito: "",
      pagoMinimo: "",
      tasaInteres: "",
    });
  };

  const handleSaveNew = () => {
    const draft = buildDebtDraft(newRow);
    const success = addDebtWithPlan(draft);
    if (success) {
      // Notificar arriba (Dashboard) para que muestre toast de éxito.
      if (typeof onSuccessNotify === "function") {
        const numCuotas = parseInt(newRow.totalCuotas) || 0;
        const esTarjeta = (newRow.tipo || "cuotas") === "tarjeta";
        const msg = esTarjeta
          ? `Tarjeta "${draft.entidad}" guardada`
          : numCuotas > 0
            ? `Deuda "${draft.entidad}" guardada (${numCuotas} cuotas)`
            : `Deuda "${draft.entidad}" guardada`;
        onSuccessNotify(msg);
      }
      setAddingTo(null);
      setShowPreview(false);
    }
  };

  // 🆕 Estado del formulario: ¿está listo para crear?
  // Esto evita que el usuario pulse "Crear deuda" cuando faltan campos
  // y se encuentre con un toast de error críptico.
  const draftForCheck = buildDebtDraft(newRow);
  const formReady = isDebtFormReady(draftForCheck);
  const tipoActual = newRow.tipo || "cuotas";
  const generaPlan = tipoActual === "cuotas" || tipoActual === "prestamo";

  // 🆕 Preview del plan de cuotas (sólo cuando el form está casi listo).
  // Mostramos los primeros 3 y los últimos 3 si hay muchas, para no
  // empapelar la UI con 24 fechas.
  const planPreview = generaPlan ? previewDebtPlan(draftForCheck) : [];
  const numCuotasPreview = planPreview.length;
  const previewTop = planPreview.slice(0, 3);
  const previewBottom = numCuotasPreview > 6 ? planPreview.slice(-3) : [];
  const hayPreview = numCuotasPreview > 0;

  // Formulario de añadir — campos dinámicos según tipo
  const AddForm = (
    <div style={{
      background: "var(--bg-subtle)",
      borderRadius: "var(--radius-md)",
      padding: 14,
      marginBottom: 10,
      border: "1.5px solid var(--accent)",
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>
        Nueva deuda
      </div>

      {/* Selector de tipo */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>
          Tipo de deuda
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {Object.entries(DEBT_TYPE_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              type="button"
              onClick={() => { setNewRow({ ...newRow, tipo: key }); setShowPreview(false); }}
              style={{
                flex: 1, minWidth: 90,
                padding: "8px 10px",
                borderRadius: "var(--radius-sm)",
                background: newRow.tipo === key ? "var(--accent-subtle)" : "var(--bg-surface)",
                border: `1.5px solid ${newRow.tipo === key ? "var(--accent)" : "var(--border-default)"}`,
                color: newRow.tipo === key ? "var(--accent)" : "var(--text-secondary)",
                fontSize: 12, fontWeight: 600,
                cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              }}
            >
              <span style={{ fontSize: 16 }}>{cfg.icon}</span>
              <span>{cfg.label}</span>
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 6, lineHeight: 1.4 }}>
          {DEBT_TYPE_CONFIG[newRow.tipo || "cuotas"]?.desc}
        </div>
      </div>

      <input className="sheet-input" placeholder="Entidad / Acreedor" value={newRow.entidad || ""} onChange={(e) => setNewRow({ ...newRow, entidad: e.target.value })} maxLength={100} />

      {/* Campos comunes: saldo y cuota */}
      <div style={{ display: "flex", gap: 6 }}>
        <input
          className="sheet-input"
          type="number"
          placeholder={newRow.tipo === "tarjeta" ? "Saldo actual €" : "Saldo total €"}
          value={newRow.saldoPendiente || ""}
          onChange={(e) => setNewRow({ ...newRow, saldoPendiente: e.target.value })}
          style={{ flex: 1 }}
        />
        <input
          className="sheet-input"
          type="number"
          placeholder={newRow.tipo === "tarjeta" ? "Pago planeado €" : "Cuota €"}
          value={newRow.proxCuota || ""}
          onChange={(e) => setNewRow({ ...newRow, proxCuota: e.target.value })}
          style={{ flex: 1 }}
        />
      </div>

      {/* Campos específicos según tipo */}
      {newRow.tipo === "tarjeta" ? (
        <>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              className="sheet-input"
              type="number"
              placeholder="Límite crédito €"
              value={newRow.limiteCredito || ""}
              onChange={(e) => setNewRow({ ...newRow, limiteCredito: e.target.value })}
              style={{ flex: 1 }}
            />
            <input
              className="sheet-input"
              type="number"
              placeholder="Pago mínimo €"
              value={newRow.pagoMinimo || ""}
              onChange={(e) => setNewRow({ ...newRow, pagoMinimo: e.target.value })}
              style={{ flex: 1 }}
            />
          </div>
          <input
            className="sheet-input"
            type="number"
            placeholder="Tasa anual % (opcional)"
            value={newRow.tasaInteres || ""}
            onChange={(e) => setNewRow({ ...newRow, tasaInteres: e.target.value })}
          />
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4, marginBottom: 10, lineHeight: 1.4 }}>
            💡 Las tarjetas no generan un plan de cuotas automático. Actualiza el saldo manualmente al revisar tu estado de cuenta.
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              className="sheet-input"
              type="number"
              placeholder="Nº cuotas"
              value={newRow.totalCuotas || ""}
              onChange={(e) => setNewRow({ ...newRow, totalCuotas: e.target.value })}
              style={{ flex: 1 }}
            />
            <input
              className="sheet-input"
              type="date"
              value={newRow.fechaInicio || ""}
              onChange={(e) => setNewRow({ ...newRow, fechaInicio: e.target.value })}
              style={{ flex: 1, colorScheme: "light dark" }}
            />
          </div>
          {newRow.tipo === "prestamo" && (
            <input
              className="sheet-input"
              type="number"
              placeholder="Tasa anual % (opcional)"
              value={newRow.tasaInteres || ""}
              onChange={(e) => setNewRow({ ...newRow, tasaInteres: e.target.value })}
            />
          )}

          {/* 🆕 Resumen + toggle de preview detallado */}
          {hayPreview && (
            <div style={{
              fontSize: 11, color: "var(--text-secondary)",
              marginTop: 4, marginBottom: 10, lineHeight: 1.4,
              padding: "8px 10px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
            }}>
              <div>
                Se crearán <strong>{numCuotasPreview}</strong> pagos de{" "}
                <strong>{fmt(parseFloat(newRow.proxCuota) || 0)}</strong> desde{" "}
                <strong>{fmtDate(newRow.fechaInicio)}</strong>.
              </div>
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                style={{
                  marginTop: 6,
                  padding: "2px 0",
                  background: "transparent",
                  color: "var(--accent)",
                  fontSize: 11, fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {showPreview ? "▲ Ocultar fechas" : "▼ Ver fechas exactas"}
              </button>

              {showPreview && (
                <div style={{
                  marginTop: 6, paddingTop: 6,
                  borderTop: "1px dashed var(--border-default)",
                  display: "flex", flexDirection: "column", gap: 3,
                  fontFeatureSettings: "'tnum'",
                }}>
                  {previewTop.map((p) => (
                    <div key={p.cuotaNum} style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-tertiary)" }}>Cuota {p.cuotaNum}</span>
                      <span>{fmtDate(p.dayPago)} · {fmt(p.monto)}</span>
                    </div>
                  ))}
                  {previewBottom.length > 0 && (
                    <>
                      <div style={{ color: "var(--text-tertiary)", textAlign: "center", fontSize: 10 }}>
                        … {numCuotasPreview - 6} cuotas más …
                      </div>
                      {previewBottom.map((p) => (
                        <div key={p.cuotaNum} style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--text-tertiary)" }}>Cuota {p.cuotaNum}</span>
                          <span>{fmtDate(p.dayPago)} · {fmt(p.monto)}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <button
        className="btn-primary btn-primary--accent"
        onClick={handleSaveNew}
        disabled={!formReady}
        style={{
          marginTop: 4,
          opacity: formReady ? 1 : 0.5,
          cursor: formReady ? "pointer" : "not-allowed",
        }}
        title={formReady ? "Crear deuda" : "Completa los campos obligatorios"}
      >
        Crear deuda
      </button>
      {!formReady && (
        <div style={{
          fontSize: 10, color: "var(--text-tertiary)",
          textAlign: "center", marginTop: 4,
          fontStyle: "italic",
        }}>
          Completa entidad, saldo{generaPlan ? ", cuotas, importe y fecha" : ""} para activar el botón
        </div>
      )}
    </div>
  );

  return (
    <Section title="Mis deudas" icon="💳" onAdd={handleAdd} mobileMode={mobileMode}>
      {addingTo === "debts" && AddForm}

      {/* Lista unificada */}
      <div className="item-list">
        {debts.map((d) => {
          const tipo = d.tipo || "cuotas";
          const cfg = DEBT_TYPE_CONFIG[tipo] || DEBT_TYPE_CONFIG.cuotas;
          const esTarjeta = tipo === "tarjeta";
          const hasPlan = !esTarjeta && d.totalCuotas && d.totalCuotas > 0;
          const cuotaAct = d.cuotaActual || 0;
          const totalC = d.totalCuotas || 0;
          const pct = hasPlan ? (cuotaAct / totalC) * 100 : 0;
          const terminada = hasPlan && cuotaAct >= totalC;

          // Utilización de tarjeta (saldo / límite)
          const utilTarjeta = esTarjeta && d.limiteCredito > 0
            ? Math.min(100, (d.saldoPendiente / d.limiteCredito) * 100)
            : 0;

          // Día de pago derivado de fechaInicio (mismo formato que gastos fijos: "día N")
          const diaPago = getDayFromISO(d.fechaInicio);

          let cuotaThisMonth = null;
          if (hasPlan && d.fechaInicio) {
            const debtPayments = (data.payments || []).filter(
              (p) => p.debtId === d.id && isDateInCycle(p.dayPago, selectedMonth)
            );
            if (debtPayments.length > 0) cuotaThisMonth = debtPayments[0].cuotaNum;
          }
          const re = isRowEditing(d.id);

          if (re) {
            return (
              <div key={d.id} style={{
                background: "var(--bg-subtle)",
                borderRadius: "var(--radius-md)",
                padding: 12, border: "1.5px solid var(--accent)",
                display: "flex", flexDirection: "column", gap: 6,
              }}>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                  {cfg.icon} {cfg.label}
                </div>
                <input className="sheet-input" value={rowField("entidad")} onChange={(e) => setRowField("entidad", e.target.value)} maxLength={100} />
                <div style={{ display: "flex", gap: 6 }}>
                  <input className="sheet-input" type="number" placeholder="Saldo" value={rowField("saldoPendiente")} onChange={(e) => setRowField("saldoPendiente", parseFloat(e.target.value) || 0)} style={{ flex: 1 }} />
                  <input className="sheet-input" type="number" placeholder="Cuota" value={rowField("proxCuota")} onChange={(e) => setRowField("proxCuota", parseFloat(e.target.value) || 0)} style={{ flex: 1 }} />
                </div>
                {/* Campos editables específicos para tarjeta */}
                {tipo === "tarjeta" && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <input className="sheet-input" type="number" placeholder="Límite" value={rowField("limiteCredito")} onChange={(e) => setRowField("limiteCredito", parseFloat(e.target.value) || 0)} style={{ flex: 1 }} />
                    <input className="sheet-input" type="number" placeholder="Pago mín" value={rowField("pagoMinimo")} onChange={(e) => setRowField("pagoMinimo", parseFloat(e.target.value) || 0)} style={{ flex: 1 }} />
                  </div>
                )}
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn-primary btn-primary--accent" onClick={handleSaveRowEdit} style={{ flex: 1 }}>Guardar</button>
                  <button className="btn-secondary" onClick={cancelRowEdit}>Cancelar</button>
                </div>
              </div>
            );
          }

          return (
            <div key={d.id} className="item" style={terminada ? { opacity: 0.6 } : {}}>
              <div className="item__icon item__icon--debt">{cfg.icon}</div>
              <div className="item__body">
                <div className="item__title" style={terminada ? { textDecoration: "line-through" } : {}}>
                  {d.entidad}
                </div>
                <div className="item__subtitle">
                  {/* Subtítulo según tipo */}
                  {esTarjeta ? (
                    <>
                      Tarjeta
                      {d.limiteCredito > 0 && (
                        <>
                          {" · "}
                          <span style={{
                            color: utilTarjeta >= 80 ? "var(--danger)"
                              : utilTarjeta >= 50 ? "var(--warning)"
                              : "var(--text-secondary)",
                          }}>
                            {utilTarjeta.toFixed(0)}% usado
                          </span>
                        </>
                      )}
                      {d.limiteCredito > 0 && (
                        <div className="progress" style={{ marginTop: 4, width: 100 }}>
                          <div
                            className="progress__fill"
                            style={{
                              width: `${utilTarjeta}%`,
                              background: utilTarjeta >= 80 ? "var(--danger)"
                                : utilTarjeta >= 50 ? "var(--warning)"
                                : "var(--accent)",
                            }}
                          />
                        </div>
                      )}
                    </>
                  ) : hasPlan ? (
                    <>
                      {terminada ? "✅ Completada" : cuotaThisMonth
                        ? `Cuota ${cuotaThisMonth} de ${totalC} este ciclo`
                        : `${cuotaAct} de ${totalC} pagadas`}
                      {!terminada && (
                        <div className="progress" style={{ marginTop: 4, width: 100 }}>
                          <div className={`progress__fill ${terminada ? "progress__fill--done" : ""}`} style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </>
                  ) : (
                    "Sin plan de cuotas"
                  )}
                </div>
              </div>
              <div className="item__right">
                <div className="item__amount item__amount--neg">{fmt(d.saldoPendiente)}</div>
                <div className="item__amount-sub">
                  {esTarjeta ? `Pago ${fmt(d.proxCuota)}` : `Cuota ${fmt(d.proxCuota)}`}
                </div>
                {/* Día de pago (mismo patrón que en Gastos fijos) */}
                {!terminada && diaPago && (
                  <div
                    className="item__amount-sub"
                    style={{ color: "var(--text-tertiary)", marginTop: 2 }}
                    title="Día de pago mensual"
                  >
                    📅 día {diaPago}
                  </div>
                )}
                <div style={{ display: "flex", gap: 2, marginTop: 4, justifyContent: "flex-end" }}>
                  <ActionButtons
                    section="debts" id={d.id} item={d}
                    isEditing={false}
                    onStartEdit={(_s, item) => startRowEdit("debts", item)}
                    onSaveEdit={handleSaveRowEdit}
                    onCancelEdit={cancelRowEdit}
                    onDelete={() => deleteRow("debts", d.id)}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {debts.length === 0 && addingTo !== "debts" && (
          <div className="empty">
            <div className="empty__emoji">💳</div>
            <div className="empty__title">Sin deudas</div>
            <div className="empty__subtitle">¡Genial! O añade tu primera con el botón +</div>
          </div>
        )}
      </div>

      {debts.length > 0 && (
        <div style={{
          padding: "10px 14px", marginTop: 6,
          background: "var(--bg-subtle)", borderRadius: "var(--radius-md)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5 }}>Total</span>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--danger)" }}>{fmt(totalDebtPending)}</div>
            <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>Cuotas mensuales: {fmt(totalCuota)}</div>
          </div>
        </div>
      )}
    </Section>
  );
}
