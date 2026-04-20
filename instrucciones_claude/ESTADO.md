# ESTADO — Snapshot de trabajo en curso

> **Qué es esto.** Foto corta y actualizable de **en qué está cada uno ahora mismo**. No es historia (eso va en `DIARIO.md`), es el presente.
>
> **Regla de uso para el Claude activo:**
> - **Solo tocar la sección del dueño activo.** Santi edita "Santi / backend", el socio edita "Socio / frontend". Nunca tocar la sección del otro (evita merge conflicts).
> - **Sobreescribir, no appendear.** Esta es una foto, no un log.
> - Actualizar al **empezar** una tarea nueva y al **terminarla**.
> - Si algo está **bloqueado esperando al otro**, dejarlo explícito en la sub-sección "Bloqueado por el otro".

---

## Santi / backend / infra / db / auth

**Fase actual:** 0 — Infra (Docker + Keycloak + BaseEntity + Security). Transición a fase 1 (Students/Courses/Enrollments) ya iniciada: módulo `enrollment` con scope vendedora mergeado.

**En qué estoy ahora:**
- Arrancando fase 2: módulos `installments`, `payments`, `discount_campaigns` (el schema V004 ya está creado, falta el módulo Java).

**Próximo paso:**
- V006 migración installments (schedule + recargos día 11+ = 5%, día 22 = suspender Moodle flag).
- V007 migración payments.
- Módulos Java: `modules/installment`, `modules/payment`, `modules/discount_campaign`.
- Tests Testcontainers para el cálculo de recargos.

**Bloqueado por el otro:** nada.

**Notas para el socio:**
- El backend expone Swagger en `http://localhost:8080/swagger-ui.html`. Usar ese contrato como fuente de verdad para el SPA.
- Usuarios de prueba en Keycloak (password `test1234`): `admin@imedba.dev`, `vendedora@imedba.dev`, `secretaria@imedba.dev`, `editorial@imedba.dev`, `contable@imedba.dev`, `viewer@imedba.dev`.

---

## Socio / frontend

**Fase actual:** _(pendiente de que el socio actualice)_

**En qué estoy ahora:** _(pendiente)_

**Próximo paso:** _(pendiente)_

**Bloqueado por el otro:** _(pendiente)_

**Notas para Santi:** _(pendiente)_
