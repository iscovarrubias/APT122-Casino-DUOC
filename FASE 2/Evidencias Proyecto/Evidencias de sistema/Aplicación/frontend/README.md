# Casino DUOC UC — Frontend (Sprint 4)

Frontend del MVP de la Plataforma de Gestión y Análisis de la Oferta
Gastronómica del Casino DUOC UC. APT122, Fase 2.

1. **Consulta pública** (`/`): menú del día, vista semanal, preguntas frecuentes. Sin login.
2. **Panel del personal** (`/panel/*`): caja, cocina, planificación, ingredientes, preparaciones, usuarios, opiniones, análisis.
3. **Perfil del estudiante** (modal): alergias, favoritos, calificaciones, categoría preferida.

## Qué incluye

| Historia | Descripción |
|---|---|
| HU-01 | Crear y editar preparaciones con ingredientes |
| HU-02 | Desactivar y reactivar preparaciones |
| HU-03 | Planificar el menú del día |
| HU-04 | Publicar y despublicar menú |
| HU-05 | Vista semanal con historial de menús |
| HU-06 | Cambiar disponibilidad durante la jornada |
| HU-08 | Menú del día con precio, categoría y disponibilidad, sin login |
| HU-09 | Ingredientes de cada preparación |
| HU-10 | Información nutricional y alérgenos, con "No disponible" si no está validada |
| HU-11 | Filtro por categoría (Principal, JUNAEB, Vegetariano, Hipocalórico) |
| HU-12 | Asignar alérgenos desde catálogo fijo |
| HU-13 | Registrar información nutricional de cada plato |
| HU-14 | Distinción de roles en el panel del personal |
| HU-15 | Login con correo institucional y SSO simulado |
| HU-20 | Calificar platos con estrellas y comentario |
| RF-21 | Gestión de ingredientes con composición nutricional |
| RF-22 | Cálculo automático de nutrición desde la receta |
| RF-24 | Iniciar jornada del día |
| RF-25 | Registrar venta de combos con un toque |
| RF-26 | Stock exacto en tiempo real |
| RF-27 | Informe mensual de agotamiento |
| — | Vista de opiniones para el personal (ranking de mejor y peor calificados) |
| — | Vista Preguntas frecuentes (contenido estático) |

## Requisitos

- Node.js 18+
- El backend corriendo en paralelo (por defecto en `http://localhost:3000`).

## Instalación

```bash
npm install
cp .env.example .env

## Levantar en desarrollo

```bash
npm run dev
```

`http://localhost:5173`


## Estructura del proyecto

src/
├── api/
│   ├── cliente.js           
│   ├── gestion.js           
│   └── menu.js              
├── components/
│   ├── Sidebar.jsx          
│   ├── CategoriaTabs.jsx    
│   ├── MenuPrincipal.jsx    
│   ├── VistaSemanal.jsx     
│   ├── VistaPreguntas.jsx   
│   ├── TablaNutricional.jsx 
│   ├── AlergenoPills.jsx   
│   ├── AvisoAlergias.jsx    
│   ├── EstadoBadge.jsx      
│   ├── BotonFavorito.jsx    
│   ├── Opinion.jsx          
│   ├── OpinionModal.jsx     
│   ├── OpinionesPanel.jsx   
│   ├── PrediccionPanel.jsx  
│   ├── RankingMensual.jsx   
│   ├── PanelVentas.jsx      
│   ├── CampoFecha.jsx       
│   ├── Mensaje.jsx          
│   ├── PerfilEstudianteModal.jsx  
│   └── iconos.jsx           
├── context/
│   ├── AuthProvider.jsx     
│   └── auth-context.js      
├── pages/
│   ├── VistaPublica.jsx     
│   ├── LoginPage.jsx        
│   ├── KioscoPage.jsx       
│   ├── CajaPage.jsx         
│   ├── PlanificacionPage.jsx 
│   ├── IngredientesPage.jsx 
│   ├── PreparacionesPage.jsx 
│   ├── UsuariosPage.jsx     
│   ├── OpinionesPage.jsx    
│   └── AnalisisPage.jsx     
├── ruteo/
│   ├── rutas.js             
│   └── useRuta.js          
├── utils/
│   ├── formato.js           
│   ├── eventos.js           
│   ├── estudiante.jsx       
│   └── tema.js              
├── App.jsx                  
├── index.css                
├── panel.css                
└── main.jsx                 