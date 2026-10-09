BEGIN;

DELETE FROM venta;
DELETE FROM menu_preparacion;  
DELETE FROM menu;
DELETE FROM informacion_nutricional;
DELETE FROM preparacion_alergeno;
DELETE FROM preparacion_ingrediente;
DELETE FROM preparacion;

INSERT INTO ingrediente (nombre) VALUES
  ('Arroz'), ('Arroz integral'), ('Pollo'), ('Pechuga de pollo'), ('Pechuga de pavo'),
  ('Carne de vacuno'), ('Salmón'), ('Pescado blanco'),
  ('Arvejas'), ('Zanahoria'), ('Cebolla'), ('Ajo'), ('Choclo'), ('Choclo desgranado'),
  ('Papa'), ('Zapallo'), ('Zapallito italiano'), ('Berenjena'), ('Calabacín'),
  ('Tomate'), ('Lechuga'), ('Palta'), ('Brócoli'), ('Coliflor'), ('Espinaca'),
  ('Porotos verdes'), ('Lentejas'), ('Quinoa'), ('Tallarines'),
  ('Leche'), ('Mantequilla'), ('Queso'), ('Huevo'), ('Crema'),
  ('Harina'), ('Pan rallado'), ('Salsa de tomate'),
  ('Sal'), ('Pimienta'), ('Orégano'), ('Cilantro'), ('Perejil'),
  ('Aceite'), ('Vinagre'), ('Limón'),
  ('Chocolate'), ('Azúcar'), ('Vainilla'), ('Caramelo'), ('Gelatina en polvo'),
  ('Naranja'), ('Manzana'), ('Frutilla'), ('Durazno'), ('Piña'),
  ('Té'), ('Agua mineral')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO preparacion (nombre, descripcion, precio, activa) VALUES
  ('Pollo arvejado con arroz', 'Pollo cocido con arvejas, zanahoria y arroz. Plato principal clásico de casino.', 4500, TRUE),
  ('Pastel de choclo', 'Pastel tradicional chileno con carne, pollo, cebolla y choclo.', 5000, TRUE),
  ('Cazuela de vacuno', 'Cazuela de carne de vacuno con verduras de temporada y papa.', 4800, TRUE),
  ('Arroz con pollo', 'Arroz con trozos de pollo salteados con verduras.', 3500, TRUE),
  ('Guiso de carne con papas', 'Guiso de carne con papas, zanahoria y cebolla.', 3800, TRUE),
  ('Tallarines con salsa', 'Tallarines con salsa de tomate casera.', 3200, TRUE),
  ('Budín de zapallito italiano', 'Budín de zapallito italiano con queso y pan rallado.', 3500, TRUE),
  ('Lasagna de verduras', 'Lasagna con capas de verduras frescas y queso.', 4200, TRUE),
  ('Ensalada de quinoa', 'Ensalada fría de quinoa con verduras de temporada.', 3800, TRUE),
  ('Pollo a la plancha con ensalada', 'Pechuga de pollo a la plancha con ensalada verde.', 4200, TRUE),
  ('Salmón al vapor con verduras', 'Filete de salmón cocido al vapor con verduras al dente.', 6500, TRUE),
  ('Pechuga de pavo con arroz integral', 'Pechuga de pavo con arroz integral y ensalada.', 4800, TRUE);


