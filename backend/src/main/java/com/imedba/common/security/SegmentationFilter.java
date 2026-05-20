package com.imedba.common.security;

import com.imedba.modules.course.entity.BusinessUnit;
import java.util.EnumSet;
import java.util.Set;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Calcula qué {@link BusinessUnit} puede ver el usuario autenticado, basado en
 * las authorities del JWT (Fase 9.a — segmentación Residencias ↔ Formación Superior).
 *
 * Reglas:
 * <ul>
 *   <li>{@code ROLE_admin} → ve todo (los 4 valores del enum).</li>
 *   <li>{@code residencias:read}     → suma {@code RESIDENCIAS}.</li>
 *   <li>{@code formacion_superior:read} → suma {@code FORMACION_SUPERIOR}.</li>
 *   <li>{@code EDITORIAL} y {@code GENERAL} son transversales: visibles para
 *       cualquiera que pase el {@code @PreAuthorize('<modulo>:read')} de su endpoint.</li>
 * </ul>
 *
 * El service que filtra debe pasarle el resultado al repositorio en cada query.
 * El controller mantiene el filtro por param ({@code businessUnit=...}); el service
 * valida que el valor pedido pertenezca al conjunto permitido (caso contrario lo
 * descarta o devuelve 403 según corresponda).
 */
public final class SegmentationFilter {

    private static final String ROLE_ADMIN_LOWER = "ROLE_admin";
    private static final String ROLE_ADMIN_UPPER = "ROLE_ADMIN";
    private static final String AUTH_RESIDENCIAS = "residencias:read";
    private static final String AUTH_FS          = "formacion_superior:read";

    private SegmentationFilter() {}

    /** Conjunto de business units visibles para el usuario logueado. */
    public static Set<BusinessUnit> allowedBusinessUnits() {
        return allowedBusinessUnits(SecurityContextHolder.getContext().getAuthentication());
    }

    public static Set<BusinessUnit> allowedBusinessUnits(Authentication auth) {
        Set<BusinessUnit> allowed = EnumSet.of(BusinessUnit.EDITORIAL, BusinessUnit.GENERAL);
        if (auth == null) {
            return allowed;
        }
        for (GrantedAuthority ga : auth.getAuthorities()) {
            String a = ga.getAuthority();
            if (ROLE_ADMIN_LOWER.equals(a) || ROLE_ADMIN_UPPER.equals(a)) {
                return EnumSet.allOf(BusinessUnit.class);
            }
            if (AUTH_RESIDENCIAS.equals(a)) {
                allowed.add(BusinessUnit.RESIDENCIAS);
            } else if (AUTH_FS.equals(a)) {
                allowed.add(BusinessUnit.FORMACION_SUPERIOR);
            }
        }
        return allowed;
    }

    /** {@code true} si el usuario puede ver entities de la business unit dada. */
    public static boolean canSee(BusinessUnit bu) {
        return allowedBusinessUnits().contains(bu);
    }
}
