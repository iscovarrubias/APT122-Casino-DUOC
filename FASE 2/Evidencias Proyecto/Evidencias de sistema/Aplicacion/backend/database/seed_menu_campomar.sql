BEGIN;

INSERT INTO alergeno (nombre) VALUES ('Pescado'), ('Maní') ON CONFLICT (nombre) DO NOTHING;
INSERT INTO categoria_ingrediente (nombre) VALUES
  ('Carnes y aves'), ('Pescados y mariscos'), ('Verduras y frutas'), ('Cereales y legumbres'),
  ('Lácteos y huevos'), ('Aceites, azúcar y condimentos'), ('Otros')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO ingrediente (nombre) VALUES
  ('Pechuga de pollo'), ('Pechuga de pavo'), ('Pollo'), ('Carne de vacuno'), ('Cerdo'),
  ('Salmón'), ('Pescado blanco'), ('Jaiba'), ('Arvejas'), ('Zanahoria'), ('Cebolla'),
  ('Ajo'), ('Choclo'), ('Choclo desgranado'), ('Papa'), ('Zapallo'), ('Zapallito italiano'),
  ('Berenjena'), ('Calabacín'), ('Tomate'), ('Lechuga'), ('Palta'), ('Brócoli'),
  ('Coliflor'), ('Espinaca'), ('Porotos verdes'), ('Pimentón'), ('Repollo'), ('Betarraga'),
  ('Naranja'), ('Manzana'), ('Frutilla'), ('Durazno'), ('Piña'), ('Plátano'), ('Limón'),
  ('Cilantro'), ('Perejil'), ('Arroz'), ('Arroz integral'), ('Lentejas'), ('Garbanzos'),
  ('Quinoa'), ('Tallarines'), ('Harina'), ('Pan rallado'), ('Leche'), ('Mantequilla'),
  ('Queso'), ('Crema'), ('Huevo'), ('Yogur natural'), ('Aceite'), ('Azúcar'), ('Vinagre'),
  ('Sal'), ('Pimienta'), ('Orégano'), ('Vainilla'), ('Canela'), ('Gelatina en polvo'),
  ('Té'), ('Agua mineral'), ('Chocolate'), ('Caramelo'), ('Salsa de tomate'), ('Nueces'),
  ('Acelga'), ('Atún'), ('Curry')
ON CONFLICT (nombre) DO NOTHING;

UPDATE ingrediente i SET
    id_categoria_ingrediente = c.id_categoria_ingrediente,
    calorias_100g      = v.kcal,
    proteinas_100g     = v.prot,
    carbohidratos_100g = v.carb,
    grasas_100g        = v.gras,
    sin_cuantificar    = v.sc
