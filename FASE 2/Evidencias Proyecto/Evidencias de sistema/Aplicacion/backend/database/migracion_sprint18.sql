BEGIN;
UPDATE categoria_menu SET nombre = 'General' WHERE nombre = 'Principal';
UPDATE opinion_registro SET categoria = 'General' WHERE categoria = 'Principal';
COMMIT;