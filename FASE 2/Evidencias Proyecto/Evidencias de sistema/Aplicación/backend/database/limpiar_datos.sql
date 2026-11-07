BEGIN;

DELETE FROM movimiento_stock;
DELETE FROM venta_combo;
DELETE FROM jornada;
DELETE FROM disponibilidad;
DELETE FROM venta;

DELETE FROM opinion_registro;
DELETE FROM calificacion;
DELETE FROM favorito;
DELETE FROM preferencia_alergeno;

DELETE FROM menu_preparacion;
DELETE FROM menu;

DELETE FROM informacion_nutricional;
DELETE FROM preparacion_alergeno;
DELETE FROM preparacion_ingrediente;
DELETE FROM preparacion;
DELETE FROM ingrediente_alergeno;
DELETE FROM ingrediente;

DELETE FROM ticket_acceso WHERE expira_en < NOW();

COMMIT;