INSERT INTO preparacion (nombre, descripcion, precio, activa, id_tipo_componente) VALUES
  ('Ensalada chilena', 'Tomate, cebolla y cilantro con aliño.', 0, TRUE,
    (SELECT id_tipo_componente FROM tipo_componente WHERE nombre = 'Entrada')),
  ('Sopa de verduras', 'Sopa casera de verduras de temporada.', 0, TRUE,
    (SELECT id_tipo_componente FROM tipo_componente WHERE nombre = 'Entrada')),
  ('Consomé de ave', 'Consomé claro de ave con arroz y perejil.', 0, TRUE,
    (SELECT id_tipo_componente FROM tipo_componente WHERE nombre = 'Entrada')),
  ('Mousse de chocolate', 'Mousse de chocolate con crema.', 0, TRUE,
    (SELECT id_tipo_componente FROM tipo_componente WHERE nombre = 'Postre')),
  ('Jalea de frutilla', 'Jalea de frutilla individual.', 0, TRUE,
    (SELECT id_tipo_componente FROM tipo_componente WHERE nombre = 'Postre')),
  ('Flan de caramelo', 'Flan casero con caramelo.', 0, TRUE,
    (SELECT id_tipo_componente FROM tipo_componente WHERE nombre = 'Postre')),
  ('Jugo de naranja', 'Jugo natural de naranja recién exprimido.', 0, TRUE,
    (SELECT id_tipo_componente FROM tipo_componente WHERE nombre = 'Bebida')),
  ('Agua mineral', 'Vaso de agua mineral.', 0, TRUE,
    (SELECT id_tipo_componente FROM tipo_componente WHERE nombre = 'Bebida')),
  ('Té helado', 'Té helado con limón.', 0, TRUE,
    (SELECT id_tipo_componente FROM tipo_componente WHERE nombre = 'Bebida'));


INSERT INTO preparacion_ingrediente (id_preparacion, id_ingrediente)
SELECT p.id_preparacion, i.id_ingrediente
FROM preparacion p, ingrediente i
WHERE p.nombre = 'Pollo arvejado con arroz' AND i.nombre IN ('Pollo', 'Arroz', 'Arvejas', 'Zanahoria', 'Cebolla', 'Ajo');

INSERT INTO preparacion_ingrediente (id_preparacion, id_ingrediente)
SELECT p.id_preparacion, i.id_ingrediente
FROM preparacion p, ingrediente i
WHERE p.nombre = 'Pastel de choclo' AND i.nombre IN ('Choclo', 'Carne de vacuno', 'Pollo', 'Cebolla', 'Huevo', 'Leche');

INSERT INTO preparacion_ingrediente (id_preparacion, id_ingrediente)
SELECT p.id_preparacion, i.id_ingrediente
FROM preparacion p, ingrediente i
WHERE p.nombre = 'Cazuela de vacuno' AND i.nombre IN ('Carne de vacuno', 'Papa', 'Zapallo', 'Choclo', 'Porotos verdes', 'Arroz');

INSERT INTO preparacion_ingrediente (id_preparacion, id_ingrediente)
SELECT p.id_preparacion, i.id_ingrediente
FROM preparacion p, ingrediente i
WHERE p.nombre = 'Arroz con pollo' AND i.nombre IN ('Arroz', 'Pollo', 'Zanahoria', 'Cebolla', 'Arvejas');

INSERT INTO preparacion_ingrediente (id_preparacion, id_ingrediente)
SELECT p.id_preparacion, i.id_ingrediente
FROM preparacion p, ingrediente i
WHERE p.nombre = 'Guiso de carne con papas' AND i.nombre IN ('Carne de vacuno', 'Papa', 'Zanahoria', 'Cebolla', 'Salsa de tomate');

INSERT INTO preparacion_ingrediente (id_preparacion, id_ingrediente)
SELECT p.id_preparacion, i.id_ingrediente
FROM preparacion p, ingrediente i
WHERE p.nombre = 'Tallarines con salsa' AND i.nombre IN ('Tallarines', 'Salsa de tomate', 'Cebolla', 'Ajo', 'Orégano');

INSERT INTO preparacion_ingrediente (id_preparacion, id_ingrediente)
SELECT p.id_preparacion, i.id_ingrediente
FROM preparacion p, ingrediente i
WHERE p.nombre = 'Budín de zapallito italiano' AND i.nombre IN ('Zapallito italiano', 'Huevo', 'Queso', 'Pan rallado', 'Cebolla', 'Leche');

INSERT INTO preparacion_ingrediente (id_preparacion, id_ingrediente)
SELECT p.id_preparacion, i.id_ingrediente
FROM preparacion p, ingrediente i
WHERE p.nombre = 'Lasagna de verduras' AND i.nombre IN ('Tallarines', 'Berenjena', 'Calabacín', 'Tomate', 'Queso', 'Leche');

