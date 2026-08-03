package com.imedba.common.pdf;

/** Falla al renderizar el comprobante. El handler global la mapea a 500. */
public class SettlementPdfException extends RuntimeException {
    public SettlementPdfException(String message, Throwable cause) {
        super(message, cause);
    }
}
