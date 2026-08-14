package com.imedba.common.pdf;

import java.text.Normalizer;

/**
 * PDF listo para servir: el nombre sugerido y los bytes. El nombre lo arma el
 * service porque depende del dominio (a quién y de qué período es), y el
 * controller sólo lo pasa al {@code Content-Disposition}.
 */
public record PdfFile(String filename, byte[] bytes) {

    /**
     * Normaliza un nombre para usarlo en el archivo: sin acentos, sin espacios y
     * sólo ASCII. Un {@code Content-Disposition} con «Álvarez» obliga a codificar
     * según RFC 6266 y hay clientes que lo muestran mal, así que se evita.
     */
    public static String slug(String raw) {
        if (raw == null || raw.isBlank()) return "sin-nombre";
        String noAccents = Normalizer.normalize(raw, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        String s = noAccents.toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        return s.isBlank() ? "sin-nombre" : s;
    }
}
