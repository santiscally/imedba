package com.imedba.modules.moodle.controller;

import com.imedba.common.error.NotFoundException;
import com.imedba.modules.course.entity.Course;
import com.imedba.modules.course.repository.CourseRepository;
import com.imedba.modules.moodle.config.MoodleProperties;
import com.imedba.modules.moodle.dto.MoodleGradeItem;
import com.imedba.modules.moodle.dto.MoodleLinkResult;
import com.imedba.modules.moodle.dto.MoodleLinkSummary;
import com.imedba.modules.moodle.dto.MoodleStatusResponse;
import com.imedba.modules.moodle.dto.MoodleUser;
import com.imedba.modules.moodle.service.MoodleService;
import com.imedba.modules.student.entity.Student;
import com.imedba.modules.student.repository.StudentRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints de administración/inspección de la integración Moodle. Mientras
 * {@code moodle.enabled=false}, las lecturas devuelven vacío y las acciones de
 * suspensión/activación son no-op (ver {@code DisabledMoodleClientConfig}).
 */
@RestController
@RequestMapping("/api/v1/moodle")
@RequiredArgsConstructor
@Tag(name = "Moodle", description = "Integración LMS (feature-flagged)")
public class MoodleController {

    private final MoodleService moodleService;
    private final MoodleProperties props;
    private final StudentRepository studentRepository;
    private final CourseRepository courseRepository;

    @GetMapping("/status")
    @PreAuthorize("hasAuthority('moodle:read')")
    @Operation(summary = "Estado de la integración (enabled/configured)")
    public MoodleStatusResponse status() {
        return new MoodleStatusResponse(props.isEnabled(), props.isConfigured());
    }

    @GetMapping("/courses/{courseId}/students")
    @PreAuthorize("hasAuthority('moodle:read')")
    @Operation(summary = "Usuarios matriculados en el curso (Moodle)")
    public List<MoodleUser> enrolledStudents(@PathVariable UUID courseId) {
        return moodleService.listCourseStudents(course(courseId));
    }

    @GetMapping("/courses/{courseId}/students/{studentId}/grades")
    @PreAuthorize("hasAuthority('moodle:read')")
    @Operation(summary = "Notas del alumno en el curso (Moodle)")
    public List<MoodleGradeItem> grades(@PathVariable UUID courseId, @PathVariable UUID studentId) {
        return moodleService.studentGrades(course(courseId), student(studentId));
    }

    @PostMapping("/students/{studentId}/link")
    @PreAuthorize("hasAuthority('moodle:write')")
    @Operation(summary = "Vincula el alumno con su cuenta Moodle buscando por email")
    public MoodleLinkResult link(@PathVariable UUID studentId) {
        return moodleService.linkStudentByEmail(student(studentId));
    }

    @PostMapping("/link-all")
    @PreAuthorize("hasAuthority('moodle:write')")
    @Operation(summary = "Vincula por email todos los alumnos aún sin moodle_user_id")
    public MoodleLinkSummary linkAll() {
        return moodleService.linkAllUnlinked();
    }

    @PostMapping("/students/{studentId}/suspend")
    @PreAuthorize("hasAuthority('moodle:write')")
    @Operation(summary = "Suspende la cuenta Moodle del alumno")
    public void suspend(@PathVariable UUID studentId) {
        moodleService.suspendStudent(student(studentId));
    }

    @PostMapping("/students/{studentId}/activate")
    @PreAuthorize("hasAuthority('moodle:write')")
    @Operation(summary = "Reactiva la cuenta Moodle del alumno")
    public void activate(@PathVariable UUID studentId) {
        moodleService.activateStudent(student(studentId));
    }

    private Student student(UUID id) {
        return studentRepository.findById(id).orElseThrow(() -> NotFoundException.of("Student", id));
    }

    private Course course(UUID id) {
        return courseRepository.findById(id).orElseThrow(() -> NotFoundException.of("Course", id));
    }
}
