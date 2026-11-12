// JobLink LK admin console. Plain JavaScript, no build step.
// Security: only the public anon key is used. Everything an admin can do is enforced by the database
// (is_admin() + row level security). All text from the database is inserted with textContent (never innerHTML).
(() => {
  "use strict";

  const cfg = window.JOBLINK_CONFIG || {};
  const $ = (sel, root = document) => root.querySelector(sel);

  // ---------------------------------------------------------------- small helpers
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

  const money = (n) => "Rs. " + Number(n || 0).toLocaleString("en-US");
  const fmtDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "–";
  const fmtDateTime = (iso) =>
    iso
      ? new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
      : "–";
  function timeAgo(iso) {
    if (!iso) return "–";
    const mins = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
    if (mins < 60) return mins + " min ago";
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + " hour" + (hrs > 1 ? "s" : "") + " ago";
    const days = Math.floor(hrs / 24);
    return days + " day" + (days > 1 ? "s" : "") + " ago";
  }
  const safeUrl = (u) => (typeof u === "string" && /^https:\/\//i.test(u) ? u : null);
  const pill = (text, kind) => h("span", { class: "pill " + (kind || "") }, text);
  const empty = (text) => h("div", { class: "empty" }, text);

  // Reads birth date + gender from a Sri Lankan NIC (same rules as the mobile app)
  function parseNIC(raw) {
    const n = String(raw || "").replace(/\s/g, "").toUpperCase();
    let year, days;
    if (/^\d{9}[VX]$/.test(n)) { year = 1900 + Number(n.slice(0, 2)); days = Number(n.slice(2, 5)); }
    else if (/^\d{12}$/.test(n)) { year = Number(n.slice(0, 4)); days = Number(n.slice(4, 7)); }
    else return null;
    let gender = "male";
    if (days > 500) { gender = "female"; days -= 500; }
    if (days < 1 || days > 366) return null;
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    if (!leap) { if (days === 60) return null; if (days > 60) days -= 1; }
    const d = new Date(Date.UTC(year, 0, days));
    const now = new Date();
    let age = now.getFullYear() - year;
    if (now.getMonth() < d.getUTCMonth() || (now.getMonth() === d.getUTCMonth() && now.getDate() < d.getUTCDate())) age -= 1;
    return { dob: d.toISOString().slice(0, 10), gender, age };
  }

  // ---------------------------------------------------------------- toast + overlay
  function toast(msg, kind) {
    const t = h("div", { class: "toast " + (kind || "") }, msg);
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
  document.addEventListener("keydown", (e) => e.key === "Escape" && closeOverlay());
  document.addEventListener("click", (e) => { if (e.target && e.target.id === "overlay") closeOverlay(); });

  // Ask for a reason (required) before rejecting something
  function reasonModal({ title, hint, chips, confirmLabel }) {
    return new Promise((resolve) => {
      const ta = h("textarea", { placeholder: "Reason (the user will see this)" });
      const err = h("div", { class: "error" });
      const done = (v) => { closeOverlay(); resolve(v); };
      const modal = h(
        "div",
        { class: "modal" },
        h("h3", {}, title),
        hint ? h("p", { class: "muted" }, hint) : null,
        ta,
        h("div", { class: "chips" }, (chips || []).map((c) => h("button", { type: "button", class: "chip", onclick: () => (ta.value = c) }, c))),
        err,
        h(
          "div",
          { class: "actions" },
          h("button", { class: "btn", onclick: () => done(null) }, "Cancel"),
          h("button", { class: "btn danger", onclick: () => {
            if (!ta.value.trim()) { err.textContent = "Please write a reason."; return; }
            done(ta.value.trim());
          } }, confirmLabel || "Reject")
        )
      );
      openOverlay(modal);
      ta.focus();
    });
  }

  function lightbox(url) {
    const u = safeUrl(url);
    if (!u) return;
    openOverlay(
      h(
        "div",
        { class: "lightbox" },
        h("img", { src: u, alt: "", referrerpolicy: "no-referrer" }),
        h("div", { class: "tools" }, h("button", { class: "btn", onclick: closeOverlay }, "Close"))
      )
    );
  }

  // ---------------------------------------------------------------- supabase
  let sb = null;

  async function rpc(name, args) {
    const { data, error } = await sb.rpc(name, args || {});
    if (error) throw new Error(error.message);
    return data;
  }

  const EMP = "employer:profiles!jobs_employer_id_fkey(id, full_name, business_name, verification_status, avatar_url)";

  async function fetchJobs({ approval, status, limit } = {}) {
    let q = sb.from("jobs").select("*, " + EMP).order("created_at", { ascending: approval !== "approved" && approval !== "rejected" }).limit(limit || 100);
    if (approval) q = q.eq("approval_status", approval);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data || [];
  }

  async function signedDoc(path) {
    if (!path) return null;
    const { data } = await sb.storage.from("verification-docs").createSignedUrl(path, 600);
    return (data && data.signedUrl) || null;
  }

  // ---------------------------------------------------------------- state / nav
  const state = { user: null, stats: null, poll: null, token: 0 };

  const NAV = [
    { key: "dashboard", label: "Dashboard", icon: "📊" },
    { key: "jobs", label: "Job ads", icon: "📝", badge: "pending_jobs", href: "#/jobs/pending" },
    { key: "accounts", label: "Account checks", icon: "🛡️", badge: "pending_accounts", href: "#/accounts/pending" },
    { key: "users", label: "Users", icon: "👥" },
    { key: "alljobs", label: "All jobs", icon: "💼" },
    { key: "audit", label: "Audit log", icon: "🧾" },
  ];

  function renderNav(active) {
    const nav = $("#nav");
    nav.replaceChildren(
      ...NAV.map((n) => {
        const count = state.stats && n.badge ? Number(state.stats[n.badge] || 0) : 0;
        return h(
          "a",
          { href: n.href || "#/" + n.key, class: n.key === active ? "active" : "" },
          h("span", {}, n.icon + "  " + n.label),
          count > 0 ? h("span", { class: "badge" }, count) : null
        );
      })
    );
  }

  async function refreshBadges() {
    try {
      state.stats = await rpc("admin_stats");
      renderNav(parseHash().route);
    } catch (e) { /* ignore: shown on next action */ }
  }

  function parseHash() {
    const parts = location.hash.replace(/^#\/?/, "").split("/");
    return { route: parts[0] || "dashboard", sub: parts[1] || "" };
  }

  // ---------------------------------------------------------------- views
  function statCard(label, value, opts = {}) {
    const el = h("a", { class: "stat" + (opts.hot && Number(value) > 0 ? " hot" : ""), href: opts.href || "#/dashboard" }, h("b", {}, value), h("span", {}, label));
    return el;
  }

  async function viewDashboard() {
    const s = (state.stats = await rpc("admin_stats"));
    renderNav("dashboard");
    const [jobs, profs] = await Promise.all([
      fetchJobs({ approval: "pending", limit: 5 }),
      sb.from("profiles").select("id, full_name, business_name, role, created_at").eq("verification_status", "pending").limit(5),
    ]);

    const jobList = jobs.length
      ? jobs.map((j) =>
          h("div", { class: "row" }, h("a", { href: "#/jobs/pending" }, j.title), h("span", { class: "muted" }, "· " + timeAgo(j.created_at)))
        )
      : [h("p", { class: "muted" }, "No job ads are waiting. 🎉")];
    const accList = (profs.data || []).length
      ? profs.data.map((p) =>
          h("div", { class: "row" }, h("a", { href: "#/accounts/pending" }, p.business_name || p.full_name || "Unnamed"), pill(p.role || "user"))
        )
      : [h("p", { class: "muted" }, "No accounts are waiting. 🎉")];

    return h(
      "div",
      {},
      h(
        "div",
        { class: "grid stats" },
        statCard("Job ads to review", s.pending_jobs, { hot: true, href: "#/jobs/pending" }),
        statCard("Accounts to check", s.pending_accounts, { hot: true, href: "#/accounts/pending" }),
        statCard("Live jobs", s.live_jobs, { href: "#/alljobs" }),
        statCard("Total users", s.total_users, { href: "#/users" }),
        statCard("Workers", s.workers, { href: "#/users" }),
        statCard("Employers", s.employers, { href: "#/users" }),
        statCard("Verified users", s.verified_users, { href: "#/users" }),
        statCard("Total jobs", s.total_jobs, { href: "#/alljobs" }),
        statCard("Applications", s.applications),
        statCard("Workers hired", s.hired)
      ),
      h(
        "div",
        { class: "grid", style: "grid-template-columns: repeat(auto-fit, minmax(300px, 1fr))" },
        h("div", { class: "card" }, h("h3", {}, "Job ads waiting"), ...jobList),
        h("div", { class: "card" }, h("h3", {}, "Accounts waiting"), ...accList)
      )
    );
  }

  // ---- job ads --------------------------------------------------------
  const JOB_REASONS = [
    "This looks like a scam or asks for money from the worker.",
    "The ad is not clear. Please describe the work, place and time.",
    "The pay is not realistic for this work.",
    "The photo is not suitable. Please use a clear photo of the work.",
    "This type of work is not allowed on JobLink LK.",
  ];

  function makeChecklist(items, onChange) {
    const boxes = items.map((t) => h("input", { type: "checkbox" }));
    boxes.forEach((b) => b.addEventListener("change", () => onChange(boxes.every((x) => x.checked))));
    const el = h("div", { class: "checks" }, items.map((t, i) => h("label", {}, boxes[i], h("span", {}, t))));
    return { el, all: () => boxes.every((b) => b.checked) };
  }

  const employerName = (e) => (e && (e.business_name || e.full_name)) || "Unknown employer";

  function jobCard(j, mode, reload) {
    const photo = safeUrl(j.image_url);
    const e = j.employer || {};
    const verified = e.verification_status === "verified";
    const when = [j.job_date ? fmtDate(j.job_date) : null, j.job_time ? String(j.job_time).slice(0, 5) + (j.end_time ? " – " + String(j.end_time).slice(0, 5) : "") : null].filter(Boolean).join(", ");

    const approveBtn = h("button", { class: "btn success" }, mode === "pending" ? "✓ Approve ad" : "✓ Approve");
    const rejectBtn = h("button", { class: "btn danger" }, mode === "approved" ? "Take down (reject)" : "✕ Reject");

    let checklist = null;
    if (mode === "pending") {
      const items = ["The ad is genuine: no scam, no fee from the worker, nothing illegal or adult.", "Pay, place and time look realistic."];
      if (photo) items.push("The photo is suitable for the job.");
      checklist = makeChecklist(items, (ok) => (approveBtn.disabled = !ok));
      approveBtn.disabled = true;
    }

    approveBtn.addEventListener("click", async () => {
      approveBtn.disabled = rejectBtn.disabled = true;
      try {
        await rpc("admin_review_job", { p_job: j.id, p_approve: true, p_reason: null });
        toast("Approved: " + j.title, "ok");
        reload();
      } catch (err) { toast(err.message, "error"); approveBtn.disabled = rejectBtn.disabled = false; }
    });
    rejectBtn.addEventListener("click", async () => {
      const reason = await reasonModal({ title: "Reject this job ad", hint: "The employer gets a notification with your reason and can edit the ad.", chips: JOB_REASONS });
      if (!reason) return;
      try {
        await rpc("admin_review_job", { p_job: j.id, p_approve: false, p_reason: reason });
        toast("Rejected: " + j.title);
        reload();
      } catch (err) { toast(err.message, "error"); }
    });

    const media = h("div", { class: "media" }, photo ? h("img", { src: photo, alt: "", referrerpolicy: "no-referrer", onclick: () => lightbox(photo) }) : "No photo");

    return h(
      "div",
      { class: "card review" },
      media,
      h(
        "div",
        { class: "body" },
        h("h3", {}, j.title),
        h("div", { class: "row" }, pill(j.category), j.urgent ? pill("Urgent", "red") : null, pill(j.status, j.status === "active" ? "green" : ""), verified ? pill("✓ Verified employer", "blue") : pill("Employer not verified", "amber")),
        h(
          "div",
          { class: "facts" },
          h("div", { class: "fact" }, h("span", {}, "Employer"), h("b", {}, employerName(e))),
          h("div", { class: "fact" }, h("span", {}, "Pay"), h("b", {}, money(j.pay) + " · " + j.pay_type)),
          h("div", { class: "fact" }, h("span", {}, "Location"), h("b", {}, j.location)),
          h("div", { class: "fact" }, h("span", {}, "When"), h("b", {}, when || "Not set")),
          h("div", { class: "fact" }, h("span", {}, "Workers needed"), h("b", {}, j.workers_needed)),
          h("div", { class: "fact" }, h("span", {}, "Posted"), h("b", {}, timeAgo(j.created_at)))
        ),
        h("div", { class: "desc" }, j.description),
        mode === "rejected" && j.rejection_reason ? h("p", { class: "error" }, "Rejected: " + j.rejection_reason) : null,
        checklist ? checklist.el : null,
        h("div", { class: "actions" }, mode !== "approved" ? approveBtn : null, mode !== "rejected" ? rejectBtn : null)
      )
    );
  }

  function tabsBar(items, active, base) {
    return h("div", { class: "tabs" }, items.map(([key, label]) => h("a", { class: "tab" + (key === active ? " active" : ""), href: "#/" + base + "/" + key }, label)));
  }

  async function viewJobs(sub) {
    const tab = ["pending", "approved", "rejected"].includes(sub) ? sub : "pending";
    const jobs = await fetchJobs({ approval: tab });
    renderNav("jobs");
    const wrap = h("div", {}, tabsBar([["pending", "Waiting"], ["approved", "Approved"], ["rejected", "Rejected"]], tab, "jobs"));
    if (!jobs.length) wrap.append(empty(tab === "pending" ? "Nothing to review right now. 🎉" : "No " + tab + " job ads."));
    jobs.forEach((j) => wrap.append(jobCard(j, tab, () => { refreshBadges(); render(); })));
    return wrap;
  }

  // ---- account checks ---------------------------------------------------
  const ACCOUNT_REASONS = [
    "The NIC photo is blurry or cut off. Please upload a clear photo of both sides.",
    "The NIC number does not match the NIC photo.",
    "The selfie does not match the face on the NIC.",
    "The name on the NIC does not match your profile name.",
    "The NIC photo looks edited or is not a real NIC.",
  ];

  function docTile(label, path) {
    const box = h("div", { class: "doc" }, path ? "Loading…" : "Not uploaded");
    if (path) {
      signedDoc(path).then((u) => {
        const url = safeUrl(u);
        box.replaceChildren(url ? h("img", { src: url, alt: label, referrerpolicy: "no-referrer", onclick: () => lightbox(url) }) : "Could not load");
      });
    }
    return h("div", {}, box, h("div", { class: "doc-label" }, label));
  }

  function accountCard(p, priv, phone, tab, reload) {
    priv = priv || {};
    const nic = parseNIC(priv.nic_number);
    const flags = [
      [!!nic, "NIC number format is valid"],
      [!!nic && priv.date_of_birth === nic.dob, "Birth date saved in the app matches the NIC"],
      [!!nic && priv.gender === nic.gender, "Gender saved in the app matches the NIC"],
      [!!nic && nic.age >= 18, nic ? "Age " + nic.age + " (must be 18 or older)" : "Age (must be 18 or older)"],
    ];
    const isEmployer = p.role === "employer";
    const name = p.business_name || p.full_name || "Unnamed";

    const approveBtn = h("button", { class: "btn success" }, "✓ Verify account");
    const rejectBtn = h("button", { class: "btn danger" }, "✕ Reject");
    let checklist = null;
    if (tab === "pending") {
      checklist = makeChecklist(
        ["NIC photos (front and back) are clear and readable.", "The NIC number typed above matches the NIC photo.", "The selfie matches the face on the NIC.", "The name on the NIC matches the profile name."],
        (ok) => (approveBtn.disabled = !ok)
      );
      approveBtn.disabled = true;
    }
    approveBtn.addEventListener("click", async () => {
      approveBtn.disabled = rejectBtn.disabled = true;
      try {
        await rpc("admin_review_account", { p_user: p.id, p_approve: true, p_note: null });
        toast("Verified: " + name, "ok");
        reload();
      } catch (err) { toast(err.message, "error"); approveBtn.disabled = rejectBtn.disabled = false; }
    });
    rejectBtn.addEventListener("click", async () => {
      const note = await reasonModal({ title: "Reject this account", hint: "The user gets a notification with your reason and can upload new details.", chips: ACCOUNT_REASONS });
      if (!note) return;
      try {
        await rpc("admin_review_account", { p_user: p.id, p_approve: false, p_note: note });
        toast("Rejected: " + name);
        reload();
      } catch (err) { toast(err.message, "error"); }
    });

    const fact = (l, v) => h("div", { class: "fact" }, h("span", {}, l), h("b", {}, v || "–"));
    return h(
      "div",
      { class: "card review", style: "grid-template-columns: 1fr" },
      h(
        "div",
        { class: "body" },
        h("h3", {}, name),
        h("div", { class: "row" }, pill(p.role || "user"), tab === "verified" ? pill("✓ Verified", "green") : tab === "rejected" ? pill("Rejected", "red") : pill("Waiting for review", "amber"), p.business_type ? pill(p.business_type.replace("_", " ")) : null),
        h(
          "div",
          { class: "facts" },
          fact("Phone", phone),
          fact("E-mail", priv.email),
          fact("NIC number", priv.nic_number),
          fact("Birth date (saved)", priv.date_of_birth ? fmtDate(priv.date_of_birth) + " · " + (priv.gender || "") : null),
          fact("Location", p.location),
          isEmployer ? fact("Address", priv.address) : fact("Emergency contact", priv.emergency_name ? priv.emergency_name + " · " + (priv.emergency_phone || "") : null),
          fact("Submitted", priv.submitted_at ? fmtDateTime(priv.submitted_at) : null),
          fact("Joined", fmtDate(p.created_at))
        ),
        p.bio ? h("div", { class: "desc" }, p.bio) : null,
        h("ul", { class: "flags" }, flags.map(([ok, text]) => h("li", { class: ok ? "ok" : "bad" }, (ok ? "✓ " : "✕ ") + text))),
        h("div", { class: "docs" }, docTile("NIC front", priv.nic_front_path), docTile("NIC back", priv.nic_back_path), docTile("Selfie", priv.selfie_path)),
        tab === "rejected" && priv.review_note ? h("p", { class: "error" }, "Rejected: " + priv.review_note) : null,
        checklist ? checklist.el : null,
        h("div", { class: "actions" }, tab !== "verified" ? approveBtn : null, tab !== "rejected" ? rejectBtn : null)
      )
    );
  }

  async function viewAccounts(sub) {
    const tab = ["pending", "verified", "rejected"].includes(sub) ? sub : "pending";
    const { data: profs, error } = await sb
      .from("profiles")
      .select("id, full_name, role, location, bio, business_name, business_type, availability, avatar_url, verification_status, created_at")
      .eq("verification_status", tab)
      .limit(100);
    if (error) throw new Error(error.message);
    renderNav("accounts");
    const wrap = h("div", {}, tabsBar([["pending", "Waiting"], ["verified", "Verified"], ["rejected", "Rejected"]], tab, "accounts"));
    if (!profs.length) { wrap.append(empty(tab === "pending" ? "No accounts are waiting for a check. 🎉" : "No " + tab + " accounts.")); return wrap; }

    const ids = profs.map((p) => p.id);
    const [{ data: privs }, users] = await Promise.all([sb.from("profile_private").select("*").in("user_id", ids), rpc("admin_list_users")]);
    const privBy = Object.fromEntries((privs || []).map((x) => [x.user_id, x]));
    const phoneBy = Object.fromEntries((users || []).map((u) => [u.id, u.phone ? "+" + String(u.phone).replace(/^\+/, "") : null]));
    profs.sort((a, b) => new Date((privBy[a.id] || {}).submitted_at || a.created_at) - new Date((privBy[b.id] || {}).submitted_at || b.created_at));
    profs.forEach((p) => wrap.append(accountCard(p, privBy[p.id], phoneBy[p.id], tab, () => { refreshBadges(); render(); })));
    return wrap;
  }

  // ---- users ----------------------------------------------------------
  const VSTATUS = { verified: ["✓ Verified", "green"], pending: ["Waiting", "amber"], rejected: ["Rejected", "red"], unverified: ["Not verified", ""] };

  async function viewUsers() {
    const users = (await rpc("admin_list_users")) || [];
    renderNav("users");
    const search = h("input", { placeholder: "Search name or phone…" });
    const role = h("select", {}, h("option", { value: "" }, "All roles"), h("option", { value: "worker" }, "Workers"), h("option", { value: "employer" }, "Employers"));
    const vs = h("select", {}, h("option", { value: "" }, "Any verification"), ...Object.keys(VSTATUS).map((k) => h("option", { value: k }, VSTATUS[k][0])));
    const count = h("span", { class: "muted" });
    const body = h("tbody");

    function draw() {
      const q = search.value.trim().toLowerCase();
      const rows = users.filter(
        (u) =>
          (!role.value || u.role === role.value) &&
          (!vs.value || u.verification_status === vs.value) &&
          (!q || (u.full_name || "").toLowerCase().includes(q) || (u.business_name || "").toLowerCase().includes(q) || (u.phone || "").includes(q))
      );
      count.textContent = rows.length + " of " + users.length + " users";
      body.replaceChildren(
        ...rows.slice(0, 500).map((u) => {
          const [vt, vk] = VSTATUS[u.verification_status] || VSTATUS.unverified;
          return h(
            "tr",
            {},
            h("td", {}, h("b", {}, u.full_name || "Unnamed"), u.business_name ? h("div", { class: "muted" }, u.business_name) : null),
            h("td", {}, pill(u.role || "–")),
            h("td", {}, u.phone ? "+" + String(u.phone).replace(/^\+/, "") : "–"),
            h("td", {}, pill(vt, vk)),
            h("td", {}, u.role === "employer" ? u.jobs_count + " jobs" : u.applications_count + " applied"),
            h("td", {}, fmtDate(u.created_at)),
            h("td", {}, u.last_sign_in_at ? timeAgo(u.last_sign_in_at) : "–")
          );
        })
      );
    }
    [search, role, vs].forEach((el) => el.addEventListener("input", draw));
    draw();

    return h(
      "div",
      {},
      h("div", { class: "toolbar" }, search, role, vs, count),
      h("div", { class: "table-wrap" }, h("table", {}, h("thead", {}, h("tr", {}, ["Name", "Role", "Phone", "Verification", "Activity", "Joined", "Last sign-in"].map((t) => h("th", {}, t)))), body))
    );
  }

  // ---- all jobs -------------------------------------------------------
  async function viewAllJobs() {
    let jobs = await fetchJobs({ limit: 300 });
    renderNav("alljobs");
    const search = h("input", { placeholder: "Search title or employer…" });
    const ap = h("select", {}, h("option", { value: "" }, "Any review status"), h("option", { value: "pending" }, "Waiting"), h("option", { value: "approved" }, "Approved"), h("option", { value: "rejected" }, "Rejected"));
    const st = h("select", {}, h("option", { value: "" }, "Open and closed"), h("option", { value: "active" }, "Open"), h("option", { value: "closed" }, "Closed"));
    const count = h("span", { class: "muted" });
    const body = h("tbody");

    async function act(fn, okMsg) {
      try { await fn(); toast(okMsg, "ok"); jobs = await fetchJobs({ limit: 300 }); draw(); refreshBadges(); }
      catch (err) { toast(err.message, "error"); }
    }

    function draw() {
      const q = search.value.trim().toLowerCase();
      const rows = jobs.filter(
        (j) =>
          (!ap.value || j.approval_status === ap.value) &&
          (!st.value || j.status === st.value) &&
          (!q || j.title.toLowerCase().includes(q) || employerName(j.employer).toLowerCase().includes(q))
      );
      count.textContent = rows.length + " of " + jobs.length + " jobs";
      body.replaceChildren(
        ...rows.map((j) => {
          const apKind = { approved: "green", rejected: "red", pending: "amber" }[j.approval_status];
          const acts = [];
          if (j.approval_status !== "approved") acts.push(h("button", { class: "btn small success", onclick: () => act(() => rpc("admin_review_job", { p_job: j.id, p_approve: true, p_reason: null }), "Approved") }, "Approve"));
          if (j.approval_status !== "rejected")
            acts.push(
              h("button", { class: "btn small danger", onclick: async () => {
                const r = await reasonModal({ title: "Reject this job ad", chips: JOB_REASONS });
                if (r) act(() => rpc("admin_review_job", { p_job: j.id, p_approve: false, p_reason: r }), "Rejected");
              } }, "Reject")
            );
          acts.push(h("button", { class: "btn small", onclick: () => act(() => rpc("admin_set_job_status", { p_job: j.id, p_status: j.status === "active" ? "closed" : "active" }), j.status === "active" ? "Closed" : "Reopened") }, j.status === "active" ? "Close" : "Reopen"));
          return h(
            "tr",
            {},
            h("td", {}, h("b", {}, j.title), h("div", { class: "muted" }, j.category + " · " + j.location)),
            h("td", {}, employerName(j.employer)),
            h("td", {}, pill(j.approval_status, apKind)),
            h("td", {}, pill(j.status, j.status === "active" ? "green" : "")),
            h("td", {}, money(j.pay)),
            h("td", {}, j.positions_filled + "/" + j.workers_needed),
            h("td", {}, timeAgo(j.created_at)),
            h("td", {}, h("div", { class: "row" }, acts))
          );
        })
      );
    }
    [search, ap, st].forEach((el) => el.addEventListener("input", draw));
    draw();

    return h(
      "div",
      {},
      h("div", { class: "toolbar" }, search, ap, st, count),
      h("div", { class: "table-wrap" }, h("table", {}, h("thead", {}, h("tr", {}, ["Job", "Employer", "Review", "Status", "Pay", "Hired", "Posted", "Actions"].map((t) => h("th", {}, t)))), body))
    );
  }

  // ---- audit log ------------------------------------------------------
  const ACTIONS = {
    job_approved: "Approved a job ad",
    job_rejected: "Rejected a job ad",
    job_closed: "Closed a job",
    job_reopened: "Reopened a job",
    account_verified: "Verified an account",
    account_rejected: "Rejected an account",
  };

  async function viewAudit() {
    const { data, error } = await sb.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    renderNav("audit");
    if (!data.length) return empty("No admin actions yet.");
    return h(
      "div",
      { class: "table-wrap" },
      h(
        "table",
        {},
        h("thead", {}, h("tr", {}, ["When", "Admin", "Action", "Target", "Note"].map((t) => h("th", {}, t)))),
        h(
          "tbody",
          {},
          data.map((a) =>
            h("tr", {}, h("td", {}, fmtDateTime(a.created_at)), h("td", {}, a.admin_email || "–"), h("td", {}, ACTIONS[a.action] || a.action), h("td", {}, (a.target_type || "") + " " + String(a.target_id || "").slice(0, 8)), h("td", {}, a.note || ""))
          )
        )
      )
    );
  }

  // ---------------------------------------------------------------- router
  const ROUTES = {
    dashboard: { title: "Dashboard", subtitle: "What needs your attention today", view: viewDashboard },
    jobs: { title: "Job ads", subtitle: "Approve or reject new job ads before workers can see them", view: viewJobs },
    accounts: { title: "Account checks", subtitle: "Check the NIC and selfie of people who asked for a verified badge", view: viewAccounts },
    users: { title: "Users", subtitle: "Everyone who signed up", view: viewUsers },
    alljobs: { title: "All jobs", subtitle: "Every job ad and its review status", view: viewAllJobs },
    audit: { title: "Audit log", subtitle: "Everything admins did, newest first", view: viewAudit },
  };

  async function render() {
    const { route, sub } = parseHash();
    const def = ROUTES[route] || ROUTES.dashboard;
    const token = ++state.token;
    renderNav(ROUTES[route] ? route : "dashboard");
    $("#title").textContent = def.title;
    $("#subtitle").textContent = def.subtitle;
    $("#head-actions").replaceChildren(h("button", { class: "btn", onclick: render }, "↻ Refresh"));
    const view = $("#view");
    view.replaceChildren(empty("Loading…"));
    try {
      const node = await def.view(sub);
      if (token === state.token) view.replaceChildren(node);
    } catch (err) {
      if (token === state.token) view.replaceChildren(empty("Something went wrong: " + (err.message || err)));
    }
  }
  window.addEventListener("hashchange", () => !$("#app").hidden && render());

  // ---------------------------------------------------------------- login / boot
  function show(which) {
    for (const id of ["setup", "login", "app"]) $("#" + id).hidden = id !== which;
  }

  function showLogin(message) {
    show("login");
    $("#login-error").textContent = message || "";
    $("#login-btn").disabled = false;
  }

  async function enter(user) {
    let isAdmin = false;
    try { isAdmin = (await sb.rpc("is_admin")).data === true; } catch (e) { isAdmin = false; }
    if (!isAdmin) {
      await sb.auth.signOut();
      showLogin("This account is not an admin.");
      return;
    }
    state.user = user;
    $("#me").textContent = user.email || "";
    show("app");
    if (!location.hash) location.hash = "#/dashboard";
    await render();
    refreshBadges();
    clearInterval(state.poll);
    state.poll = setInterval(refreshBadges, 60000);
  }

  // Accept sloppy input: quotes, spaces, a trailing "/" or a pasted path like "/rest/v1/" (that caused
  // "Invalid path specified in request URL"). Only "https://PROJECT.supabase.co" is kept.
  function cleanUrl(raw) {
    const v = String(raw || "").trim().replace(/^["']|["']$/g, "");
    try { return new URL(v).origin; } catch (e) { return v; }
  }
  const cleanKey = (raw) => String(raw || "").trim().replace(/^["']|["']$/g, "");

  async function boot() {
    const url = cleanUrl(cfg.SUPABASE_URL);
    const key = cleanKey(cfg.SUPABASE_ANON_KEY);
    if (!url || !key || /YOUR-/.test(url + key)) { show("setup"); return; }
    sb = window.supabase.createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });

    $("#login-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      $("#login-btn").disabled = true;
      $("#login-error").textContent = "";
      const { data, error } = await sb.auth.signInWithPassword({ email: $("#login-email").value.trim(), password: $("#login-password").value });
      if (error || !data.user) {
        showLogin(error ? error.message : "Could not sign in");
        return;
      }
      $("#login-password").value = "";
      await enter(data.user);
    });
    $("#signout").addEventListener("click", async () => {
      clearInterval(state.poll);
      await sb.auth.signOut();
      showLogin();
    });
    window.addEventListener("unhandledrejection", (ev) => toast(String((ev.reason && ev.reason.message) || ev.reason), "error"));

    const { data } = await sb.auth.getSession();
    if (data && data.session) await enter(data.session.user);
    else showLogin();
  }

  boot();
})();