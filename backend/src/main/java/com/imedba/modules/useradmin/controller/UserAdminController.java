package com.imedba.modules.useradmin.controller;

import com.imedba.modules.useradmin.dto.AppUserResponse;
import com.imedba.modules.useradmin.dto.CreateUserRequest;
import com.imedba.modules.useradmin.dto.ResetPasswordRequest;
import com.imedba.modules.useradmin.dto.UpdateUserRequest;
import com.imedba.modules.useradmin.service.UserAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Módulo Personal: gestión de usuarios de la app (viven en Keycloak). SOLO ADMIN
 * ({@code admin:manage}). Acá se dan de alta usuarios con contraseña + rol.
 */
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('admin:manage')")
@Tag(name = "Personal / Usuarios", description = "Gestión de usuarios Keycloak (solo admin)")
public class UserAdminController {

    private final UserAdminService service;

    @GetMapping
    @Operation(summary = "Lista los usuarios de la app con su rol")
    public List<AppUserResponse> list() {
        return service.list();
    }

    @GetMapping("/roles")
    @Operation(summary = "Roles de app asignables (ADMIN, VENDEDORA, …)")
    public List<String> roles() {
        return service.roles();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Crea un usuario con contraseña y rol")
    public AppUserResponse create(@Valid @RequestBody CreateUserRequest req) {
        return service.create(req);
    }

    @PutMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Edita datos / estado / rol del usuario")
    public void update(@PathVariable String id, @RequestBody UpdateUserRequest req) {
        service.update(id, req);
    }

    @PutMapping("/{id}/reset-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Blanquea la contraseña del usuario")
    public void resetPassword(@PathVariable String id, @Valid @RequestBody ResetPasswordRequest req) {
        service.resetPassword(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Elimina el usuario de Keycloak")
    public void delete(@PathVariable String id) {
        service.delete(id);
    }
}
