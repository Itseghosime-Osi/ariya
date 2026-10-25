/* Fine invitation cards, drawn in SVG gold foil on coloured stock.
   FineCard.html(options) returns the markup for one 5:7 card. Styles live in assets/ariya.css (.fc). */
(function () {
  var uid = 0;
  function foil(id) {
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#9c7432"/><stop offset=".3" stop-color="#f3dca4"/><stop offset=".5" stop-color="#b98c42"/>' +
      '<stop offset=".72" stop-color="#f8e7bb"/><stop offset="1" stop-color="#8f6a2c"/></linearGradient>';
  }
  // One corner, drawn for the top-left and mirrored into the other three.
  function corner(id) {
    return '<g id="' + id + '" fill="none" stroke-linecap="round">' +
      '<path d="M16 78 V30 Q16 16 30 16 H78" stroke-width="1.1"/>' +
      '<path d="M23 62 Q23 23 62 23" stroke-width=".6"/>' +
      '<path d="M78 16 c11 0 15 9 9.5 14 c-4.5 4 -10.5 0 -7.2 -4.2" stroke-width=".8"/>' +
      '<path d="M16 78 c0 11 9 15 14 9.5 c4 -4.5 0 -10.5 -4.2 -7.2" stroke-width=".8"/>' +
      '<g transform="translate(41 41)" stroke-width=".85">' +
        '<path d="M0 0 c2.5 -3 7 -2 7 1.5 c0 4.5 -6.5 6 -9 2.5 c-2.5 -4.5 2 -10 7.5 -9.5 c7 .8 9.5 8.5 5 13 c-5.5 5.5 -15 3 -16.5 -4.5 c-1.6 -8.5 6 -15.5 14.5 -14"/>' +
        '<path d="M-12 -1 c-2.5 -9.5 6 -16.5 15 -14.5"/><path d="M13 9 c4.5 6.5 -1 13 -9 11.5"/><path d="M-8 9 c-3 4 -1 8 3 9"/>' +
      '</g>' +
      '<path d="M54 29 q12 -7 23 1.5 q-12 7 -23 -1.5z" stroke-width=".7"/><path d="M58 29.8 h14" stroke-width=".45"/>' +
      '<path d="M29 54 q-7 12 1.5 23 q7 -12 -1.5 -23z" stroke-width=".7"/><path d="M29.8 58 v14" stroke-width=".45"/>' +
      '<path d="M62 40 q9 -1 12 6 q-8 1 -12 -6z" stroke-width=".6"/><path d="M40 62 q-1 9 6 12 q1 -8 -6 -12z" stroke-width=".6"/>' +
      '<circle cx="86" cy="16" r="1.3" fill="currentColor" stroke="none"/><circle cx="16" cy="86" r="1.3" fill="currentColor" stroke="none"/>' +
      '</g>';
  }
  function ornament() {
    var n = ++uid, f = "fcf" + n, c = "fcc" + n;
    return '<svg class="fc-orn" viewBox="0 0 300 420" aria-hidden="true" focusable="false"><defs>' + foil(f) + corner(c) + '</defs>' +
      '<g stroke="url(#' + f + ')" color="#e7c98d" fill="none">' +
      '<rect x="8.5" y="8.5" width="283" height="403" rx="1.5" stroke-width="1.5"/>' +
      '<rect x="12.5" y="12.5" width="275" height="395" stroke-width=".5"/>' +
      '<use href="#' + c + '"/><use href="#' + c + '" transform="translate(300 0) scale(-1 1)"/>' +
      '<use href="#' + c + '" transform="translate(0 420) scale(1 -1)"/><use href="#' + c + '" transform="translate(300 420) scale(-1 -1)"/>' +
      '<path d="M135 12.5 l15 -5 l15 5" stroke-width=".7"/><path d="M135 407.5 l15 5 l15 -5" stroke-width=".7"/>' +
      '</g></svg>';
  }
  function wreath(initials) {
    var n = ++uid, f = "fcw" + n, leaves = "";
    for (var i = 0; i < 26; i++) {
      var a = (i / 26) * Math.PI * 2 + Math.PI / 26;
      if (Math.abs(Math.sin(a)) > 0.97 && Math.cos(a) < 0.3 && Math.sin(a) > 0) continue; // a small gap at the bottom, like a real laurel
      var x = Math.cos(a) * 26, y = Math.sin(a) * 26, deg = (a * 180) / Math.PI + 90 + (i % 2 ? 28 : -28);
      leaves += '<ellipse cx="' + x.toFixed(2) + '" cy="' + y.toFixed(2) + '" rx="4.4" ry="1.5" transform="rotate(' + deg.toFixed(1) + ' ' + x.toFixed(2) + ' ' + y.toFixed(2) + ')"/>';
    }
    var parts = String(initials || "C T").split(" ");
    return '<svg class="fc-wreath" viewBox="-34 -34 68 68" aria-hidden="true" focusable="false"><defs>' + foil(f) + '</defs>' +
      '<g fill="none" stroke="url(#' + f + ')" stroke-width=".7">' + leaves + '<circle r="19.5" stroke-width=".5"/></g>' +
      '<g fill="url(#' + f + ')" font-family="Cinzel, Georgia, serif" font-size="13" text-anchor="middle">' +
      '<text x="-7.5" y="4.6">' + parts[0] + '</text><text x="7.5" y="4.6">' + (parts[1] || "") + '</text></g>' +
      '<path d="M0 -8 V8" stroke="url(#' + f + ')" stroke-width=".6"/></svg>';
  }
  function rule() {
    var n = ++uid, f = "fcr" + n;
    return '<svg class="fc-rule" viewBox="0 0 120 10" aria-hidden="true" focusable="false"><defs>' + foil(f) + '</defs><g stroke="url(#' + f + ')" fill="none" stroke-width=".7">' +
      '<path d="M4 5 H50 M70 5 H116"/><path d="M60 1 l4 4 l-4 4 l-4 -4z" fill="url(#' + f + ')"/><circle cx="52.5" cy="5" r=".9" fill="url(#' + f + ')"/><circle cx="67.5" cy="5" r=".9" fill="url(#' + f + ')"/></g></svg>';
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function tableSvg(used, cap, mine) {
    var n = ++uid, f = "fct" + n, out = '<svg class="fc-table" viewBox="-60 -60 120 120" aria-hidden="true" focusable="false"><defs>' + foil(f) + '</defs>' +
      '<circle r="27" fill="none" stroke="url(#' + f + ')" stroke-width="1.2"/><circle r="23" fill="none" stroke="url(#' + f + ')" stroke-width=".5"/>';
    for (var i = 0; i < cap; i++) {
      var a = -Math.PI / 2 + (i / cap) * Math.PI * 2, x = Math.cos(a) * 44, y = Math.sin(a) * 44, taken = i < used, me = mine && i === used - 1;
      out += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (me ? 9 : 7.5) + '" fill="' + (me ? "url(#" + f + ")" : taken ? "rgba(233,201,138,.35)" : "none") + '" stroke="url(#' + f + ')" stroke-width="' + (taken ? 1 : 0.7) + '"' + (taken ? "" : ' stroke-dasharray="2 2"') + '/>';
    }
    return out + '</svg>';
  }

  // A pressed wax seal: an irregular poured edge, a raised rim around a pressed centre,
  // an embossed crest and a script monogram, shaded with SVG lighting so it reads as wax, not a flat disc.
  function seal(o) {
    o = o || {};
    var n = ++uid, id = "ws" + n, pts = [];
    for (var i = 0; i < 90; i++) {
      var a = (i / 90) * Math.PI * 2;
      var r = 53 + 2.3 * Math.sin(3 * a + 0.5) + 1.7 * Math.sin(5 * a + 1.3) + 1.1 * Math.sin(8 * a + 2) + 0.7 * Math.sin(13 * a + 0.4);
      pts.push((Math.cos(a) * r).toFixed(2) + " " + (Math.sin(a) * r).toFixed(2));
    }
    var blob = "M" + pts.join(" L") + "Z";
    var half = '<path d="M-6 -30 c-10 -2 -18 4 -17 12 c1 6 8 7 10 2 c1.5 -4 -3 -6 -5 -3"/>' +
      '<path d="M-17 -16 c-10 10 -11 25 -2 35"/><path d="M-19 19 c4 8 12 10 17 6 c3 -3 0 -8 -4 -6"/>' +
      '<path d="M-23 -7 q-9 -3 -11 -12 q8 2 11 12z"/><path d="M-26 4 q-9 0 -13 -8 q9 0 13 8z"/><path d="M-23 14 q-8 2 -13 -4 q8 -2 13 4z"/>' +
      '<path d="M-8 30 c-6 3 -12 2 -14 -2"/><circle cx="-28" cy="-14" r="1.3"/><circle cx="-30" cy="12" r="1.3"/>' +
      '<path d="M-14 -26 q-3 -8 2 -13 q3 7 -2 13z"/><path d="M-19 -22 q-8 -4 -9 -11 q7 2 9 11z"/><path d="M-30 -2 q-6 -5 -5 -11 q5 4 5 11z"/>' +
      '<path d="M-28 22 q-7 -1 -10 -7 q7 0 10 7z"/><path d="M-15 27 q-4 6 -10 7 q2 -6 10 -7z"/><path d="M-33 -18 c-3 -2 -3 -6 0 -7"/><path d="M-35 8 c-3 1 -5 -1 -4 -4"/>';
    var mono = String(o.initials || "C T").split(" ");
    return '<svg class="wax" viewBox="-62 -62 124 124" aria-hidden="true" focusable="false"><defs>' +
      '<radialGradient id="' + id + 'g" cx="38%" cy="32%" r="75%"><stop offset="0" style="stop-color:var(--wax-hi,#a12f4a)"/><stop offset=".55" style="stop-color:var(--wax,#7a1830)"/><stop offset="1" style="stop-color:var(--wax-lo,#4a0b1a)"/></radialGradient>' +
      '<linearGradient id="' + id + 'r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".28"/></linearGradient>' +
      '<filter id="' + id + 'b" x="-20%" y="-20%" width="140%" height="140%">' +
        '<feGaussianBlur in="SourceAlpha" stdDeviation="2.6" result="bl"/>' +
        '<feSpecularLighting in="bl" surfaceScale="3.2" specularConstant=".7" specularExponent="18" lighting-color="#ffe6ea" result="sp"><feDistantLight azimuth="225" elevation="42"/></feSpecularLighting>' +
        '<feComposite in="sp" in2="SourceAlpha" operator="in" result="spi"/>' +
        '<feComposite in="SourceGraphic" in2="spi" operator="arithmetic" k1="0" k2="1" k3=".32" k4="0"/></filter>' +
      '<filter id="' + id + 'e" x="-10%" y="-10%" width="120%" height="120%">' +
        '<feGaussianBlur in="SourceAlpha" stdDeviation=".7" result="bl"/>' +
        '<feSpecularLighting in="bl" surfaceScale="1.6" specularConstant=".9" specularExponent="22" lighting-color="#ffe6ea" result="sp"><feDistantLight azimuth="225" elevation="38"/></feSpecularLighting>' +
        '<feComposite in="sp" in2="SourceAlpha" operator="in" result="spi"/>' +
        '<feOffset in="SourceAlpha" dx=".7" dy=".9" result="sh"/><feComposite in="sh" in2="SourceAlpha" operator="out" result="sho"/>' +
        '<feFlood flood-color="#000" flood-opacity=".45"/><feComposite in2="sho" operator="in" result="shd"/>' +
        '<feMerge><feMergeNode in="shd"/><feMergeNode in="SourceGraphic"/><feMergeNode in="spi"/></feMerge></filter>' +
      '</defs>' +
      '<path d="' + blob + '" fill="url(#' + id + 'g)" filter="url(#' + id + 'b)"/>' +
      '<circle r="41.5" style="fill:var(--wax,#7a1830)" opacity=".55"/>' +
      '<circle r="41.5" fill="none" stroke="url(#' + id + 'r)" stroke-width="3"/>' +
      '<g fill="none" style="stroke:var(--wax-hi,#a12f4a)" stroke-width="1.7" stroke-linecap="round" filter="url(#' + id + 'e)">' +
        half + '<g transform="scale(-1 1)">' + half + '</g>' +
        '<path d="M0 -37 c-3 -4 -8 -4 -9 0 c4 0 6 2 9 6 c3 -4 5 -6 9 -6 c-1 -4 -6 -4 -9 0z"/>' +
        '<path d="M-5 34 q5 4 10 0"/>' +
      '</g>' +
      '<g style="fill:var(--wax-hi,#a12f4a)" font-family="Pinyon Script, Snell Roundhand, cursive" text-anchor="middle" filter="url(#' + id + 'e)">' +
        '<text x="-6" y="10" font-size="36">' + mono[0] + '</text><text x="9" y="15" font-size="31">' + (mono[1] || "") + '</text></g>' +
      '</svg>';
  }

  window.FineCard = {
    seal: seal,
    place: function (o) {
      return '<div class="fc fc--' + (o.variant || "ivory") + ' fc-place"' + (o.id ? ' id="' + o.id + '"' : "") + '>' + ornament() +
        '<div class="fc-body">' + wreath(o.initials) +
        '<p class="fc-caps">Your seat</p>' +
        '<p class="fc-script fc-foil">' + esc(o.name) + '</p>' +
        rule() +
        '<p class="fc-date fc-tablename">' + esc(o.table) + '</p>' +
        tableSvg(o.used, o.cap, true) +
        '<p class="fc-venue">' + esc(o.used + " of " + o.cap + " seats filled" + (o.used >= o.cap ? " · table complete" : "")) + '</p>' +
        '</div></div>';
    },
    html: function (o) {
      o = o || {};
      var cotd = o.cotd || [["#5a1428", "Burgundy"], ["#48502a", "Olive"], ["#f3ead8", "Ivory"]];
      return '<div class="fc fc--' + (o.variant || "wine") + (o.cls ? " " + o.cls : "") + '"' + (o.id ? ' id="' + o.id + '"' : "") + (o.label ? ' role="img" aria-label="' + esc(o.label) + '"' : "") + '>' +
        ornament() +
        '<div class="fc-body"' + (o.label ? ' aria-hidden="true"' : "") + '>' + wreath(o.initials) +
        '<p class="fc-caps">Together with their families</p>' +
        '<p class="fc-script fc-foil">' + esc(o.a || "Chidinma") + '</p>' + (o.aSub ? '<p class="fc-sub">' + esc(o.aSub) + '</p>' : "") +
        '<p class="fc-amp fc-foil">&amp;</p>' +
        '<p class="fc-script fc-foil">' + esc(o.b || "Tunde") + '</p>' + (o.bSub ? '<p class="fc-sub">' + esc(o.bSub) + '</p>' : "") +
        (o.guest ? '<p class="fc-line">joyfully invite <span class="fc-guest fc-foil">' + esc(o.guest) + '</span>to celebrate their wedding</p>' : '<p class="fc-line">joyfully invite you to celebrate their wedding</p>') +
        rule() +
        '<p class="fc-date">' + esc(o.date || "Saturday, 12 December 2026") + '</p>' +
        '<p class="fc-venue">' + (o.venue || "The Grand Pavilion<br>Victoria Island, Lagos") + '</p>' +
        (o.noCotd ? "" : '<p class="fc-caps" style="margin-top:1.4cqw">Colour of the day</p><div class="fc-cotd">' + cotd.map(function (c) { return '<i style="--c:' + c[0] + '" title="' + esc(c[1]) + '"></i>'; }).join("") + '</div>') +
        '</div></div>';
    }
  };
})();
