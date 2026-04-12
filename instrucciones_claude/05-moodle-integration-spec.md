# Especificación de Integración con Moodle - IMEDBA

> **Propósito**: Este documento está diseñado para compartir con el programador/administrador de Moodle de IMEDBA. Contiene las preguntas técnicas y los requerimientos de integración necesarios para conectar el nuevo sistema de gestión con la plataforma Moodle existente.

---

## 1. Contexto

IMEDBA está desarrollando un sistema de gestión interna (backoffice) que necesita comunicarse con Moodle para sincronizar el estado de los alumnos. El sistema de gestión será el "sistema maestro" (source of truth) para datos de alumnos, inscripciones y pagos. Moodle será el destino para reflejar estos estados.

## 2. Información que Necesitamos del Lado Moodle

### 2.1 Datos del Entorno
Por favor completar:

| Dato | Valor |
|------|-------|
| URL de Moodle | `https://...` |
| Versión de Moodle | ej: 4.1, 4.3, etc. |
| Tipo de instalación | Estándar / Cloud / Fork / Personalizado |
| Hosting de Moodle | Servidor propio / Cloud / Proveedor |
| ¿Tiene API REST habilitada? | Sí / No |
| ¿Tiene Web Services habilitados? | Sí / No |
| ¿Existe un token de servicio externo? | Sí / No |

### 2.2 Acceso API
Necesitamos que se configure un **usuario de servicio** con un **token de API** que tenga permisos para las operaciones listadas abajo.

Para habilitar la API REST de Moodle:
1. Ir a **Administración del sitio → Plugins → Servicios web → Administrar protocolos** → Habilitar REST
2. Crear un **servicio externo** dedicado para IMEDBA (Administración → Plugins → Servicios web → Servicios externos)
3. Agregar las **funciones** listadas en la sección 3
4. Crear un **token** para un usuario con los permisos necesarios

### 2.3 Mapeo de Cursos
Necesitamos una lista de los cursos actuales en Moodle con sus IDs:

| Nombre del Curso en Moodle | Moodle Course ID | Equivalente IMEDBA |
|----------------------------|-------------------|-------------------|
| (completar) | (completar) | (completar) |

## 3. Funciones API Requeridas

Necesitamos que las siguientes funciones estén habilitadas en el servicio externo de IMEDBA:

### 3.1 Gestión de Usuarios

| Función Moodle | Propósito en IMEDBA |
|---------------|---------------------|
| `core_user_create_users` | Crear usuario cuando se inscribe un alumno nuevo |
| `core_user_get_users` | Buscar si el alumno ya existe en Moodle (por email o username) |
| `core_user_get_users_by_field` | Buscar usuario por campo específico (email, DNI) |
| `core_user_update_users` | Actualizar datos del alumno (nombre, email, etc.) |
| `core_user_get_user_preferences` | Consultar estado del usuario |

### 3.2 Inscripción a Cursos

| Función Moodle | Propósito en IMEDBA |
|---------------|---------------------|
| `enrol_manual_enrol_users` | Inscribir alumno en un curso después del pago |
| `enrol_manual_unenrol_users` | Desinscribir alumno (para cancelaciones definitivas) |
| `core_enrol_get_enrolled_users` | Verificar alumnos inscriptos en un curso |
| `core_enrol_get_users_courses` | Ver cursos de un alumno |

### 3.3 Suspensión y Reactivación

| Función Moodle | Propósito en IMEDBA |
|---------------|---------------------|
| `enrol_manual_enrol_users` (con `suspend=1`) | Suspender acceso al curso por mora |
| `enrol_manual_enrol_users` (con `suspend=0`) | Reactivar acceso cuando regulariza pago |
| `core_user_update_users` (con `suspended=1/0`) | Suspender/reactivar cuenta de usuario completa |

**Pregunta clave**: ¿Prefieren suspender la **inscripción al curso** o suspender la **cuenta de usuario completa**? Recomendamos suspender la inscripción al curso para que el alumno no pierda su historial.

## 4. Flujos de Integración

### 4.1 Alta de Alumno
```
Sistema IMEDBA                              Moodle
     │                                        │
     │  1. Buscar usuario por email            │
     │ ──────────────────────────────────────► │
     │  core_user_get_users_by_field           │
     │ ◄────────────────────────────────────── │
     │                                        │
     │  2a. Si no existe → Crear usuario       │
     │ ──────────────────────────────────────► │
     │  core_user_create_users                 │
     │  {username, firstname, lastname,        │
     │   email, password (autogenerado)}       │
     │ ◄────────────────────────────────────── │
     │  Retorna: moodle_user_id                │
     │                                        │
     │  3. Inscribir en curso                  │
     │ ──────────────────────────────────────► │
     │  enrol_manual_enrol_users               │
     │  {userid, courseid, roleid=5}           │
     │  (roleid 5 = student)                   │
     │ ◄────────────────────────────────────── │
     │                                        │
```

