# Notificaciones — Mail + WhatsApp

> Estado: **toda la lógica está cableada; el proveedor real NO.** Igual que Moodle: el sistema
> arma, encola y "envía" notificaciones, pero el adapter activo por defecto es un **noop** (loguea,
> no manda nada) hasta que se decida y conecte un proveedor. Reunión origen: 2026-06-05 + pedido
> del usuario 2026-06-09.

## TL;DR para cuando se decida el proveedor de mail

1. Implementar un bean `MailSender` para el proveedor elegido (o setear `SENDGRID_API_KEY` si se
   queda con SendGrid).
2. Listo: el resto de la app no cambia. El dispatcher empieza a enviar de verdad.

Hoy, **sin `SENDGRID_API_KEY`**, el bean activo es `NoopMailSender` → los mails se loguean
(`[noop-mail] to=… subject=…`) y se marcan como enviados. La app funciona igual.

## Arquitectura del envío de mail

```
(disparador) ──> NotificationService.enqueue(...)
                    └─ persiste Notification (status QUEUED) en la DB
NotificationScheduler.dispatchDueJob()  (cada 60s)
   └─ NotificationService.dispatchDueBatch()
        └─ MailSender.send(to, subject, body)   ← acá entra el proveedor real
             ├─ OK    → Notification.status = SENT
             └─ falla → retry / FAILED (MailSendException)
```

Abstracción provider-agnostic (`modules/notification/mail/`):
- `MailSender` — interfaz (`send(to, subject, body)`). **Esto es lo único que ve la app.**
- `NoopMailSenderConfig` → `NoopMailSender` — bean por defecto (`@ConditionalOnMissingBean`).
  Activo cuando no hay otro `MailSender`. Loguea y no envía.
- `SendGridMailSender` — adapter SendGrid v3, **implementación de referencia**. Activo sólo si
  `sendgrid.api-key` tiene contenido (`@ConditionalOnExpression`). Si el día de mañana se elige
  otro proveedor (Amazon SES, Mailgun, SMTP, etc.), se agrega otro `MailSender` con la misma idea
  y se desactiva éste — **sin tocar `NotificationService` ni los schedulers**.
- `MailSendException` — error de envío; dispara el retry/FAILED del dispatcher.

Soporte:
- `template/NotificationTemplates` + `NotificationTemplate` — arman subject + body (HTML) de cada
  tipo de notificación (ej. `preSuspension(firstName, nroCuota, dueDate)`).
- `entity/Notification` (+ `NotificationStatus`, `NotificationType`, `RelatedEntityType`) — registro
  persistido de cada notificación (cola + estado + a qué entidad refiere).
- `scheduler/NotificationScheduler`:
  - **Pre-suspensión** (cron 06:05 AR): para cuotas OVERDUE con exactamente 20 días de mora, encola
    un aviso "te suspenden Moodle en 2 días". La suspensión efectiva (día 22) la hace
    `InstallmentScheduler` (engancha con Moodle, ver módulo `moodle`).
  - **Dispatcher** (cada 60s): toma el batch en cola y lo envía vía `MailSender`.

### Config mail (env vars)

| Var | Default | Qué es |
|-----|---------|--------|
| `SENDGRID_API_KEY` | *(vacío)* | si está vacío → NoopMailSender. Si tiene valor → SendGridMailSender activo |
| `SENDGRID_FROM_EMAIL` | `no-reply@imedba.local` | remitente |
| `SENDGRID_FROM_NAME` | `IMEDBA` | nombre remitente |
| `notifications.dispatch-interval-ms` | `60000` | frecuencia del dispatcher |

> El `SendGridConfig` crea un cliente "dummy" si la key está vacía, así el backend arranca sin
> credenciales. El gate real del envío es el `@ConditionalOnExpression` del `SendGridMailSender`.

## WhatsApp

Dos cosas distintas:

### 1) Aviso MANUAL de cuota vencida (YA implementado, front)
En **Cuotas → vista "Por alumno" (deudores)**, cada deudor con teléfono muestra un botón
**WhatsApp** (`WhatsAppDebtorLink` en `pages/Cuotas.tsx`). Abre `https://wa.me/<tel>?text=<msg>`
con un mensaje pre-armado (nombre, curso, cantidad de cuotas vencidas, total, próximo vencimiento).
**El envío lo decide la persona** — no es automático. Requiere que el alumno tenga `phone` cargado;
conviene que incluya código de país (ej. `54 9 11 …`) para que `wa.me` lo resuelva. El backend
expone `studentPhone` en `DebtorResponse`.

### 2) Canal automático de WhatsApp — **DESCARTADO (decisión 2026-06-09)**
**WhatsApp será SIEMPRE manual** (decisión del usuario, 2026-06-09): el canal pendiente de
proveedor es **el email**, no WhatsApp. El scaffolding `modules/notification/whatsapp/`
(`WhatsAppSender` + `NoopWhatsAppSender`, flag `WHATSAPP_ENABLED=false`) queda en el código
como stub inerte por si la decisión cambia, pero **no invertir más ahí**: no buscar proveedor,
no cablear nada. Todo lo de WhatsApp pasa por el link manual del punto 1.

## Relación con la pestaña "Notificaciones" (eliminada)

La **página** `/notificaciones` del front se eliminó (pedido 2026-06-09): no se usa como bandeja.
El **backend de notificaciones se mantiene completo** — es el motor de envío (mail + futuro WhatsApp),
no una bandeja de UI. No confundir "sacar la pestaña" con "sacar las notificaciones".

## Pendientes

- [ ] **Decidir proveedor de mail definitivo** (SendGrid / SES / Mailgun / SMTP) — es EL pendiente
      de notificaciones. Implementar/activar (1 adapter, el resto no cambia).
- [ ] Plantillas adicionales según necesidades (bienvenida con credenciales, recordatorio de pago, etc.).
- ~~Proveedor de WhatsApp automático~~ — descartado 2026-06-09: WhatsApp siempre manual.