FROM (VALUES
  ('Pechuga de pollo', 'Carnes y aves', 120, 22.5, 0, 2.6, FALSE),
  ('Pechuga de pavo', 'Carnes y aves', 115, 23.7, 0, 1.5, FALSE),
  ('Pollo', 'Carnes y aves', 121, 19.7, 0, 4.1, FALSE),
  ('Carne de vacuno', 'Carnes y aves', 140, 21.5, 0, 5.5, FALSE),
  ('Cerdo', 'Carnes y aves', 120, 20.5, 0, 3.5, FALSE),
  ('Salmón', 'Pescados y mariscos', 208, 20.4, 0, 13.4, FALSE),
  ('Pescado blanco', 'Pescados y mariscos', 90, 18.3, 0, 1.3, FALSE),
  ('Jaiba', 'Pescados y mariscos', 83, 17.9, 0, 0.7, FALSE),
  ('Arvejas', 'Verduras y frutas', 81, 5.4, 14.5, 0.4, FALSE),
  ('Zanahoria', 'Verduras y frutas', 41, 0.9, 9.6, 0.2, FALSE),
  ('Cebolla', 'Verduras y frutas', 40, 1.1, 9.3, 0.1, FALSE),
  ('Ajo', 'Verduras y frutas', 149, 6.4, 33.1, 0.5, FALSE),
  ('Choclo', 'Verduras y frutas', 86, 3.3, 19.0, 1.4, FALSE),
  ('Choclo desgranado', 'Verduras y frutas', 86, 3.3, 19.0, 1.4, FALSE),
  ('Papa', 'Verduras y frutas', 77, 2.0, 17.0, 0.1, FALSE),
  ('Zapallo', 'Verduras y frutas', 26, 1.0, 6.5, 0.1, FALSE),
  ('Zapallito italiano', 'Verduras y frutas', 17, 1.2, 3.1, 0.3, FALSE),
  ('Berenjena', 'Verduras y frutas', 25, 1.0, 5.9, 0.2, FALSE),
  ('Calabacín', 'Verduras y frutas', 17, 1.2, 3.1, 0.3, FALSE),
  ('Tomate', 'Verduras y frutas', 18, 0.9, 3.9, 0.2, FALSE),
  ('Lechuga', 'Verduras y frutas', 15, 1.4, 2.9, 0.2, FALSE),
  ('Palta', 'Verduras y frutas', 160, 2.0, 8.5, 14.7, FALSE),
  ('Brócoli', 'Verduras y frutas', 34, 2.8, 6.6, 0.4, FALSE),
  ('Coliflor', 'Verduras y frutas', 25, 1.9, 5.0, 0.3, FALSE),
  ('Espinaca', 'Verduras y frutas', 23, 2.9, 3.6, 0.4, FALSE),
  ('Porotos verdes', 'Verduras y frutas', 31, 1.8, 7.0, 0.1, FALSE),
  ('Pimentón', 'Verduras y frutas', 31, 1.0, 6.0, 0.3, FALSE),
  ('Repollo', 'Verduras y frutas', 25, 1.3, 5.8, 0.1, FALSE),
  ('Betarraga', 'Verduras y frutas', 43, 1.6, 9.6, 0.2, FALSE),
  ('Naranja', 'Verduras y frutas', 47, 0.9, 11.8, 0.1, FALSE),
  ('Manzana', 'Verduras y frutas', 52, 0.3, 13.8, 0.2, FALSE),
  ('Frutilla', 'Verduras y frutas', 32, 0.7, 7.7, 0.3, FALSE),
  ('Durazno', 'Verduras y frutas', 39, 0.9, 9.5, 0.3, FALSE),
  ('Piña', 'Verduras y frutas', 50, 0.5, 13.1, 0.1, FALSE),
  ('Plátano', 'Verduras y frutas', 89, 1.1, 22.8, 0.3, FALSE),
  ('Limón', 'Verduras y frutas', 29, 1.1, 9.3, 0.3, FALSE),
  ('Cilantro', 'Verduras y frutas', 23, 2.1, 3.7, 0.5, FALSE),
  ('Perejil', 'Verduras y frutas', NULL, NULL, NULL, NULL, TRUE),
  ('Arroz', 'Cereales y legumbres', 360, 6.7, 79.3, 0.7, FALSE),
  ('Arroz integral', 'Cereales y legumbres', 370, 7.9, 77.2, 2.9, FALSE),
  ('Lentejas', 'Cereales y legumbres', 352, 24.6, 63.4, 1.1, FALSE),
  ('Garbanzos', 'Cereales y legumbres', 378, 20.5, 63.0, 6.0, FALSE),
  ('Quinoa', 'Cereales y legumbres', 368, 14.1, 64.2, 6.1, FALSE),
  ('Tallarines', 'Cereales y legumbres', 371, 13.0, 74.7, 1.5, FALSE),
  ('Harina', 'Cereales y legumbres', 364, 10.3, 76.3, 1.0, FALSE),
  ('Pan rallado', 'Cereales y legumbres', 395, 13.4, 72.0, 5.3, FALSE),
  ('Leche', 'Lácteos y huevos', 61, 3.2, 4.8, 3.3, FALSE),
  ('Mantequilla', 'Lácteos y huevos', 717, 0.9, 0.1, 81.1, FALSE),
  ('Queso', 'Lácteos y huevos', 356, 24.9, 2.2, 27.4, FALSE),
  ('Crema', 'Lácteos y huevos', 340, 2.1, 2.8, 36.1, FALSE),
  ('Huevo', 'Lácteos y huevos', 143, 12.6, 0.7, 9.5, FALSE),
  ('Yogur natural', 'Lácteos y huevos', 61, 3.5, 4.7, 3.3, FALSE),
  ('Aceite', 'Aceites, azúcar y condimentos', 884, 0, 0, 100, FALSE),
  ('Azúcar', 'Aceites, azúcar y condimentos', 387, 0, 100, 0, FALSE),
  ('Vinagre', 'Aceites, azúcar y condimentos', NULL, NULL, NULL, NULL, TRUE),
  ('Sal', 'Aceites, azúcar y condimentos', NULL, NULL, NULL, NULL, TRUE),
  ('Pimienta', 'Aceites, azúcar y condimentos', NULL, NULL, NULL, NULL, TRUE),
  ('Orégano', 'Aceites, azúcar y condimentos', NULL, NULL, NULL, NULL, TRUE),
  ('Vainilla', 'Aceites, azúcar y condimentos', NULL, NULL, NULL, NULL, TRUE),
  ('Canela', 'Aceites, azúcar y condimentos', NULL, NULL, NULL, NULL, TRUE),
  ('Gelatina en polvo', 'Otros', 335, 85.6, 0, 0.1, FALSE),
  ('Té', 'Otros', NULL, NULL, NULL, NULL, TRUE),
  ('Agua mineral', 'Otros', 0, 0, 0, 0, FALSE),
  ('Chocolate', 'Otros', 546, 4.9, 61.2, 31.3, FALSE),
  ('Caramelo', 'Otros', 382, 4.6, 77.0, 8.1, FALSE),
  ('Salsa de tomate', 'Otros', 38, 1.7, 8.9, 0.2, FALSE),
  ('Nueces', 'Otros', 654, 15.2, 13.7, 65.2, FALSE),
  ('Acelga', 'Verduras y frutas', 19, 1.8, 3.7, 0.2, FALSE),
  ('Atún', 'Pescados y mariscos', 116, 25.5, 0, 0.8, FALSE),
  ('Curry', 'Aceites, azúcar y condimentos', NULL, NULL, NULL, NULL, TRUE)
) AS v(nombre, categoria, kcal, prot, carb, gras, sc)
JOIN categoria_ingrediente c ON c.nombre = v.categoria
WHERE i.nombre = v.nombre;

INSERT INTO ingrediente_alergeno (id_ingrediente, id_alergeno)
SELECT i.id_ingrediente, a.id_alergeno
FROM (VALUES
  ('Leche', 'Lácteos'), ('Mantequilla', 'Lácteos'), ('Queso', 'Lácteos'),
  ('Crema', 'Lácteos'), ('Yogur natural', 'Lácteos'), ('Huevo', 'Huevo'),
  ('Harina', 'Gluten'), ('Pan rallado', 'Gluten'), ('Tallarines', 'Gluten'),
  ('Salmón', 'Pescado'), ('Pescado blanco', 'Pescado'), ('Jaiba', 'Mariscos'),
  ('Nueces', 'Frutos secos'), ('Atún', 'Pescado')
) AS v(ingrediente, alergeno)
JOIN ingrediente i ON i.nombre = v.ingrediente
JOIN alergeno a ON a.nombre = v.alergeno
ON CONFLICT DO NOTHING;

