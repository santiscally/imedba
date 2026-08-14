package com.imedba.modules.staff;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.imedba.common.error.ConflictException;
import com.imedba.modules.staff.dto.StaffCreateRequest;
import com.imedba.modules.staff.dto.StaffUpdateRequest;
import com.imedba.modules.staff.entity.Staff;
import com.imedba.modules.staff.entity.StaffSegment;
import com.imedba.modules.staff.entity.StaffType;
import com.imedba.modules.staff.mapper.StaffMapper;
import com.imedba.modules.staff.repository.StaffRepository;
import com.imedba.modules.staff.service.StaffService;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Tests del alta/edición de Personal Académico (V034). Lo que se verifica es el
 * chequeo de DNI duplicado: el unique index de la DB ya lo impide, pero el service
 * lo adelanta para devolver un mensaje que diga a quién ya se tenía cargado.
 */
@ExtendWith(MockitoExtension.class)
class StaffServiceTests {

    @Mock private StaffRepository repository;
    @Mock private StaffMapper mapper;

    private StaffService service;

    @BeforeEach
    void setUp() {
        service = new StaffService(repository, mapper);
        lenient().when(mapper.toEntity(any(StaffCreateRequest.class)))
                .thenAnswer(inv -> {
                    StaffCreateRequest r = inv.getArgument(0);
                    return Staff.builder()
                            .firstName(r.firstName()).lastName(r.lastName())
                            .staffType(r.staffType()).dni(r.dni())
                            .paidByHours(r.paidByHours())
                            .build();
                });
        lenient().when(repository.save(any(Staff.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private static StaffCreateRequest create(String dni, Boolean paidByHours) {
        return new StaffCreateRequest("Iris", "Directora", "iris@imedba.dev", "1122334455",
                StaffType.DIRECTORA, dni, "Neonatología", StaffSegment.FORMACION_SUPERIOR,
                paidByHours, null, null, null);
    }

    @Test
    @DisplayName("DNI repetido al crear: 409 con el nombre de quien ya estaba cargado")
    void dni_duplicado_al_crear() {
        Staff existente = Staff.builder()
                .firstName("Norma").lastName("Otra").staffType(StaffType.DIRECTORA).dni("30111222")
                .build();
        existente.setId(UUID.randomUUID());
        when(repository.findByDni("30111222")).thenReturn(Optional.of(existente));

        assertThatThrownBy(() -> service.create(create("30111222", null)))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("30111222")
                .hasMessageContaining("Norma Otra");

        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("Editar sin cambiar el DNI no choca contra sí misma")
    void dni_propio_al_editar_no_es_conflicto() {
        UUID id = UUID.randomUUID();
        Staff propia = Staff.builder()
                .firstName("Iris").lastName("Directora").staffType(StaffType.DIRECTORA).dni("30111222")
                .build();
        propia.setId(id);
        when(repository.findById(id)).thenReturn(Optional.of(propia));
        when(repository.findByDni("30111222")).thenReturn(Optional.of(propia));

        StaffUpdateRequest req = new StaffUpdateRequest(
                null, null, null, null, null, "30111222", "Pediatría",
                StaffSegment.AMBAS, null, null, null, null, null);

        assertThatCode(() -> service.update(id, req)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Sin DNI no se chequea nada: es un campo opcional")
    void dni_vacio_no_dispara_chequeo() {
        assertThatCode(() -> service.create(create(null, null))).doesNotThrowAnyException();
        assertThatCode(() -> service.create(create("   ", null))).doesNotThrowAnyException();

        verify(repository, never()).findByDni(any());
    }

    @Test
    @DisplayName("paidByHours nulo cae en true: por defecto se liquida por horas")
    void paid_by_hours_default() {
        service.create(create("40111222", null));

        verify(repository).save(org.mockito.ArgumentMatchers.argThat(
                s -> Boolean.TRUE.equals(s.getPaidByHours())));
    }

    @Test
    @DisplayName("paidByHours=false se respeta: sueldo fijo, fuera de la liquidación por horas")
    void paid_by_hours_false_se_respeta() {
        service.create(create("41111222", Boolean.FALSE));

        verify(repository).save(org.mockito.ArgumentMatchers.argThat(
                s -> Boolean.FALSE.equals(s.getPaidByHours())));
    }
}
