package com.imedba.modules.dashboard.controller;

import com.imedba.modules.dashboard.dto.ActivityItemResponse;
import com.imedba.modules.dashboard.dto.DashboardSummaryResponse;
import com.imedba.modules.dashboard.service.DashboardService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints del dashboard del SPA. Reunión 2026-05-22 §2.9 — refactor del dashboard
 * con refuerzo positivo arriba + operativo abajo (cuotas vencidas viven en
 * {@code /installments/overdue} dentro del módulo installments).
 *
 * <p>Auth: leer authority de {@code students:read} (es info agregada visible para
 * cualquier rol que tenga lectura de alumnos — el dashboard no expone datos
 * sensibles más allá de los KPIs y el feed).
 */
@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService service;

    @GetMapping("/summary")
    @PreAuthorize("hasAuthority('students:read')")
    public DashboardSummaryResponse summary() {
        return service.summary();
    }

    @GetMapping("/activity")
    @PreAuthorize("hasAuthority('students:read')")
    public List<ActivityItemResponse> activity() {
        return service.recentActivity();
    }
}
