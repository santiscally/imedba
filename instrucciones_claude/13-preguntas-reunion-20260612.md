# Preguntas abiertas — para la reunión del viernes 12-06-2026

> Lista viva de cosas que **no están claras** y conviene preguntar/confirmar en la demo.
> Sale de las dudas del usuario (2026-06-09) + los pendientes-cliente del doc `09`.

## Diplomaturas

1. **¿Dónde va "Diplomaturas" en el menú: Finanzas o Académico?**
   Hoy está en **Finanzas** por decisión de Jaque (reunión 24-04, min 27:02: *"si es diplomatura
   estaría en finanzas porque estaría ahí la liquidación"*). A nosotros nos hace ruido que un
   producto al que se inscriben alumnos no esté en Académico. Confirmar si la agrupación les
   sigue cerrando ahora que lo ven andando.

2. **Inscripción a diplomaturas — RESUELTO por diseño (2026-06-09), confirmar el modelo.**
   **La diplomatura ES un curso**: al crearla, el sistema genera automáticamente su curso en
   Formación Superior (mismo nombre/precios, sincronizados al editar). Los alumnos se inscriben
   desde Inscripciones eligiendo ese curso, con el flujo normal (cuotas, descuentos, grupos de
   pago). La liquidación suma sola lo cobrado. **Confirmar con Nico/Jaque que ese flujo les
   cierra** (¿algo distinto en diplomaturas: pago a la universidad, contrato propio, comisiones?).
   El módulo `DiplomaEnrollment` (backend, sin UI) queda legacy — si el modelo cierra, se elimina.

3. **Comisiones de diplomatura** (reunión 24-04 §3): cohortes cada 6 meses (#10 actual, #11 en
   agosto). No está construido. ¿Lo necesitan desde el día 1 o puede esperar?

## Liquidaciones ↔ Presupuesto

4. **Liquidación → Presupuesto — IMPLEMENTADO (2026-06-09), validar con Nico.**
   Al marcar la liquidación **Pagada** se asientan automáticamente los **egresos** en Presupuesto
   (unidad FS, período de la liquidación): impuestos→`TAXES`, secretaría→`SALARIES`,
   publicidad→`ADVERTISING`, administración→`OTHER`, universidad y cada directora→`SUPPLIERS`.
   La porción IMEDBA **no** se asienta (queda en la casa). El **ingreso** ya estaba: cada pago de
   cuota genera su asiento INCOME automático. Validar con Nico el **mapeo de categorías**
   (¿directoras como Proveedores está bien? ¿administración?).
5. **Cálculo exacto de la liquidación** — Nico quedó en pasarlo (doc 09 §3.11). Sin eso no se
   puede validar el `SettlementEngine` contra la realidad.

## Unidades de negocio

6. **Visibilidad por unidad**: implementamos que con la unidad "Residencias Médicas" seleccionada
   el menú **oculta Diplomaturas y Liquidaciones** (son de FS). Confirmar que ese comportamiento
   es el esperado, y si hay otras secciones que deban filtrar igual (¿Editorial?).

## Editorial

7. **Precios reales** de las dos colecciones (anillada / tradicional) y **% exactos de autorías**
   por libro/autora (doc 09 §3.4 — Nico los pasa).

## Cobranzas / datos

8. **Lista final de cursos** por ciclo lectivo (Nico, doc 09 §3.7).
9. **Categorías de egreso por escrito** (Nico, doc 09 §3.6 — el catálogo de 11 ya está cargado,
   confirmar que los nombres coincidan).

## Integraciones

10. **Moodle**: pedir a David el **token + doc de versión + estructura de DB** (sin eso la
    integración queda inerte). Confirmar **qué campos** sincronizar y si se puede leer el
    **% de uso** por alumno (lo necesita el futuro módulo Pases).
11. **Email**: decidir **proveedor de envío** (¿se quedan con SendGrid? ¿tienen cuenta?). Es lo
    único que falta para que las notificaciones automáticas salgan de verdad
    (ver `12-notificaciones-mail-whatsapp.md`). **WhatsApp queda siempre manual** (decidido 09-06).

## Otras

12. **Excel de seguimiento académico** — Meli debía un sample (pendiente desde el doc `08`).
13. **Entorno de prueba** (semana del 15): confirmar si lo que carguen ahí debe persistir a
    producción o es descartable.
