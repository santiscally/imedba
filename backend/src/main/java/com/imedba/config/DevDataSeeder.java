package com.imedba.config;

import com.imedba.modules.course.entity.BusinessUnit;
import com.imedba.modules.course.entity.Course;
import com.imedba.modules.course.repository.CourseRepository;
import com.imedba.modules.enrollment.entity.Enrollment;
import com.imedba.modules.enrollment.entity.EnrollmentStatus;
import com.imedba.modules.enrollment.entity.InstallmentDistribution;
import com.imedba.modules.enrollment.entity.PaymentGroup;
import com.imedba.modules.enrollment.repository.EnrollmentRepository;
import com.imedba.modules.installment.entity.Installment;
import com.imedba.modules.installment.entity.InstallmentStatus;
import com.imedba.modules.installment.repository.InstallmentRepository;
import com.imedba.modules.installment.service.InstallmentGenerator;
import com.imedba.modules.student.entity.Student;
import com.imedba.modules.student.repository.StudentRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seed de datos de PRUEBA, SÓLO perfil {@code dev} (nunca prod — en prod la data la
 * carga IMEDBA). Idempotente: si ya hay cursos, no toca nada. Pensado para que al
 * levantar el entorno local haya cursos + alumnos + inscripciones para probar la app.
 *
 * <p>Además, si existe el alumno de prueba de Moodle ({@code Acceso.Prueba3@gmail.com},
 * vinculado por David), le crea una inscripción con cuota VENCIDA para poder tantear la
 * suspensión automática (test #2). No suspende nada por sí solo: eso depende del flag
 * {@code MOODLE_AUTO_SUSPEND_ENABLED} + el scheduler.</p>
 */
@Slf4j
@Component
@Profile("dev")
@RequiredArgsConstructor
public class DevDataSeeder implements ApplicationRunner {

    private static final ZoneId ZONE = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final String MOODLE_TEST_EMAIL = "Acceso.Prueba3@gmail.com";

    private final CourseRepository courseRepository;
    private final StudentRepository studentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final InstallmentRepository installmentRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedCatalog();
        seedMoodleTestOverdue();
    }

    private void seedCatalog() {
        if (courseRepository.count() > 0) {
            log.info("[dev-seed] ya hay cursos cargados — no seedeo catálogo de prueba.");
            return;
        }
        log.info("[dev-seed] perfil dev sin cursos: sembrando catálogo de prueba…");

        Course resi = courseRepository.save(Course.builder()
                .name("Residencia Médica — Curso Libre 2026").code("RM-LIBRE-2026")
                .businessUnit(BusinessUnit.RESIDENCIAS).modality("LIBRE").country("AR")
                .enrollmentPrice(new BigDecimal("120000")).coursePrice(new BigDecimal("1020000"))
                .academicYear(2026).build());

        courseRepository.save(Course.builder()
                .name("Diplomatura Neurodesarrollo").code("FS-NEURO-C10")
                .businessUnit(BusinessUnit.FORMACION_SUPERIOR).modality("Diplomatura Neurodesarrollo")
                .country("AR").enrollmentPrice(new BigDecimal("50000")).coursePrice(new BigDecimal("400000"))
                .academicYear(2026).commission(10).build());

        // Alumnos de prueba con emails ficticios (sirven para probar la rama "no existe en Moodle").
        Student ada = studentRepository.save(student("Ada", "Lovelace", "ada.test@example.com", "11111111"));
        Student alan = studentRepository.save(student("Alan", "Turing", "alan.test@example.com", "22222222"));
        studentRepository.save(student("Grace", "Hopper", "grace.test@example.com", "33333333"));

        enroll(ada, resi, Instant.now(), false);                                  // al día
        enroll(alan, resi, Instant.now().minus(70, ChronoUnit.DAYS), true);       // con cuotas vencidas
        log.info("[dev-seed] OK — 2 cursos, 3 alumnos, 2 inscripciones (1 con mora).");
    }

    /** Si existe el alumno vinculado de prueba y no tiene inscripción, le crea una con mora. */
    private void seedMoodleTestOverdue() {
        Student acceso = studentRepository.findAll().stream()
                .filter(s -> MOODLE_TEST_EMAIL.equalsIgnoreCase(s.getEmail()))
                .findFirst().orElse(null);
        if (acceso == null) {
            return;
        }
        if (enrollmentRepository.existsByStudentId(acceso.getId())) {
            return;
        }
        Course course = courseRepository.findAll().stream().findFirst().orElse(null);
        if (course == null) {
            return;
        }
        enroll(acceso, course, Instant.now().minus(70, ChronoUnit.DAYS), true);
        log.info("[dev-seed] {} (Moodle {}): inscripción con cuota vencida creada — lista para el test de auto-suspend.",
                MOODLE_TEST_EMAIL, acceso.getMoodleUserId());
    }

    private Student student(String firstName, String lastName, String email, String dni) {
        return Student.builder()
                .firstName(firstName).lastName(lastName).email(email).dni(dni)
                .active(true).iarPfoCompleted(false).build();
    }

    private void enroll(Student s, Course c, Instant when, boolean overdue) {
        BigDecimal coursePrice = c.getCoursePrice() != null ? c.getCoursePrice() : new BigDecimal("300000");
        BigDecimal fee = c.getEnrollmentPrice() != null ? c.getEnrollmentPrice() : new BigDecimal("50000");
        BigDecimal total = coursePrice.add(fee);

        Enrollment e = enrollmentRepository.save(Enrollment.builder()
                .student(s).course(c).enrollmentDate(when)
                .listPrice(coursePrice).discountPercentage(BigDecimal.ZERO)
                .finalPrice(total).bookPrice(BigDecimal.ZERO).enrollmentFee(fee).totalPrice(total)
                .numInstallments(3).paymentGroup(PaymentGroup.GROUP_1)
                .status(EnrollmentStatus.ACTIVE).build());

        List<Installment> cuotas = InstallmentGenerator.generate(e, InstallmentDistribution.SEPARATE);
        if (overdue) {
            LocalDate cutoff = LocalDate.now(ZONE).minusDays(1);
            for (Installment i : cuotas) {
                if (i.getDueDate().isBefore(cutoff)) {
                    i.setStatus(InstallmentStatus.OVERDUE);
                    i.setSurchargeAmount(i.getAmount().multiply(new BigDecimal("0.05"))
                            .setScale(2, RoundingMode.HALF_UP));
                }
            }
        }
        installmentRepository.saveAll(cuotas);
    }
}
