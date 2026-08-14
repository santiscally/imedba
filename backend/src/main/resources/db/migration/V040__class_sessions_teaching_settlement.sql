-- =============================================================================
-- V040 — Liquidación de horas docentes y preceptoras.
--
-- Modela la hoja «HS DOCENTE» de `liquidaciones-planilla-completa-20260730.xlsx`
-- y la liquidación que sale de ella. Fórmulas confirmadas por Nico el 2026-07-30
-- (doc 17 §3.2):
--
--   DOCENTE:    total = Σ horas_a_pagar × valor_hora_docente          ($75.000)
--   PRECEPTORA: total = (Σ horas_a_pagar + 0,25 × nro_clases) × valor  ($6.500)
--
--   El 0,25 es un cuarto de hora POR CLASE —los 15 minutos de anticipación—,
--   NO un recargo del 25% sobre el total. Las dos lecturas sólo coinciden si las
--   clases duran exactamente 1 hora.
--
--   Sólo entran las clases SINCRÓNICAS: «las asincrónicas no tienen preceptora,
--   podés desestimarlas y que sea solo una liquidación de clases en vivo».
--
-- POR QUÉ UNA TABLA NUEVA Y NO `hour_logs`
--   `hour_logs` es un agregado mensual (staff × actividad × mes). La grilla real
--   es POR CLASE y necesita datos que ahí no existen: fecha, materia, comisión,
--   sincrónica/asincrónica y —sobre todo— la preceptora, que se asigna clase por
--   clase y no coincide con la docente de esa fila. `hour_logs` queda obsoleto:
--   no se borra acá para no romper nada, pero ya no es el camino.
-- =============================================================================

-- ─── 1) La grilla que completa la secretaría ────────────────────────────────
CREATE TABLE class_sessions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    session_date     DATE NOT NULL,
    -- Texto libre: mezcla cohortes de PREMA («COM 9», «COM 10») con
    -- «comunidad imedba», que es Residencias. La liquidación cruza las dos
    -- unidades, así que no se puede modelar como FK a una sola cosa.
    commission       VARCHAR(100),
    subject          VARCHAR(200),
    class_label      VARCHAR(300),

    -- La planilla tiene dos columnas con «X». Acá es un booleano: sólo las
    -- sincrónicas entran en la liquidación.
    is_synchronous   BOOLEAN NOT NULL DEFAULT true,

    scheduled_time   VARCHAR(50),      -- «18-20», texto tal cual la planilla
    zoom_account     VARCHAR(200),
    session_link     VARCHAR(500),

    -- Ambas nullable: en la planilla hay clases sin docente asignada (cierres de
    -- módulo) y clases sin preceptora (las asincrónicas).
    teacher_id       UUID REFERENCES staff(id),
    preceptor_id     UUID REFERENCES staff(id),

    -- Numérico a propósito. En la planilla viene como texto («2 h 50»), que es
    -- imposible de sumar sin parsear y se rompe el día que alguien escriba
    -- «2hs 50». La UI carga horas y minutos por separado.
    actual_hours     NUMERIC(6,2),
    -- La completa Cobranzas: es el chequeo final que fija el monto a facturar.
    -- Si está NULL, la liquidación cae a actual_hours.
    hours_to_pay     NUMERIC(6,2),

    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by       UUID,
    deleted_at       TIMESTAMPTZ,

    CONSTRAINT ck_class_sessions_hours CHECK (
        (actual_hours IS NULL OR actual_hours >= 0)
        AND (hours_to_pay IS NULL OR hours_to_pay >= 0))
);

CREATE INDEX idx_class_sessions_date      ON class_sessions (session_date)  WHERE deleted_at IS NULL;
CREATE INDEX idx_class_sessions_teacher   ON class_sessions (teacher_id)    WHERE deleted_at IS NULL;
CREATE INDEX idx_class_sessions_preceptor ON class_sessions (preceptor_id)  WHERE deleted_at IS NULL;
CREATE INDEX idx_class_sessions_sync      ON class_sessions (is_synchronous) WHERE deleted_at IS NULL;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON class_sessions
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

COMMENT ON TABLE class_sessions IS
    'Grilla de clases dictadas (hoja HS DOCENTE). La carga la secretaría; Cobranzas completa hours_to_pay.';
COMMENT ON COLUMN class_sessions.preceptor_id IS
    'Se asigna POR CLASE y no coincide con la docente de la fila: una clase tiene docente y preceptora distintas.';


