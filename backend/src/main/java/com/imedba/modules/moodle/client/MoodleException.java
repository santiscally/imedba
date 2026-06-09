package com.imedba.modules.moodle.client;

/**
 * Error al comunicarse con Moodle (HTTP, I/O, o respuesta de error del web service).
 * Moodle responde HTTP 200 incluso en errores funcionales, devolviendo un objeto
 * {@code {"exception":...,"errorcode":...,"message":...}} — el cliente lo detecta y
 * lanza esta excepción.
 */
public class MoodleException extends RuntimeException {

    public MoodleException(String message) {
        super(message);
    }

    public MoodleException(String message, Throwable cause) {
        super(message, cause);
    }
}
