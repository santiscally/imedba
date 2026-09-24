-- El precio de lista de la colección pasa a ser la suma de sus libros (se calcula al leer): la columna queda sin uso.
ALTER TABLE collections ALTER COLUMN price DROP NOT NULL;
