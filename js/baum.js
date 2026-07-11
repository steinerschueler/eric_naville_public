/* Hereinzoomen in den Weltanschauungs-Baum:
   Ein Klick auf einen Gattungs-Kreis zoomt hinein (Hash #rationalismus)
   und macht seine zwölf Art-Kugeln sichtbar; ein Klick auf eine Art-Kugel
   folgt ihrem Verweis zur Art-Liste. Ohne JavaScript führen alle Verweise
   direkt zu den Seiten. Escape oder ein Klick ins Leere zoomt hinaus,
   „← Ganzer Baum“ ebenso. Vor/Zurück im Browser funktionieren. */

(function () {
  "use strict";

  var svg = document.querySelector(".baum-rollbereich svg");
  if (!svg) return;

  var START = svg.getAttribute("viewBox").split(/\s+/).map(Number);
  var SEITENVERHAELTNIS = START[2] / START[3];
  var aktuell = START.slice();
  var animation = null;
  var zurueckKnopf = document.querySelector(".zoom-zurueck");
  var ruhig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function kreisVon(slug) {
    return slug ? svg.querySelector('.kreis[data-slug="' + slug + '"]') : null;
  }

  function masse(kreisEl, wahl) {
    var k = kreisEl.querySelector(wahl);
    return k ? { cx: +k.getAttribute("cx"), cy: +k.getAttribute("cy"), r: +k.getAttribute("r") } : null;
  }

  function zustandAusHash() {
    // Defekte oder fremde Hashes (kaputtes %-Encoding, Anführungszeichen)
    // dürfen das Skript nie zu Fall bringen – dann gilt schlicht: nicht gezoomt.
    try {
      var h = decodeURIComponent(location.hash.replace(/^#/, ""));
      if (!h) return null;
      var teile = h.split("/");
      var kreis = kreisVon(teile[0]);
      if (!kreis) return null;
      var zustand = { gattung: teile[0], kreis: kreis, art: null, artEl: null };
      if (teile[1]) {
        var artEl = kreis.querySelector('.art[data-art="' + teile[1] + '"]');
        if (artEl) { zustand.art = teile[1]; zustand.artEl = artEl; }
      }
      return zustand;
    } catch (fehler) {
      return null;
    }
  }

  function zielkasten(m, faktor) {
    var h = m.r * faktor;
    var w = h * SEITENVERHAELTNIS;
    return [m.cx - w / 2, m.cy - h / 2, w, h];
  }

  function setzeKasten(kasten) {
    aktuell = kasten;
    svg.setAttribute("viewBox", kasten.map(function (n) { return n.toFixed(2); }).join(" "));
  }

  function fahreZu(kasten) {
    if (animation) cancelAnimationFrame(animation);
    if (ruhig) { setzeKasten(kasten); return; }
    var von = aktuell.slice();
    var beginn = null;
    var DAUER = 650;
    function schritt(zeit) {
      if (beginn === null) beginn = zeit;
      var t = Math.min(1, (zeit - beginn) / DAUER);
      var e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      setzeKasten(von.map(function (v, i) { return v + (kasten[i] - v) * e; }));
      animation = t < 1 ? requestAnimationFrame(schritt) : null;
    }
    animation = requestAnimationFrame(schritt);
  }

  function anwenden(zustand, animiert) {
    svg.querySelectorAll(".kreis").forEach(function (g) {
      g.classList.toggle("aktiv", !!zustand && g === zustand.kreis);
    });
    svg.querySelectorAll(".art").forEach(function (g) {
      g.classList.toggle("aktiv", !!zustand && g === zustand.artEl);
    });
    svg.classList.toggle("gezoomt", !!zustand);
    svg.classList.toggle("gezoomt-art", !!(zustand && zustand.artEl));
    if (zurueckKnopf) zurueckKnopf.hidden = !zustand;

    var kasten = START.slice();
    if (zustand) {
      var m = zustand.artEl ? masse(zustand.artEl, "circle.art-kugel")
                            : masse(zustand.kreis, "circle.kreisflaeche");
      if (m) kasten = zielkasten(m, zustand.artEl ? 3.4 : 2.8);
    }
    if (animiert) {
      fahreZu(kasten);
    } else {
      if (animation) cancelAnimationFrame(animation);
      animation = null;
      setzeKasten(kasten);
    }
  }

  function hashSetzen(wert) {
    if (wert) {
      if (location.hash !== "#" + wert) location.hash = wert;
    } else {
      history.pushState("", document.title, location.pathname + location.search);
      anwenden(null, true);
    }
  }

  function eineStufeZurueck() {
    var z = zustandAusHash();
    if (z && z.art) hashSetzen(z.gattung);
    else hashSetzen(null);
  }

  svg.addEventListener("click", function (ereignis) {
    var ziel = ereignis.target;
    if (!ziel.closest) return;

    // Klick mit Zusatztaste (neuer Tab, neues Fenster): native Navigation
    // zur Gattungsseite gilt, kein Zoom.
    if (ereignis.button !== 0 || ereignis.metaKey || ereignis.ctrlKey ||
        ereignis.shiftKey || ereignis.altKey) return;

    // Ein Klick auf eine Art-Kugel folgt ihrem Verweis zur Art-Liste.
    // (Die Kugeln sind erst sichtbar und klickbar, wenn ihre Gattung
    //  hereingezoomt ist; siehe CSS a.art-link.)
    if (ziel.closest("a.art-link")) return;

    var kreisVerweis = ziel.closest("a.kreis-link");
    if (kreisVerweis) {
      ereignis.preventDefault();
      hashSetzen(kreisVerweis.closest(".kreis").dataset.slug);
      return;
    }

    // Klick ins Leere: eine Stufe zurück
    if (svg.classList.contains("gezoomt-art") && !ziel.closest(".art.aktiv")) {
      eineStufeZurueck();
    } else if (svg.classList.contains("gezoomt") &&
               !svg.classList.contains("gezoomt-art") &&
               !ziel.closest(".kreis.aktiv")) {
      eineStufeZurueck();
    }
  });

  if (zurueckKnopf) zurueckKnopf.addEventListener("click", function () { hashSetzen(null); });

  window.addEventListener("keydown", function (ereignis) {
    if (ereignis.key === "Escape" && svg.classList.contains("gezoomt")) eineStufeZurueck();
  });

  window.addEventListener("hashchange", function () {
    anwenden(zustandAusHash(), true);
  });

  // Anfangszustand: ein Hash wie #realismus oder #realismus/1 zoomt
  // sofort hinein – ohne Überblendung, damit die Seite fertig dasteht.
  svg.classList.add("ohne-uebergang");
  anwenden(zustandAusHash(), false);
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      svg.classList.remove("ohne-uebergang");
    });
  });
})();
