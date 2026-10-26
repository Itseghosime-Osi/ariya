/* Àríyá's cinematic navigation, shared by every page except the guest RSVP page.
   - A full-screen menu: a velvet curtain drops, the pages rise in one by one, gold foil on hover.
   - Page changes close a velvet curtain over the page, and the next page opens it again.
   - The film can add its chapter index to the menu.
   Turned down to simple fades for prefers-reduced-motion.

   Use: AriyaNav.init({ chapters: [["Prologue", fn], ...] })  // chapters are optional
   Any element with [data-cm-open] opens the menu. */
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;
  var PAGES = [
    ["./", "The film", "Fifteen chapters of a Lagos wedding. Best with sound."],
    ["about.html", "About Àríyá", "Invitations, RSVPs and seating, told on one page."],
    ["product.html", "What we do", "Guest lists, personal links, seating and vendors."],
    ["pricing.html", "Pricing", "Pay per event. Placeholder prices for the prototype."],
    ["planner.html", "The demo planner", "Try it on a sample wedding. Nothing is sent."]
  ];
  function here(href) {
    var p = location.pathname.split("/").pop() || "index.html";
    return href === "./" ? p === "index.html" || p === "" : p === href;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------- Curtain between pages ---------- */
  var leaving = false;
  function openCurtain() {
    if (!root.classList.contains("cur-in")) return;
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      root.classList.add("cur-opening");
      setTimeout(function () { root.classList.remove("cur-in", "cur-opening"); }, reduce ? 150 : 700);
    }); });
  }
  function go(href) {
    if (leaving) return; leaving = true;
    try { sessionStorage.setItem("ariya-curtain", "1"); } catch (e) { /* the next page just opens plainly */ }
    if (window.AriyaScore && AriyaScore.handoff) AriyaScore.handoff();
    root.classList.add("cur-out");
    setTimeout(function () { location.href = href; }, reduce ? 120 : 420);
  }
  try { sessionStorage.removeItem("ariya-curtain"); } catch (e) { /* fine */ }
  window.addEventListener("pageshow", function (e) { if (e.persisted) { leaving = false; root.classList.remove("cur-out", "cur-in", "cur-opening"); } });
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.target || a.hasAttribute("download") || a.hasAttribute("data-no-curtain")) return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return; // in-page anchor
    if (url.pathname === location.pathname && url.search === location.search && !url.hash) { e.preventDefault(); closeMenu(); return; }
    e.preventDefault(); go(url.href);
  });

  /* ---------- Menu ---------- */
  var cm = null, opener = null, ghost = null;
  function build(chapters) {
    cm = document.createElement("div");
    cm.className = "cm"; cm.id = "cm"; cm.hidden = true;
    cm.setAttribute("role", "dialog"); cm.setAttribute("aria-modal", "true"); cm.setAttribute("aria-label", "Menu");
    var links = PAGES.map(function (pg, i) {
      return '<li style="--i:' + i + '"><a href="' + pg[0] + '"' + (here(pg[0]) ? ' aria-current="page"' : "") + ' data-word="' + esc(pg[1].split(" ").pop()) + '">' +
        '<span class="n">0' + (i + 1) + '</span><span class="t"><span>' + esc(pg[1]) + '</span></span><span class="d">' + esc(pg[2]) + "</span></a></li>";
    }).join("");
    var chap = chapters && chapters.length ? '<div class="cm-chapters"><h2 class="cm-cap">The film, chapter by chapter</h2><ol>' + chapters.map(function (c, i) {
      return '<li style="--i:' + (i + 3) + '"><button type="button" data-ch="' + i + '"><span>No. ' + (i < 10 ? "00" : "0") + i + "</span>" + esc(c[0]) + "</button></li>";
    }).join("") + "</ol></div>" : "";
    cm.innerHTML = '<div class="cm-velvet" aria-hidden="true"><i></i><i></i></div><div class="cm-ghost" aria-hidden="true"></div>' +
      '<div class="cm-inner"><div class="cm-top"><span class="cm-mark">Àríyá</span><button type="button" class="cm-close">Close</button></div>' +
      '<div class="cm-body"><nav aria-label="Pages"><ol class="cm-list">' + links + "</ol></nav>" + chap + "</div>" +
      '<div class="cm-foot"><span>Àríyá (ah-ree-YAH): merriment, in Yoruba</span><span>Lagos · Benin · Abuja</span><a href="rsvp.html?g=k701Qx">Open a sample invitation</a></div></div>';
    document.body.appendChild(cm);
    ghost = cm.querySelector(".cm-ghost");
    cm.querySelector(".cm-close").addEventListener("click", function () { closeMenu(); });
    Array.prototype.forEach.call(cm.querySelectorAll(".cm-list a"), function (a) {
      var show = function () { ghost.textContent = a.getAttribute("data-word"); ghost.classList.add("on"); };
      // Hover motion only for a real mouse: touch fires a false hover on tap.
      a.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") { a.classList.add("hov"); show(); } });
      a.addEventListener("focus", show);
      a.addEventListener("pointerleave", function () { a.classList.remove("hov"); ghost.classList.remove("on"); });
    });
    if (chapters) Array.prototype.forEach.call(cm.querySelectorAll("[data-ch]"), function (b) {
      b.addEventListener("click", function () { closeMenu(true); chapters[+b.getAttribute("data-ch")][1](); });
    });
    cm.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); closeMenu(); return; }
      if (e.key !== "Tab") return;
      var f = cm.querySelectorAll("a, button"), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }
  function setOpeners(open) {
    Array.prototype.forEach.call(document.querySelectorAll("[data-cm-open]"), function (b) {
      b.setAttribute("aria-expanded", open ? "true" : "false");
      if (b.hasAttribute("data-cm-label")) b.textContent = open ? "Close" : "Menu";
    });
  }
  function openMenu(from) {
    opener = from || document.activeElement;
    cm.hidden = false; root.classList.add("cm-on");
    requestAnimationFrame(function () { requestAnimationFrame(function () { cm.classList.add("open"); }); });
    setOpeners(true);
    setTimeout(function () { var cur = cm.querySelector('.cm-list a[aria-current="page"]') || cm.querySelector(".cm-list a"); cur.focus({ preventScroll: true }); }, reduce ? 0 : 450);
  }
  function closeMenu(keepFocus) {
    if (!cm || cm.hidden) return;
    cm.classList.remove("open"); root.classList.remove("cm-on"); setOpeners(false);
    setTimeout(function () { if (!cm.classList.contains("open")) cm.hidden = true; }, reduce ? 0 : 700);
    if (!keepFocus && opener && opener.focus) opener.focus({ preventScroll: true });
  }

  window.AriyaNav = {
    init: function (o) {
      build(o && o.chapters);
      Array.prototype.forEach.call(document.querySelectorAll("[data-cm-open]"), function (b) {
        b.setAttribute("aria-haspopup", "dialog"); b.setAttribute("aria-controls", "cm"); b.setAttribute("aria-expanded", "false");
        b.addEventListener("click", function () { if (cm.hidden) openMenu(b); else closeMenu(); });
      });
      openCurtain();
    },
    open: openMenu, close: closeMenu, go: go,
    get isOpen() { return !!cm && !cm.hidden; }
  };
})();
