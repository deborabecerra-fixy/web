/* ================================================================
   CONFIGURACIÓN DE FIREBASE — Fixy PickUp
   ================================================================
   Este archivo conecta el sitio (mapa público + panel de admin) con
   tu proyecto de Firebase. Los valores de acá NO son secretos: Google
   los diseña para ser públicos en el navegador. La seguridad real la
   dan las "Reglas de Firestore" (ver archivo firestore.rules) y el
   login de administradores.

   CÓMO OBTENER ESTOS VALORES (una sola vez):
   1. Entrá a https://console.firebase.google.com y creá un proyecto
      gratuito (por ejemplo "fixy-pickup").
   2. Dentro del proyecto: ícono de engranaje > "Configuración del
      proyecto" > pestaña "General" > sección "Tus apps".
   3. Hacé clic en el ícono "</>" (Web) para registrar una app web,
      ponele un nombre (ej. "fixy-web") y confirmá.
   4. Firebase te va a mostrar un bloque "firebaseConfig" con estos
      mismos nombres de campo. Copiá cada valor acá abajo.

   Seguí el instructivo completo en SETUP-FIREBASE.md (en la raíz del
   proyecto) para los pasos previos (Firestore, Authentication, reglas
   y usuarios admin).
   ================================================================ */

window.FIXY_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDltek8OXG17DmiK9EfJABfeQbB6ZWV5DI",
  authDomain: "fixy-pickup.firebaseapp.com",
  projectId: "fixy-pickup",
  storageBucket: "fixy-pickup.firebasestorage.app",
  messagingSenderId: "833620115832",
  appId: "1:833620115832:web:586731c6754f386fc1488d"
};

/* No tocar de acá para abajo: solo detecta si ya pegaste tus datos. */
window.FIXY_FIREBASE_READY = window.FIXY_FIREBASE_CONFIG.apiKey !== "REEMPLAZAR_CON_TU_API_KEY"
  && window.FIXY_FIREBASE_CONFIG.projectId !== "REEMPLAZAR";
