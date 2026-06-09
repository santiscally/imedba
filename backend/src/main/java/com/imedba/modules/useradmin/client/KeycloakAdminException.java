package com.imedba.modules.useradmin.client;

/** Falla al hablar con el Keycloak Admin REST API. La mapea el GlobalExceptionHandler a 502/409. */
public class KeycloakAdminException extends RuntimeException {
    public KeycloakAdminException(String message) {
        super(message);
    }

    public KeycloakAdminException(String message, Throwable cause) {
        super(message, cause);
    }
}
