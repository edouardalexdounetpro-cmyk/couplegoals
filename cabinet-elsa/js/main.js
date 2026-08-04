/* ===========================================================
   Cabinet Elsa Quintin — logique de la page
   =========================================================== */

/* -----------------------------------------------------------
   ⚙️  CONFIGURATION À COMPLÉTER
   -----------------------------------------------------------
   1) FORMULAIRE → BOÎTE GMAIL
      Le formulaire de contact utilise Web3Forms, un service
      gratuit qui transfère chaque message reçu vers une adresse
      e-mail (Gmail par exemple), sans serveur à gérer.

      Pour l'activer :
        a. Aller sur https://web3forms.com
        b. Saisir l'adresse Gmail du cabinet -> un "Access Key"
           est envoyé par mail.
        c. Coller cette clé ci-dessous à la place de la valeur
           d'exemple. Les demandes arriveront alors directement
           dans la boîte Gmail indiquée.

      Tant que la clé n'est pas remplie, le formulaire bascule
      automatiquement sur l'application e-mail du visiteur
      (mailto) — voir CABINET_EMAIL ci-dessous.

   2) ADRESSE E-MAIL DU CABINET
      Renseigner l'adresse Gmail réelle du cabinet (utilisée pour
      le lien "mailto" de secours et affichée sur la page).
   ----------------------------------------------------------- */

const WEB3FORMS_KEY = "REMPLACER_PAR_VOTRE_ACCESS_KEY"; // ← clé Web3Forms
const CABINET_EMAIL = "contact@cabinet-elsa-quintin.fr"; // ← Gmail du cabinet

/* Coordonnées du cabinet : 3 rue René Leduc, 31500 Toulouse */
const CABINET_COORDS = [43.6108, 1.4566];
const RAYON_METRES = 1150; // couvre Les Chalets jusqu'aux abords de Jean Jaurès

/* -----------------------------------------------------------
   Menu mobile
   ----------------------------------------------------------- */
(function initNav() {
  const toggle = document.querySelector(".nav__toggle");
  const links = document.querySelector(".nav__links");
  if (!toggle || !links) return;
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  links.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      links.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    })
  );
})();

/* -----------------------------------------------------------
   Adresse e-mail affichée (synchronisée avec la config)
   ----------------------------------------------------------- */
(function syncEmail() {
  document.querySelectorAll("[data-cabinet-email]").forEach((el) => {
    el.textContent = CABINET_EMAIL;
    el.setAttribute("href", "mailto:" + CABINET_EMAIL);
  });
})();

/* -----------------------------------------------------------
   Carte Leaflet : cabinet + rayon d'intervention
   ----------------------------------------------------------- */
(function initMap() {
  const el = document.getElementById("map");
  if (!el || typeof L === "undefined") return;

  const map = L.map("map", {
    center: CABINET_COORDS,
    zoom: 14,
    scrollWheelZoom: false,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  // Rayon d'intervention
  L.circle(CABINET_COORDS, {
    radius: RAYON_METRES,
    color: "#0d9488",
    weight: 2,
    fillColor: "#14b8a6",
    fillOpacity: 0.14,
  }).addTo(map);

  // Marqueur du cabinet
  const icon = L.divIcon({
    className: "cabinet-pin",
    html:
      '<div style="background:#0d9488;width:26px;height:26px;border-radius:50% 50% 50% 0;' +
      'transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.3)"></div>',
    iconSize: [26, 26],
    iconAnchor: [13, 26],
  });

  L.marker(CABINET_COORDS, { icon, title: "Cabinet Elsa Quintin" })
    .addTo(map)
    .bindPopup(
      "<strong>Cabinet Elsa Quintin &amp; Carole Pujol</strong><br>3 rue René Leduc, 31500 Toulouse"
    );

  // Ajuster la vue pour montrer tout le rayon
  const bounds = L.latLng(CABINET_COORDS).toBounds(RAYON_METRES * 2.4);
  map.fitBounds(bounds);

  // Activer le zoom molette au clic (évite les scrolls accidentels)
  map.on("click", () => map.scrollWheelZoom.enable());
  map.on("mouseout", () => map.scrollWheelZoom.disable());
})();

/* -----------------------------------------------------------
   Formulaire de contact → Gmail (via Web3Forms) + secours mailto
   ----------------------------------------------------------- */
(function initForm() {
  const form = document.getElementById("contact-form");
  const status = document.getElementById("form-status");
  const btn = document.getElementById("submit-btn");
  if (!form) return;

  const keyConfigured =
    WEB3FORMS_KEY && !WEB3FORMS_KEY.startsWith("REMPLACER");

  function setStatus(msg, type) {
    status.textContent = msg;
    status.className = "form__status" + (type ? " is-" + type : "");
  }

  function buildMailtoFallback(data) {
    const subject = `Demande de soins — ${data.prenom} ${data.nom}`;
    const body =
      `Prénom : ${data.prenom}\n` +
      `Nom : ${data.nom}\n` +
      `Adresse : ${data.adresse}\n` +
      `E-mail : ${data.email}\n` +
      `Téléphone : ${data.telephone}\n\n` +
      `Message :\n${data.message}\n`;
    return `mailto:${CABINET_EMAIL}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Honeypot anti-spam
    if (form.botcheck && form.botcheck.checked) return;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());

    // Sans clé configurée : ouverture du client mail du visiteur
    if (!keyConfigured) {
      setStatus("Ouverture de votre application e-mail…", "ok");
      window.location.href = buildMailtoFallback(data);
      return;
    }

    btn.disabled = true;
    setStatus("Envoi en cours…", null);

    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: `Nouvelle demande de soins — ${data.prenom} ${data.nom}`,
          from_name: "Site du cabinet Elsa Quintin",
          Prénom: data.prenom,
          Nom: data.nom,
          Adresse: data.adresse,
          "E-mail": data.email,
          Téléphone: data.telephone,
          Message: data.message,
        }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setStatus(
          "Merci ! Votre demande a bien été envoyée. Le cabinet vous recontacte au plus vite.",
          "ok"
        );
        form.reset();
      } else {
        throw new Error(json.message || "Échec de l'envoi");
      }
    } catch (err) {
      setStatus(
        "L'envoi automatique a échoué. Ouverture de votre application e-mail…",
        "error"
      );
      window.location.href = buildMailtoFallback(data);
    } finally {
      btn.disabled = false;
    }
  });
})();
