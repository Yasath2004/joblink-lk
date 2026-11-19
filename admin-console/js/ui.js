// Shared UI helpers for the admin console. Everything is built with DOM methods (never innerHTML),
// so text coming from the database can never run as HTML.
(() => {
  "use strict";
  const $ = (sel, root = document) => root.querySelector(sel);
  const NS = "http://www.w3.org/2000/svg";

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, "");
      else el.setAttribute(k, String(v));
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  function s(tag, attrs, ...kids) {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, String(v));
    for (const kid of kids.flat(Infinity)) if (kid != null) el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    return el;
  }

  const ico = (name, size) => window.icon(name, size);

  // ------------------------------------------------------------ formatting
  const money = (n) => "Rs. " + Number(n || 0).toLocaleString("en-US");
  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "–");
  const fmtDateTime = (iso) =>
    iso ? new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "–";
  function timeAgo(iso) {
    if (!iso) return "–";
    const mins = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
    if (mins < 60) return mins + " min ago";
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + " hour" + (hrs > 1 ? "s" : "") + " ago";
    const days = Math.floor(hrs / 24);
    if (days < 60) return days + " day" + (days > 1 ? "s" : "") + " ago";
    return fmtDate(iso);
  }
  const safeUrl = (u) => (typeof u === "string" && /^https:\/\//i.test(u) ? u : null);
  const phoneText = (p) => (p ? "+" + String(p).replace(/^\+/, "") : null);

  // ------------------------------------------------------------ small components
  const PALETTE = ["#0d9488", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#ca8a04", "#16a34a", "#0891b2"];
  function initials(name) {
    const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
    return ((parts[0] || "?")[0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
  }
  function avatar(name, size) {
    let hash = 0;
    for (const c of String(name || "?")) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
    const el = h("div", { class: "avatar" + (size ? " " + size : "") }, initials(name));
    el.style.setProperty("--av", PALETTE[hash % PALETTE.length]);
    return el;
  }
  const pill = (text, kind, nodot) => h("span", { class: "pill " + (kind || "") + (nodot ? " nodot" : "") }, text);
  function empty(iconName, title, text) {
    return h("div", { class: "empty" }, h("div", { class: "badge" }, ico(iconName || "inbox", 28)), h("h3", {}, title), text ? h("p", {}, text) : null);
  }
  function skeleton(rows) {
    const out = [];
    for (let i = 0; i < (rows || 4); i++) {
      const sk = h("div", { class: "sk" });
      sk.style.height = i === 0 ? "92px" : "64px";
      sk.style.marginBottom = "12px";
      out.push(sk);
    }
    return h("div", {}, out);
  }

  // ------------------------------------------------------------ toast / overlay / drawer
  function toast(msg, kind) {
    const t = h("div", { class: "toast " + (kind || "") }, ico(kind === "error" ? "warning" : kind === "ok" ? "check" : "info", 18), h("span", {}, msg));
    $("#toasts").append(t);
    setTimeout(() => t.remove(), kind === "error" ? 7000 : 3500);
  }
  function openOverlay(node) {
    const o = $("#overlay");
    o.replaceChildren(node);
    o.hidden = false;
  }
  function closeOverlay() {
    const o = $("#overlay");
    o.hidden = true;
    o.replaceChildren();
  }
  function openDrawer(node) {
    const d = $("#drawer");
    d.replaceChildren(node);
    d.hidden = false;
  }
  function closeDrawer() {
    const d = $("#drawer");
    d.hidden = true;
    d.replaceChildren();
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeOverlay(); closeDrawer(); }
  });
  document.addEventListener("click", (e) => {
    if (e.target && e.target.id === "overlay") closeOverlay();
    if (e.target && e.target.id === "drawer") closeDrawer();
  });

  function reasonModal({ title, hint, chips, confirmLabel }) {
    return new Promise((resolve) => {
      const ta = h("textarea", { class: "textarea", placeholder: "Write a short reason. The user will see this." });
      const err = h("div", { class: "form-error" });
      const done = (v) => { closeOverlay(); resolve(v); };
      openOverlay(
        h(
          "div",
          { class: "modal", role: "dialog", "aria-modal": "true" },
          h("h3", {}, title),
          hint ? h("p", { class: "muted" }, hint) : null,
          h("div", { style: "margin-top:12px" }, ta),
          h("div", { class: "chips" }, (chips || []).map((c) => h("button", { type: "button", class: "chip-btn", onclick: () => { ta.value = c; err.textContent = ""; } }, c))),
          err,
          h(
            "div",
            { class: "actions" },
            h("button", { class: "btn", type: "button", onclick: () => done(null) }, "Cancel"),
            h("button", { class: "btn btn-danger", type: "button", onclick: () => {
              if (!ta.value.trim()) { err.textContent = "Please write a reason."; return; }
              done(ta.value.trim());
            } }, confirmLabel || "Reject")
          )
        )
      );
      ta.focus();
    });
  }

  function lightbox(url) {
    const u = safeUrl(url);
    if (!u) return;
    let scale = 1, rot = 0;
    const img = h("img", { src: u, alt: "", referrerpolicy: "no-referrer" });
    const apply = () => (img.style.transform = "scale(" + scale + ") rotate(" + rot + "deg)");
    img.style.maxWidth = "88vw";
    img.style.maxHeight = "74vh";
    openOverlay(
      h(
        "div",
        { class: "lightbox" },
        h("div", { class: "stage" }, img),
        h(
          "div",
          { class: "tools" },
          h("button", { class: "btn", type: "button", onclick: () => { scale = Math.min(4, scale + 0.5); apply(); } }, ico("zoom"), "Zoom in"),
          h("button", { class: "btn", type: "button", onclick: () => { scale = Math.max(0.5, scale - 0.5); apply(); } }, "Zoom out"),
          h("button", { class: "btn", type: "button", onclick: () => { rot = (rot + 90) % 360; apply(); } }, ico("rotate"), "Rotate"),
          h("button", { class: "btn btn-primary", type: "button", onclick: closeOverlay }, "Close")
        )
      )
    );
  }

  // ------------------------------------------------------------ CSV
  function downloadCsv(name, headers, rows) {
    const q = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    const text = [headers.map(q).join(","), ...rows.map((r) => r.map(q).join(","))].join("\r\n");
    if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return text;
    const url = URL.createObjectURL(new Blob(["\ufeff" + text], { type: "text/csv;charset=utf-8" }));
    const a = h("a", { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return text;
  }

  // ------------------------------------------------------------ data table (sort + pages + CSV)
  function dataTable({ columns, rows, pageSize = 25, onRowClick, emptyIcon, emptyTitle, emptyText }) {
    let data = rows || [];
    let sortIdx = -1, dir = 1, page = 0;
    const thead = h("thead");
    const tbody = h("tbody");
    const info = h("span");
    const prev = h("button", { class: "btn btn-sm", type: "button", onclick: () => go(-1) }, ico("left", 14), "Previous");
    const next = h("button", { class: "btn btn-sm", type: "button", onclick: () => go(1) }, "Next", ico("right", 14));
    const pager = h("div", { class: "pager" }, info, h("div", { class: "btns" }, prev, next));
    const emptyBox = h("div");
    const wrap = h("div", {}, h("div", { class: "table-scroll" }, h("table", {}, thead, tbody)), emptyBox, pager);

    function sorted() {
      if (sortIdx < 0 || !columns[sortIdx].sort) return data;
      const f = columns[sortIdx].sort;
      return [...data].sort((a, b) => {
        const x = f(a), y = f(b);
        if (x == null && y == null) return 0;
        if (x == null) return 1;
        if (y == null) return -1;
        return (x > y ? 1 : x < y ? -1 : 0) * dir;
      });
    }
    function go(d) { page = Math.max(0, page + d); draw(); }
    function draw() {
      thead.replaceChildren(
        h(
          "tr",
          {},
          columns.map((c, i) =>
            h("th", { class: c.sort ? "sortable" : "", onclick: c.sort ? () => { if (sortIdx === i) dir = -dir; else { sortIdx = i; dir = 1; } page = 0; draw(); } : null },
              c.label + (sortIdx === i ? (dir === 1 ? " ↑" : " ↓") : ""))
          )
        )
      );
      const all = sorted();
      const pages = Math.max(1, Math.ceil(all.length / pageSize));
      page = Math.min(page, pages - 1);
      const slice = all.slice(page * pageSize, page * pageSize + pageSize);
      tbody.replaceChildren(
        ...slice.map((r) => {
          const tr = h("tr", { class: onRowClick ? "clickable" : "" }, columns.map((c) => h("td", {}, c.render(r))));
          if (onRowClick) tr.addEventListener("click", (e) => { if (!e.target.closest("button, a")) onRowClick(r); });
          return tr;
        })
      );
      emptyBox.replaceChildren(all.length ? "" : empty(emptyIcon || "inbox", emptyTitle || "Nothing here", emptyText));
      info.textContent = all.length ? "Showing " + (page * pageSize + 1) + "–" + (page * pageSize + slice.length) + " of " + all.length : "0 results";
      prev.disabled = page === 0;
      next.disabled = page >= pages - 1;
      pager.hidden = all.length <= pageSize;
    }
    draw();
    return {
      el: wrap,
      setRows(r) { data = r || []; page = 0; draw(); },
      csv(name) {
        const cols = columns.filter((c) => c.csv);
        return downloadCsv(name, cols.map((c) => c.label), sorted().map((r) => cols.map((c) => c.csv(r))));
      },
    };
  }

  // ------------------------------------------------------------ charts
  function stackedBars(days) {
    const W = 640, H = 210, L = 30, B = 26, T = 10;
    const max = Math.max(1, ...days.map((d) => d.workers + d.employers));
    const top = max <= 4 ? 4 : Math.ceil(max / 4) * 4;
    const slot = (W - L) / days.length;
    const bw = Math.min(26, slot * 0.62);
    const y = (v) => T + (H - T - B) * (1 - v / top);
    const svg = s("svg", { viewBox: "0 0 " + W + " " + H, class: "chart", role: "img", "aria-label": "New sign-ups per day" });
    for (let i = 0; i <= 4; i++) {
      const v = (top / 4) * i;
      svg.append(s("line", { class: "grid", x1: L, x2: W, y1: y(v), y2: y(v) }), s("text", { x: L - 6, y: y(v) + 4, "text-anchor": "end" }, Math.round(v)));
    }
    days.forEach((d, i) => {
      const x = L + slot * i + (slot - bw) / 2;
      const hw = y(0) - y(d.workers), he = y(0) - y(d.employers);
      const g = s("g", {}, s("title", {}, d.label + ": " + d.workers + " workers, " + d.employers + " employers"));
      if (d.workers) g.append(s("rect", { class: "b1", fill: "#0d9488", x, y: y(d.workers), width: bw, height: hw, rx: 3 }));
      if (d.employers) g.append(s("rect", { class: "b2", fill: "#f59e0b", x, y: y(d.workers) - he, width: bw, height: he, rx: 3 }));
      svg.append(g);
      if (i % 2 === 0 || days.length < 8) svg.append(s("text", { x: x + bw / 2, y: H - 8, "text-anchor": "middle" }, d.short));
    });
    return svg;
  }

  function hbars(items) {
    const max = Math.max(1, ...items.map((i) => i.value));
    return h(
      "div",
      {},
      items.map((i) => {
        const fill = h("div", { class: "fill" });
        fill.style.width = Math.max(3, (i.value / max) * 100) + "%";
        return h("div", { class: "hb" }, h("div", { class: "name", title: i.label }, i.label), h("div", { class: "track" }, fill), h("div", { class: "val" }, i.value));
      })
    );
  }

  window.UI = {
    $, h, s, ico, money, fmtDate, fmtDateTime, timeAgo, safeUrl, phoneText, initials, avatar, pill, empty, skeleton,
    toast, openOverlay, closeOverlay, openDrawer, closeDrawer, reasonModal, lightbox, downloadCsv, dataTable, stackedBars, hbars,
  };
})();