CREATE TEMP TABLE _campomar_prep (nombre VARCHAR(150), descripcion TEXT, precio INT, tipo VARCHAR(50)) ON COMMIT DROP;
INSERT INTO _campomar_prep VALUES
  ('Budín de Zapallitos Italianos con Arroz Piamontesa', 'Budín de zapallito italiano gratinado con queso, acompañado de arroz piamontesa cremoso.', 4800, 'Plato Principal'),
  ('Lentejas a la Parmesana', 'Lentejas guisadas con arroz, zanahoria y salsa de tomate, gratinadas con queso parmesano.', 4800, 'Plato Principal'),
  ('Budín de Zapallitos Italianos con Ensaladas', 'Budín de zapallito italiano horneado, acompañado de ensalada fresca de lechuga, tomate y zanahoria.', 4800, 'Plato Principal'),
  ('Budín de Acelga con Arroz Árabe', 'Budín de acelga y huevo horneado, con arroz árabe.', 4800, 'Plato Principal'),
  ('Omelette pimentón con ensaladas', 'Omelette de huevo con pimentón y cebolla, acompañado de ensalada fresca.', 4800, 'Plato Principal'),
  ('Corbatitas con Salsa Alfredo', 'Pasta corbatitas con salsa Alfredo de crema y queso.', 4800, 'Plato Principal'),
  ('Panqueques Florentinos', 'Panqueques rellenos de espinaca y queso, gratinados con salsa blanca.', 4800, 'Plato Principal'),
  ('Ensalada del Huerto', 'Ensalada de hojas verdes, tomate, zanahoria, choclo, palta y huevo duro, con un toque de queso.', 4800, 'Plato Principal'),
  ('Hamburguesa Suiza con Acelgas a la Crema', 'Hamburguesa de vacuno gratinada con queso, acompañada de acelgas a la crema.', 4800, 'Plato Principal'),
  ('Garbanzos al Curry con Arroz Perla', 'Guiso de garbanzos con verduras y curry, acompañado de arroz graneado.', 4800, 'Plato Principal'),
  ('Ensalada Nicoise', 'Ensalada de lechuga, tomate, papa, porotos verdes, huevo duro y atún.', 4800, 'Plato Principal'),
  ('Pollo Asado con Papas fritas y Arroz', 'Presa de pollo asado con papas fritas y arroz graneado.', 4800, 'Plato Principal'),
  ('Hamburguesa de Vacuno con Arroz', 'Hamburguesa casera de vacuno con arroz graneado y tomate.', 4800, 'Plato Principal'),
  ('Hamburguesa Veggie con Papas Fritas y Arroz', 'Hamburguesa vegetal de garbanzos y verduras, con papas fritas y arroz.', 4800, 'Plato Principal'),
  ('Pollo Asado con Ensaladas', 'Presa de pollo asado acompañada de ensalada fresca de lechuga, tomate y zanahoria.', 4800, 'Plato Principal'),
  ('Charquicán con huevo', 'Charquicán de carne con papa, zapallo, choclo y arvejas, coronado con huevo frito.', 4800, 'Plato Principal'),
  ('Charquicán', 'Charquicán vegetariano de papa, zapallo, choclo, arvejas y lentejas.', 4800, 'Plato Principal'),
  ('Sopa de verduras', 'Sopa casera de zanahoria, papa, zapallo y cebolla.', 0, 'Sopa'),
  ('Consomé de ave', 'Consomé claro de ave con arroz.', 0, 'Sopa'),
  ('Crema de zapallo', 'Crema suave de zapallo con leche y un toque de crema.', 0, 'Sopa'),
  ('Ensalada de repollo y zanahoria', 'Repollo y zanahoria ralladas con limón y aceite.', 0, 'Ensalada'),
  ('Ensalada chilena', 'Tomate, cebolla y cilantro con aceite.', 0, 'Ensalada'),
  ('Pan amasado', 'Pan amasado del día, una unidad.', 0, 'Pan'),
  ('Manzana', 'Manzana fresca de la estación.', 0, 'Fruta'),
  ('Naranja', 'Naranja fresca de la estación.', 0, 'Fruta'),
  ('Plátano', 'Plátano fresco de la estación.', 0, 'Fruta'),
  ('Fruta de estación', 'Fruta fresca picada de la estación.', 0, 'Postre'),
  ('Arroz con leche', 'Arroz con leche cremoso con canela.', 0, 'Postre'),
  ('Jalea de frutilla', 'Jalea de frutilla con trozos de fruta.', 0, 'Postre'),
  ('Mousse de chocolate', 'Mousse de chocolate suave y aireado.', 0, 'Postre'),
  ('Flan de caramelo', 'Flan casero con caramelo.', 0, 'Postre'),
  ('Agua mineral', 'Botella individual de agua mineral.', 0, 'Bebida'),
  ('Jugo de naranja', 'Jugo natural de naranja.', 0, 'Bebida'),
  ('Té helado', 'Té helado con limón.', 0, 'Bebida'),
  ('Jugo de piña', 'Jugo natural de piña.', 0, 'Bebida');

