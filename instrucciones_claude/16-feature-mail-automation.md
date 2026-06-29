# Feature — Automatización de envío de mail (owner: Fran)

> **Quién sos vos (agente nuevo).** Te pasaron este doc para que ayudes a Fran a
> (a) **investigar** la mejor herramienta de envío de mail para IMEDBA, y
> (b) **codear** la funcionalidad de envío automático de mails y un job/scheduler asociado.
>
> Es la **única pieza pendiente para cerrar el go-live**. Cuando esto esté, el sistema
> queda listo para producción (Moodle queda en paralelo, lo hace Santi).
>
> Leé primero este doc entero antes de tocar código.

---

## ⚠️ Cambio de propiedad del repo

El `CLAUDE.md` raíz dice que **backend es de Santi y frontend de Fran**. Para esta tarea
**eso cambia parcialmente**: el feature de mail lo agarra Fran (acuerdo con Santi
2026-06-28). Significa que **podés tocar `backend/src/main/java/com/imedba/modules/notification/`
y `backend/src/main/resources/` sin pedir permiso**, porque ese módulo pasa a ser
responsabilidad de Fran. **El resto del backend sigue siendo de Santi — no tocar.**

Si descubrís que el feature te obliga a tocar otra cosa del backend (ej. agregar
campo a `Enrollment`, modificar `Course`), **parar y avisar** a Fran antes; eso sí
toca coordinarlo con Santi.

---

## TL;DR — qué tenés que hacer

