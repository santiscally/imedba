package com.imedba.modules.diploma;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.imedba.common.error.BadRequestException;
import com.imedba.common.error.ConflictException;
import com.imedba.modules.course.entity.BusinessUnit;
import com.imedba.modules.course.entity.Course;
import com.imedba.modules.course.repository.CourseRepository;
import com.imedba.modules.course.service.CourseService;
import com.imedba.modules.diploma.dto.CommissionRequest;
import com.imedba.modules.diploma.dto.DiplomaCreateRequest;
import com.imedba.modules.diploma.dto.DiplomaResponse;
import com.imedba.modules.diploma.dto.DiplomaUpdateRequest;
import com.imedba.modules.diploma.entity.Diploma;
import com.imedba.modules.diploma.mapper.DiplomaMapper;
import com.imedba.modules.diploma.repository.DiplomaRepository;
import com.imedba.modules.diploma.service.DiplomaService;
import com.imedba.modules.staff.repository.StaffRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DiplomaServiceTests {

    @Mock private DiplomaRepository repository;
    @Mock private CourseRepository courseRepository;
    @Mock private CourseService courseService;
    @Mock private StaffRepository staffRepository;

    private DiplomaService service;

    @BeforeEach
    void setUp() {
        DiplomaMapper mapper = new DiplomaMapper() {};
        service = new DiplomaService(repository, mapper, courseRepository, courseService, staffRepository);
        lenient().when(repository.save(any(Diploma.class))).thenAnswer(inv -> withId(inv.getArgument(0)));
        lenient().when(courseRepository.save(any(Course.class))).thenAnswer(inv -> withId(inv.getArgument(0)));
    }

    @Test
    @DisplayName("el alta crea la diplomatura general y su primera comisión como curso FS")
    void create_with_first_commission() {
        DiplomaResponse out = service.create(new DiplomaCreateRequest(
                "Diplomatura PREMA", "UNTREF", null, List.of(), commission(11)));

        assertThat(out.commissions()).hasSize(1);
        var com = out.commissions().get(0);
        assertThat(com.name()).isEqualTo("Diplomatura PREMA · Comisión 11");
        assertThat(com.commission()).isEqualTo(11);
        assertThat(com.coursePrice()).isEqualByComparingTo("900000");
        assertThat(com.includesPremaBook()).isTrue();
        assertThat(com.startDate()).isEqualTo(LocalDate.of(2026, 8, 1));
        verify(courseRepository).save(org.mockito.ArgumentMatchers.argThat(c ->
                c.getBusinessUnit() == BusinessUnit.FORMACION_SUPERIOR && c.getDiploma() != null));
    }

    @Test
    @DisplayName("no deja repetir el número de comisión dentro de la misma diplomatura")
    void duplicate_commission_number_is_conflict() {
        Diploma d = existing("Diplomatura PREMA");
        service.createCommission(d.getId(), commission(10));

        assertThatThrownBy(() -> service.createCommission(d.getId(), commission(10)))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("comisión 10");
    }

    @Test
    @DisplayName("rechaza una comisión con cierre anterior al inicio")
    void commission_dates_validated() {
        Diploma d = existing("Diplomatura PREMA");
        CommissionRequest bad = new CommissionRequest(12, 2027, null, null, false,
                LocalDate.of(2027, 6, 1), LocalDate.of(2027, 1, 1), null, null, null);

        assertThatThrownBy(() -> service.createCommission(d.getId(), bad))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("renombrar la diplomatura renombra sus comisiones; darla de baja las desactiva")
    void rename_and_deactivate_cascade() {
        Diploma d = existing("Diplomatura PREMA");
        service.createCommission(d.getId(), commission(10));

        service.update(d.getId(), new DiplomaUpdateRequest("Diplomatura Prematuros", null, null, null, false));

        Course c = d.getCommissions().get(0);
        assertThat(c.getName()).isEqualTo("Diplomatura Prematuros · Comisión 10");
        assertThat(c.getActive()).isFalse();
    }

    @Test
    @DisplayName("borrar una comisión delega en CourseService (que bloquea si tiene inscripciones)")
    void delete_commission_delegates() {
        Diploma d = existing("Diplomatura PREMA");
        UUID courseId = service.createCommission(d.getId(), commission(10)).id();

        service.deleteCommission(d.getId(), courseId);

        verify(courseService).deleteCourse(any(Course.class));
        assertThat(d.getCommissions()).isEmpty();
    }

    private Diploma existing(String name) {
        Diploma d = withId(Diploma.builder().name(name).commissions(new ArrayList<>())
                .directors(new ArrayList<>()).build());
        when(repository.findById(d.getId())).thenReturn(Optional.of(d));
        return d;
    }

    private static CommissionRequest commission(int number) {
        return new CommissionRequest(number, 2026, new BigDecimal("150000"), new BigDecimal("900000"),
                true, LocalDate.of(2026, 8, 1), LocalDate.of(2027, 1, 31), null, null, null);
    }

    private static <T extends com.imedba.common.entity.BaseEntity> T withId(T e) {
        if (e.getId() == null) e.setId(UUID.randomUUID());
        return e;
    }
}