INSERT INTO preparacion (nombre, descripcion, precio, activa, id_tipo_componente, porciones_receta)
SELECT d.nombre, d.descripcion, d.precio, TRUE, t.id_tipo_componente, 10
FROM _campomar_prep d
JOIN tipo_componente t ON t.nombre = d.tipo
WHERE NOT EXISTS (SELECT 1 FROM preparacion p WHERE p.nombre = d.nombre);

UPDATE preparacion p SET descripcion = d.descripcion, precio = d.precio, porciones_receta = 10, activa = TRUE
FROM _campomar_prep d
WHERE p.nombre = d.nombre;

CREATE TEMP TABLE _campomar_receta (preparacion VARCHAR(150), ingrediente VARCHAR(100), cantidad_g NUMERIC(8,1)) ON COMMIT DROP;
INSERT INTO _campomar_receta VALUES
  ('Budín de Zapallitos Italianos con Arroz Piamontesa', 'Zapallito italiano', 2500),
  ('Budín de Zapallitos Italianos con Arroz Piamontesa', 'Arroz', 700),
  ('Budín de Zapallitos Italianos con Arroz Piamontesa', 'Huevo', 600),
  ('Budín de Zapallitos Italianos con Arroz Piamontesa', 'Queso', 300),
  ('Budín de Zapallitos Italianos con Arroz Piamontesa', 'Pan rallado', 200),
  ('Budín de Zapallitos Italianos con Arroz Piamontesa', 'Leche', 500),
  ('Budín de Zapallitos Italianos con Arroz Piamontesa', 'Cebolla', 300),
  ('Budín de Zapallitos Italianos con Arroz Piamontesa', 'Aceite', 60),
  ('Budín de Zapallitos Italianos con Arroz Piamontesa', 'Sal', NULL),
  ('Budín de Zapallitos Italianos con Arroz Piamontesa', 'Pimienta', NULL),
  ('Lentejas a la Parmesana', 'Lentejas', 800),
  ('Lentejas a la Parmesana', 'Arroz', 400),
  ('Lentejas a la Parmesana', 'Cebolla', 300),
  ('Lentejas a la Parmesana', 'Zanahoria', 200),
  ('Lentejas a la Parmesana', 'Queso', 200),
  ('Lentejas a la Parmesana', 'Salsa de tomate', 300),
  ('Lentejas a la Parmesana', 'Ajo', 20),
  ('Lentejas a la Parmesana', 'Aceite', 50),
  ('Lentejas a la Parmesana', 'Sal', NULL),
  ('Lentejas a la Parmesana', 'Orégano', NULL),
  ('Budín de Zapallitos Italianos con Ensaladas', 'Zapallito italiano', 2500),
  ('Budín de Zapallitos Italianos con Ensaladas', 'Huevo', 500),
  ('Budín de Zapallitos Italianos con Ensaladas', 'Queso', 200),
  ('Budín de Zapallitos Italianos con Ensaladas', 'Pan rallado', 100),
  ('Budín de Zapallitos Italianos con Ensaladas', 'Leche', 300),
  ('Budín de Zapallitos Italianos con Ensaladas', 'Aceite', 30),
  ('Budín de Zapallitos Italianos con Ensaladas', 'Lechuga', 600),
  ('Budín de Zapallitos Italianos con Ensaladas', 'Tomate', 600),
  ('Budín de Zapallitos Italianos con Ensaladas', 'Zanahoria', 300),
  ('Budín de Zapallitos Italianos con Ensaladas', 'Sal', NULL),
  ('Budín de Acelga con Arroz Árabe', 'Acelga', 1500),
  ('Budín de Acelga con Arroz Árabe', 'Arroz', 700),
  ('Budín de Acelga con Arroz Árabe', 'Huevo', 500),
  ('Budín de Acelga con Arroz Árabe', 'Queso', 250),
  ('Budín de Acelga con Arroz Árabe', 'Cebolla', 300),
  ('Budín de Acelga con Arroz Árabe', 'Pan rallado', 100),
  ('Budín de Acelga con Arroz Árabe', 'Leche', 300),
  ('Budín de Acelga con Arroz Árabe', 'Aceite', 60),
  ('Budín de Acelga con Arroz Árabe', 'Sal', NULL),
  ('Budín de Acelga con Arroz Árabe', 'Pimienta', NULL),
  ('Omelette pimentón con ensaladas', 'Huevo', 1000),
  ('Omelette pimentón con ensaladas', 'Pimentón', 400),
  ('Omelette pimentón con ensaladas', 'Cebolla', 200),
  ('Omelette pimentón con ensaladas', 'Queso', 100),
  ('Omelette pimentón con ensaladas', 'Aceite', 40),
  ('Omelette pimentón con ensaladas', 'Lechuga', 600),
  ('Omelette pimentón con ensaladas', 'Tomate', 600),
  ('Omelette pimentón con ensaladas', 'Zanahoria', 300),
  ('Omelette pimentón con ensaladas', 'Sal', NULL),
  ('Corbatitas con Salsa Alfredo', 'Tallarines', 900),
  ('Corbatitas con Salsa Alfredo', 'Crema', 500),
  ('Corbatitas con Salsa Alfredo', 'Leche', 300),
  ('Corbatitas con Salsa Alfredo', 'Queso', 300),
  ('Corbatitas con Salsa Alfredo', 'Mantequilla', 50),
  ('Corbatitas con Salsa Alfredo', 'Ajo', 20),
  ('Corbatitas con Salsa Alfredo', 'Sal', NULL),
  ('Corbatitas con Salsa Alfredo', 'Pimienta', NULL),
  ('Panqueques Florentinos', 'Harina', 500),
  ('Panqueques Florentinos', 'Leche', 800),
  ('Panqueques Florentinos', 'Huevo', 400),
  ('Panqueques Florentinos', 'Espinaca', 800),
  ('Panqueques Florentinos', 'Queso', 400),
  ('Panqueques Florentinos', 'Crema', 200),
  ('Panqueques Florentinos', 'Mantequilla', 50),
  ('Panqueques Florentinos', 'Cebolla', 200),
  ('Panqueques Florentinos', 'Aceite', 40),
  ('Panqueques Florentinos', 'Sal', NULL),
  ('Ensalada del Huerto', 'Lechuga', 1000),
  ('Ensalada del Huerto', 'Tomate', 800),
  ('Ensalada del Huerto', 'Zanahoria', 500),
  ('Ensalada del Huerto', 'Choclo desgranado', 400),
  ('Ensalada del Huerto', 'Palta', 400),
  ('Ensalada del Huerto', 'Huevo', 500),
  ('Ensalada del Huerto', 'Queso', 200),
  ('Ensalada del Huerto', 'Aceite', 60),
  ('Ensalada del Huerto', 'Limón', 100),
  ('Ensalada del Huerto', 'Sal', NULL),
  ('Hamburguesa Suiza con Acelgas a la Crema', 'Carne de vacuno', 1500),
  ('Hamburguesa Suiza con Acelgas a la Crema', 'Queso', 300),
  ('Hamburguesa Suiza con Acelgas a la Crema', 'Pan rallado', 150),
  ('Hamburguesa Suiza con Acelgas a la Crema', 'Huevo', 150),
  ('Hamburguesa Suiza con Acelgas a la Crema', 'Cebolla', 200),
  ('Hamburguesa Suiza con Acelgas a la Crema', 'Acelga', 1500),
  ('Hamburguesa Suiza con Acelgas a la Crema', 'Crema', 400),
  ('Hamburguesa Suiza con Acelgas a la Crema', 'Aceite', 80),
  ('Hamburguesa Suiza con Acelgas a la Crema', 'Sal', NULL),
  ('Hamburguesa Suiza con Acelgas a la Crema', 'Pimienta', NULL),
  ('Garbanzos al Curry con Arroz Perla', 'Garbanzos', 800),
  ('Garbanzos al Curry con Arroz Perla', 'Arroz', 600),
  ('Garbanzos al Curry con Arroz Perla', 'Cebolla', 300),
  ('Garbanzos al Curry con Arroz Perla', 'Zanahoria', 200),
  ('Garbanzos al Curry con Arroz Perla', 'Pimentón', 200),
  ('Garbanzos al Curry con Arroz Perla', 'Tomate', 400),
  ('Garbanzos al Curry con Arroz Perla', 'Aceite', 50),
  ('Garbanzos al Curry con Arroz Perla', 'Curry', NULL),
  ('Garbanzos al Curry con Arroz Perla', 'Sal', NULL),
  ('Ensalada Nicoise', 'Lechuga', 600),
  ('Ensalada Nicoise', 'Tomate', 800),
  ('Ensalada Nicoise', 'Huevo', 500),
  ('Ensalada Nicoise', 'Atún', 500),
  ('Ensalada Nicoise', 'Papa', 800),
  ('Ensalada Nicoise', 'Porotos verdes', 400),
  ('Ensalada Nicoise', 'Aceite', 60),
  ('Ensalada Nicoise', 'Vinagre', NULL),
  ('Ensalada Nicoise', 'Sal', NULL),
  ('Pollo Asado con Papas fritas y Arroz', 'Pollo', 2000),
  ('Pollo Asado con Papas fritas y Arroz', 'Papa', 1500),
  ('Pollo Asado con Papas fritas y Arroz', 'Aceite', 160),
  ('Pollo Asado con Papas fritas y Arroz', 'Arroz', 600),
  ('Pollo Asado con Papas fritas y Arroz', 'Cebolla', 200),
  ('Pollo Asado con Papas fritas y Arroz', 'Sal', NULL),
  ('Pollo Asado con Papas fritas y Arroz', 'Pimienta', NULL),
  ('Pollo Asado con Papas fritas y Arroz', 'Orégano', NULL),
  ('Hamburguesa de Vacuno con Arroz', 'Carne de vacuno', 1400),
  ('Hamburguesa de Vacuno con Arroz', 'Arroz', 700),
  ('Hamburguesa de Vacuno con Arroz', 'Pan rallado', 150),
  ('Hamburguesa de Vacuno con Arroz', 'Huevo', 150),
  ('Hamburguesa de Vacuno con Arroz', 'Cebolla', 200),
  ('Hamburguesa de Vacuno con Arroz', 'Aceite', 60),
  ('Hamburguesa de Vacuno con Arroz', 'Tomate', 400),
  ('Hamburguesa de Vacuno con Arroz', 'Sal', NULL),
  ('Hamburguesa de Vacuno con Arroz', 'Pimienta', NULL),
  ('Hamburguesa Veggie con Papas Fritas y Arroz', 'Garbanzos', 600),
  ('Hamburguesa Veggie con Papas Fritas y Arroz', 'Papa', 800),
  ('Hamburguesa Veggie con Papas Fritas y Arroz', 'Aceite', 120),
  ('Hamburguesa Veggie con Papas Fritas y Arroz', 'Pan rallado', 200),
  ('Hamburguesa Veggie con Papas Fritas y Arroz', 'Arroz', 400),
  ('Hamburguesa Veggie con Papas Fritas y Arroz', 'Zanahoria', 200),
  ('Hamburguesa Veggie con Papas Fritas y Arroz', 'Cebolla', 200),
  ('Hamburguesa Veggie con Papas Fritas y Arroz', 'Huevo', 100),
  ('Hamburguesa Veggie con Papas Fritas y Arroz', 'Sal', NULL),
  ('Hamburguesa Veggie con Papas Fritas y Arroz', 'Pimienta', NULL),
  ('Pollo Asado con Ensaladas', 'Pollo', 2000),
  ('Pollo Asado con Ensaladas', 'Lechuga', 800),
  ('Pollo Asado con Ensaladas', 'Tomate', 800),
  ('Pollo Asado con Ensaladas', 'Zanahoria', 400),
  ('Pollo Asado con Ensaladas', 'Aceite', 40),
  ('Pollo Asado con Ensaladas', 'Limón', 60),
  ('Pollo Asado con Ensaladas', 'Sal', NULL),
  ('Pollo Asado con Ensaladas', 'Pimienta', NULL),
  ('Pollo Asado con Ensaladas', 'Orégano', NULL),
  ('Charquicán con huevo', 'Carne de vacuno', 900),
  ('Charquicán con huevo', 'Papa', 2000),
  ('Charquicán con huevo', 'Zapallo', 1000),
  ('Charquicán con huevo', 'Choclo', 500),
  ('Charquicán con huevo', 'Arvejas', 400),
  ('Charquicán con huevo', 'Cebolla', 400),
  ('Charquicán con huevo', 'Aceite', 100),
  ('Charquicán con huevo', 'Huevo', 600),
  ('Charquicán con huevo', 'Sal', NULL),
  ('Charquicán con huevo', 'Orégano', NULL),
  ('Charquicán', 'Papa', 2000),
  ('Charquicán', 'Zapallo', 1000),
  ('Charquicán', 'Choclo', 500),
  ('Charquicán', 'Arvejas', 400),
  ('Charquicán', 'Porotos verdes', 300),
  ('Charquicán', 'Lentejas', 400),
  ('Charquicán', 'Cebolla', 400),
  ('Charquicán', 'Aceite', 100),
  ('Charquicán', 'Sal', NULL),
  ('Charquicán', 'Orégano', NULL),
  ('Sopa de verduras', 'Zanahoria', 400),
  ('Sopa de verduras', 'Papa', 600),
  ('Sopa de verduras', 'Zapallo', 600),
  ('Sopa de verduras', 'Cebolla', 200),
  ('Sopa de verduras', 'Sal', NULL),
  ('Consomé de ave', 'Pollo', 500),
  ('Consomé de ave', 'Arroz', 150),
  ('Consomé de ave', 'Zanahoria', 100),
  ('Consomé de ave', 'Sal', NULL),
  ('Crema de zapallo', 'Zapallo', 1500),
  ('Crema de zapallo', 'Leche', 500),
  ('Crema de zapallo', 'Crema', 100),
  ('Crema de zapallo', 'Cebolla', 100),
  ('Crema de zapallo', 'Sal', NULL),
  ('Ensalada de repollo y zanahoria', 'Repollo', 800),
  ('Ensalada de repollo y zanahoria', 'Zanahoria', 400),
  ('Ensalada de repollo y zanahoria', 'Limón', 50),
  ('Ensalada de repollo y zanahoria', 'Aceite', 30),
  ('Ensalada de repollo y zanahoria', 'Sal', NULL),
  ('Ensalada chilena', 'Tomate', 1200),
  ('Ensalada chilena', 'Cebolla', 400),
  ('Ensalada chilena', 'Aceite', 40),
  ('Ensalada chilena', 'Cilantro', 50),
  ('Ensalada chilena', 'Sal', NULL),
  ('Fruta de estación', 'Manzana', 800),
  ('Fruta de estación', 'Naranja', 400),
  ('Fruta de estación', 'Plátano', 300),
  ('Arroz con leche', 'Arroz', 200),
  ('Arroz con leche', 'Leche', 1500),
  ('Arroz con leche', 'Azúcar', 200),
  ('Arroz con leche', 'Canela', NULL),
  ('Jalea de frutilla', 'Gelatina en polvo', 100),
  ('Jalea de frutilla', 'Frutilla', 300),
  ('Jalea de frutilla', 'Azúcar', 100),
  ('Mousse de chocolate', 'Chocolate', 300),
  ('Mousse de chocolate', 'Crema', 400),
  ('Flan de caramelo', 'Leche', 1200),
  ('Flan de caramelo', 'Huevo', 500),
  ('Flan de caramelo', 'Azúcar', 300),
  ('Flan de caramelo', 'Vainilla', NULL),
  ('Agua mineral', 'Agua mineral', 2500),
  ('Jugo de naranja', 'Naranja', 2000),
  ('Té helado', 'Té', NULL),
  ('Té helado', 'Limón', 100),
  ('Té helado', 'Azúcar', 150),
  ('Jugo de piña', 'Piña', 2000),
  ('Pan amasado', 'Harina', 700),
  ('Pan amasado', 'Sal', NULL),
  ('Manzana', 'Manzana', 1500),
  ('Naranja', 'Naranja', 1500),
  ('Plátano', 'Plátano', 1200);

