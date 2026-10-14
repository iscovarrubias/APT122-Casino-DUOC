BEGIN;

CREATE TABLE IF NOT EXISTS categoria_ingrediente (
    id_categoria_ingrediente SERIAL PRIMARY KEY,
    nombre                   VARCHAR(60) NOT NULL UNIQUE
);
INSERT INTO categoria_ingrediente (nombre) VALUES
    ('Carnes y aves'), ('Pescados y mariscos'), ('Verduras y frutas'),
    ('Cereales y legumbres'), ('Lácteos y huevos'),
    ('Aceites, azúcar y condimentos'), ('Otros')
ON CONFLICT (nombre) DO NOTHING;

ALTER TABLE ingrediente
    ADD COLUMN IF NOT EXISTS id_categoria_ingrediente INT REFERENCES categoria_ingrediente(id_categoria_ingrediente),
    ADD COLUMN IF NOT EXISTS calorias_100g       NUMERIC(6,1) CHECK (calorias_100g >= 0),
    ADD COLUMN IF NOT EXISTS proteinas_100g      NUMERIC(6,1) CHECK (proteinas_100g >= 0),
    ADD COLUMN IF NOT EXISTS carbohidratos_100g  NUMERIC(6,1) CHECK (carbohidratos_100g >= 0),
    ADD COLUMN IF NOT EXISTS grasas_100g         NUMERIC(6,1) CHECK (grasas_100g >= 0),
    ADD COLUMN IF NOT EXISTS fuente_nutricional  VARCHAR(200),
    ADD COLUMN IF NOT EXISTS sin_cuantificar     BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS dato_de_ejemplo     BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE preparacion_ingrediente
    ADD COLUMN IF NOT EXISTS cantidad_g NUMERIC(8,1) CHECK (cantidad_g > 0);

ALTER TABLE preparacion
    ADD COLUMN IF NOT EXISTS porciones_receta INT CHECK (porciones_receta > 0);

ALTER TABLE informacion_nutricional
    ADD COLUMN IF NOT EXISTS origen       VARCHAR(10) NOT NULL DEFAULT 'manual'
        CHECK (origen IN ('calculada', 'manual')),
    ADD COLUMN IF NOT EXISTS calculado_en TIMESTAMP;

CREATE TABLE IF NOT EXISTS ingrediente_alergeno (
    id_ingrediente INT NOT NULL REFERENCES ingrediente(id_ingrediente) ON DELETE CASCADE,
    id_alergeno    INT NOT NULL REFERENCES alergeno(id_alergeno) ON DELETE RESTRICT,
    PRIMARY KEY (id_ingrediente, id_alergeno)
);


INSERT INTO alergeno (nombre) VALUES ('Pescado'), ('Maní')
ON CONFLICT (nombre) DO NOTHING;

DELETE FROM preparacion_alergeno
WHERE id_alergeno = (SELECT id_alergeno FROM alergeno WHERE nombre = 'Mariscos')
  AND id_preparacion IN (SELECT id_preparacion FROM preparacion WHERE nombre = 'Salmón al vapor con verduras');
INSERT INTO preparacion_alergeno (id_preparacion, id_alergeno)
SELECT p.id_preparacion, a.id_alergeno
FROM preparacion p, alergeno a
WHERE p.nombre = 'Salmón al vapor con verduras' AND a.nombre = 'Pescado'
ON CONFLICT DO NOTHING;

INSERT INTO ingrediente_alergeno (id_ingrediente, id_alergeno)
SELECT i.id_ingrediente, a.id_alergeno
FROM (VALUES
    ('Leche','Lácteos'), ('Mantequilla','Lácteos'), ('Queso','Lácteos'), ('Crema','Lácteos'),
    ('Huevo','Huevo'),
    ('Harina','Gluten'), ('Pan rallado','Gluten'), ('Tallarines','Gluten'),
    ('Salmón','Pescado'), ('Pescado blanco','Pescado')
) AS v(ingrediente, alergeno)
JOIN ingrediente i ON i.nombre = v.ingrediente
JOIN alergeno a ON a.nombre = v.alergeno
ON CONFLICT DO NOTHING;

UPDATE ingrediente i SET
    id_categoria_ingrediente = COALESCE(i.id_categoria_ingrediente, c.id_categoria_ingrediente),
    fuente_nutricional = CASE WHEN i.calorias_100g IS NULL AND v.kcal IS NOT NULL
        THEN 'Valor de ejemplo (aprox., tabla tipo USDA). Reemplazar con fuente validada.'
        ELSE i.fuente_nutricional END,
    dato_de_ejemplo = CASE WHEN i.calorias_100g IS NULL AND v.kcal IS NOT NULL THEN TRUE ELSE i.dato_de_ejemplo END,
    calorias_100g      = COALESCE(i.calorias_100g, v.kcal),
    proteinas_100g     = COALESCE(i.proteinas_100g, v.prot),
    carbohidratos_100g = COALESCE(i.carbohidratos_100g, v.carb),
    grasas_100g        = COALESCE(i.grasas_100g, v.gras),
    sin_cuantificar    = i.sin_cuantificar OR v.sc
