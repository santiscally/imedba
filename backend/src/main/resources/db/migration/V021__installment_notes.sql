-- Nota/aclaración por cuota (reunión IMEDBA 2026-06-05, Nico ~22:22):
-- cuando se edita manualmente el monto de una cuota (ej. "paga la mitad ahora y
-- el resto en dos cuotas"), poder dejar una aclaración en el detalle de la cuota.
ALTER TABLE installments
    ADD COLUMN notes TEXT;
