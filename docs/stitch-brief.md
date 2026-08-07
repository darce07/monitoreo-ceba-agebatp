# Brief para Stitch — Monitoreo CEBA (AGEBATP, UGEL 06)

## Qué es el sistema

Plataforma web donde 17 directores de CEBA (Centro de Educación Básica
Alternativa) suben en PDF sus fichas de monitoreo pedagógico, y un
especialista de AGEBATP supervisa el avance de las 17 instituciones desde
un panel central. Reemplaza un flujo manual por Google Drive donde no
había forma de saber quién ya cumplió, quién falta y quién fue observado.

## Referencia de calidad: nuestro propio sistema hermano (SubCAFAE/SIAGEB)

Ya tenemos en producción otro sistema de monitoreo, mismo stack, mismo
equipo, mucho más maduro — **ese es el nivel de acabado que queremos acá**,
no una pantalla plana. Lo que tiene y quiero que Stitch reproduzca el
mismo espíritu de sistema (adaptado, no copiado 1:1 — ver "qué NO copiar"
más abajo):

- **Layout de app real**: sidebar lateral fijo con navegación agrupada por
  secciones (ej. "Principal" / "Gestión" / "Organización"), no tabs sueltos
  arriba. Cada grupo con su label, cada ítem con ícono (lucide-react) +
  texto. Ítem activo resaltado con color de marca.
- **Topbar**: barra superior con acceso a notificaciones (ícono campana,
  con contador de pendientes), menú de usuario (perfil/cerrar sesión), y
  espacio para búsqueda.
- **Home/Dashboard con quick actions**: la pantalla de inicio no es solo
  KPIs — tiene botones de "acciones rápidas" contextuales según el rol
  (ej. para el admin: "Ver reportes", "Revisar fichas pendientes",
  "Gestionar equipo"; para el director: "Subir ficha", "Ver mis fichas").
- **Sistema de componentes propio y consistente**, reutilizado en toda la
  app (no estilos ad-hoc por pantalla):
  - `Badge` — para estados (Pendiente/Recibido/Observado), con color por
    tono (crítico=rojo, alerta=ámbar, éxito=verde, neutral=gris).
  - `Card` — contenedor base para KPIs, filas de tabla, secciones.
  - `Input`, `Select`, `Textarea`, `Toggle` — controles de formulario con
    estilo unificado.
  - `SectionHeader` — encabezado de sección con título + descripción +
    acción a la derecha (ej. botón "Nueva ficha").
  - `Skeleton` — estados de carga con placeholders animados, no solo texto
    "Cargando...".
  - `Toast` — notificaciones flotantes de éxito/error (en vez de `alert()`
    del navegador, que es lo que tenemos ahora).
  - `ConfirmModal` — modal de confirmación real para acciones destructivas
    (eliminar ficha), no un botón inline "¿Seguro?" como tenemos ahora.
- **Estados vacíos y de carga bien resueltos**: cada listado (fichas,
  docentes) tiene su propio estado "sin datos todavía" ilustrado, no solo
  una línea de texto gris.
- **Accesible por defecto**: buen contraste, tamaños de texto legibles,
  soporte táctil claro en botones (los directores suben desde el celular).
- **Responsive real**: en mobile el sidebar colapsa a menú hamburguesa; el
  formulario de subida del director está optimizado mobile-first porque es
  su pantalla principal.

### Qué NO copiar de SubCAFAE (para no sobre-construir)

- Nada de builder de plantillas de monitoreo (acá el "formulario" es fijo:
  docente/área/fecha/N° monitoreo/PDF).
- Nada de firma digital (`SignaturePad`) — no aplica, el director sube un
  PDF ya firmado.
- Solo 2 roles (director, admin), no 4 — no hace falta un sistema de
  permisos tan granular como el de SubCAFAE.
- El asistente flotante tipo chatbot es opcional/lindo-tener, no crítico —
  priorizarlo al final si sobra tiempo de diseño.
- Tema oscuro/rosa/claro configurable es un nice-to-have, no bloqueante —
  un tema claro bien hecho es suficiente para el v1.

