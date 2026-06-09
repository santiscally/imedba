package com.imedba.modules.moodle.dto;

/**
 * Estado de la integración Moodle para el front: si el feature flag está prendido
 * ({@code enabled}) y si además tiene URL + token cargados ({@code configured}).
 */
public record MoodleStatusResponse(boolean enabled, boolean configured) {}
