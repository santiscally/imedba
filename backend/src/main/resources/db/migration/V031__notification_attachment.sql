-- =============================================================================
-- V031 — Adjunto opcional en notifications.
-- Para el mail de alta de inscripción: el contrato de matrícula viaja como PDF
-- adjunto junto a la notificación CONTRACT. Los bytes se guardan acá (no en
-- filesystem: no hay infra de storage y son ~30KB por contrato) para que el
-- dispatcher los adjunte sin re-generar ni acoplar el módulo notification a
-- enrollment/course/student.
-- =============================================================================

ALTER TABLE notifications
    ADD COLUMN attachment_content  bytea,
    ADD COLUMN attachment_filename varchar(255);
