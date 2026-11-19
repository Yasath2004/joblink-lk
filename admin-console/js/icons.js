// Small inline icon set (24x24, stroke based). Built with createElementNS, never innerHTML.
(() => {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";

  // each icon = list of [tag, attributes]
  const P = (d) => ["path", { d }];
  const C = (cx, cy, r) => ["circle", { cx, cy, r }];
  const R = (x, y, w, h, rx) => ["rect", { x, y, width: w, height: h, rx }];

  const ICONS = {
    dashboard: [R(3, 3, 7, 9, 1), R(14, 3, 7, 5, 1), R(14, 12, 7, 9, 1), R(3, 16, 7, 5, 1)],
    jobreview: [P("M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"), P("M14 2v6h6"), P("m9 15 2 2 4-4")],
    shield: [P("M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"), P("m9 12 2 2 4-4")],
    users: [P("M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"), C(9, 7, 4), P("M22 21v-2a4 4 0 0 0-3-3.87"), P("M16 3.13a4 4 0 0 1 0 7.75")],
    user: [P("M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"), C(12, 7, 4)],
    briefcase: [R(2, 7, 20, 14, 2), P("M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16")],
    building: [R(4, 2, 16, 20, 2), P("M9 22v-4h6v4"), P("M8 6h.01"), P("M12 6h.01"), P("M16 6h.01"), P("M8 10h.01"), P("M12 10h.01"), P("M16 10h.01"), P("M8 14h.01"), P("M12 14h.01"), P("M16 14h.01")],
    audit: [R(8, 2, 8, 4, 1), P("M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"), P("M12 11h4"), P("M12 16h4"), P("M8 11h.01"), P("M8 16h.01")],
    search: [C(11, 11, 8), P("m21 21-4.3-4.3")],
    refresh: [P("M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"), P("M21 3v5h-5"), P("M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"), P("M8 16H3v5")],
    moon: [P("M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z")],
    sun: [C(12, 12, 4), P("M12 2v2"), P("M12 20v2"), P("m4.93 4.93 1.41 1.41"), P("m17.66 17.66 1.41 1.41"), P("M2 12h2"), P("M20 12h2"), P("m6.34 17.66-1.41 1.41"), P("m19.07 4.93-1.41 1.41")],
    logout: [P("M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"), P("m16 17 5-5-5-5"), P("M21 12H9")],
    check: [P("M20 6 9 17l-5-5")],
    x: [P("M18 6 6 18"), P("m6 6 12 12")],
    download: [P("M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"), P("m7 10 5 5 5-5"), P("M12 15V3")],
    menu: [P("M4 6h16"), P("M4 12h16"), P("M4 18h16")],
    right: [P("m9 18 6-6-6-6")],
    left: [P("m15 18-6-6 6-6")],
    pin: [P("M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"), C(12, 10, 3)],
    phone: [P("M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z")],
    mail: [R(2, 4, 20, 16, 2), P("m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7")],
    idcard: [R(2, 5, 20, 14, 2), C(9, 11, 2), P("M15 9h3"), P("M15 13h3"), P("M6 16c.5-1.5 1.5-2 3-2s2.5.5 3 2")],
    calendar: [R(3, 4, 18, 18, 2), P("M16 2v4"), P("M8 2v4"), P("M3 10h18")],
    clock: [C(12, 12, 10), P("M12 6v6l4 2")],
    warning: [P("m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"), P("M12 9v4"), P("M12 17h.01")],
    image: [R(3, 3, 18, 18, 2), C(9, 9, 2), P("m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21")],
    zoom: [C(11, 11, 8), P("m21 21-4.3-4.3"), P("M11 8v6"), P("M8 11h6")],
    rotate: [P("M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"), P("M21 3v5h-5")],
    copy: [R(8, 8, 14, 14, 2), P("M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2")],
    trend: [P("m22 7-8.5 8.5-5-5L2 17"), P("M16 7h6v6")],
    zap: [P("M13 2 3 14h9l-1 8 10-12h-9l1-8z")],
    badge: [P("M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"), P("m9 12 2 2 4-4")],
    inbox: [P("M22 12h-6l-2 3h-4l-2-3H2"), P("M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z")],
    key: [C(7.5, 15.5, 4.5), P("m10.7 12.3 9.8-9.8"), P("m17 6 3 3"), P("m14 9 2 2")],
    info: [C(12, 12, 10), P("M12 16v-4"), P("M12 8h.01")],
  };

  window.icon = function icon(name, size) {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", String(size || 18));
    svg.setAttribute("height", String(size || 18));
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.8");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", "ico");
    for (const [tag, attrs] of ICONS[name] || ICONS.info) {
      const el = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
      svg.appendChild(el);
    }
    return svg;
  };
  window.ICON_NAMES = Object.keys(ICONS);
  window.ICON_DATA = ICONS; // used by the offline icon sheet test
})();
