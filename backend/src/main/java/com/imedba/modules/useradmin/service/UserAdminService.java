package com.imedba.modules.useradmin.service;

import com.imedba.common.error.ConflictException;
import com.imedba.modules.useradmin.client.KeycloakAdminClient;
import com.imedba.modules.useradmin.dto.AppUserResponse;
import com.imedba.modules.useradmin.dto.CreateUserRequest;
import com.imedba.modules.useradmin.dto.ResetPasswordRequest;
import com.imedba.modules.useradmin.dto.UpdateUserRequest;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Orquesta la gestión de usuarios contra Keycloak. Única puerta de entrada del módulo
 * Personal (solo ADMIN). Si la integración está deshabilitada, falla con 409 explicativo.
 */
@Service
@RequiredArgsConstructor
public class UserAdminService {

    private final KeycloakAdminClient client;

    private void requireEnabled() {
        if (!client.isEnabled()) {
            throw new ConflictException(
                    "La gestión de usuarios está deshabilitada (keycloak.admin.enabled=false)");
        }
    }

    public List<AppUserResponse> list() {
        requireEnabled();
        return client.listUsers();
    }

    public List<String> roles() {
        return client.appRoles();
    }

    public AppUserResponse create(CreateUserRequest req) {
        requireEnabled();
        String id = client.createUser(
                req.email(), req.firstName(), req.lastName(),
                req.password(), req.role(), req.temporaryPassword());
        return new AppUserResponse(id, req.email(), req.email(),
                req.firstName(), req.lastName(), true, List.of(req.role()));
    }

    public void update(String id, UpdateUserRequest req) {
        requireEnabled();
        client.update(id, req.firstName(), req.lastName(), req.enabled(), req.role());
    }

    public void resetPassword(String id, ResetPasswordRequest req) {
        requireEnabled();
        client.resetPassword(id, req.password(), req.temporary());
    }

    public void delete(String id) {
        requireEnabled();
        client.delete(id);
    }
}