-- ─── 2) Liquidación por persona y mes ───────────────────────────────────────
CREATE TABLE teaching_settlements (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id               UUID NOT NULL REFERENCES staff(id),
    staff_name             VARCHAR(200),   -- snapshot legible
    period_year            INTEGER NOT NULL,
    period_month           INTEGER NOT NULL,

    -- Con qué rol se liquida. Una misma persona puede aparecer como DOCENTE en
    -- unas clases y como PRECEPTORA en otras: son dos liquidaciones distintas
    -- porque el valor hora y la fórmula difieren.
    role                   VARCHAR(20) NOT NULL,

    hourly_rate            NUMERIC(12,2) NOT NULL,   -- congelado al liquidar
    /* Sólo preceptoras: horas extra por clase (0,25 = 15 min). */
    per_class_bonus_hours  NUMERIC(6,2) NOT NULL DEFAULT 0,

    class_count            INTEGER NOT NULL DEFAULT 0,
    total_hours            NUMERIC(8,2) NOT NULL DEFAULT 0,   -- Σ horas a pagar
    bonus_hours            NUMERIC(8,2) NOT NULL DEFAULT 0,   -- 0,25 × clases
    billable_hours         NUMERIC(8,2) NOT NULL DEFAULT 0,   -- total + bonus
    total_amount           NUMERIC(14,2) NOT NULL DEFAULT 0,

    -- Mismo flujo de factura que hour_logs: se le pide factura por mail, se
    -- confirma la recepción y recién ahí se paga.
    invoice_email_sent_at  TIMESTAMPTZ,
    invoice_received       BOOLEAN NOT NULL DEFAULT false,
    paid_at                TIMESTAMPTZ,

    status                 VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    notes                  TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by             UUID,

    CONSTRAINT uk_teaching_settlement UNIQUE (staff_id, period_year, period_month, role),
    CONSTRAINT ck_teaching_role   CHECK (role IN ('DOCENTE', 'PRECEPTORA')),
    CONSTRAINT ck_teaching_status CHECK (status IN ('DRAFT', 'APPROVED', 'PAID')),
    CONSTRAINT ck_teaching_period CHECK (
        period_month BETWEEN 1 AND 12 AND period_year BETWEEN 2020 AND 2100),
    CONSTRAINT ck_teaching_amounts CHECK (
        hourly_rate >= 0 AND class_count >= 0 AND total_hours >= 0
        AND bonus_hours >= 0 AND billable_hours >= 0 AND total_amount >= 0)
);

CREATE INDEX idx_teaching_settlements_staff  ON teaching_settlements (staff_id);
CREATE INDEX idx_teaching_settlements_period ON teaching_settlements (period_year, period_month);
CREATE INDEX idx_teaching_settlements_status ON teaching_settlements (status);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON teaching_settlements
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();


-- ─── 3) Detalle: qué clases entraron en cada liquidación ────────────────────
CREATE TABLE teaching_settlement_lines (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_id    UUID NOT NULL REFERENCES teaching_settlements(id) ON DELETE CASCADE,
    class_session_id UUID NOT NULL REFERENCES class_sessions(id),

    -- Snapshots: la línea tiene que seguir leyéndose aunque después editen la clase.
    session_date     DATE NOT NULL,
    commission       VARCHAR(100),
    subject          VARCHAR(200),
    class_label      VARCHAR(300),
    hours_paid       NUMERIC(6,2) NOT NULL,

    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_teaching_line_hours CHECK (hours_paid >= 0)
);

CREATE INDEX idx_teaching_lines_settlement ON teaching_settlement_lines (settlement_id);
CREATE INDEX idx_teaching_lines_session    ON teaching_settlement_lines (class_session_id);


-- ─── 4) Valores hora vigentes ───────────────────────────────────────────────
-- Confirmados por Nico el 2026-07-30. Editables desde el catálogo; el valor se
-- congela en cada liquidación, así que cambiarlos no reescribe lo ya emitido.
INSERT INTO activity_types (name, rate_per_hour, applies_to, is_active)
VALUES ('Hora docente', 75000, 'DOCENTE', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO activity_types (name, rate_per_hour, applies_to, is_active)
VALUES ('Hora preceptora', 6500, 'PRECEPTORA', true)
ON CONFLICT (name) DO NOTHING;
