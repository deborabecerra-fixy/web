/* ================================================================
   FIXY PICKUP — Panel de administración
   ================================================================
   Requiere: firebase-config.js ya completado con las claves reales
   del proyecto (ver SETUP-FIREBASE.md), Authentication con proveedor
   Email/Contraseña habilitado, y al menos un documento en la
   colección "admins" (ver instructivo) para poder operar.
   ================================================================ */

(function () {
  "use strict";

  var ZONA_POR_LOCALIDAD = {
    "AVELLANEDA": "z1", "LANUS": "z1", "LANÚS": "z1", "LOMAS DE ZAMORA": "z1",
    "SAN MARTIN": "z1", "SAN MARTÍN": "z1", "TRES DE FEBRERO": "z1", "VICENTE LOPEZ": "z1",
    "VICENTE LÓPEZ": "z1", "CIUDADELA": "z1", "VILLA BALLESTER": "z1", "OLIVOS": "z1",
    "TEMPERLEY": "z1", "WILDE": "z1", "LA MATANZA": "z1", "GONZALEZ CATAN": "z1",
    "EZEIZA": "z2", "MORENO": "z2", "MERLO": "z2", "MORON": "z2", "MORÓN": "z2",
    "QUILMES": "z2", "SAN MIGUEL": "z2", "SAN ISIDRO": "z2", "TIGRE": "z2",
    "ESCOBAR": "z2", "PILAR": "z2", "HURLINGHAM": "z2", "ITUZAINGO": "z2",
    "FLORENCIO VARELA": "z2", "ESTEBAN ECHEVERRIA": "z2", "MALVINAS ARGENTINAS": "z2",
    "JOSE C PAZ": "z2", "SAN FERNANDO": "z2", "ALMIRANTE BROWN": "z2", "BERAZATEGUI": "z2",
    "SAN VICENTE": "z3", "CORONEL BRANDSEN": "z3", "EXALTACION DE LA CRUZ": "z3",
    "CAMPANA": "z3", "GENERAL LAS HERAS": "z3", "CAÑUELAS": "z3", "LA PLATA": "z3",
    "LUJAN": "z3", "ZARATE": "z3", "MARCOS PAZ": "z3", "GENERAL RODRIGUEZ": "z3",
    "PRESIDENTE PERON": "z3", "BERISSO": "z3", "ENSENADA": "z3",
    "CABA": "caba", "CIUDAD AUTONOMA BUENOS AIRES": "caba"
  };

  function guessZona(text) {
    if (!text) { return "z2"; }
    var upper = text.toUpperCase();
    for (var key in ZONA_POR_LOCALIDAD) {
      if (upper.indexOf(key) !== -1) { return ZONA_POR_LOCALIDAD[key]; }
    }
    return "z2";
  }

  // Normaliza direcciones para comparar (sin importar mayúsculas, tildes o espacios extra).
  function normalizeAddr(str) {
    return (str || "")
      .toString()
      .trim()
      .toLowerCase()
      .normalize("NFD").replace(new RegExp("[̀-ͯ]", "g"), "")
      .replace(/\s+/g, " ");
  }

  // ---------------------------------------------------------------
  // Firebase init
  // ---------------------------------------------------------------
  var configWarning = document.getElementById("puAdminConfigWarning");
  if (!window.FIXY_FIREBASE_READY) {
    if (configWarning) { configWarning.hidden = false; }
    var loginBtn = document.getElementById("puAdminLoginBtn");
    if (loginBtn) { loginBtn.disabled = true; }
    return;
  }

  firebase.initializeApp(window.FIXY_FIREBASE_CONFIG);
  var auth = firebase.auth();
  var db = firebase.firestore();

  var loginScreen = document.getElementById("puAdminLogin");
  var appScreen = document.getElementById("puAdminApp");
  var loginForm = document.getElementById("puAdminLoginForm");
  var loginError = document.getElementById("puAdminLoginError");
  var userEmailEl = document.getElementById("puAdminUserEmail");

  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();
    loginError.hidden = true;
    var email = document.getElementById("puAdminEmail").value.trim();
    var password = document.getElementById("puAdminPassword").value;
    auth.signInWithEmailAndPassword(email, password).catch(function (err) {
      loginError.textContent = "No se pudo iniciar sesión: " + (err.message || err.code);
      loginError.hidden = false;
    });
  });

  document.getElementById("puAdminLogoutBtn").addEventListener("click", function () {
    auth.signOut();
  });

  auth.onAuthStateChanged(function (user) {
    if (!user) {
      loginScreen.hidden = false;
      appScreen.hidden = true;
      return;
    }
    db.collection("admins").doc(user.uid).get().then(function (doc) {
      if (!doc.exists) {
        loginError.textContent = "Tu cuenta (" + user.email + ") no tiene permisos de administrador. Pedile a quien gestiona Firebase que te agregue a la colección \"admins\".";
        loginError.hidden = false;
        auth.signOut();
        return;
      }
      loginScreen.hidden = true;
      appScreen.hidden = false;
      userEmailEl.textContent = user.email;
      initApp();
    }).catch(function (err) {
      loginError.textContent = "Error verificando permisos: " + err.message;
      loginError.hidden = false;
      auth.signOut();
    });
  });

  // ---------------------------------------------------------------
  // Tabs
  // ---------------------------------------------------------------
  function initTabs() {
    var tabs = document.querySelectorAll(".pu-admin-tab");
    var panels = {
      add: document.getElementById("puAdminTabAdd"),
      manage: document.getElementById("puAdminTabManage"),
      import: document.getElementById("puAdminTabImport")
    };
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) { t.classList.remove("is-active"); });
        tab.classList.add("is-active");
        Object.keys(panels).forEach(function (key) {
          panels[key].classList.toggle("is-active", key === tab.getAttribute("data-tab"));
        });
      });
    });
  }

  function goToTab(name) {
    document.querySelector('.pu-admin-tab[data-tab="' + name + '"]').click();
  }

  // ---------------------------------------------------------------
  // TAB: Agregar / editar punto
  // ---------------------------------------------------------------
  var confirmMap = null;
  var confirmMarker = null;
  var currentLatLng = null;
  var pendingImportFix = null; // referencia al ítem de importResults.fail que se está corrigiendo a mano

  function ensureConfirmMap(lat, lng) {
    var el = document.getElementById("puAdminConfirmMap");
    if (!confirmMap) {
      confirmMap = L.map(el).setView([lat, lng], 16);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(confirmMap);
      confirmMarker = L.marker([lat, lng], { draggable: true }).addTo(confirmMap);
      confirmMarker.on("dragend", function () {
        currentLatLng = confirmMarker.getLatLng();
        updateCoordsLabel();
      });
    } else {
      confirmMap.setView([lat, lng], 16);
      confirmMarker.setLatLng([lat, lng]);
      setTimeout(function () { confirmMap.invalidateSize(); }, 80);
    }
    currentLatLng = { lat: lat, lng: lng };
    updateCoordsLabel();
  }

  function updateCoordsLabel() {
    var label = document.getElementById("puAdminCoordsLabel");
    if (currentLatLng) {
      label.textContent = "Coordenadas: " + currentLatLng.lat.toFixed(6) + ", " + currentLatLng.lng.toFixed(6);
    }
  }

  function searchAddress(query, resultsEl) {
    resultsEl.innerHTML = '<p class="pu-admin-hint">Buscando…</p>';
    var url = "https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=ar&q=" + encodeURIComponent(query);
    return fetch(url).then(function (r) { return r.json(); }).then(function (data) {
      resultsEl.innerHTML = "";
      if (!data || !data.length) {
        resultsEl.innerHTML = '<p class="pu-admin-hint">No se encontraron resultados. Probá con más detalle (calle, número y localidad).</p>';
        return;
      }
      data.forEach(function (item) {
        var row = document.createElement("button");
        row.type = "button";
        row.className = "pu-admin-address-result";
        row.textContent = item.display_name;
        row.addEventListener("click", function () { selectAddressResult(item); });
        resultsEl.appendChild(row);
      });
    });
  }

  function selectAddressResult(item) {
    var lat = parseFloat(item.lat);
    var lng = parseFloat(item.lon);
    var addr = item.address || {};

    document.getElementById("puAdminConfirmStep").hidden = false;
    document.getElementById("puAdminDetailsStep").hidden = false;
    ensureConfirmMap(lat, lng);

    document.getElementById("puAdminDireccion").value = item.display_name;
    document.getElementById("puAdminLocalidad").value = addr.suburb || addr.city_district || addr.town || addr.village || addr.city || "";
    document.getElementById("puAdminPartido").value = addr.city || addr.county || addr.town || "";
    document.getElementById("puAdminCP").value = addr.postcode || "";
    document.getElementById("puAdminZona").value = guessZona((addr.city || "") + " " + (addr.town || "") + " " + (addr.suburb || ""));
    if (!document.getElementById("puAdminNombre").value) {
      document.getElementById("puAdminNombre").value = "FixyPoint " + (addr.suburb || addr.city || addr.town || "");
    }
  }

  function resetAddForm() {
    document.getElementById("puAdminEditingId").value = "";
    document.getElementById("puAdminAddTitle").textContent = "Agregar nuevo punto Pick Up";
    document.getElementById("puAdminAddressInput").value = "";
    document.getElementById("puAdminAddressResults").innerHTML = "";
    document.getElementById("puAdminConfirmStep").hidden = true;
    document.getElementById("puAdminDetailsStep").hidden = true;
    document.getElementById("puAdminDetailsForm").reset();
    currentLatLng = null;
    pendingImportFix = null;
  }

  function loadPointIntoForm(id, data) {
    goToTab("add");
    document.getElementById("puAdminEditingId").value = id;
    document.getElementById("puAdminAddTitle").textContent = "Editar punto: " + (data.nombre || "");
    document.getElementById("puAdminConfirmStep").hidden = false;
    document.getElementById("puAdminDetailsStep").hidden = false;
    document.getElementById("puAdminNombre").value = data.nombre || "";
    document.getElementById("puAdminDireccion").value = data.direccionCompleta || "";
    document.getElementById("puAdminLocalidad").value = data.localidad || "";
    document.getElementById("puAdminPartido").value = data.partido || "";
    document.getElementById("puAdminCP").value = data.codigoPostal || "";
    document.getElementById("puAdminZona").value = data.zona || "z2";
    document.getElementById("puAdminHorarios").value = data.horarios || "";
    document.getElementById("puAdminServPickup").checked = (data.servicios || []).indexOf("Pick Up") !== -1;
    document.getElementById("puAdminServDropoff").checked = (data.servicios || []).indexOf("Drop Off") !== -1;
    document.getElementById("puAdminEstado").value = data.estado || "activo";
    if (typeof data.lat === "number" && typeof data.lng === "number") {
      ensureConfirmMap(data.lat, data.lng);
    }
  }

  function initAddTab() {
    document.getElementById("puAdminAddressSearchBtn").addEventListener("click", function () {
      var query = document.getElementById("puAdminAddressInput").value.trim();
      if (!query) { return; }
      searchAddress(query, document.getElementById("puAdminAddressResults"));
    });

    document.getElementById("puAdminCancelBtn").addEventListener("click", resetAddForm);

    document.getElementById("puAdminDetailsForm").addEventListener("submit", function (event) {
      event.preventDefault();
      var feedback = document.getElementById("puAdminSaveFeedback");
      if (!currentLatLng) {
        alert("Primero buscá y confirmá una dirección en el mapa.");
        return;
      }

      var editingId = document.getElementById("puAdminEditingId").value;
      var direccionCompleta = document.getElementById("puAdminDireccion").value.trim();
      var direccionNormalizada = normalizeAddr(direccionCompleta);

      var duplicado = allManagedPoints.some(function (item) {
        if (editingId && item.id === editingId) { return false; }
        return normalizeAddr(item.data.direccionCompleta || "") === direccionNormalizada;
      });
      if (duplicado) {
        feedback.hidden = false;
        feedback.className = "pu-admin-feedback is-error";
        feedback.textContent = "Ya existe un punto cargado con esa misma dirección. Buscalo en \"Gestionar puntos\" para editarlo, reactivarlo o eliminarlo antes de crear uno nuevo.";
        return;
      }

      var servicios = [];
      if (document.getElementById("puAdminServPickup").checked) { servicios.push("Pick Up"); }
      if (document.getElementById("puAdminServDropoff").checked) { servicios.push("Drop Off"); }

      var payload = {
        nombre: document.getElementById("puAdminNombre").value.trim(),
        direccionCompleta: direccionCompleta,
        localidad: document.getElementById("puAdminLocalidad").value.trim(),
        partido: document.getElementById("puAdminPartido").value.trim(),
        codigoPostal: document.getElementById("puAdminCP").value.trim(),
        zona: document.getElementById("puAdminZona").value,
        horarios: document.getElementById("puAdminHorarios").value.trim(),
        servicios: servicios,
        estado: document.getElementById("puAdminEstado").value,
        lat: currentLatLng.lat,
        lng: currentLatLng.lng,
        geocodificado: true,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (pendingImportFix && pendingImportFix.idOrigen) {
        payload.idOrigen = pendingImportFix.idOrigen;
      }

      var fixedItem = pendingImportFix;
      var promise;
      if (editingId) {
        promise = db.collection("pickupPoints").doc(editingId).update(payload);
      } else {
        payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        promise = db.collection("pickupPoints").add(payload);
      }

      promise.then(function () {
        feedback.hidden = false;
        feedback.className = "pu-admin-feedback is-ok";
        feedback.textContent = "Punto guardado correctamente.";
        if (fixedItem) {
          importResults.fail = importResults.fail.filter(function (f) { return f.idOrigen !== fixedItem.idOrigen; });
          var failCountEl = document.getElementById("puAdminImportFailCount");
          if (failCountEl) { failCountEl.textContent = importResults.fail.length; }
          renderImportFails();
          feedback.textContent = "Punto guardado y sincronizado. Ya no figura pendiente en \"Importar datos iniciales\".";
        }
        resetAddForm();
      }).catch(function (err) {
        feedback.hidden = false;
        feedback.className = "pu-admin-feedback is-error";
        feedback.textContent = "Error al guardar: " + err.message;
      });
    });
  }

  // ---------------------------------------------------------------
  // TAB: Gestionar puntos
  // ---------------------------------------------------------------
  var allManagedPoints = [];

  function initManageTab() {
    db.collection("pickupPoints").onSnapshot(function (snapshot) {
      allManagedPoints = [];
      snapshot.forEach(function (doc) {
        allManagedPoints.push({ id: doc.id, data: doc.data() });
      });
      renderManageTable();
    });

    document.getElementById("puAdminManageSearch").addEventListener("input", renderManageTable);
    document.getElementById("puAdminManageEstado").addEventListener("change", renderManageTable);
    document.getElementById("puAdminManageZona").addEventListener("change", renderManageTable);
  }

  function renderManageTable() {
    var query = document.getElementById("puAdminManageSearch").value.trim().toLowerCase();
    var estadoFilter = document.getElementById("puAdminManageEstado").value;
    var zonaFilter = document.getElementById("puAdminManageZona").value;
    var body = document.getElementById("puAdminManageBody");
    var countEl = document.getElementById("puAdminManageCount");

    var filtered = allManagedPoints.filter(function (item) {
      var d = item.data;
      var haystack = ((d.nombre || "") + " " + (d.direccionCompleta || "") + " " + (d.localidad || "")).toLowerCase();
      var matchesQuery = !query || haystack.indexOf(query) !== -1;
      var matchesEstado = !estadoFilter || d.estado === estadoFilter;
      var matchesZona = !zonaFilter || d.zona === zonaFilter;
      return matchesQuery && matchesEstado && matchesZona;
    });

    countEl.textContent = filtered.length + " de " + allManagedPoints.length + " puntos";
    body.innerHTML = "";

    filtered.forEach(function (item) {
      var d = item.data;
      var tr = document.createElement("tr");

      var estadoBadge = '<span class="pu-admin-badge ' + (d.estado === "activo" ? "is-active" : "is-paused") + '">' + (d.estado === "activo" ? "Activo" : "Pausado") + '</span>';

      tr.innerHTML =
        "<td>" + (d.nombre || "") + "</td>" +
        "<td>" + (d.direccionCompleta || "") + "</td>" +
        "<td>" + (d.zona || "") + "</td>" +
        "<td>" + estadoBadge + "</td>" +
        '<td class="pu-admin-row-actions"></td>';

      var actionsCell = tr.querySelector(".pu-admin-row-actions");

      var toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.textContent = d.estado === "activo" ? "Pausar" : "Reactivar";
      toggleBtn.addEventListener("click", function () {
        db.collection("pickupPoints").doc(item.id).update({
          estado: d.estado === "activo" ? "pausado" : "activo"
        });
      });

      var editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.textContent = "Editar";
      editBtn.addEventListener("click", function () { loadPointIntoForm(item.id, d); });

      var deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "is-danger";
      deleteBtn.textContent = "Eliminar";
      deleteBtn.addEventListener("click", function () {
        if (window.confirm('¿Eliminar definitivamente "' + d.nombre + '"? Esta acción no se puede deshacer.')) {
          db.collection("pickupPoints").doc(item.id).delete();
        }
      });

      actionsCell.appendChild(toggleBtn);
      actionsCell.appendChild(editBtn);
      actionsCell.appendChild(deleteBtn);
      body.appendChild(tr);
    });
  }

  // ---------------------------------------------------------------
  // TAB: Importar datos iniciales
  // ---------------------------------------------------------------
  var importResults = { ok: [], fail: [] };

  function initImportTab() {
    document.getElementById("puAdminImportStart").addEventListener("click", runImport);
    document.getElementById("puAdminImportConfirm").addEventListener("click", confirmImport);
  }

  function delay(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }

  function runImport() {
    var startBtn = document.getElementById("puAdminImportStart");
    var progressWrap = document.getElementById("puAdminImportProgress");
    var barFill = document.getElementById("puAdminImportBarFill");
    var status = document.getElementById("puAdminImportStatus");

    startBtn.disabled = true;
    progressWrap.hidden = false;
    importResults = { ok: [], fail: [] };

    Promise.all([
      fetch("../../data/pickup-points-seed.json").then(function (r) { return r.json(); }),
      db.collection("pickupPoints").get()
    ]).then(function (results) {
      var seed = results[0];
      var existing = results[1];
      var existingIds = {};
      existing.forEach(function (doc) {
        var d = doc.data();
        if (d.idOrigen) { existingIds[d.idOrigen] = true; }
      });

      var pending = seed.filter(function (item) { return !existingIds[item.idOrigen]; });
      var total = pending.length;
      if (!total) {
        status.textContent = "No hay puntos nuevos para importar (ya estaban todos cargados).";
        return;
      }

      var i = 0;
      function processNext() {
        if (i >= total) {
          status.textContent = "Listo: " + importResults.ok.length + " geocodificados, " + importResults.fail.length + " a revisar.";
          document.getElementById("puAdminImportSummary").hidden = false;
          document.getElementById("puAdminImportOkCount").textContent = importResults.ok.length;
          document.getElementById("puAdminImportFailCount").textContent = importResults.fail.length;
          renderImportFails();
          return;
        }
        var item = pending[i];
        status.textContent = "Procesando " + (i + 1) + " / " + total + ": " + item.direccionCompleta;
        barFill.style.width = Math.round(((i + 1) / total) * 100) + "%";

        var url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ar&q=" + encodeURIComponent(item.direccionCompleta);
        fetch(url).then(function (r) { return r.json(); }).then(function (data) {
          if (data && data.length) {
            importResults.ok.push({
              idOrigen: item.idOrigen,
              nombre: item.partido + " · " + item.localidad,
              direccionCompleta: item.direccionCompleta,
              localidad: item.localidad,
              partido: item.partido,
              codigoPostal: item.codigoPostal,
              horarios: item.horarios,
              servicios: item.servicios || ["Pick Up"],
              zona: item.zonaSugerida,
              estado: item.estado || "activo",
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon),
              geocodificado: true
            });
          } else {
            importResults.fail.push(item);
          }
        }).catch(function () {
          importResults.fail.push(item);
        }).then(function () {
          i++;
          delay(1100).then(processNext);
        });
      }
      processNext();
    });
  }

  function renderImportFails() {
    var wrap = document.getElementById("puAdminImportFails");
    wrap.innerHTML = "";
    if (!importResults.fail.length) { return; }
    var title = document.createElement("p");
    title.className = "pu-admin-hint";
    title.textContent = "Direcciones que no se pudieron ubicar automáticamente (corregilas a mano en la pestaña \"Agregar punto\"):";
    wrap.appendChild(title);
    importResults.fail.forEach(function (item) {
      var row = document.createElement("div");
      row.className = "pu-admin-import-fail-row";
      row.innerHTML = "<span>" + item.direccionCompleta + "</span>";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Corregir manualmente";
      btn.addEventListener("click", function () {
        resetAddForm();
        goToTab("add");
        pendingImportFix = item;
        document.getElementById("puAdminAddressInput").value = item.direccionCompleta;
        document.getElementById("puAdminNombre").value = item.partido + " · " + item.localidad;
        document.getElementById("puAdminHorarios").value = item.horarios || "";
        document.getElementById("puAdminCP").value = item.codigoPostal || "";
        document.getElementById("puAdminZona").value = item.zonaSugerida || "z2";
        searchAddress(item.direccionCompleta, document.getElementById("puAdminAddressResults"));
      });
      row.appendChild(btn);
      wrap.appendChild(row);
    });
  }

  function confirmImport() {
    if (!importResults.ok.length) { return; }
    var confirmBtn = document.getElementById("puAdminImportConfirm");
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Importando…";

    var batch = db.batch();
    importResults.ok.forEach(function (point) {
      var ref = db.collection("pickupPoints").doc();
      var payload = Object.assign({}, point, { createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      batch.set(ref, payload);
    });

    batch.commit().then(function () {
      confirmBtn.textContent = "Importado ✔";
      document.getElementById("puAdminImportStatus").textContent = "Importación completa: " + importResults.ok.length + " puntos cargados.";
    }).catch(function (err) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Confirmar e importar a Firestore";
      alert("Error al importar: " + err.message);
    });
  }

  // ---------------------------------------------------------------
  function initApp() {
    if (window.__puAdminInited) { return; }
    window.__puAdminInited = true;
    initTabs();
    initAddTab();
    initManageTab();
    initImportTab();
  }
}());
