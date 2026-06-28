// ============================================================================
// DEMO ONLY — test de envío de mail por cuota vencida.
//
// Standalone (no toca el backend). Lee de la DB las cuotas OVERDUE > 10 días
// (las mismas que muestra el dashboard), arma el HTML como lo haría el
// NotificationTemplates.preSuspension del backend, y lo manda vía Resend HTTP
// API a franallende2000@gmail.com.
//
// Objetivo: mostrar que la pipeline mail+job es trivial — la infra ya existe
// (NotificationScheduler corriendo, templates, status QUEUED/SENT/FAILED). Lo
// único pendiente es el proveedor real. Acá lo simulamos por fuera con Resend.
//
// Uso:
//   RESEND_API_KEY=re_xxx node scripts/test-mail-cuota-vencida.mjs
// ============================================================================

import { execSync } from 'node:child_process'

const TO = 'franallende2000@gmail.com'
const FROM = 'IMEDBA <onboarding@resend.dev>'  // único sender permitido sin domain-verify
const RESEND_API_KEY = process.env.RESEND_API_KEY

if (!RESEND_API_KEY) {
  console.error('❌ Falta RESEND_API_KEY. Corré:')
  console.error('   RESEND_API_KEY=re_xxx node scripts/test-mail-cuota-vencida.mjs')
  process.exit(1)
}

// ─── 1) Leer una cuota OVERDUE real de la DB ────────────────────────────────
const SQL = `
SELECT s.first_name AS nombre,
       s.last_name  AS apellido,
       c.name       AS curso,
       i.number     AS cuota_n,
       i.amount + i.surcharge_amount AS monto_total,
       i.due_date,
       (CURRENT_DATE - i.due_date) AS dias_vencidos
FROM installments i
JOIN enrollments e ON i.enrollment_id = e.id
JOIN students    s ON e.student_id    = s.id
JOIN courses     c ON e.course_id     = c.id
WHERE i.status = 'OVERDUE' AND (CURRENT_DATE - i.due_date) > 10
ORDER BY (CURRENT_DATE - i.due_date) DESC
LIMIT 1;
`.trim().replace(/\s+/g, ' ')

let row
try {
  const out = execSync(
    `docker compose exec -T db psql -U imedba -d imedba -t -A -F '|' -c "${SQL}"`,
    { encoding: 'utf-8' },
  ).trim()
  if (!out) throw new Error('No hay cuotas OVERDUE > 10 días en la DB.')
  const [nombre, apellido, curso, cuotaN, monto, dueDate, dias] = out.split('|')
  row = {
    nombre, apellido, curso,
    cuotaN: Number(cuotaN),
    monto: Number(monto),
    dueDate,
    dias: Number(dias),
  }
  console.log('📋 Cuota elegida:', row)
} catch (err) {
  console.error('❌ No se pudo leer la DB:', err.message)
  process.exit(1)
}

// ─── 2) Armar el HTML (mismo estilo que NotificationTemplates.preSuspension) ─
function fmtDate(iso) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
function fmtMonto(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

const cuotaLabel = row.cuotaN === 0 ? 'matrícula' : `cuota número ${row.cuotaN}`
const subject = `IMEDBA — Recordatorio: ${cuotaLabel} vencida (${row.dias} días)`

const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#f7f8fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#374151;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:14px;padding:32px 28px;border:1px solid #f0f2f5;">
    <div style="background:linear-gradient(135deg,#08323C 0%,#1a4a56 100%);color:#fff;margin:-32px -28px 24px;padding:24px 28px;border-radius:14px 14px 0 0;">
      <div style="font-size:0.78rem;text-transform:uppercase;letter-spacing:0.08em;opacity:0.85;margin-bottom:6px;">IMEDBA · Cobranzas</div>
      <h1 style="font-size:1.4rem;font-weight:700;margin:0;letter-spacing:-0.02em;">Hola ${row.nombre},</h1>
    </div>

    <p style="font-size:0.95rem;line-height:1.55;margin:0 0 14px;">
      Tu <strong>${cuotaLabel}</strong> del curso <strong>${row.curso}</strong> figura impaga.
    </p>

    <table style="width:100%;border-collapse:collapse;margin:18px 0;">
      <tr><td style="padding:10px 0;border-bottom:1px solid #f0f2f5;color:#6b7280;font-size:0.82rem;">Vencimiento</td>
          <td style="padding:10px 0;border-bottom:1px solid #f0f2f5;text-align:right;font-weight:600;color:#111827;">${fmtDate(row.dueDate)}</td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #f0f2f5;color:#6b7280;font-size:0.82rem;">Días vencidos</td>
          <td style="padding:10px 0;border-bottom:1px solid #f0f2f5;text-align:right;">
            <span style="background:#fee2e2;color:#dc2626;padding:3px 10px;border-radius:999px;font-weight:600;font-size:0.82rem;">${row.dias} días</span>
          </td></tr>
      <tr><td style="padding:10px 0;color:#6b7280;font-size:0.82rem;">Total a pagar</td>
          <td style="padding:10px 0;text-align:right;font-weight:700;font-size:1.15rem;color:#111827;">${fmtMonto(row.monto)}</td></tr>
    </table>

    <p style="font-size:0.9rem;line-height:1.55;color:#6b7280;margin:18px 0 0;">
      El monto incluye un <strong>5% de recargo</strong> por mora.
      Si ya regularizaste, ignorá este mensaje.
    </p>

    <p style="font-size:0.85rem;color:#9ca3af;margin:28px 0 0;text-align:center;border-top:1px solid #f0f2f5;padding-top:18px;">
      — Equipo IMEDBA
    </p>
  </div>
</body></html>`

// ─── 3) Mandar por Resend HTTP API ──────────────────────────────────────────
const payload = {
  from: FROM,
  to: [TO],
  subject,
  html,
}

console.log(`\n📨 Enviando a ${TO}…`)
const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${RESEND_API_KEY}`,
  },
  body: JSON.stringify(payload),
})

const json = await res.json().catch(() => ({}))
if (!res.ok) {
  console.error(`❌ HTTP ${res.status}:`, json)
  process.exit(1)
}

console.log(`✅ Enviado. id=${json.id}`)
console.log(`📬 Chequeá la inbox de ${TO}.`)