INSERT INTO preparacion_ingrediente (id_preparacion, id_ingrediente)
SELECT p.id_preparacion, i.id_ingrediente
FROM preparacion p, ingrediente i
WHERE p.nombre = 'Ensalada de quinoa' AND i.nombre IN ('Quinoa', 'Tomate', 'Palta', 'Choclo desgranado', 'Cilantro', 'Limón');

INSERT INTO preparacion_ingrediente (id_preparacion, id_ingrediente)
SELECT p.id_preparacion, i.id_ingrediente
FROM preparacion p, ingrediente i
WHERE p.nombre = 'Pollo a la plancha con ensalada' AND i.nombre IN ('Pechuga de pollo', 'Lechuga', 'Tomate', 'Palta', 'Aceite', 'Limón');

INSERT INTO preparacion_ingrediente (id_preparacion, id_ingrediente)
SELECT p.id_preparacion, i.id_ingrediente
FROM preparacion p, ingrediente i
WHERE p.nombre = 'Salmón al vapor con verduras' AND i.nombre IN ('Salmón', 'Brócoli', 'Zanahoria', 'Calabacín', 'Limón');

INSERT INTO preparacion_ingrediente (id_preparacion, id_ingrediente)
SELECT p.id_preparacion, i.id_ingrediente
FROM preparacion p, ingrediente i
WHERE p.nombre = 'Pechuga de pavo con arroz integral' AND i.nombre IN ('Pechuga de pavo', 'Arroz integral', 'Brócoli', 'Zanahoria', 'Aceite');

INSERT INTO preparacion_ingrediente (id_preparacion, id_ingrediente)
SELECT p.id_preparacion, i.id_ingrediente
FROM preparacion p, ingrediente i
WHERE p.nombre = 'Ensalada chilena' AND i.nombre IN ('Tomate', 'Cebolla', 'Cilantro', 'Aceite', 'Sal');

INSERT INTO preparacion_ingrediente (id_preparacion, id_ingrediente)
SELECT p.id_preparacion, i.id_ingrediente
FROM preparacion p, ingrediente i
WHERE p.nombre = 'Sopa de verduras' AND i.nombre IN ('Zanahoria', 'Papa', 'Zapallo', 'Porotos verdes', 'Cebolla');

INSERT INTO preparacion_ingrediente (id_preparacion, id_ingrediente)
SELECT p.id_preparacion, i.id_ingrediente
FROM preparacion p, ingrediente i
WHERE p.nombre = 'Consomé de ave' AND i.nombre IN ('Pollo', 'Arroz', 'Zanahoria', 'Perejil');

INSERT INTO preparacion_ingrediente (id_preparacion, id_ingrediente)
SELECT p.id_preparacion, i.id_ingrediente
FROM preparacion p, ingrediente i
WHERE p.nombre = 'Mousse de chocolate' AND i.nombre IN ('Chocolate', 'Crema', 'Leche', 'Huevo', 'Azúcar', 'Vainilla');

INSERT INTO preparacion_ingrediente (id_preparacion, id_ingrediente)
SELECT p.id_preparacion, i.id_ingrediente
FROM preparacion p, ingrediente i
WHERE p.nombre = 'Jalea de frutilla' AND i.nombre IN ('Gelatina en polvo', 'Frutilla', 'Azúcar');

INSERT INTO preparacion_ingrediente (id_preparacion, id_ingrediente)
SELECT p.id_preparacion, i.id_ingrediente
FROM preparacion p, ingrediente i
WHERE p.nombre = 'Flan de caramelo' AND i.nombre IN ('Leche', 'Huevo', 'Azúcar', 'Caramelo', 'Vainilla');

INSERT INTO preparacion_ingrediente (id_preparacion, id_ingrediente)
SELECT p.id_preparacion, i.id_ingrediente
FROM preparacion p, ingrediente i
WHERE p.nombre = 'Jugo de naranja' AND i.nombre IN ('Naranja');

INSERT INTO preparacion_ingrediente (id_preparacion, id_ingrediente)
SELECT p.id_preparacion, i.id_ingrediente
FROM preparacion p, ingrediente i
WHERE p.nombre = 'Agua mineral' AND i.nombre IN ('Agua mineral');

