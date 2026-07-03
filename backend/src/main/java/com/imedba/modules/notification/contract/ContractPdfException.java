package com.imedba.modules.notification.contract;

/** Falla generando el PDF del contrato. */
public class ContractPdfException extends RuntimeException {

    public ContractPdfException(String message, Throwable cause) {
        super(message, cause);
    }
}
