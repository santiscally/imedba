package com.imedba.common.error;

/**
 * Error del cliente que las anotaciones de validación no pueden expresar: típicamente
 * combinaciones de parámetros («o mandás A, o mandás B + C») que Bean Validation no
 * alcanza porque dependen de más de un campo.
 *
 * <p>Existe porque un {@code IllegalArgumentException} pelado no lo mapea el
 * {@link GlobalExceptionHandler} y termina como <b>500 «Error interno»</b>: el
 * llamador recibe un error de servidor por una equivocación propia, y el mensaje
 * que explica qué mandar nunca le llega. Mapear {@code IllegalArgumentException}
 * en bloque no es opción — la tiran también los {@code valueOf} de enums y los
 * parsers internos, y ahí un 400 con el mensaje crudo filtraría detalle interno.
 */
public class BadRequestException extends RuntimeException {
    public BadRequestException(String message) {
        super(message);
    }
}