DELETE FROM preparacion_ingrediente
WHERE id_preparacion IN (SELECT id_preparacion FROM preparacion WHERE nombre IN (SELECT nombre FROM _campomar_prep));

INSERT INTO preparacion_ingrediente (id_preparacion, id_ingrediente, cantidad_g)
SELECT p.id_preparacion, i.id_ingrediente, r.cantidad_g
FROM _campomar_receta r
JOIN preparacion p ON p.nombre = r.preparacion
JOIN ingrediente i ON i.nombre = r.ingrediente;

DELETE FROM preparacion_alergeno
WHERE id_preparacion IN (SELECT id_preparacion FROM preparacion WHERE nombre IN (SELECT nombre FROM _campomar_prep));

INSERT INTO preparacion_alergeno (id_preparacion, id_alergeno)
SELECT DISTINCT pi.id_preparacion, ia.id_alergeno
FROM preparacion_ingrediente pi
JOIN preparacion p ON p.id_preparacion = pi.id_preparacion
JOIN ingrediente_alergeno ia ON ia.id_ingrediente = pi.id_ingrediente
WHERE p.nombre IN (SELECT nombre FROM _campomar_prep);

DELETE FROM informacion_nutricional
WHERE id_preparacion IN (SELECT id_preparacion FROM preparacion WHERE nombre IN (SELECT nombre FROM _campomar_prep));

