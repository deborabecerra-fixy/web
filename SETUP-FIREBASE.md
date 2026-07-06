# Configuración de Firebase para el Panel FixyPoints

Esta guía te lleva paso a paso para dejar funcionando el mapa dinámico de puntos Pick Up y el panel de administración. No hace falta saber programar. Se hace una sola vez y toma unos 15-20 minutos.

No se necesita tarjeta de crédito: el plan gratuito de Firebase (Spark) alcanza sobradamente para este volumen de datos (decenas de miles de lecturas/escrituras gratis por día).

---

## Paso 1 — Crear el proyecto de Firebase

1. Entrá a **https://console.firebase.google.com** con tu cuenta de Google (podés usar una cuenta de Gmail normal, o una de Google Workspace de Fixy si la tenés).
2. Hacé clic en **"Crear un proyecto"**.
3. Ponele un nombre, por ejemplo `fixy-pickup`.
4. Podés desactivar Google Analytics si te pregunta (no hace falta para esto).
5. Esperá a que termine de crearse el proyecto.

## Paso 2 — Registrar la app web y obtener las claves

1. Dentro del proyecto, hacé clic en el ícono de **engranaje** (arriba a la izquierda) → **"Configuración del proyecto"**.
2. En la pestaña **"General"**, bajá hasta **"Tus apps"** y hacé clic en el ícono **`</>`** (Web).
3. Ponele un nombre a la app, por ejemplo `fixy-web`, y hacé clic en **"Registrar app"**.
4. Firebase te va a mostrar un bloque de código llamado `firebaseConfig` con valores como `apiKey`, `authDomain`, `projectId`, etc.
5. Abrí el archivo **`js/firebase-config.js`** de este proyecto y reemplazá cada valor de ejemplo por el que te dio Firebase. Guardá el archivo.

## Paso 3 — Activar la base de datos (Firestore)

1. En el menú de la izquierda de la consola de Firebase, andá a **"Firestore Database"**.
2. Hacé clic en **"Crear base de datos"**.
3. Elegí la ubicación **`southamerica-east1` (São Paulo)** (la más cercana a Argentina).
4. Elegí **"Empezar en modo de producción"** (no en modo de prueba).
5. Confirmá.

## Paso 4 — Pegar las reglas de seguridad

Estas reglas son las que definen que **cualquiera puede ver los puntos activos**, pero **solo los administradores pueden agregar, pausar o eliminar puntos**.

1. Dentro de "Firestore Database", andá a la pestaña **"Reglas"**.
2. Borrá lo que haya y pegá exactamente el contenido del archivo **`firestore.rules`** que está en la raíz de este proyecto.
3. Hacé clic en **"Publicar"**.

## Paso 5 — Activar el login por email y contraseña

1. En el menú de la izquierda, andá a **"Authentication"**.
2. Hacé clic en **"Comenzar"** (si es la primera vez).
3. En la pestaña **"Sign-in method"** (Método de acceso), activá el proveedor **"Correo electrónico/contraseña"**.

## Paso 6 — Crear las cuentas de los administradores

1. Seguí en "Authentication", pestaña **"Users"** (Usuarios).
2. Hacé clic en **"Add user"** (Agregar usuario).
3. Cargá el email y una contraseña para cada persona de Fixy que vaya a administrar los puntos (podés repetir este paso para cada admin).
4. Guardá; a cada usuario creado Firebase le asigna automáticamente un **UID** (un código, lo vas a ver en la lista de usuarios). Vas a necesitar copiar ese UID en el paso siguiente.

## Paso 7 — Darle permisos de administrador a cada usuario

Por seguridad, crear el login no alcanza: además hay que decirle a la base de datos "esta persona es admin".

1. Volvé a **"Firestore Database"** → pestaña **"Datos"**.
2. Hacé clic en **"Iniciar colección"**.
3. ID de la colección: escribí exactamente `admins`.
4. ID del primer documento: pegá el **UID** del usuario que copiaste en el paso 6.
5. Agregá un campo:
   - Nombre del campo: `email`
   - Tipo: `string`
   - Valor: el email de esa persona (solo para tu referencia).
6. Guardá. Repetí este paso (un documento por cada admin) para cada persona que necesite acceso.

> Si en el futuro alguien deja de trabajar en Fixy, simplemente borrá su documento de la colección `admins` (y opcionalmente su usuario en Authentication) para quitarle el acceso.

## Paso 8 — Abrir el panel de administración

La URL del panel es:

```
pages/admin/pickup-admin.html
```

No está enlazada desde ningún menú del sitio público — solo entra quien tenga ese link exacto, y además necesita loguearse con una cuenta que vos hayas dado de alta como admin. Guardala en un lugar privado (marcador del navegador, no en redes sociales ni en el sitio público).

## Paso 9 — Cargar los 88 puntos reales de arranque

Una vez que puedas iniciar sesión en el panel:

1. Andá a la pestaña **"Importar datos iniciales"**.
2. Hacé clic en **"Iniciar geocodificación"**. El sistema busca la ubicación exacta de cada una de las 88 direcciones reales (extraídas de tu Google My Maps) una por una — tarda aproximadamente 2 minutos.
3. Al terminar, vas a ver cuántas direcciones se ubicaron correctamente y cuántas necesitan revisión manual (direcciones incompletas o con datos poco claros, por ejemplo "Chango más" sin número).
4. Hacé clic en **"Confirmar e importar a Firestore"** para subir todo de una vez.
5. Las direcciones que necesiten revisión manual tienen un botón **"Corregir manualmente"** que te lleva a la pestaña "Agregar punto" con esos datos precargados, para que busques la dirección correcta y confirmes el pin en el mapa.

Después de este primer uso, el mapa público (`pages/pickup.html`) ya va a mostrar los puntos reales en vivo, agrupados por zona, con el buscador funcionando de verdad.

## Cómo se usa después (día a día)

- **Agregar un punto nuevo:** pestaña "Agregar punto" → escribís la dirección → elegís el resultado correcto → ajustás el pin arrastrándolo si hace falta → completás nombre, horarios y servicios → "Guardar punto".
- **Pausar un punto** (por ejemplo, un local cerrado temporalmente): pestaña "Gestionar puntos" → buscalo → botón "Pausar". Deja de verse en el mapa público pero no se borra, y podés reactivarlo cuando quieras.
- **Eliminar un punto definitivamente:** mismo lugar, botón "Eliminar" (pide confirmación).
- **Editar los datos de un punto:** botón "Editar" en la tabla.

Todos los cambios se reflejan al instante en el mapa público, sin tocar código ni volver a publicar el sitio.
