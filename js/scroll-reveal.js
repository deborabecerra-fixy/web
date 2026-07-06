/* ============================================================
   Fixy — Scroll Reveal
   Animación de entrada liviana basada en IntersectionObserver.
   Marca con .is-revealed cualquier elemento [data-reveal] cuando
   entra en viewport. Respeta prefers-reduced-motion (la CSS ya
   muestra el contenido sin animar en ese caso, así que el script
   simplemente no necesita hacer nada extra).
   ============================================================ */
(function () {
  "use strict";

  var targets = document.querySelectorAll("[data-reveal]");
  if (!targets.length) return;

  if (!("IntersectionObserver" in window)) {
    // Fallback: sin soporte, mostrar todo de inmediato.
    targets.forEach(function (el) {
      el.classList.add("is-revealed");
    });
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -40px 0px",
    }
  );

  targets.forEach(function (el) {
    observer.observe(el);
  });
})();