INSERT INTO preparacion_ingrediente (id_preparacion, id_ingrediente)
SELECT p.id_preparacion, i.id_ingrediente
FROM preparacion p, ingrediente i
WHERE p.nombre = 'Té helado' AND i.nombre IN ('Té', 'Limón', 'Azúcar');

INSERT INTO preparacion_alergeno (id_preparacion, id_alergeno)
SELECT p.id_preparacion, a.id_alergeno
FROM preparacion p, alergeno a
WHERE p.nombre = 'Pastel de choclo' AND a.nombre IN ('Lácteos', 'Huevo');

INSERT INTO preparacion_alergeno (id_preparacion, id_alergeno)
SELECT p.id_preparacion, a.id_alergeno
FROM preparacion p, alergeno a
WHERE p.nombre = 'Tallarines con salsa' AND a.nombre IN ('Gluten');

INSERT INTO preparacion_alergeno (id_preparacion, id_alergeno)
SELECT p.id_preparacion, a.id_alergeno
FROM preparacion p, alergeno a
WHERE p.nombre = 'Budín de zapallito italiano' AND a.nombre IN ('Gluten', 'Lácteos', 'Huevo');

INSERT INTO preparacion_alergeno (id_preparacion, id_alergeno)
SELECT p.id_preparacion, a.id_alergeno
FROM preparacion p, alergeno a
WHERE p.nombre = 'Lasagna de verduras' AND a.nombre IN ('Gluten', 'Lácteos', 'Huevo');

INSERT INTO preparacion_alergeno (id_preparacion, id_alergeno)
SELECT p.id_preparacion, a.id_alergeno
FROM preparacion p, alergeno a
WHERE p.nombre = 'Salmón al vapor con verduras' AND a.nombre IN ('Mariscos');

INSERT INTO preparacion_alergeno (id_preparacion, id_alergeno)
SELECT p.id_preparacion, a.id_alergeno
FROM preparacion p, alergeno a
WHERE p.nombre = 'Mousse de chocolate' AND a.nombre IN ('Lácteos', 'Huevo');

INSERT INTO preparacion_alergeno (id_preparacion, id_alergeno)
SELECT p.id_preparacion, a.id_alergeno
FROM preparacion p, alergeno a
WHERE p.nombre = 'Flan de caramelo' AND a.nombre IN ('Lácteos', 'Huevo');

INSERT INTO informacion_nutricional (id_preparacion, calorias, proteinas_g, carbohidratos_g, grasas_g, fuente, validado, actualizado_en)
SELECT id_preparacion, 520, 32.5, 55.0, 15.0, 'Nutricionista del casino', TRUE, CURRENT_TIMESTAMP FROM preparacion WHERE nombre = 'Pollo arvejado con arroz';

INSERT INTO informacion_nutricional (id_preparacion, calorias, proteinas_g, carbohidratos_g, grasas_g, fuente, validado, actualizado_en)
SELECT id_preparacion, 650, 35.0, 60.0, 28.0, 'Nutricionista del casino', TRUE, CURRENT_TIMESTAMP FROM preparacion WHERE nombre = 'Pastel de choclo';

INSERT INTO informacion_nutricional (id_preparacion, calorias, proteinas_g, carbohidratos_g, grasas_g, fuente, validado, actualizado_en)
SELECT id_preparacion, 480, 30.0, 40.0, 18.0, 'Nutricionista del casino', TRUE, CURRENT_TIMESTAMP FROM preparacion WHERE nombre = 'Cazuela de vacuno';

INSERT INTO informacion_nutricional (id_preparacion, calorias, proteinas_g, carbohidratos_g, grasas_g, fuente, validado, actualizado_en)
SELECT id_preparacion, 450, 25.0, 55.0, 12.0, 'Nutricionista del casino', TRUE, CURRENT_TIMESTAMP FROM preparacion WHERE nombre = 'Arroz con pollo';

INSERT INTO informacion_nutricional (id_preparacion, calorias, proteinas_g, carbohidratos_g, grasas_g, fuente, validado, actualizado_en)
SELECT id_preparacion, 430, 28.0, 35.0, 15.0, 'Nutricionista del casino', TRUE, CURRENT_TIMESTAMP FROM preparacion WHERE nombre = 'Guiso de carne con papas';