FROM (VALUES
    ('Pechuga de pollo','Carnes y aves',120,22.5,0,2.6,FALSE),
    ('Pechuga de pavo','Carnes y aves',115,23.7,0,1.5,FALSE),
    ('Pollo','Carnes y aves',NULL,NULL,NULL,NULL,FALSE),
    ('Carne de vacuno','Carnes y aves',NULL,NULL,NULL,NULL,FALSE),
    ('Salmón','Pescados y mariscos',208,20.4,0,13.4,FALSE),
    ('Pescado blanco','Pescados y mariscos',NULL,NULL,NULL,NULL,FALSE),
    ('Arvejas','Verduras y frutas',81,5.4,14.5,0.4,FALSE),
    ('Zanahoria','Verduras y frutas',41,0.9,9.6,0.2,FALSE),
    ('Cebolla','Verduras y frutas',40,1.1,9.3,0.1,FALSE),
    ('Ajo','Verduras y frutas',149,6.4,33.1,0.5,FALSE),
    ('Choclo','Verduras y frutas',86,3.3,19,1.4,FALSE),
    ('Choclo desgranado','Verduras y frutas',86,3.3,19,1.4,FALSE),
    ('Papa','Verduras y frutas',77,2,17,0.1,FALSE),
    ('Zapallo','Verduras y frutas',26,1,6.5,0.1,FALSE),
    ('Zapallito italiano','Verduras y frutas',17,1.2,3.1,0.3,FALSE),
    ('Berenjena','Verduras y frutas',25,1,5.9,0.2,FALSE),
    ('Calabacín','Verduras y frutas',17,1.2,3.1,0.3,FALSE),
    ('Tomate','Verduras y frutas',18,0.9,3.9,0.2,FALSE),
    ('Lechuga','Verduras y frutas',15,1.4,2.9,0.2,FALSE),
    ('Palta','Verduras y frutas',160,2,8.5,14.7,FALSE),
    ('Brócoli','Verduras y frutas',34,2.8,6.6,0.4,FALSE),
    ('Coliflor','Verduras y frutas',25,1.9,5,0.3,FALSE),
    ('Espinaca','Verduras y frutas',23,2.9,3.6,0.4,FALSE),
    ('Porotos verdes','Verduras y frutas',31,1.8,7,0.1,FALSE),
    ('Naranja','Verduras y frutas',47,0.9,11.8,0.1,FALSE),
    ('Manzana','Verduras y frutas',52,0.3,13.8,0.2,FALSE),
    ('Frutilla','Verduras y frutas',32,0.7,7.7,0.3,FALSE),
    ('Durazno','Verduras y frutas',39,0.9,9.5,0.3,FALSE),
    ('Piña','Verduras y frutas',50,0.5,13.1,0.1,FALSE),
    ('Limón','Verduras y frutas',29,1.1,9.3,0.3,FALSE),
    ('Cilantro','Verduras y frutas',23,2.1,3.7,0.5,FALSE),
    ('Perejil','Verduras y frutas',NULL,NULL,NULL,NULL,TRUE),
    ('Arroz','Cereales y legumbres',360,6.7,79.3,0.7,FALSE),
    ('Arroz integral','Cereales y legumbres',370,7.9,77.2,2.9,FALSE),
    ('Lentejas','Cereales y legumbres',352,24.6,63.4,1.1,FALSE),
    ('Quinoa','Cereales y legumbres',368,14.1,64.2,6.1,FALSE),
    ('Tallarines','Cereales y legumbres',371,13,74.7,1.5,FALSE),
    ('Harina','Cereales y legumbres',364,10.3,76.3,1,FALSE),
    ('Pan rallado','Cereales y legumbres',395,13.4,72,5.3,FALSE),
    ('Leche','Lácteos y huevos',61,3.2,4.8,3.3,FALSE),
    ('Mantequilla','Lácteos y huevos',717,0.9,0.1,81.1,FALSE),
    ('Queso','Lácteos y huevos',NULL,NULL,NULL,NULL,FALSE),
    ('Crema','Lácteos y huevos',340,2.1,2.8,36.1,FALSE),
    ('Huevo','Lácteos y huevos',143,12.6,0.7,9.5,FALSE),
    ('Aceite','Aceites, azúcar y condimentos',884,0,0,100,FALSE),
    ('Azúcar','Aceites, azúcar y condimentos',387,0,100,0,FALSE),
    ('Vinagre','Aceites, azúcar y condimentos',NULL,NULL,NULL,NULL,TRUE),
    ('Sal','Aceites, azúcar y condimentos',NULL,NULL,NULL,NULL,TRUE),
    ('Pimienta','Aceites, azúcar y condimentos',NULL,NULL,NULL,NULL,TRUE),
    ('Orégano','Aceites, azúcar y condimentos',NULL,NULL,NULL,NULL,TRUE),
    ('Vainilla','Aceites, azúcar y condimentos',NULL,NULL,NULL,NULL,TRUE),
    ('Gelatina en polvo','Otros',335,85.6,0,0.1,FALSE),
    ('Té','Otros',NULL,NULL,NULL,NULL,TRUE),
    ('Agua mineral','Otros',0,0,0,0,FALSE),
    ('Chocolate','Otros',NULL,NULL,NULL,NULL,FALSE),
    ('Caramelo','Otros',NULL,NULL,NULL,NULL,FALSE),
    ('Salsa de tomate','Otros',NULL,NULL,NULL,NULL,FALSE)
) AS v(nombre, categoria, kcal, prot, carb, gras, sc)
JOIN categoria_ingrediente c ON c.nombre = v.categoria
WHERE i.nombre = v.nombre;

COMMIT;
