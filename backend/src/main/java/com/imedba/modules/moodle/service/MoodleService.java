package com.imedba.modules.moodle.service;

import com.imedba.common.error.ConflictException;
import com.imedba.modules.course.entity.Course;
import com.imedba.modules.enrollment.repository.EnrollmentRepository;
import com.imedba.modules.moodle.client.MoodleClient;
import com.imedba.modules.moodle.config.MoodleProperties;
import com.imedba.modules.moodle.dto.MoodleGradeItem;
import com.imedba.modules.moodle.dto.MoodleLinkResult;
import com.imedba.modules.moodle.dto.MoodleLinkSummary;
import com.imedba.modules.moodle.dto.MoodleLookupResult;
import com.imedba.modules.moodle.dto.MoodleUser;
import com.imedba.modules.moodle.dto.UnlinkedStudentRow;
import com.imedba.modules.student.entity.Student;
import com.imedba.modules.student.repository.StudentRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Orquesta la integración Moodle a nivel de dominio. El resto de la app habla con
 * este servicio, no con {@link MoodleClient} directo.
 *
 * <p>Decisión de David (reunión 2026-05-29): la suspensión por mora se aplica a nivel
 * de CUENTA de usuario ({@code core_user_update_users suspended=1}), NO desmatriculando
 * del curso. Por eso suspend/activate operan sobre {@code student.moodleUserId}.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MoodleService {

    private final MoodleClient client;
    private final MoodleProperties props;
    private final StudentRepository studentRepository;
    private final EnrollmentRepository enrollmentRepository;

    public boolean isEnabled() {
        return client.isEnabled();
    }

    /**
     * true si el scheduler puede suspender morosos en masa. Requiere la integración
     * prendida ({@code moodle.enabled=true}) Y el flag específico {@code auto-suspend-enabled}.
     * Mientras sea false, la suspensión por mora es manual desde la UI.
     */
    public boolean isAutoSuspendEnabled() {
        return client.isEnabled() && props.isAutoSuspendEnabled();
    }

    /**
     * Valida un email contra Moodle SIN persistir (botón "Validar con Moodle" del alta de
     * alumno). Operación de sólo lectura: no escribe en la DB ni suspende nada en Moodle.
     */
    @Transactional(readOnly = true)
    public MoodleLookupResult lookupByEmail(String email) {
        if (!client.isEnabled()) {
            return MoodleLookupResult.disabled();
        }
        String e = email == null ? "" : email.trim();
        if (e.isBlank()) {
            return MoodleLookupResult.notFound(e);
        }
        Optional<MoodleUser> match = client.findUserByEmail(e);
        if (match.isEmpty() || match.get().id() == null) {
            return MoodleLookupResult.notFound(e);
        }
        MoodleUser u = match.get();
        return MoodleLookupResult.found(u.id(), u.fullname(), suspendedToBool(u.suspended()));
    }

    /**
     * Estado vivo de la cuenta Moodle del alumno vinculado (para decidir en la UI si se
     * muestra "Suspender" o "Reactivar"). Devuelve null si el alumno no tiene
     * {@code moodleUserId} o si la integración está deshabilitada.
     */
    @Transactional(readOnly = true)
    public MoodleUser accountFor(Student student) {
        Integer uid = student != null ? student.getMoodleUserId() : null;
        if (!client.isEnabled() || uid == null) {
            return null;
        }
        return client.findUserById(uid).orElse(null);
    }

    /**
     * Alumnos sin {@code moodle_user_id} junto con los cursos a los que están inscriptos.
     * Insumo del export para que David los cree/alinee en Moodle. No depende de que la
     * integración esté prendida: es data de nuestra propia DB.
     */
    @Transactional(readOnly = true)
    public List<UnlinkedStudentRow> listUnlinkedStudents() {
        List<Student> unlinked = studentRepository.findByMoodleUserIdIsNull();
        List<UnlinkedStudentRow> rows = new ArrayList<>(unlinked.size());
        for (Student s : unlinked) {
            List<String> courses = enrollmentRepository.findByStudentIdFetchCourse(s.getId()).stream()
                    .map(en -> en.getCourse() != null ? en.getCourse().getName() : null)
                    .filter(Objects::nonNull)
                    .distinct()
                    .toList();
            rows.add(new UnlinkedStudentRow(
                    s.getId(), s.getFirstName(), s.getLastName(),
                    s.getEmail(), s.getDni(), s.getPhone(), courses));
        }
        return rows;
    }

    private static Boolean suspendedToBool(Integer suspended) {
        return suspended == null ? null : suspended != 0;
    }

    /**
     * Vincula un alumno con su cuenta de Moodle buscando por email y, si hay match,
     * guardando el {@code moodleUserId}. El email es la clave común: los alumnos se dan
     * de alta en esta plataforma de forma independiente de Moodle (decisión 2026-06-09).
     *
     * <p>No-op informativo si la integración está deshabilitada o si no hay match.</p>
     */
    @Transactional
    public MoodleLinkResult linkStudentByEmail(Student student) {
        String email = student.getEmail();
        if (!client.isEnabled()) {
            return MoodleLinkResult.disabled(student.getId(), email);
        }
        Optional<MoodleUser> match = client.findUserByEmail(email);
        if (match.isEmpty() || match.get().id() == null) {
            return MoodleLinkResult.notFound(student.getId(), email);
        }
        int moodleUserId = match.get().id();
        student.setMoodleUserId(moodleUserId);
        studentRepository.save(student);
        log.info("Alumno {} vinculado a Moodle user {} (email {})", student.getId(), moodleUserId, email);
        return MoodleLinkResult.linked(student.getId(), email, moodleUserId);
    }

    /**
     * Intenta vincular por email TODOS los alumnos que aún no tienen {@code moodleUserId}.
     * Pensado para correr una vez cuando llega el token de David y ya hay alumnos cargados.
     */
    @Transactional
    public MoodleLinkSummary linkAllUnlinked() {
        List<Student> pending = studentRepository.findByMoodleUserIdIsNull();
        List<MoodleLinkResult> results = new ArrayList<>(pending.size());
        int linked = 0;
        for (Student s : pending) {
            MoodleLinkResult r = linkStudentByEmail(s);
            if (r.linked()) {
                linked++;
            }
            results.add(r);
        }
        return new MoodleLinkSummary(pending.size(), linked, pending.size() - linked, results);
    }

    /** Suspende la cuenta Moodle del alumno. No-op si no tiene moodleUserId o si está deshabilitado. */
    public void suspendStudent(Student student) {
        Integer uid = student != null ? student.getMoodleUserId() : null;
        if (uid == null) {
            log.debug("suspendStudent: alumno {} sin moodleUserId — se omite",
                    student != null ? student.getId() : null);
            return;
        }
        client.setUserSuspended(uid, true);
    }

    /** Reactiva la cuenta Moodle del alumno. No-op si no tiene moodleUserId o si está deshabilitado. */
    public void activateStudent(Student student) {
        Integer uid = student != null ? student.getMoodleUserId() : null;
        if (uid == null) {
            log.debug("activateStudent: alumno {} sin moodleUserId — se omite",
                    student != null ? student.getId() : null);
            return;
        }
        client.setUserSuspended(uid, false);
    }

    public List<MoodleUser> listCourseStudents(Course course) {
        return client.getEnrolledUsers(requireCourseId(course));
    }

    public List<MoodleGradeItem> studentGrades(Course course, Student student) {
        Integer cid = requireCourseId(course);
        Integer uid = student != null ? student.getMoodleUserId() : null;
        if (uid == null) {
            throw new ConflictException("El alumno no tiene moodle_user_id asignado");
        }
        return client.getUserCourseGrades(cid, uid);
    }

    private Integer requireCourseId(Course course) {
        Integer cid = course != null ? course.getMoodleCourseId() : null;
        if (cid == null) {
            throw new ConflictException("El curso no tiene moodle_course_id asignado");
        }
        return cid;
    }
}