INSERT INTO informacion_nutricional (id_preparacion, calorias, proteinas_g, carbohidratos_g, grasas_g, fuente, validado, actualizado_en)
SELECT id_preparacion, 420, 14.0, 70.0, 10.0, 'Nutricionista del casino', TRUE, CURRENT_TIMESTAMP FROM preparacion WHERE nombre = 'Tallarines con salsa';

INSERT INTO informacion_nutricional (id_preparacion, calorias, proteinas_g, carbohidratos_g, grasas_g, fuente, validado, actualizado_en)
SELECT id_preparacion, 380, 18.0, 35.0, 18.0, 'Nutricionista del casino', TRUE, CURRENT_TIMESTAMP FROM preparacion WHERE nombre = 'Budín de zapallito italiano';

INSERT INTO informacion_nutricional (id_preparacion, calorias, proteinas_g, carbohidratos_g, grasas_g, fuente, validado, actualizado_en)
SELECT id_preparacion, 450, 22.0, 45.0, 20.0, 'Nutricionista del casino', TRUE, CURRENT_TIMESTAMP FROM preparacion WHERE nombre = 'Lasagna de verduras';

INSERT INTO informacion_nutricional (id_preparacion, calorias, proteinas_g, carbohidratos_g, grasas_g, fuente, validado, actualizado_en)
SELECT id_preparacion, 320, 12.0, 45.0, 10.0, 'Nutricionista del casino', TRUE, CURRENT_TIMESTAMP FROM preparacion WHERE nombre = 'Ensalada de quinoa';

INSERT INTO informacion_nutricional (id_preparacion, calorias, proteinas_g, carbohidratos_g, grasas_g, fuente, validado, actualizado_en)
SELECT id_preparacion, 350, 38.0, 8.0, 18.0, 'Nutricionista del casino', TRUE, CURRENT_TIMESTAMP FROM preparacion WHERE nombre = 'Pollo a la plancha con ensalada';

INSERT INTO informacion_nutricional (id_preparacion, calorias, proteinas_g, carbohidratos_g, grasas_g, fuente, validado, actualizado_en)
SELECT id_preparacion, 380, 35.0, 5.0, 24.0, 'Nutricionista del casino', TRUE, CURRENT_TIMESTAMP FROM preparacion WHERE nombre = 'Salmón al vapor con verduras';

INSERT INTO informacion_nutricional (id_preparacion, calorias, proteinas_g, carbohidratos_g, grasas_g, fuente, validado, actualizado_en)
SELECT id_preparacion, 340, 32.0, 38.0, 8.0, 'Nutricionista del casino', TRUE, CURRENT_TIMESTAMP FROM preparacion WHERE nombre = 'Pechuga de pavo con arroz integral';

INSERT INTO informacion_nutricional (id_preparacion, calorias, proteinas_g, carbohidratos_g, grasas_g, fuente, validado, actualizado_en)
SELECT id_preparacion, 80, 2.0, 10.0, 4.0, 'Nutricionista del casino', TRUE, CURRENT_TIMESTAMP FROM preparacion WHERE nombre = 'Ensalada chilena';

INSERT INTO informacion_nutricional (id_preparacion, calorias, proteinas_g, carbohidratos_g, grasas_g, fuente, validado, actualizado_en)
SELECT id_preparacion, 120, 4.0, 18.0, 4.0, 'Nutricionista del casino', TRUE, CURRENT_TIMESTAMP FROM preparacion WHERE nombre = 'Sopa de verduras';

INSERT INTO informacion_nutricional (id_preparacion, calorias, proteinas_g, carbohidratos_g, grasas_g, fuente, validado, actualizado_en)
SELECT id_preparacion, 90, 6.0, 8.0, 3.0, 'Nutricionista del casino', TRUE, CURRENT_TIMESTAMP FROM preparacion WHERE nombre = 'Consomé de ave';

INSERT INTO informacion_nutricional (id_preparacion, calorias, proteinas_g, carbohidratos_g, grasas_g, fuente, validado, actualizado_en)
SELECT id_preparacion, 350, 6.0, 30.0, 22.0, 'Nutricionista del casino', TRUE, CURRENT_TIMESTAMP FROM preparacion WHERE nombre = 'Mousse de chocolate';