1. **Investigar** y proponer el proveedor de mail definitivo a usar (sección [Investigación pendiente](#investigación-pendiente---a-resolver-antes-de-codear)).
2. **Conectarlo** al `MailSender` ya abstraído del backend (1 adapter, sin tocar el resto).
3. **Implementar el mail de alta de inscripción** (template HTML + adjuntar contrato PDF generado a partir del template DOCX que pasó Jaque). Este es el primer mail que **NO** está cableado todavía — los disparadores actuales son solo cuotas vencidas / pre-suspensión.
4. **Implementar el mail de alerta día 1 de cuota** (recordatorio de pago un día antes del vencimiento).
5. **Decidir cómo generar el PDF del contrato** (4 opciones planteadas — investigar).

Lo BUENO: el scaffolding ya está. Hay `MailSender` interface, `SendGridMailSender` como
implementación de referencia, `NotificationScheduler` corriendo cron, tabla
`notifications` con status `QUEUED/SENT/FAILED/CANCELLED`, retry policy, 7 templates HTML.
Lo único que cambia al sumar un nuevo trigger o un nuevo proveedor es **1 adapter o 1 método**.

---

## Contexto del proyecto IMEDBA (en 1 minuto)

**IMEDBA** = academia de formación médica (residencias + diplomaturas + editorial). El sistema
es un monorepo que reemplaza un Excel + WhatsApp + mails sueltos. Lo construyen dos personas:

- **Santi**: backend (Java 21 / Spring Boot 3.3 / PostgreSQL 16 / Flyway / Keycloak)
- **Fran**: frontend (React 18 / TS / Vite)

**Stack productivo apuntado:** mediados/fin de junio – mediados de julio. Hoy todavía
está en dev, en breve sube a un servidor de prueba para que el cliente lo use con datos
reales. **El feature de mail es lo que gatilla el go-live.**

**Negocio relevante para este feature:**
- 1 alumno = 1 curso (no se pueden inscribir a varios). Cuando se inscribe, IMEDBA hoy le
  manda un contrato a firmar por WhatsApp/mail manual. **Queremos automatizar eso.**
- Plan de cuotas: 2 grupos (Grupo 1 vence día 10 / Grupo 2 vence día 20). Recargo 5% pasado
  el día 11 o 21 según el grupo. Suspensión Moodle día 22 (la maneja `InstallmentScheduler`,
  no tocar). **El cliente quiere alerta por mail un día antes del vencimiento.**
- Volumen real esperado: ~10 mails/día (cuotas vencidas + altas). Free tier de cualquier
  proveedor alcanza con margen.

**Doc raíz del proyecto:** [CLAUDE.md](../CLAUDE.md) — reglas de convención y stack.

---

## Estado actual del scaffolding (LEER bien)

Está documentado en detalle en [12-notificaciones-mail-whatsapp.md](12-notificaciones-mail-whatsapp.md).
Resumen rápido:

```
(disparador) ──> NotificationService.enqueue(...)
                    └─ persiste Notification (status=QUEUED) en la DB
NotificationScheduler.dispatchDueJob()  (cada 60s)
   └─ NotificationService.dispatchDueBatch()
        └─ MailSender.send(to, subject, body)   ← acá entra el proveedor real
             ├─ OK    → Notification.status=SENT
             └─ falla → retry / FAILED (MailSendException)
```

**Hoy el proveedor activo es `NoopMailSender`** (loguea `[noop-mail] to=… subject=…`
y marca SENT, no envía nada). El gate del proveedor real es la presencia de
`SENDGRID_API_KEY` env var.

### Templates ya cableados (`NotificationTemplates.java`)

7 métodos estáticos que devuelven `{subject, body}` HTML:

| Template | Disparador actual | Auth/módulo |
|---|---|---|
| `welcome(firstName, courseName)` | ⚠️ **NO disparado** — método existe, nadie lo llama | — |
| `contract(firstName, courseName)` | ⚠️ **NO disparado** — método existe, nadie lo llama | — |
| `paymentReceipt(firstName, receipt, amount, course)` | Al registrar pago (Enrollment/Payment service) | payments:write |
| `preSuspension(firstName, nroCuota, dueDate)` | Cron 06:05 AR si cuota OVERDUE con exactamente 20 días de mora | — |
| `suspended(firstName, courseName)` | Cuando `InstallmentScheduler` suspende Moodle (día 22) | — |
| `installmentDueSoon(firstName, nroCuota, dueDate, amount)` | ⚠️ **NO disparado** — método existe, nadie lo llama. Esto es el "alerta día 1" pedido por Nico |
| `settlementApproved(directorName, diploma, periodM, periodY, amount)` | Al aprobar liquidación de diplomatura | settlements:write |

**Lo que tenés que cablear**:
1. `welcome` + `contract` al disparador de alta de inscripción
2. `installmentDueSoon` al cron del día antes del vencimiento
3. **Sumar adjunto PDF** al template `contract` (hoy `MailSender.send` solo manda HTML, no soporta adjuntos — habría que extender la interfaz o el adapter).

---

## Investigación pendiente — A RESOLVER ANTES DE CODEAR

### 1. Proveedor de mail definitivo

El cliente (reunión 12-jun §8) usa hoy **EnvíaloSimple** + paga algo a Google "para enviar
muchos mails sin bloqueo" (lo configura Esteban / David). **No está claro si quieren que
nos integremos a su EnvíaloSimple o si elegimos uno propio.**

**Opciones a investigar:**

| Provider | Pros | Contras | Verificá |
|---|---|---|---|
| **EnvíaloSimple** (lo que usan hoy) | Cliente lo conoce, ya paga | API rara/limitada? Free tier? Soporte de templates dinámicos? Adjuntos? | API docs, transactional vs marketing, precio |
| **SendGrid v3** (ya tenemos adapter ref) | Adapter ya escrito, 100/día free | Verificación de sender (domain o single sender) | Si el free alcanza, si el setup es viable para IMEDBA |
| **Resend** (modern) | API simple, 100/día free, single sender sin verificar dominio | Más joven, menos features | Adjuntos OK? Templates? |
| **Amazon SES** | Muy barato, escala | Setup más pesado (DKIM, SPF) | Si IMEDBA tiene AWS ya. Quota inicial baja |
| **Mailgun** | Robusto, EU + US | Free tier limitado | Quota free vs pago |
| **SMTP directo** (Gmail / cliente) | 0 dependencias externas | App password / OAuth, no escalable | Si cliente prefiere usar su propio SMTP |
| **Spring Mail + cualquier SMTP** | Provider-agnostic, fácil de swappear | Implementación más larga | Compatible con todas las opciones anteriores |

**Preguntas que tenés que hacerle a Fran** (o que Fran le tiene que preguntar al cliente):
- ¿Quieren que mandemos desde el dominio `@imedba.com`? Si sí, alguien tiene que configurar
  DKIM/SPF en el DNS de IMEDBA (probablemente David lo hace — confirmar).
- ¿Pueden compartir credenciales/API key de EnvíaloSimple para evaluarlo?
- ¿Tienen problema con que mandemos desde `no-reply@imedba.com` o quieren un mail real
  monitoreado?
- ¿Hay un límite de presupuesto?

### 2. Generación del PDF del contrato

El template oficial está en [`contratos/contrato-template-final.docx`](contratos/contrato-template-final.docx)
(detalle en [15-contrato-alumno-template.md](15-contrato-alumno-template.md)).

Hay que rellenarlo con datos del alumno/curso/inscripción y mandarlo como adjunto. **Opciones a investigar:**

| Opción | Pros | Contras |
|---|---|---|
| **A. docx4j** (rellenar DOCX) + conversión a PDF (LibreOffice headless / Aspose) | Fidelidad 100% al template de Jaque | Pesado, dependencia nativa (LibreOffice en el container) |
| **B. Reescribir como HTML+CSS** → wkhtmltopdf / Puppeteer | Control total del rendering | Hay que mantener "dos templates" (DOCX para el cliente / HTML para el sistema) |
| **C. SendGrid Dynamic Templates** | Si elegimos SendGrid, los hace ellos | Lock-in al proveedor, sin PDF — es solo HTML email |
| **D. iText + plantilla programática** | Sin Office en el container, rápido | Hay que reescribir el contrato como código Java |
| **E. Apache POI XWPF** (manipular DOCX), exportar PDF con Aspose o XDocReport | Similar a A pero más liviano | XDocReport está medio abandonado |

**Recomendación de partida** (a validar): **B (HTML→PDF con wkhtmltopdf)** — control total
del rendering, fácil de mantener desde código, el HTML del contrato lo podemos generar como
template parecido a los que ya hay. El DOCX queda como **fuente de verdad para que Jaque
modifique** si cambia algo, y se re-traduce a HTML cuando haga falta.

### 3. ¿Adjuntos en `MailSender`?

La interfaz hoy es `void send(String to, String subject, String body)` — solo HTML. Para
adjuntar el contrato PDF habría que extender. Dos formas:

- **Variante mínima**: agregar segundo método `send(to, subject, body, List<Attachment>)`.
  Adapter Noop ignora attachments, adapters reales los suben.
- **Variante limpia**: pasar a un DTO `MailRequest{to, subject, body, attachments, …}`.
  Más expresivo, futuro-proof (CC/BCC, replyTo, headers).

Recomendación: variante limpia. Es 1 archivo nuevo + ajustar 2 adapters.

---

## Lo que el cliente pidió (reunión 12-jun §8)

De [14-requerimientos-reunion-20260612.md](14-requerimientos-reunion-20260612.md) §8:

> - Es **lo único grande pendiente para el go-live**.
> - **Mails automáticos requeridos:**
>   - **Alta de inscripción** → enviar **recibo** + **contrato (PDF) a firmar** con la info.
>   - **Alerta día 1** de cuota (recordatorio de pago) por mail.
> - **Nico va a pasar**: textos predeterminados + los PDFs que se envían automáticamente.

Estado de los inputs del cliente:

| Input | Quién | Estado |
|---|---|---|
| Template del contrato | Jaque | ✅ Llegó 2026-06-28 — [`contratos/contrato-template-final.docx`](contratos/contrato-template-final.docx) |
| Texto del mail "alta inscripción" | Nico | 🟡 Pendiente — Fran tiene que pedírselo |
| Texto del mail "alerta día 1" | Nico | 🟡 Pendiente — Fran tiene que pedírselo |
| Texto del recibo (si va aparte del contrato) | Nico | 🟡 Pendiente — confirmar si es 1 mail con 2 adjuntos o 2 mails |
| Proveedor de mail elegido | Cliente | 🟡 Pendiente — investigación arriba |

**Si Nico tarda en pasar los textos, podés arrancar con copy genérico y reemplazarlo después.**
Los templates Java ya están parametrizados — cambiar el body es 1 línea.

---

## Archivos importantes (paths absolutos al root del repo)

### Backend — todo lo de mail vive acá

**Módulo notificaciones** ([backend/src/main/java/com/imedba/modules/notification/](../backend/src/main/java/com/imedba/modules/notification/)):
- [`mail/MailSender.java`](../backend/src/main/java/com/imedba/modules/notification/mail/MailSender.java) — **la interfaz**. Lo que ve el resto de la app.
- [`mail/SendGridMailSender.java`](../backend/src/main/java/com/imedba/modules/notification/mail/SendGridMailSender.java) — adapter de referencia, `@ConditionalOnExpression` por API key.
- [`mail/NoopMailSender.java`](../backend/src/main/java/com/imedba/modules/notification/mail/NoopMailSender.java) — default, `@ConditionalOnMissingBean`. Loguea y marca SENT.
- [`mail/MailSendException.java`](../backend/src/main/java/com/imedba/modules/notification/mail/MailSendException.java) — falla → retry / FAILED.
- [`template/NotificationTemplates.java`](../backend/src/main/java/com/imedba/modules/notification/template/NotificationTemplates.java) — los 7 templates HTML (factory static).
- [`template/NotificationTemplate.java`](../backend/src/main/java/com/imedba/modules/notification/template/NotificationTemplate.java) — DTO `{subject, body}`.
- [`scheduler/NotificationScheduler.java`](../backend/src/main/java/com/imedba/modules/notification/scheduler/NotificationScheduler.java) — cron 06:05 pre-suspensión + dispatcher cada 60s.
- [`service/NotificationService.java`](../backend/src/main/java/com/imedba/modules/notification/service/NotificationService.java) — `enqueue()`, `dispatchDueBatch()`, retry, cancel.
- [`entity/Notification.java`](../backend/src/main/java/com/imedba/modules/notification/entity/Notification.java) — row en DB.
- [`entity/NotificationStatus.java`](../backend/src/main/java/com/imedba/modules/notification/entity/NotificationStatus.java) — `QUEUED|SENT|FAILED|CANCELLED`.
- [`entity/NotificationType.java`](../backend/src/main/java/com/imedba/modules/notification/entity/NotificationType.java) — `WELCOME|CONTRACT|RECEIPT|PRE_SUSPENSION|SUSPENDED|INSTALLMENT_DUE_SOON|SETTLEMENT_APPROVED`.
- [`entity/RelatedEntityType.java`](../backend/src/main/java/com/imedba/modules/notification/entity/RelatedEntityType.java) — a qué entidad linkea la notif (ENROLLMENT, INSTALLMENT, etc.).
- [`controller/NotificationController.java`](../backend/src/main/java/com/imedba/modules/notification/controller/NotificationController.java) — `/api/v1/notifications` list / retry / cancel (read-only desde el front).
- [`repository/NotificationRepository.java`](../backend/src/main/java/com/imedba/modules/notification/repository/NotificationRepository.java) — JPA.
- [`mapper/NotificationMapper.java`](../backend/src/main/java/com/imedba/modules/notification/mapper/NotificationMapper.java) — MapStruct.

**Disparadores actuales** (de dónde se llama a `notificationService.enqueue`):
- [`backend/src/main/java/com/imedba/modules/payment/service/PaymentService.java`](../backend/src/main/java/com/imedba/modules/payment/service/PaymentService.java) — dispara `paymentReceipt` al registrar pago.
- [`backend/src/main/java/com/imedba/modules/installment/service/InstallmentScheduler.java`](../backend/src/main/java/com/imedba/modules/installment/service/InstallmentScheduler.java) — dispara `suspended` al suspender Moodle (día 22).
- [`backend/src/main/java/com/imedba/modules/diplomasettlement/service/DiplomaSettlementService.java`](../backend/src/main/java/com/imedba/modules/diplomasettlement/service/DiplomaSettlementService.java) — `settlementApproved` al aprobar.
- ⚠️ **No hay disparador de `welcome` ni `contract`** — eso lo tenés que sumar al
  [`backend/src/main/java/com/imedba/modules/enrollment/service/EnrollmentService.java`](../backend/src/main/java/com/imedba/modules/enrollment/service/EnrollmentService.java)
  (método `create()` o equivalente).
- ⚠️ **No hay cron de `installmentDueSoon`** — sumarlo a `NotificationScheduler` (similar al
  `enqueuePreSuspensionJob`, pero apuntando a cuotas que vencen mañana).

**Migraciones Flyway** ([backend/src/main/resources/db/migration/](../backend/src/main/resources/db/migration/)):
- `V008__notifications.sql` (tabla notifications original)
- Si necesitás campos nuevos (ej. adjuntos guardados, contractPdfPath en Enrollment),
  agregá una V031+. Sin pisar lo de Santi.

**Config:**
- [`backend/src/main/resources/application.yml`](../backend/src/main/resources/application.yml) — `sendgrid.api-key`, `notifications.dispatch-interval-ms`.
- [`.env.example`](../.env.example) (raíz) — plantilla de env vars; documentar `SENDGRID_API_KEY` (o lo que elijas).
- [`docker-compose.yml`](../docker-compose.yml) — pasar la env var al backend.

### Templates oficiales (input del cliente)

- [`instrucciones_claude/contratos/contrato-template-final.docx`](contratos/contrato-template-final.docx) — ⭐ el template OFICIAL nuevo que IMEDBA quiere usar. Rojas 61, 13 cláusulas, compatible con grupos 1/2 y módulo Pases.
- [`instrucciones_claude/contratos/contrato-ejemplo-rivero-ileana.pdf`](contratos/contrato-ejemplo-rivero-ileana.pdf) — ejemplo del modelo VIEJO. Solo referencia visual.
- [`instrucciones_claude/15-contrato-alumno-template.md`](15-contrato-alumno-template.md) — análisis del template + mapeo a entidades del back + diff viejo/nuevo + pendientes.

### Frontend — tie-in points (mínimo)

- [`frontend/src/types/enrollment.ts`](../frontend/src/types/enrollment.ts) — el type `Enrollment` ya tiene `contractFilePath`, `contractSentAt`, `contractSignedAt`. Cuando la pipeline mande mails, esos campos se van a llenar; el frontend ya los está esperando.
- `frontend/src/components/EnrollmentDetail.tsx` (si existe) — cuando todo funcione, sumar badge "Contrato enviado el X" y link al PDF. Hoy NO mostrar nada — sería decorativo, el back no lo setea.

### Docs de referencia obligatorias

- [12-notificaciones-mail-whatsapp.md](12-notificaciones-mail-whatsapp.md) — arquitectura detallada del scaffolding actual + decisiones tomadas (WhatsApp manual, pestaña de notificaciones eliminada).
- [14-requerimientos-reunion-20260612.md](14-requerimientos-reunion-20260612.md) — la reunión donde se cerró que mail es el último bloqueo. Ver §8.
- [15-contrato-alumno-template.md](15-contrato-alumno-template.md) — todo lo del contrato nuevo.
- [09-requerimientos-reunion-20260529-20260605.md](09-requerimientos-reunion-20260529-20260605.md) — origen del feature en la reunión funcional (§3.10, §3.1).
- [DIARIO.md](DIARIO.md) — bitácora compartida entre Claudes. **Al cerrar trabajo no trivial agregá entrada.** Convenciones en el header del archivo.
- [ESTADO.md](ESTADO.md) — snapshot del trabajo en curso. Sección "Fran / frontend" es la tuya; podés sobrescribirla cuando arranques/termines tarea. **No toques la sección de Santi.**

---

## Plan de trabajo sugerido (orden propuesto)

### Fase 0 — Investigación (sin código)
1. Evaluar EnvíaloSimple vs alternatives. Pedirle a Fran info del cliente.
2. Decidir proveedor + presentar a Fran con pros/contras.
3. Decidir cómo generar el PDF (HTML→PDF recomendado por mí; investigar alternativas).
4. Decidir si extender `MailSender` con adjuntos (recomendado: DTO `MailRequest`).

### Fase 1 — Conectar el proveedor real
1. Implementar adapter del proveedor elegido (si es nuevo) o setear `SENDGRID_API_KEY` (si seguimos con SendGrid).
2. Verificar end-to-end: encolar un mail de prueba → `NotificationScheduler` lo despacha → llega al inbox.

### Fase 2 — Trigger de alta de inscripción
1. Extender `MailSender` para soportar adjuntos.
2. Implementar generación del PDF a partir del template DOCX (o reescribir como HTML).
3. Wire en `EnrollmentService.create()` — al final del flujo, encolar:
   - 1 notif `WELCOME` (texto bienvenida)
   - 1 notif `CONTRACT` con el PDF adjunto
   - (Pedirle a Nico aclaración: ¿recibo también va al alta o solo cuando paga la matrícula?)
4. Setear `Enrollment.contractFilePath` con el path del PDF generado.

### Fase 3 — Cron de alerta día 1
1. Agregar `@Scheduled` en `NotificationScheduler.enqueueInstallmentDueSoon()`.
2. Lógica: buscar cuotas con `due_date = today + 1` y status `PENDING`. Encolar `installmentDueSoon` por cada una.
3. Cuidado con duplicar: usar `lastAlertSentAt` en `Installment` (o agregar el campo si no existe) para no spamear.

### Fase 4 — Frontend (Fran toca esto, no el agente)
- Badge "Contrato enviado" + link en `EnrollmentDetail`.
- Quizás re-habilitar la página `/notificaciones` como bandeja (hoy está eliminada — fue decisión, no error). Confirmar con Fran si quiere.

### Fase 5 — Cierre
- Doc en `DIARIO.md` con todo lo hecho.
- Smoke test e2e contra stack levantado.
- Avisar a Santi que está cerrado y se puede deployar a servidor de prueba.

---

## Convenciones del proyecto que tenés que respetar

1. **Backend Java**: paquete base `com.imedba`. Cada módulo en `modules/<nombre>/` con
   `entity/repository/service/controller/dto/`. Migraciones Flyway `V0NN__descripcion.sql`.
2. **Comentarios**: minimalistas. Solo el WHY no obvio. No explicar qué hace código bien
   nombrado. No referenciar la tarea o el caller — eso va al commit message.
3. **DIARIO**: al cerrar tarea no trivial, append-only. Formato en el header del archivo.
4. **ESTADO**: sobrescribir tu sección al empezar/terminar. No tocar la de Santi.
5. **Commits**: `feat(notification): ...` / `feat(mail): ...` etc. Co-author Claude al final.
   No incluir mensaje promocional ("Generated with Claude Code").
6. **No skip hooks** (--no-verify) sin pedido explícito del usuario.
7. **Tests**: si agregás lógica de negocio, sumar test en `backend/src/test/...` (estilo
   de los existentes).
8. **Si necesitás modificar archivos fuera de `modules/notification/`** (ej. `EnrollmentService`,
   tabla nueva en Flyway, frontend), **avisar a Fran antes** — esos son cambios cross-cutting
   que pueden chocar con Santi.

---

## Comandos útiles

```bash
# Levantar stack completo
docker compose up -d --build

# Solo backend (re-aplica migrations)
docker compose up -d --build backend

# Ver logs del scheduler
docker compose logs -f backend | grep -E "Notifications|Pre-suspension|noop-mail"

# Encolar un mail de prueba a mano (psql)
docker compose exec -T db psql -U imedba -d imedba

# Tests unit (en docker porque host puede no tener Java 21)
docker compose exec backend ./mvnw test

# Build local del backend (si tenés Java 21)
cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

---

## Glosario rápido

- **NoopMailSender / NoopWhatsAppSender**: implementaciones que loguean y simulan envío. Default cuando no hay credenciales.
- **Dispatcher**: el job que cada 60s saca notifs en QUEUED y las manda.
- **Pre-suspension**: aviso al alumno "te suspenden Moodle en 2 días" — se manda cuando la cuota cumple 20 días vencida. La suspensión efectiva (día 22) la hace `InstallmentScheduler`, no este módulo.
- **Catch-up al startup**: cuando el back arranca, corre el cron de recargos (5%) sobre cuotas vencidas porque Spring no recupera ticks perdidos (si la app estuvo apagada a las 06:00, se perdió el job). Documentado en DIARIO 06-09 de Santi.
- **`lastAlertSentAt`**: campo en `Installment` para no spamear con el mismo recordatorio. Verificar que existe (si no, agregarlo con V031+).

---

Cualquier duda, pregúntale a Fran. Buena suerte 🚀