INSERT INTO informacion_nutricional
    (id_preparacion, calorias, proteinas_g, carbohidratos_g, grasas_g, validado, fuente, actualizado_en, origen, calculado_en)
SELECT p.id_preparacion,
       ROUND(SUM(pi.cantidad_g / 100.0 * i.calorias_100g)      / p.porciones_receta, 1),
       ROUND(SUM(pi.cantidad_g / 100.0 * i.proteinas_100g)     / p.porciones_receta, 1),
       ROUND(SUM(pi.cantidad_g / 100.0 * i.carbohidratos_100g) / p.porciones_receta, 1),
       ROUND(SUM(pi.cantidad_g / 100.0 * i.grasas_100g)        / p.porciones_receta, 1),
       TRUE, 'Calculada automáticamente desde los ingredientes', CURRENT_TIMESTAMP, 'calculada', CURRENT_TIMESTAMP
FROM preparacion p
JOIN preparacion_ingrediente pi ON pi.id_preparacion = p.id_preparacion
JOIN ingrediente i ON i.id_ingrediente = pi.id_ingrediente
WHERE p.nombre IN (SELECT nombre FROM _campomar_prep)
  AND p.porciones_receta IS NOT NULL
  AND NOT i.sin_cuantificar
GROUP BY p.id_preparacion, p.porciones_receta
HAVING bool_and(pi.cantidad_g > 0
                AND i.calorias_100g IS NOT NULL AND i.proteinas_100g IS NOT NULL
                AND i.carbohidratos_100g IS NOT NULL AND i.grasas_100g IS NOT NULL);

