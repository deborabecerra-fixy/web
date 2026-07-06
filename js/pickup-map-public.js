/* ================================================================
   FIXY PICKUP — Mapa público (Leaflet + clustering + búsqueda real)
   ================================================================
   - Si js/firebase-config.js ya tiene tus claves reales, este script
     lee los puntos "activo" en vivo desde Firestore (se actualiza
     solo si un admin agrega/pausa/elimina un punto, sin recargar).
   - Si Firebase todavía no está configurado, muestra automáticamente
     el set de datos real de arranque (data/pickup-points-seed.json)
     con ubicaciones aproximadas por localidad, para que la página no
     se vea vacía mientras se completa la configuración.
   ================================================================ */

(function () {
  "use strict";

  var ZONE_META = {
    caba: { label: "CABA", color: "#66D7DD" },
    z1: { label: "Primer Cordón", color: "#FBBE37" },
    z2: { label: "Segundo Cordón", color: "#008FC3" },
    z3: { label: "Tercer Cordón", color: "#06587C" }
  };

  var mapEl = document.getElementById("puLeafletMap");
  if (!mapEl || typeof L === "undefined") { return; }

  var map = L.map(mapEl, { scrollWheelZoom: false, minZoom: 7 }).setView([-34.62, -58.6], 9);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 19,
    subdomains: "abcd",
    attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  map.on("focus", function () { map.scrollWheelZoom.enable(); });
  map.on("blur", function () { map.scrollWheelZoom.disable(); });

  var clusterGroup = L.markerClusterGroup({
    maxClusterRadius: 46,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false
  });
  map.addLayer(clusterGroup);

  var searchMarker = null;
  var allPoints = [];   // { id, nombre, direccion, horarios, servicios[], zona, lat, lng, aproximado }
  var activeZone = null;
  var markerById = {};

  function zoneMeta(zone) {
    return ZONE_META[zone] || ZONE_META.z2;
  }

  function pinIcon(zone, dim) {
    var meta = zoneMeta(zone);
    return L.divIcon({
      className: "pu-leaflet-pin" + (dim ? " is-dimmed" : ""),
      html: '<span style="background:' + meta.color + '"></span>',
      iconSize: [18, 18],
      popupAnchor: [0, -10]
    });
  }

  function popupHtml(p) {
    var chips = (p.servicios || []).map(function (s) {
      return '<span>' + s + '</span>';
    }).join("");
    var aviso = p.aproximado
      ? '<p class="pu-leaflet-popup-note">Ubicación aproximada (localidad). Precisión exacta disponible una vez completada la carga.</p>'
      : "";
    return (
      '<div class="pu-leaflet-popup">' +
      '<span class="pu-leaflet-popup-zone">' + zoneMeta(p.zona).label + '</span>' +
      '<h4>' + p.nombre + '</h4>' +
      '<p>' + p.direccion + '</p>' +
      (p.horarios ? '<p class="pu-leaflet-popup-hours">' + p.horarios + '</p>' : '') +
      '<div class="pu-leaflet-popup-tags">' + chips + '</div>' +
      aviso +
      '</div>'
    );
  }

  function renderMarkers() {
    clusterGroup.clearLayers();
    markerById = {};
    allPoints.forEach(function (p) {
      if (p.lat == null || p.lng == null) { return; }
      if (activeZone && p.zona !== activeZone) { return; }
      var marker = L.marker([p.lat, p.lng], { icon: pinIcon(p.zona, false) });
      marker.bindPopup(popupHtml(p));
      marker.puData = p;
      markerById[p.id] = marker;
      clusterGroup.addLayer(marker);
    });
  }

  function haversineKm(lat1, lng1, lat2, lng2) {
    var R = 6371;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLng = (lng2 - lng1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function focusPoint(p) {
    map.setView([p.lat, p.lng], 15, { animate: true });
    var marker = markerById[p.id];
    if (marker) {
      if (typeof clusterGroup.zoomToShowLayer === "function") {
        clusterGroup.zoomToShowLayer(marker, function () { marker.openPopup(); });
      } else {
        marker.openPopup();
      }
    }
  }

  function renderResultsList(items, container) {
    container.innerHTML = "";
    if (!items.length) {
      container.innerHTML = '<p class="pu-search-empty">No encontramos puntos con ese criterio.</p>';
      container.classList.add("is-open");
      return;
    }
    var title = document.createElement("p");
    title.className = "pu-search-results-title";
    title.textContent = "Puntos más cercanos a tu dirección";
    container.appendChild(title);
    items.forEach(function (item) {
      var row = document.createElement("button");
      row.type = "button";
      row.className = "pu-search-result";
      var distTxt = (typeof item.distKm === "number") ? '<span class="pu-search-result-dist">' + item.distKm.toFixed(1) + ' km</span>' : "";
      row.innerHTML = '<span class="pu-search-result-main"><strong>' + item.nombre + '</strong><small>' + item.direccion + '</small></span>' + distTxt;
      row.addEventListener("click", function () { focusPoint(item); });
      container.appendChild(row);
    });
    container.classList.add("is-open");
  }

  function initSearch() {
    var form = document.getElementById("puMapSearchForm");
    var input = document.getElementById("puMapSearch");
    var results = document.getElementById("puMapSearchResults");
    var searchBtn = document.getElementById("puMapSearchGeo");
    if (!form || !input || !results || !searchBtn) { return; }

    var btnText = searchBtn.querySelector(".pu-map-search-btn-text");

    function setLoading(isLoading) {
      searchBtn.disabled = isLoading;
      if (btnText) { btnText.textContent = isLoading ? "Buscando…" : "Buscar cercanos"; }
    }

    function showMessage(text) {
      results.innerHTML = '<p class="pu-search-empty">' + text + '</p>';
      results.classList.add("is-open");
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var query = input.value.trim();
      if (!query) {
        showMessage("Ingresá tu dirección (calle, número y localidad) para ver los puntos más cercanos.");
        return;
      }

      setLoading(true);
      var baseUrl = "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ar&q=";

      // 1er intento: la dirección tal cual la escribió el usuario.
      fetch(baseUrl + encodeURIComponent(query)).then(function (r) { return r.json(); }).then(function (data) {
        if (data && data.length) { return data; }
        // 2do intento (fallback): agregando ", Argentina" por si la dirección viene muy escueta
        // (ej: solo "Rivadavia 4550"), sin inventar zonas que Nominatim no reconozca.
        return fetch(baseUrl + encodeURIComponent(query + ", Argentina"))
          .then(function (r) { return r.json(); });
      }).then(function (data) {
        setLoading(false);
        if (!data || !data.length) {
          showMessage("No encontramos esa dirección. Revisá que esté completa (calle, número y localidad) e intentá de nuevo.");
          return;
        }
        var lat = parseFloat(data[0].lat);
        var lng = parseFloat(data[0].lon);

        if (searchMarker) { map.removeLayer(searchMarker); }
        searchMarker = L.marker([lat, lng], {
          icon: L.divIcon({ className: "pu-leaflet-pin pu-leaflet-pin-you", html: "<span></span>", iconSize: [16, 16] })
        }).addTo(map).bindPopup("Tu dirección buscada").openPopup();

        var withDist = allPoints
          .filter(function (p) { return p.lat != null && p.lng != null; })
          .map(function (p) {
            var copy = Object.assign({}, p);
            copy.distKm = haversineKm(lat, lng, p.lat, p.lng);
            return copy;
          })
          .sort(function (a, b) { return a.distKm - b.distKm; })
          .slice(0, 6);

        map.setView([lat, lng], 13, { animate: true });

        if (!withDist.length) {
          showMessage("Encontramos tu dirección, pero todavía no hay puntos activos cargados cerca. Probá ampliar la búsqueda o volvé más adelante.");
          return;
        }
        renderResultsList(withDist, results);
      }).catch(function () {
        setLoading(false);
        showMessage("Ocurrió un error al buscar tu dirección. Intentá nuevamente en unos segundos.");
      });
    });
  }

  function initFilters() {
    var buttons = document.querySelectorAll(".pu-map-filter");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var zone = btn.getAttribute("data-zone");
        activeZone = (activeZone === zone) ? null : zone;
        buttons.forEach(function (b) { b.classList.toggle("is-active", b === btn && !!activeZone); });
        renderMarkers();
      });
    });
  }

  function pointCountLabel() {
    var el = document.getElementById("puMapCount");
    if (el) {
      el.textContent = allPoints.length + " puntos activos cargados";
    }
  }

  function loadFromFirestore() {
    try {
      firebase.initializeApp(window.FIXY_FIREBASE_CONFIG);
      var db = firebase.firestore();
      db.collection("pickupPoints").where("estado", "==", "activo")
        .onSnapshot(function (snapshot) {
          allPoints = [];
          snapshot.forEach(function (doc) {
            var d = doc.data();
            allPoints.push({
              id: doc.id,
              nombre: d.nombre || d.localidad || "FixyPoint",
              direccion: d.direccionCompleta || d.calle || "",
              horarios: d.horarios || "",
              servicios: d.servicios || ["Pick Up"],
              zona: d.zona || "z2",
              lat: (typeof d.lat === "number") ? d.lat : null,
              lng: (typeof d.lng === "number") ? d.lng : null,
              aproximado: false
            });
          });
          renderMarkers();
          pointCountLabel();
        }, function (err) {
          console.warn("Fixy PickUp: no se pudo leer Firestore, uso datos de respaldo.", err);
          loadFromSeed();
        });
    } catch (err) {
      console.warn("Fixy PickUp: Firebase no disponible, uso datos de respaldo.", err);
      loadFromSeed();
    }
  }

  function loadFromSeed() {
    fetch("../data/pickup-points-seed.json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        allPoints = data.map(function (d, i) {
          return {
            id: "seed-" + i,
            nombre: d.partido + " · " + d.localidad,
            direccion: d.direccionCompleta,
            horarios: d.horarios,
            servicios: d.servicios || ["Pick Up"],
            zona: d.zonaSugerida,
            lat: d.latAprox,
            lng: d.lngAprox,
            aproximado: true
          };
        });
        renderMarkers();
        pointCountLabel();
      })
      .catch(function (err) {
        console.error("Fixy PickUp: no se pudieron cargar los puntos.", err);
      });
  }

  initFilters();
  initSearch();

  if (window.FIXY_FIREBASE_READY && typeof firebase !== "undefined") {
    loadFromFirestore();
  } else {
    loadFromSeed();
  }
}());