INSERT INTO informacion_nutricional (id_preparacion, calorias, proteinas_g, carbohidratos_g, grasas_g, fuente, validado, actualizado_en)
SELECT id_preparacion, 90, 2.0, 21.0, 0.0, 'Nutricionista del casino', TRUE, CURRENT_TIMESTAMP FROM preparacion WHERE nombre = 'Jalea de frutilla';

INSERT INTO informacion_nutricional (id_preparacion, calorias, proteinas_g, carbohidratos_g, grasas_g, fuente, validado, actualizado_en)
SELECT id_preparacion, 250, 6.0, 40.0, 8.0, 'Nutricionista del casino', TRUE, CURRENT_TIMESTAMP FROM preparacion WHERE nombre = 'Flan de caramelo';

INSERT INTO informacion_nutricional (id_preparacion, calorias, proteinas_g, carbohidratos_g, grasas_g, fuente, validado, actualizado_en)
SELECT id_preparacion, 110, 2.0, 26.0, 0.0, 'Nutricionista del casino', TRUE, CURRENT_TIMESTAMP FROM preparacion WHERE nombre = 'Jugo de naranja';

INSERT INTO informacion_nutricional (id_preparacion, calorias, proteinas_g, carbohidratos_g, grasas_g, fuente, validado, actualizado_en)
SELECT id_preparacion, 0, 0, 0, 0, 'Nutricionista del casino', TRUE, CURRENT_TIMESTAMP FROM preparacion WHERE nombre = 'Agua mineral';

INSERT INTO informacion_nutricional (id_preparacion, calorias, proteinas_g, carbohidratos_g, grasas_g, fuente, validado, actualizado_en)
SELECT id_preparacion, 60, 0, 15.0, 0, 'Nutricionista del casino', TRUE, CURRENT_TIMESTAMP FROM preparacion WHERE nombre = 'Té helado';

INSERT INTO menu (id_sede, fecha, publicado)
SELECT 1, d, TRUE FROM (VALUES
  ('2026-10-05'::date),
  ('2026-10-06'),
  ('2026-10-07'),
  ('2026-10-08'),
  ('2026-10-09'),
  ('2026-10-10')
) AS t(d);

INSERT INTO menu_preparacion (id_menu, id_preparacion, id_categoria_menu, id_tipo_componente, cantidad_planificada)
SELECT
  (SELECT id_menu FROM menu WHERE fecha = t.fecha AND id_sede = 1),
  (SELECT id_preparacion FROM preparacion WHERE nombre = t.preparacion),
  (SELECT id_categoria_menu FROM categoria_menu WHERE nombre = t.categoria),
  (SELECT id_tipo_componente FROM tipo_componente WHERE nombre = t.tipo),
  t.cantidad