CREATE TEMP TABLE _menu_campomar (dia_offset INT, categoria VARCHAR(50), preparacion VARCHAR(150), tipo VARCHAR(50), cantidad INT) ON COMMIT DROP;
INSERT INTO _menu_campomar VALUES
  (0, 'General', 'Budín de Zapallitos Italianos con Arroz Piamontesa', 'Plato Principal', 40),
  (0, 'JUNAEB', 'Lentejas a la Parmesana', 'Plato Principal', 45),
  (0, 'Vegetariano', 'Lentejas a la Parmesana', 'Plato Principal', 25),
  (0, 'Hipocalórico', 'Budín de Zapallitos Italianos con Ensaladas', 'Plato Principal', 20),
  (0, NULL, 'Ensalada chilena', 'Ensalada', 100),
  (0, NULL, 'Sopa de verduras', 'Sopa', 100),
  (0, NULL, 'Pan amasado', 'Pan', 65),
  (0, NULL, 'Fruta de estación', 'Postre', 100),
  (0, NULL, 'Manzana', 'Fruta', 100),
  (0, NULL, 'Jugo de naranja', 'Bebida', 120),
  (0, 'JUNAEB', 'Agua mineral', 'Bebida', 45),
  (0, 'Hipocalórico', 'Agua mineral', 'Bebida', 20),

  (1, 'General', 'Charquicán con huevo', 'Plato Principal', 40),
  (1, 'JUNAEB', 'Budín de Acelga con Arroz Árabe', 'Plato Principal', 45),
  (1, 'Vegetariano', 'Charquicán', 'Plato Principal', 25),
  (1, 'Hipocalórico', 'Omelette pimentón con ensaladas', 'Plato Principal', 20),
  (1, NULL, 'Ensalada de repollo y zanahoria', 'Ensalada', 100),
  (1, NULL, 'Consomé de ave', 'Sopa', 100),
  (1, NULL, 'Pan amasado', 'Pan', 65),
  (1, NULL, 'Arroz con leche', 'Postre', 100),
  (1, NULL, 'Manzana', 'Fruta', 100),
  (1, NULL, 'Jugo de piña', 'Bebida', 120),
  (1, 'JUNAEB', 'Agua mineral', 'Bebida', 45),
  (1, 'Hipocalórico', 'Agua mineral', 'Bebida', 20),

  (2, 'General', 'Corbatitas con Salsa Alfredo', 'Plato Principal', 40),
  (2, 'JUNAEB', 'Panqueques Florentinos', 'Plato Principal', 45),
  (2, 'Vegetariano', 'Corbatitas con Salsa Alfredo', 'Plato Principal', 25),
  (2, 'Hipocalórico', 'Ensalada del Huerto', 'Plato Principal', 20),
  (2, NULL, 'Ensalada chilena', 'Ensalada', 100),
  (2, NULL, 'Crema de zapallo', 'Sopa', 100),
  (2, NULL, 'Pan amasado', 'Pan', 65),
  (2, NULL, 'Jalea de frutilla', 'Postre', 100),
  (2, NULL, 'Manzana', 'Fruta', 100),
  (2, NULL, 'Té helado', 'Bebida', 120),
  (2, 'JUNAEB', 'Agua mineral', 'Bebida', 45),
  (2, 'Hipocalórico', 'Agua mineral', 'Bebida', 20),

  (3, 'General', 'Hamburguesa Suiza con Acelgas a la Crema', 'Plato Principal', 40),
  (3, 'JUNAEB', 'Garbanzos al Curry con Arroz Perla', 'Plato Principal', 45),
  (3, 'Vegetariano', 'Garbanzos al Curry con Arroz Perla', 'Plato Principal', 25),
  (3, 'Hipocalórico', 'Ensalada Nicoise', 'Plato Principal', 20),
  (3, NULL, 'Ensalada de repollo y zanahoria', 'Ensalada', 100),
  (3, NULL, 'Sopa de verduras', 'Sopa', 100),
  (3, NULL, 'Pan amasado', 'Pan', 65),
  (3, NULL, 'Mousse de chocolate', 'Postre', 100),
  (3, NULL, 'Manzana', 'Fruta', 100),
  (3, NULL, 'Jugo de naranja', 'Bebida', 120),
  (3, 'JUNAEB', 'Agua mineral', 'Bebida', 45),
  (3, 'Hipocalórico', 'Agua mineral', 'Bebida', 20),

  (4, 'General', 'Pollo Asado con Papas fritas y Arroz', 'Plato Principal', 40),
  (4, 'JUNAEB', 'Hamburguesa de Vacuno con Arroz', 'Plato Principal', 45),
  (4, 'Vegetariano', 'Hamburguesa Veggie con Papas Fritas y Arroz', 'Plato Principal', 25),
  (4, 'Hipocalórico', 'Pollo Asado con Ensaladas', 'Plato Principal', 20),
  (4, NULL, 'Ensalada chilena', 'Ensalada', 100),
  (4, NULL, 'Consomé de ave', 'Sopa', 100),
  (4, NULL, 'Pan amasado', 'Pan', 65),
  (4, NULL, 'Flan de caramelo', 'Postre', 100),
  (4, NULL, 'Manzana', 'Fruta', 100),
  (4, NULL, 'Jugo de piña', 'Bebida', 120),
  (4, 'JUNAEB', 'Agua mineral', 'Bebida', 45),
  (4, 'Hipocalórico', 'Agua mineral', 'Bebida', 20);

