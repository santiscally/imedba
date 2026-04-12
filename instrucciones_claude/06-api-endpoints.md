# API REST Endpoints - IMEDBA

Base URL: `/api/v1` | Auth: Bearer JWT | Paginación: `?page=0&size=20&sort=createdAt,desc`

---

## Alumnos
```
GET/POST       /api/v1/students              # Listar (paginado) / Crear
GET/PUT/DELETE /api/v1/students/{id}          # Detalle / Actualizar / Borrado lógico
GET            /api/v1/students/{id}/enrollments
GET            /api/v1/students/search?q=     # Búsqueda por nombre/email/DNI
```
Permisos: `students:read`, `students:write`

## Cursos
```
GET/POST       /api/v1/courses
GET/PUT/DELETE /api/v1/courses/{id}
```
Permisos: `courses:read`, `courses:write`

## Inscripciones
```
GET/POST       /api/v1/enrollments
GET/PUT        /api/v1/enrollments/{id}
PUT            /api/v1/enrollments/{id}/suspend
PUT            /api/v1/enrollments/{id}/reactivate
GET            /api/v1/enrollments/my          # Solo vendedora logueada
```
Permisos: `enrollments:read`, `enrollments:write`

## Campañas de Descuento
```
GET/POST       /api/v1/discount-campaigns
GET/PUT/DELETE /api/v1/discount-campaigns/{id}
GET            /api/v1/discount-campaigns/active
```
Permisos: `payments:write`

## Cuotas
```
GET            /api/v1/installments            # Filtros: ?status=PENDING|OVERDUE|PAID&studentId=&courseId=
GET            /api/v1/installments/overdue
```
Permisos: `payments:read`

## Pagos
```
GET/POST       /api/v1/payments
GET            /api/v1/payments/{id}/receipt-pdf
POST           /api/v1/payments/{id}/resend-receipt
```
Permisos: `payments:read`, `payments:write`

## Libros
```
GET/POST       /api/v1/books
GET/PUT/DELETE /api/v1/books/{id}
PUT            /api/v1/books/{id}/stock        # Ajustar stock
```
Permisos: `editorial:read`, `editorial:write`, `stock:write`

## Ventas de Libros
```
GET/POST       /api/v1/book-sales
GET            /api/v1/book-sales/report?month=&year=
```

## Autores y Autorías
```
GET/POST       /api/v1/authors
PUT            /api/v1/authors/{id}
GET            /api/v1/authors/royalties?month=&year=    # Cálculo on-the-fly
```

## Diplomaturas
```
GET/POST       /api/v1/diplomas
GET/PUT        /api/v1/diplomas/{id}                     # Incluye config distribución
GET/POST       /api/v1/diploma-enrollments
```
Permisos: `settlements:read`, `settlements:write`

## Liquidaciones Formación Superior
```
GET            /api/v1/diploma-settlements
POST           /api/v1/diploma-settlements/generate       # Genera liquidación del mes
PUT            /api/v1/diploma-settlements/{id}/approve
PUT            /api/v1/diploma-settlements/{id}/mark-paid
```

## Staff (Docentes + Tutoras)
```
GET/POST       /api/v1/staff
GET/PUT        /api/v1/staff/{id}
```
Permisos: `teaching:read`, `teaching:write`

## Tipos de Actividad
```
GET/POST       /api/v1/activity-types
PUT            /api/v1/activity-types/{id}
```

## Registro de Horas
```
GET/POST       /api/v1/hour-logs?month=&year=
PUT            /api/v1/hour-logs/{id}
GET            /api/v1/hour-logs/summary?month=&year=     # Resumen liquidación
POST           /api/v1/hour-logs/send-invoices?month=&year= # Envía emails de factura
PUT            /api/v1/hour-logs/{id}/invoice-received
PUT            /api/v1/hour-logs/{id}/mark-paid
```

## Presupuesto
```
GET/POST       /api/v1/budget-entries
PUT            /api/v1/budget-entries/{id}
GET            /api/v1/budget/summary?month=&year=
GET            /api/v1/budget/income-vs-expense?year=
GET            /api/v1/budget/by-business-unit?year=
```
Permisos: `budget:read`, `budget:write`

## Contactos (Empleados + Proveedores)
```
GET/POST       /api/v1/contacts
GET/PUT        /api/v1/contacts/{id}
```

## Sedes
```
GET/POST       /api/v1/branches
PUT            /api/v1/branches/{id}
```
Permisos: `admin:manage`

## Notificaciones y Alertas
```
GET            /api/v1/notifications                     # Log de enviadas
GET            /api/v1/notifications/alerts/today        # Alertas del día
POST           /api/v1/notifications/alerts              # Crear alerta
PUT            /api/v1/notifications/{id}/dismiss        # Descartar alerta
```
Permisos: `notifications:manage`

## Dashboard
```
GET            /api/v1/dashboard/summary?year=
GET            /api/v1/dashboard/monthly?month=&year=
```
Permisos: `reports:read`