FROM (VALUES
  ('2026-10-05'::date, 'Pollo arvejado con arroz', 'Principal', 'Plato Principal', 40),
  ('2026-10-05', 'Arroz con pollo', 'JUNAEB', 'Plato Principal', 45),
  ('2026-10-05', 'Budín de zapallito italiano', 'Vegetariano', 'Plato Principal', 25),
  ('2026-10-05', 'Pollo a la plancha con ensalada', 'Hipocalórico', 'Plato Principal', 20),
  ('2026-10-05', 'Sopa de verduras', NULL, 'Entrada', 100),
  ('2026-10-05', 'Flan de caramelo', NULL, 'Postre', 100),
  ('2026-10-05', 'Jugo de naranja', NULL, 'Bebida', 120),
  ('2026-10-06', 'Pastel de choclo', 'Principal', 'Plato Principal', 40),
  ('2026-10-06', 'Guiso de carne con papas', 'JUNAEB', 'Plato Principal', 45),
  ('2026-10-06', 'Lasagna de verduras', 'Vegetariano', 'Plato Principal', 25),
  ('2026-10-06', 'Salmón al vapor con verduras', 'Hipocalórico', 'Plato Principal', 20),
  ('2026-10-06', 'Ensalada chilena', NULL, 'Entrada', 100),
  ('2026-10-06', 'Mousse de chocolate', NULL, 'Postre', 100),
  ('2026-10-06', 'Agua mineral', NULL, 'Bebida', 120),
  ('2026-10-07', 'Cazuela de vacuno', 'Principal', 'Plato Principal', 40),
  ('2026-10-07', 'Tallarines con salsa', 'JUNAEB', 'Plato Principal', 45),
  ('2026-10-07', 'Ensalada de quinoa', 'Vegetariano', 'Plato Principal', 25),
  ('2026-10-07', 'Pechuga de pavo con arroz integral', 'Hipocalórico', 'Plato Principal', 20),
  ('2026-10-07', 'Consomé de ave', NULL, 'Entrada', 100),
  ('2026-10-07', 'Jalea de frutilla', NULL, 'Postre', 100),
  ('2026-10-07', 'Té helado', NULL, 'Bebida', 120),
  ('2026-10-08', 'Pollo arvejado con arroz', 'Principal', 'Plato Principal', 40),
  ('2026-10-08', 'Arroz con pollo', 'JUNAEB', 'Plato Principal', 45),
  ('2026-10-08', 'Budín de zapallito italiano', 'Vegetariano', 'Plato Principal', 25),
  ('2026-10-08', 'Salmón al vapor con verduras', 'Hipocalórico', 'Plato Principal', 20),
  ('2026-10-08', 'Sopa de verduras', NULL, 'Entrada', 100),
  ('2026-10-08', 'Flan de caramelo', NULL, 'Postre', 100),
  ('2026-10-08', 'Jugo de naranja', NULL, 'Bebida', 120),
  ('2026-10-09', 'Pastel de choclo', 'Principal', 'Plato Principal', 40),
  ('2026-10-09', 'Guiso de carne con papas', 'JUNAEB', 'Plato Principal', 45),
  ('2026-10-09', 'Lasagna de verduras', 'Vegetariano', 'Plato Principal', 25),
  ('2026-10-09', 'Pechuga de pavo con arroz integral', 'Hipocalórico', 'Plato Principal', 20),
  ('2026-10-09', 'Ensalada chilena', NULL, 'Entrada', 100),
  ('2026-10-09', 'Mousse de chocolate', NULL, 'Postre', 100),
  ('2026-10-09', 'Agua mineral', NULL, 'Bebida', 120),
  ('2026-10-10', 'Cazuela de vacuno', 'Principal', 'Plato Principal', 40),
  ('2026-10-10', 'Tallarines con salsa', 'JUNAEB', 'Plato Principal', 45),
  ('2026-10-10', 'Ensalada de quinoa', 'Vegetariano', 'Plato Principal', 25),
  ('2026-10-10', 'Pollo a la plancha con ensalada', 'Hipocalórico', 'Plato Principal', 20),
  ('2026-10-10', 'Consomé de ave', NULL, 'Entrada', 100),
  ('2026-10-10', 'Jalea de frutilla', NULL, 'Postre', 100),
  ('2026-10-10', 'Té helado', NULL, 'Bebida', 120)
) AS t(fecha, preparacion, categoria, tipo, cantidad);

INSERT INTO disponibilidad (id_menu_preparacion, estado, observacion)
SELECT mp.id_menu_preparacion, 'disponible', NULL
FROM menu_preparacion mp;

UPDATE disponibilidad
SET estado = 'agotado'
WHERE id_menu_preparacion IN (
  SELECT mp.id_menu_preparacion FROM menu_preparacion mp
  JOIN menu m ON m.id_menu = mp.id_menu
  JOIN preparacion p ON p.id_preparacion = mp.id_preparacion
  WHERE m.fecha = '2026-10-06' AND p.nombre = 'Pastel de choclo'
);

UPDATE disponibilidad
SET estado = 'baja_disponibilidad'
WHERE id_menu_preparacion IN (
  SELECT mp.id_menu_preparacion FROM menu_preparacion mp
  JOIN menu m ON m.id_menu = mp.id_menu
  JOIN preparacion p ON p.id_preparacion = mp.id_preparacion
  WHERE m.fecha = '2026-10-07' AND p.nombre = 'Cazuela de vacuno'
);

COMMIT;