DO $$
DECLARE
    v_lunes DATE := date_trunc('week', CURRENT_DATE)::date;
    v_sede INT;
    v_id_menu INT;
    r RECORD;
BEGIN
    SELECT id_sede INTO v_sede FROM sede ORDER BY id_sede LIMIT 1;

    FOR i IN 0..4 LOOP
        SELECT id_menu INTO v_id_menu FROM menu WHERE id_sede = v_sede AND fecha = v_lunes + i;

        IF v_id_menu IS NOT NULL THEN
            DELETE FROM movimiento_stock WHERE id_menu_preparacion IN (SELECT id_menu_preparacion FROM menu_preparacion WHERE id_menu = v_id_menu);
            DELETE FROM venta_combo WHERE id_jornada IN (SELECT id_jornada FROM jornada WHERE id_menu = v_id_menu);
            DELETE FROM jornada WHERE id_menu = v_id_menu;
            DELETE FROM venta WHERE id_menu_preparacion IN (SELECT id_menu_preparacion FROM menu_preparacion WHERE id_menu = v_id_menu);
            DELETE FROM disponibilidad WHERE id_menu_preparacion IN (SELECT id_menu_preparacion FROM menu_preparacion WHERE id_menu = v_id_menu);
            DELETE FROM menu_preparacion WHERE id_menu = v_id_menu;
            UPDATE menu SET publicado = TRUE WHERE id_menu = v_id_menu;
        ELSE
            INSERT INTO menu (id_sede, fecha, publicado) VALUES (v_sede, v_lunes + i, TRUE) RETURNING id_menu INTO v_id_menu;
        END IF;

        FOR r IN (SELECT * FROM _menu_campomar WHERE dia_offset = i) LOOP
            INSERT INTO menu_preparacion (id_menu, id_preparacion, id_categoria_menu, id_tipo_componente, cantidad_planificada, precio)
            SELECT v_id_menu, p.id_preparacion, c.id_categoria_menu, t.id_tipo_componente, r.cantidad,
                   CASE WHEN r.tipo = 'Plato Principal' THEN (CASE WHEN r.categoria = 'JUNAEB' THEN 2350 ELSE 4800 END) END
            FROM preparacion p
            JOIN tipo_componente t ON t.nombre = r.tipo
            LEFT JOIN categoria_menu c ON c.nombre = r.categoria
            WHERE p.nombre = r.preparacion;
        END LOOP;

        INSERT INTO disponibilidad (id_menu_preparacion, estado)
        SELECT id_menu_preparacion, 'disponible' FROM menu_preparacion WHERE id_menu = v_id_menu;
    END LOOP;
END $$;

COMMIT;