### 4.2 Suspensión por Mora
```
Sistema IMEDBA                              Moodle
     │                                        │
     │  Alumno tiene mora > 20 días            │
     │                                        │
     │  1. Suspender inscripción               │
     │ ──────────────────────────────────────► │
     │  enrol_manual_enrol_users               │
     │  {userid, courseid, suspend=1}          │
     │ ◄────────────────────────────────────── │
     │                                        │
     │  ** El alumno NO puede acceder al       │
     │  ** curso pero su usuario sigue activo  │
     │  ** y sus datos/progreso se conservan   │
```

### 4.3 Reactivación por Pago
```
Sistema IMEDBA                              Moodle
     │                                        │
     │  Se registra pago que regulariza deuda  │
     │                                        │
     │  1. Reactivar inscripción               │
     │ ──────────────────────────────────────► │
     │  enrol_manual_enrol_users               │
     │  {userid, courseid, suspend=0}          │
     │ ◄────────────────────────────────────── │
     │                                        │
     │  ** El alumno recupera acceso al curso  │
```

## 5. Datos que Enviaremos a Moodle (Crear Usuario)

```json
{
  "users": [
    {
      "username": "alumno_12345",
      "firstname": "Juan",
      "lastname": "Pérez",
      "email": "juan.perez@gmail.com",
      "password": "TempPass2026!",
      "auth": "manual",
      "preferences": [
        {
          "type": "auth_forcepasswordchange",
          "value": "1"
        }
      ],
      "customfields": [
        {
          "type": "dni",
          "value": "35123456"
        }
      ]
    }
  ]
}
```

**Pregunta**: ¿Tienen campos personalizados (`customfields`) configurados en Moodle? ¿Cuáles? Necesitamos saber para mapear correctamente DNI, teléfono, etc.

## 6. Preguntas para el Programador de Moodle

1. ¿Qué versión exacta de Moodle están usando?
2. ¿El protocolo REST está habilitado? Si no, ¿pueden habilitarlo?
3. ¿Ya existe un servicio externo configurado? Si no, ¿pueden crear uno con las funciones listadas en la sección 3?
4. ¿Pueden generar un token de API para el servicio externo?
5. ¿Usan el plugin de inscripción manual (`enrol_manual`)? Este es necesario para inscribir/suspender vía API.
6. ¿Tienen campos personalizados de usuario configurados? ¿Cuáles?
7. ¿Hay algún plugin personalizado o regla que interfiera con las inscripciones manuales?
8. ¿Cómo manejan actualmente las contraseñas iniciales de los alumnos? ¿Auto-generadas, enviadas por email?
9. ¿El Moodle tiene habilitado el envío de emails propio (para notificar al alumno su alta)?
10. ¿Cuál es la URL base de la API REST? (Normalmente: `https://su-moodle.com/webservice/rest/server.php`)
11. ¿Qué `roleid` usan para el rol "estudiante"? (Default Moodle = 5, pero puede estar personalizado)
12. ¿Hay límites de rate limiting en la API?
13. ¿Podemos tener acceso a un entorno de pruebas/staging de Moodle para testing?

## 7. Requisitos Técnicos de Conexión

### Desde nuestro sistema necesitamos:
- **URL base de Moodle**: `https://...`
- **Token de servicio web**: string alfanumérico
- **Formato de respuesta**: JSON (default)
- **Protocolo**: HTTPS (obligatorio para producción)

### Ejemplo de llamada API:
```
POST https://moodle.imedba.com/webservice/rest/server.php
Content-Type: application/x-www-form-urlencoded

wstoken=TOKEN_AQUI
&wsfunction=core_user_get_users_by_field
&moodlewsrestformat=json
&field=email
&values[0]=juan.perez@gmail.com
```

## 8. Consideraciones de Seguridad

- El token de API debe tener **solo los permisos necesarios** (principio de mínimo privilegio).
- La comunicación debe ser exclusivamente por **HTTPS**.
- El token se almacenará como **variable de entorno** en nuestro servidor, nunca en código.
- Todas las operaciones de Moodle quedan registradas en nuestro `moodle_sync_logs`.

## 9. Plan de Implementación

| Paso | Responsable | Descripción |
|------|------------|-------------|
| 1 | Programador Moodle | Habilitar API REST y crear servicio externo |
| 2 | Programador Moodle | Generar token y compartirlo de forma segura |
| 3 | Programador Moodle | Compartir lista de cursos con IDs |
| 4 | Programador Moodle | Configurar entorno de pruebas |
| 5 | Equipo desarrollo IMEDBA | Implementar cliente Moodle en Spring Boot |
| 6 | Ambos equipos | Testing conjunto en staging |
| 7 | Ambos equipos | Deploy y verificación en producción |

---

> **Contacto**: Este documento debe compartirse con el programador de Moodle lo antes posible para que las configuraciones estén listas cuando se llegue a la Fase 7 del plan de desarrollo.