## Los dos roles (interfaces completamente distintas)

**Director de CEBA** (17 usuarios, uno por institución):
- Solo ve y gestiona los datos de SU propia CEBA — nunca los de otras.
- Pantalla principal: subir una ficha nueva (elige docente de una lista
  existente o agrega uno nuevo, área, fecha, número de monitoreo, archivo
  PDF) + historial de sus propias fichas subidas con su estado.
- Perfil de bajo dominio técnico, mayoría entra desde el celular —
  necesita máxima simplicidad, poco texto, pasos claros, feedback
  inmediato de éxito/error (toast, no texto perdido en la pantalla).

**Admin (especialista AGEBATP)** (1-2 usuarios):
- Ve TODAS las CEBA, todas las fichas, todos los docentes, desde
  escritorio principalmente.
- Tres secciones en el sidebar (hoy están mezcladas en una sola pantalla
  larga, y ese es justo el problema a resolver):
  1. **Inicio/Resumen**: KPIs (CEBA con fichas / pendientes / observadas /
     % avance), gráfico de barras por CEBA, tabla resumen por CEBA con
     semáforo de estado, quick actions.
  2. **Fichas**: listado completo de fichas de las 17 CEBA, con filtros
     (por CEBA, estado, docente, rango de fecha), edición (docente, área,
     fecha, N° monitoreo, estado, observaciones) vía panel lateral o
     modal, y eliminar (soft-delete, con `ConfirmModal`, no borrado real).
  3. **Docentes**: listado de docentes por CEBA con cantidad de fichas
     subidas por cada uno, filtrable por CEBA.

## Datos y estados clave

- Estado de cada ficha: `Pendiente` / `Recibido` / `Observado` (semáforo
  rojo/ámbar/verde — mismo código de color en dashboard, tabla de fichas y
  badges sueltos, sin inconsistencias entre pantallas).
- Cada ficha: CEBA, docente, área (Comunicación/Matemática/Ciencia y
  Tecnología/Ciencias Sociales/Otra), fecha de monitoreo, N° de monitoreo
  (M01–M12), PDF, observaciones del admin si fue observada.
- El nombre del PDF se genera automático (`CEBA_DOCENTE_FECHA_Mxx.pdf`) —
  el usuario no lo escribe, solo lo ve como confirmación.

## Tono visual

Institucional pero no burocrático-feo: limpio, confiable, profesional —
piensa en un sistema de gestión escolar serio, con la densidad de
información de una herramienta de trabajo real (como SubCAFAE), no un
landing page de SaaS con gradientes/glassmorphism/blobs flotantes. Paleta
actual: teal/verde azulado como color de marca (`#0f766e`), fondo gris muy
claro, tarjetas blancas con bordes sutiles. Se puede refinar la paleta,
no hace falta calcarla — pero mantené la lógica de tonos por estado
(crítico/alerta/éxito/neutral) consistente en toda la app.

## Stack real (para que el diseño sea implementable tal cual)

React + TypeScript + Vite + Tailwind CSS v4 + react-router-dom + Supabase
(auth + Postgres + storage) + lucide-react para íconos + recharts para
gráficos. Preferible HTML/Tailwind estándar sobre librerías de componentes
pesadas, para que se pueda portar directo al código.

## Pantallas a diseñar (prioridad)

1. Login (correo + contraseña institucional).
2. Vista Director: formulario de subida (mobile-first) + lista de "mis
   fichas" con badges de estado.
3. Shell de Admin: sidebar agrupado + topbar con notificaciones/usuario.
4. Admin — Inicio: KPIs + gráfico + tabla por CEBA + quick actions.
5. Admin — Fichas: tabla filtrable + panel de edición + modal de
   confirmación al eliminar.
6. Admin — Docentes: listado con conteo de fichas, filtro por CEBA.
7. (Opcional, si sobra tiempo) Centro de notificaciones para el admin:
   alertas de fichas observadas sin resolver o CEBA sin ninguna ficha
   subida hace X tiempo.
