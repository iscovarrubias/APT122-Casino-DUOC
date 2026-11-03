BEGIN;

ALTER TABLE opinion_registro ADD COLUMN IF NOT EXISTS autor_correo VARCHAR(150);

UPDATE opinion_registro o
   SET autor_correo = u.email
  FROM usuario u
 WHERE u.id_usuario = o.id_usuario AND o.autor_correo IS NULL;

COMMIT;
