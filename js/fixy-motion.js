/* ============================================================
   Fixy — Motion (capa de interacción "signature")
   - Barra de progreso de scroll
   - Entrada escalonada de elementos [.fxm-intro] en el primer pintado
   - Botones magnéticos [.fxm-magnetic] (solo con mouse fino, sin
     prefers-reduced-motion)
   Vanilla JS, sin dependencias, no bloquea el render.
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var canHoverFine = !!(window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches);

  /* ---------------------------------------------------------
     1. Barra de progreso de scroll
     --------------------------------------------------------- */
  var progressFill = document.querySelector(".fxm-progress > span");
  if (progressFill) {
    var ticking = false;

    var updateProgress = function () {
      var doc = document.documentElement;
      var scrollTop = doc.scrollTop || document.body.scrollTop || 0;
      var scrollHeight = (doc.scrollHeight - doc.clientHeight) || 1;
      var progress = Math.min(Math.max(scrollTop / scrollHeight, 0), 1);
      progressFill.style.transform = "scaleX(" + progress + ")";
      ticking = false;
    };

    updateProgress();

    window.addEventListener("scroll", function () {
      if (!ticking) {
        requestAnimationFrame(updateProgress);
        ticking = true;
      }
    }, { passive: true });

    window.addEventListener("resize", updateProgress);
  }

  /* ---------------------------------------------------------
     2. Entrada escalonada — se dispara apenas carga, sin
        esperar scroll (para contenido above-the-fold).
     --------------------------------------------------------- */
  var introTargets = document.querySelectorAll(".fxm-intro");
  if (introTargets.length) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        introTargets.forEach(function (el) {
          el.classList.add("is-in");
        });
      });
    });
  }

  /* ---------------------------------------------------------
     3. Botones magnéticos — solo en desktop con mouse fino
        y sin preferencia de movimiento reducido.
     --------------------------------------------------------- */
  if (canHoverFine && !reduceMotion) {
    var magnets = document.querySelectorAll(".fxm-magnetic");
    var strength = 14;

    magnets.forEach(function (btn) {
      btn.addEventListener("mousemove", function (e) {
        var rect = btn.getBoundingClientRect();
        var x = e.clientX - rect.left - rect.width / 2;
        var y = e.clientY - rect.top - rect.height / 2;
        var tx = (x / rect.width) * strength;
        var ty = (y / rect.height) * strength;
        btn.style.transform = "translate(" + tx.toFixed(2) + "px," + ty.toFixed(2) + "px)";
      });

      btn.addEventListener("mouseleave", function () {
        btn.style.transform = "translate(0,0)";
      });
    });
  }

  /* ---------------------------------------------------------
     4. Tilt 3D — cards "Qué resolvemos" (.fx-resolve-card)
        Solo en desktop con mouse fino y sin reduced-motion.
        Rota la card según la posición del cursor y mueve sus
        capas internas (glow / anillos / contenido) en distinto
        grado para simular profundidad.
     --------------------------------------------------------- */
  if (canHoverFine && !reduceMotion) {
    var tiltCards = document.querySelectorAll(".fx-resolve-card[data-tilt]");
    var tiltMaxDeg = 7;
    var liftPx = 10;

    tiltCards.forEach(function (card) {
      card.classList.add("has-js-tilt");

      var glow = card.querySelector(".fx-resolve-card__glow");
      var rings = card.querySelector(".fx-resolve-card__rings");
      var content = card.querySelector(".fx-resolve-card__content");
      var raf = null;
      var settleTimeout = null;

      var applyTilt = function (px, py) {
        var rotY = (px - 0.5) * tiltMaxDeg * 2;
        var rotX = (0.5 - py) * tiltMaxDeg * 2;

        card.style.transform =
          "rotateX(" + rotX.toFixed(2) + "deg) rotateY(" + rotY.toFixed(2) + "deg) " +
          "translateY(-" + liftPx + "px) translateZ(6px)";

        if (glow) {
          glow.style.opacity = "1";
          glow.style.transform =
            "translate(" + ((px - 0.5) * 26).toFixed(1) + "px," + ((py - 0.5) * 26).toFixed(1) + "px) scale(1.1)";
        }
        if (rings) {
          rings.style.transform =
            "translate(" + ((px - 0.5) * 14).toFixed(1) + "px," + ((py - 0.5) * 14).toFixed(1) + "px)";
        }
        if (content) {
          content.style.transform =
            "translate(" + ((px - 0.5) * -8).toFixed(1) + "px," + ((py - 0.5) * -8).toFixed(1) + "px)";
        }
      };

      var onMouseMove = function (e) {
        var rect = card.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width;
        var py = (e.clientY - rect.top) / rect.height;

        if (raf) { return; }
        raf = window.requestAnimationFrame(function () {
          applyTilt(px, py);
          raf = null;
        });
      };

      var resetTilt = function () {
        card.classList.add("is-settling");
        card.style.transform = "rotateX(0deg) rotateY(0deg) translateY(0) translateZ(0)";
        if (glow) {
          glow.style.transform = "translate(0,0) scale(1)";
          glow.style.opacity = "";
        }
        if (rings) {
          rings.style.transform = "translate(0,0)";
        }
        if (content) {
          content.style.transform = "translate(0,0)";
        }

        window.clearTimeout(settleTimeout);
        settleTimeout = window.setTimeout(function () {
          card.classList.remove("is-settling");
        }, 460);
      };

      card.addEventListener("mouseenter", function () {
        card.classList.remove("is-settling");
        window.clearTimeout(settleTimeout);
      });

      card.addEventListener("mousemove", onMouseMove);

      card.addEventListener("mouseleave", function () {
        if (raf) {
          window.cancelAnimationFrame(raf);
          raf = null;
        }
        resetTilt();
      });
    });
  }

  /* ---------------------------------------------------------
     5. Campo de puntos interactivo — fondo de TODA la sección
        "Tecnología integrada" (.fx-tech-dots, hijo directo de
        .fx-section.fx-tech; el panel .fx-tech-inner queda por
        encima). Textura de dots azul Fixy con leve acento verde
        Flex; reacciona por proximidad del cursor sobre la
        sección completa. Estática en mobile/tablet o con
        prefers-reduced-motion (host = canvas.parentElement, se
        adapta solo al nuevo contenedor).
     --------------------------------------------------------- */
  var techDotsCanvas = document.querySelector(".fx-tech-dots");
  if (techDotsCanvas && techDotsCanvas.getContext) {
    (function () {
      var canvas = techDotsCanvas;
      var host = canvas.parentElement;
      var ctx = canvas.getContext("2d");
      var dots = [];
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var spacing = 36;
      var interactive = canHoverFine && !reduceMotion;
      var mouse = { x: null, y: null };
      var rafId = null;
      var resizeTimer = null;

      var blueRGB = "0,143,195";
      var greenRGB = "166,245,0";

      var pseudoRandom = function (seed) {
        var x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
      };

      var buildGrid = function (width, height) {
        dots = [];
        var cols = Math.round(width / spacing);
        var rows = Math.round(height / spacing);
        var offsetX = (width - cols * spacing) / 2;
        var offsetY = (height - rows * spacing) / 2;

        for (var row = 0; row <= rows; row++) {
          for (var col = 0; col <= cols; col++) {
            var jitterX = (pseudoRandom(row * 131.7 + col * 17.3) - 0.5) * 6;
            var jitterY = (pseudoRandom(row * 53.1 + col * 91.7) - 0.5) * 6;
            var isAccent = (row * cols + col) % 9 === 0;
            var baseR = isAccent ? 1.4 : 1.6;
            var baseO = isAccent ? 0.3 : 0.2;

            dots.push({
              x: offsetX + col * spacing + jitterX,
              y: offsetY + row * spacing + jitterY,
              baseR: baseR,
              baseO: baseO,
              r: baseR,
              o: baseO,
              color: isAccent ? greenRGB : blueRGB
            });
          }
        }
      };

      var draw = function () {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (var i = 0; i < dots.length; i++) {
          var d = dots[i];
          ctx.beginPath();
          ctx.fillStyle = "rgba(" + d.color + "," + d.o.toFixed(2) + ")";
          ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          ctx.fill();
        }
      };

      var tick = function () {
        var settled = true;

        for (var i = 0; i < dots.length; i++) {
          var d = dots[i];
          var targetR = d.baseR;
          var targetO = d.baseO;

          if (mouse.x !== null) {
            var dx = d.x - mouse.x;
            var dy = d.y - mouse.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            var influence = Math.max(0, 1 - dist / 120);

            targetR = d.baseR + influence * 2.2;
            targetO = Math.min(0.8, d.baseO + influence * 0.5);
          }

          d.r += (targetR - d.r) * 0.18;
          d.o += (targetO - d.o) * 0.18;

          if (Math.abs(targetR - d.r) > 0.02 || Math.abs(targetO - d.o) > 0.01) {
            settled = false;
          }
        }

        draw();

        rafId = settled ? null : window.requestAnimationFrame(tick);
      };

      var ensureLoop = function () {
        if (!rafId) {
          rafId = window.requestAnimationFrame(tick);
        }
      };

      var resize = function () {
        var rect = host.getBoundingClientRect();
        if (!rect.width || !rect.height) { return; }

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + "px";
        canvas.style.height = rect.height + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        buildGrid(rect.width, rect.height);
        draw();
      };

      resize();

      if (interactive) {
        host.addEventListener("mousemove", function (e) {
          var rect = host.getBoundingClientRect();
          mouse.x = e.clientX - rect.left;
          mouse.y = e.clientY - rect.top;
          ensureLoop();
        });

        host.addEventListener("mouseleave", function () {
          mouse.x = null;
          mouse.y = null;
          ensureLoop();
        });
      }

      window.addEventListener("resize", function () {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(resize, 150);
      });
    })();
  }
})();
