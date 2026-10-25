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

  // A glossy poured wax seal: a scalloped edge, a thick shiny rim, a smooth pressed centre with a thin raised ring,
  // and a faint engraved monogram. With { breakable: true } it is drawn as two halves along a crack so it can be broken.
  function seal(o) {
    o = o || {};
    var n = ++uid, id = "ws" + n, pts = [];
    for (var i = 0; i < 120; i++) {
      var a = (i / 120) * Math.PI * 2;
      var r = 51 + 3.4 * Math.sin(10 * a + 0.3) + 0.9 * Math.sin(3 * a + 1.1) + 0.5 * Math.sin(17 * a + 0.4);
      pts.push((Math.cos(a) * r).toFixed(2) + " " + (Math.sin(a) * r).toFixed(2));
    }
    var blob = "M" + pts.join(" L") + "Z";
    var mono = String(o.initials || "C T").split(" ");
    var defs =
      '<radialGradient id="' + id + 'g" cx="42%" cy="38%" r="70%"><stop offset="0" style="stop-color:var(--wax-hi,#c2283c)"/><stop offset=".6" style="stop-color:var(--wax,#8e1022)"/><stop offset="1" style="stop-color:var(--wax-lo,#4a0612)"/></radialGradient>' +
      '<radialGradient id="' + id + 'c" cx="40%" cy="36%" r="72%"><stop offset="0" style="stop-color:var(--wax-hi,#c2283c)"/><stop offset="1" style="stop-color:var(--wax,#8e1022)"/></radialGradient>' +
      '<linearGradient id="' + id + 'r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".35"/></linearGradient>' +
      '<radialGradient id="' + id + 's" cx="34%" cy="26%" r="40%"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
      // Wet-looking wax: a tight, bright specular on a soft bevel.
      '<filter id="' + id + 'b" x="-20%" y="-20%" width="140%" height="140%">' +
        '<feGaussianBlur in="SourceAlpha" stdDeviation="2.6" result="bl"/>' +
        '<feSpecularLighting in="bl" surfaceScale="7" specularConstant="1" specularExponent="60" lighting-color="#fff" result="sp"><feDistantLight azimuth="230" elevation="48"/></feSpecularLighting>' +
        '<feComposite in="sp" in2="SourceAlpha" operator="in" result="spi"/>' +
        '<feDiffuseLighting in="bl" surfaceScale="4" diffuseConstant="1.1" lighting-color="#fff" result="df"><feDistantLight azimuth="230" elevation="60"/></feDiffuseLighting>' +
        '<feComposite in="df" in2="SourceAlpha" operator="in" result="dfi"/>' +
        '<feBlend in="SourceGraphic" in2="dfi" mode="multiply" result="sh"/>' +
        '<feComposite in="sh" in2="spi" operator="arithmetic" k1="0" k2="1.15" k3=".8" k4="0"/></filter>' +
      '<filter id="' + id + 'e" x="-10%" y="-10%" width="120%" height="120%">' +
        '<feGaussianBlur in="SourceAlpha" stdDeviation=".9" result="bl"/>' +
        '<feSpecularLighting in="bl" surfaceScale="2.4" specularConstant="1.1" specularExponent="30" lighting-color="#fff" result="sp"><feDistantLight azimuth="230" elevation="40"/></feSpecularLighting>' +
        '<feComposite in="sp" in2="SourceAlpha" operator="in" result="spi"/>' +
        '<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="spi"/></feMerge></filter>' +
      '<filter id="' + id + 'i"><feOffset dx="-.8" dy="-1" in="SourceAlpha" result="o1"/><feFlood flood-color="#000" flood-opacity=".5"/><feComposite in2="o1" operator="in" result="d"/>' +
        '<feOffset dx=".8" dy="1" in="SourceAlpha" result="o2"/><feFlood flood-color="#fff" flood-opacity=".22"/><feComposite in2="o2" operator="in" result="l"/>' +
        '<feMerge><feMergeNode in="d"/><feMergeNode in="l"/></feMerge></filter>';
    var body =
      '<path d="' + blob + '" fill="url(#' + id + 'g)" filter="url(#' + id + 'b)"/>' +
      '<path d="' + blob + '" fill="none" style="stroke:var(--wax-lo,#42050f)" stroke-width="1" opacity=".6"/>' +
      '<circle r="35.5" fill="url(#' + id + 'c)"/>' +
      '<circle r="35.5" fill="none" stroke="url(#' + id + 'r)" stroke-width="3.2"/>' +
      '<circle r="31" fill="none" style="stroke:var(--wax-hi,#c2283c)" stroke-width="1.6" filter="url(#' + id + 'e)"/>' +
      (o.mono === false ? "" : '<g font-family="Pinyon Script, Snell Roundhand, cursive" text-anchor="middle" filter="url(#' + id + 'i)" fill="#000"><text x="-5" y="9" font-size="28">' + mono[0] + '</text><text x="8" y="13" font-size="24">' + (mono[1] || "") + '</text></g>') +
      '<ellipse cx="-14" cy="-20" rx="22" ry="13" transform="rotate(-28 -14 -20)" fill="url(#' + id + 's)"/>';
    var open = '<svg class="wax' + (o.breakable ? " wax-breakable" : "") + '" viewBox="-62 -62 124 124" aria-hidden="true" focusable="false"><defs>' + defs;
    if (!o.breakable) return open + '</defs>' + body + '</svg>';
    // The crack runs top to bottom; each half is the same seal clipped to one side of it.
    var crack = [[3, -66], [-2, -44], [5, -30], [-3, -16], [4, -3], [-4, 9], [3, 22], [-3, 36], [2, 50], [-1, 66]];
    var line = crack.map(function (p) { return p[0] + " " + p[1]; }).join(" L");
    var left = "M-70 -70 L" + line + " L-70 70Z", right = "M70 -70 L" + line + " L70 70Z";
    return open +
      '<clipPath id="' + id + 'L"><path d="' + left + '"/></clipPath><clipPath id="' + id + 'R"><path d="' + right + '"/></clipPath><clipPath id="' + id + 'B"><path d="' + blob + '"/></clipPath></defs>' +
      '<g class="half half-l"><g clip-path="url(#' + id + 'L)">' + body + '</g></g>' +
      '<g class="half half-r"><g clip-path="url(#' + id + 'R)">' + body + '</g></g>' +
      '<g clip-path="url(#' + id + 'B)"><path class="crack" d="M' + line + '" fill="none" stroke="#120104" stroke-width="1.8" stroke-linejoin="round" pathLength="1"/>' +
      '<path class="crack" d="M' + line + '" fill="none" stroke="#ffd4da" stroke-opacity=".45" stroke-width=".6" stroke-linejoin="round" pathLength="1" transform="translate(1.2 .6)"/></g>' +
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
