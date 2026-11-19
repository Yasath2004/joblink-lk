// JobLink LK admin console. Plain JavaScript, no build step.
// Security: only the public anon key is used. Every admin power is enforced by the database
// (is_admin() + row level security + audited functions), never by this page.
(() => {
  "use strict";

  const {
    $, h, ico, money, fmtDate, fmtDateTime, timeAgo, safeUrl, phoneText, avatar, pill, empty, skeleton, toast,
    closeOverlay, openDrawer, closeDrawer, reasonModal, lightbox, dataTable, stackedBars, hbars,
  } = window.UI;
  const cfg = window.JOBLINK_CONFIG || {};
  let sb = null;
  const state = { user: null, stats: null, poll: null, token: 0, nextIdx: null, focusId: null, queue: null };

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

  // ---------------------------------------------------------------- data
  async function rpc(name, args) {
    const { data, error } = await sb.rpc(name, args || {});
    if (error) throw new Error(error.message);
    return data;
  }
  const EMP = "employer:profiles!jobs_employer_id_fkey(id, full_name, business_name, verification_status, avatar_url)";

  async function fetchJobs({ approval, status, limit } = {}) {
    let q = sb.from("jobs").select("*, " + EMP).order("created_at", { ascending: approval === "pending" }).limit(limit || 100);
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
  const employerName = (e) => (e && (e.business_name || e.full_name)) || "Unknown employer";

  // ---------------------------------------------------------------- theme
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem("joblink-admin-theme", t); } catch (e) { /* private mode */ }
  }
  function initTheme() {
    let t = null;
    try { t = localStorage.getItem("joblink-admin-theme"); } catch (e) { /* ignore */ }
    if (!t) t = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    applyTheme(t);
  }
  const isDark = () => document.documentElement.dataset.theme === "dark";

  // ---------------------------------------------------------------- navigation
  const NAV = [
    { group: "Overview", items: [{ key: "dashboard", label: "Dashboard", icon: "dashboard" }] },
    {
      group: "Review",
      items: [
        { key: "jobs", label: "Job ads", icon: "jobreview", badge: "pending_jobs", href: "#/jobs/pending" },
        { key: "accounts", label: "Account checks", icon: "shield", badge: "pending_accounts", href: "#/accounts/pending" },
      ],
    },
    {
      group: "Manage",
      items: [
        { key: "users", label: "Users", icon: "users" },
        { key: "alljobs", label: "All jobs", icon: "briefcase" },
        { key: "audit", label: "Audit log", icon: "audit" },
      ],
    },
  ];

  function renderNav(active) {
    const parts = [];
    for (const g of NAV) {
      parts.push(h("div", { class: "nav-group" }, g.group));
      for (const n of g.items) {
        const count = state.stats && n.badge ? Number(state.stats[n.badge] || 0) : 0;
        parts.push(
          h("a", { href: n.href || "#/" + n.key, class: n.key === active ? "active" : "" }, ico(n.icon, 18), h("span", { class: "label" }, n.label), count > 0 ? h("span", { class: "nav-badge" }, count) : null)
        );
      }
    }
    $("#nav").replaceChildren(...parts);
  }

  async function refreshBadges() {
    try {
      state.stats = await rpc("admin_stats");
      renderNav(parseHash().route);
    } catch (e) { /* shown on next action */ }
  }
  function parseHash() {
    const parts = location.hash.replace(/^#\/?/, "").split("/");
    return { route: parts[0] || "dashboard", sub: parts[1] || "" };
  }

  // ---------------------------------------------------------------- review queue (list + detail)
  function buildQueue({ items, listItem, detail, hint }) {
    let idx = Math.min(Math.max(state.nextIdx == null ? 0 : state.nextIdx, 0), items.length - 1);
    state.nextIdx = null;
    if (state.focusId) {
      const f = items.findIndex((x) => x.id === state.focusId);
      if (f >= 0) idx = f;
      state.focusId = null;
    }
    const detailBox = h("div", { class: "card q-detail" });
    const api = { actions: {}, items };
    const rows = items.map((it, i) => {
      const el = listItem(it);
      el.className = "q-item";
      el.addEventListener("click", () => select(i));
      return el;
    });
    function select(i) {
      if (i < 0 || i >= items.length) return;
      idx = i;
      api.idx = i;
      api.actions = {};
      rows.forEach((r, k) => r.classList.toggle("sel", k === i));
      detailBox.replaceChildren(detail(items[i], api));
      if (rows[i].scrollIntoView) rows[i].scrollIntoView({ block: "nearest" });
    }
    api.select = select;
    api.next = () => select(idx + 1);
    api.prev = () => select(idx - 1);
    api.done = () => { state.nextIdx = idx; refreshBadges(); render(); };
    state.queue = api;
    const list = h("div", { class: "card q-list" }, h("div", { class: "q-scroll" }, rows), hint ? h("div", { class: "q-hint" }, hint) : null);
    select(idx);
    return h("div", { class: "queue" }, list, detailBox);
  }

  function tabsBar(items, active, base) {
    return h(
      "div",
      { class: "tabs" },
      items.map(([key, label, count]) =>
        h("a", { class: "tab" + (key === active ? " active" : ""), href: "#/" + base + "/" + key }, label, count ? h("span", { class: "count" }, count) : null)
      )
    );
  }

  function makeChecklist(items, onChange) {
    const boxes = items.map(() => h("input", { type: "checkbox" }));
    boxes.forEach((b) => b.addEventListener("change", () => onChange(boxes.every((x) => x.checked))));
    return h("div", { class: "checklist" }, items.map((t, i) => h("label", {}, boxes[i], h("span", {}, t))));
  }

  const fact = (icon, label, value, wide) =>
    h("div", { class: "fact" + (wide ? " wide" : "") }, h("div", { class: "k" }, ico(icon, 13), label), h("div", { class: "v" }, value || "–"));

  function flagBox(title, flags) {
    return h(
      "div",
      {},
      h("div", { class: "section-title" }, title),
      h("div", { class: "flagbox" }, flags.map((f) => h("div", { class: "flagrow " + f.kind }, ico(f.kind === "ok" ? "check" : f.kind === "info" ? "info" : f.kind === "bad" ? "x" : "warning", 17), h("span", {}, f.text))))
    );
  }

  // ---- job ads ---------------------------------------------------------
  const JOB_REASONS = [
    "This looks like a scam or asks for money from the worker.",
    "The ad is not clear. Please describe the work, place and time.",
    "The pay is not realistic for this work.",
    "The photo is not suitable. Please use a clear photo of the work.",
    "This type of work is not allowed on JobLink LK.",
  ];

  // Automatic hints to help the reviewer (the reviewer still decides)
  function jobFlags(j) {
    const flags = [];
    const e = j.employer || {};
    flags.push(e.verification_status === "verified" ? { kind: "ok", text: "The employer's account is verified." } : { kind: "warn", text: "The employer's account is not verified yet." });
    const text = (j.title || "") + " " + (j.description || "");
    if (/(registration|joining|deposit|advance|processing|training)\s*(fee|payment|charge)|pay\s*(first|upfront|in advance)|send\s*money/i.test(text))
      flags.push({ kind: "bad", text: "Mentions a fee or advance payment. This is a common scam pattern." });
    if (/(https?:\/\/|www\.|wa\.me|bit\.ly|t\.me|telegram|whatsapp)/i.test(text)) flags.push({ kind: "warn", text: "Contains a link or a messaging-app contact." });
    if (/(\+?94|0)7\d{8}/.test(text.replace(/[\s-]/g, ""))) flags.push({ kind: "info", text: "Contains a phone number in the text." });
    const len = String(j.description || "").trim().length;
    if (len < 40) flags.push({ kind: "warn", text: "Very short description (" + len + " characters)." });
    if (Number(j.pay) < 300) flags.push({ kind: "warn", text: "Pay looks very low (" + money(j.pay) + ")." });
    if (Number(j.pay) > 100000) flags.push({ kind: "warn", text: "Pay looks very high (" + money(j.pay) + ")." });
    if (!safeUrl(j.image_url)) flags.push({ kind: "info", text: "No photo attached." });
    return flags;
  }

  function jobListItem(j) {
    const photo = safeUrl(j.image_url);
    return h(
      "div",
      {},
      h("div", { class: "q-thumb" }, photo ? h("img", { src: photo, alt: "", loading: "lazy", referrerpolicy: "no-referrer" }) : ico("image", 20)),
      h("div", { class: "q-main" }, h("b", {}, j.title), h("small", {}, employerName(j.employer) + " · " + timeAgo(j.created_at))),
      j.urgent ? pill("Urgent", "bad", true) : null
    );
  }

  function jobDetail(j, mode, api) {
    const photo = safeUrl(j.image_url);
    const e = j.employer || {};
    const verified = e.verification_status === "verified";
    const when = [
      j.job_date ? fmtDate(j.job_date) : null,
      j.job_time ? String(j.job_time).slice(0, 5) + (j.end_time ? " – " + String(j.end_time).slice(0, 5) : "") : null,
    ].filter(Boolean).join(", ");

    const approveBtn = h("button", { class: "btn btn-success", type: "button" }, ico("check", 16), mode === "pending" ? "Approve ad" : "Approve");
    const rejectBtn = h("button", { class: "btn btn-danger", type: "button" }, ico("x", 16), mode === "approved" ? "Take down" : "Reject");
    let checklist = null;
    if (mode === "pending") {
      const items = ["The ad is genuine: no scam, no fee from the worker, nothing illegal or adult.", "Pay, place and time look realistic."];
      if (photo) items.push("The photo is suitable for the job.");
      checklist = makeChecklist(items, (ok) => (approveBtn.disabled = !ok));
      approveBtn.disabled = true;
    }
    const doApprove = async () => {
      approveBtn.disabled = rejectBtn.disabled = true;
      try {
        await rpc("admin_review_job", { p_job: j.id, p_approve: true, p_reason: null });
        toast("Approved: " + j.title, "ok");
        api.done();
      } catch (err) { toast(err.message, "error"); approveBtn.disabled = rejectBtn.disabled = false; }
    };
    const doReject = async () => {
      const reason = await reasonModal({ title: "Reject this job ad", hint: "The employer gets a notification with your reason and can edit the ad.", chips: JOB_REASONS });
      if (!reason) return;
      try {
        await rpc("admin_review_job", { p_job: j.id, p_approve: false, p_reason: reason });
        toast("Rejected: " + j.title);
        api.done();
      } catch (err) { toast(err.message, "error"); }
    };
    approveBtn.addEventListener("click", doApprove);
    rejectBtn.addEventListener("click", doReject);
    api.actions = {
      approve: () => (approveBtn.disabled ? toast("Tick all the checks first.", "error") : approveBtn.click()),
      reject: () => rejectBtn.click(),
    };

    const media = photo
      ? h("div", { class: "photo", onclick: () => lightbox(photo) }, h("img", { src: photo, alt: "", referrerpolicy: "no-referrer" }), h("span", { class: "zoom" }, ico("zoom", 14), "View"))
      : h("div", { class: "photo nophoto" }, ico("image", 30), "No photo");

    return h(
      "div",
      {},
      h(
        "div",
        { class: "d-head" },
        h("h2", {}, j.title),
        h(
          "div",
          { class: "meta" },
          pill(j.category, "", true),
          j.urgent ? pill("Urgent", "bad") : null,
          pill(j.status === "active" ? "Open" : "Closed", j.status === "active" ? "ok" : ""),
          verified ? pill("Verified employer", "info") : pill("Employer not verified", "warn")
        )
      ),
      h(
        "div",
        { class: "d-body" },
        h(
          "div",
          { class: "hero" },
          media,
          h(
            "div",
            { class: "facts" },
            fact("building", "Employer", employerName(e), true),
            fact("trend", "Pay", money(j.pay) + " · " + j.pay_type),
            fact("users", "Workers needed", String(j.workers_needed)),
            fact("pin", "Location", j.location, true),
            fact("calendar", "When", when || "Not set", true),
            fact("clock", "Posted", timeAgo(j.created_at))
          )
        ),
        flagBox("Heads-up (automatic checks)", jobFlags(j)),
        h("div", {}, h("div", { class: "section-title" }, "Description"), h("div", { class: "desc" }, j.description)),
        mode === "rejected" && j.rejection_reason ? h("div", { class: "rej" }, "Rejected: " + j.rejection_reason) : null,
        checklist ? h("div", {}, h("div", { class: "section-title" }, "Your review"), checklist) : null
      ),
      h(
        "div",
        { class: "actionbar" },
        mode !== "approved" ? approveBtn : null,
        mode !== "rejected" ? rejectBtn : null,
        h("span", { class: "spacer" }),
        mode === "pending" ? h("span", { class: "muted" }, h("kbd", {}, "A"), " approve  ", h("kbd", {}, "R"), " reject") : null
      )
    );
  }

  async function viewJobs(sub) {
    const tab = ["pending", "approved", "rejected"].includes(sub) ? sub : "pending";
    const jobs = await fetchJobs({ approval: tab });
    renderNav("jobs");
    const pending = state.stats ? Number(state.stats.pending_jobs || 0) : 0;
    const wrap = h("div", {}, tabsBar([["pending", "Waiting", pending], ["approved", "Approved"], ["rejected", "Rejected"]], tab, "jobs"));
    if (!jobs.length) {
      wrap.append(h("div", { class: "card" }, empty(tab === "pending" ? "badge" : "inbox", tab === "pending" ? "All caught up" : "Nothing here", tab === "pending" ? "No job ads are waiting for review right now." : "No " + tab + " job ads yet.")));
      return wrap;
    }
    wrap.append(buildQueue({ items: jobs, listItem: jobListItem, detail: (j, api) => jobDetail(j, tab, api), hint: tab === "pending" ? "J / K to move · A approve · R reject" : null }));
    return wrap;
  }

  // ---- account checks --------------------------------------------------
  const ACCOUNT_REASONS = [
    "The NIC photo is blurry or cut off. Please upload a clear photo of both sides.",
    "The NIC number does not match the NIC photo.",
    "The selfie does not match the face on the NIC.",
    "The name on the NIC does not match your profile name.",
    "The NIC photo looks edited or is not a real NIC.",
  ];

  function docTile(label, path) {
    const box = h("div", { class: "photo nophoto" }, path ? "Loading…" : "Not uploaded");
    if (path) {
      signedDoc(path).then((u) => {
        const url = safeUrl(u);
        if (url) {
          box.className = "photo";
          box.replaceChildren(h("img", { src: url, alt: label, referrerpolicy: "no-referrer" }), h("span", { class: "zoom" }, ico("zoom", 14), "Zoom"));
          box.addEventListener("click", () => lightbox(url));
        } else box.textContent = "Could not load";
      });
    }
    return h("div", { class: "doc" }, box, h("div", { class: "cap" }, label));
  }

  function accountListItem(a) {
    const name = a.p.business_name || a.p.full_name || "Unnamed";
    return h(
      "div",
      {},
      avatar(name),
      h("div", { class: "q-main" }, h("b", {}, name), h("small", {}, (a.p.role || "user") + " · " + timeAgo((a.priv && a.priv.submitted_at) || a.p.created_at))),
      a.p.role ? pill(a.p.role, "", true) : null
    );
  }

  function accountDetail(a, tab, api) {
    const { p, priv: priv0, phone } = a;
    const priv = priv0 || {};
    const nic = parseNIC(priv.nic_number);
    const flags = [
      { kind: nic ? "ok" : "bad", text: nic ? "NIC number format is valid." : "NIC number format is not valid." },
      { kind: nic && priv.date_of_birth === nic.dob ? "ok" : "bad", text: "Birth date saved in the app " + (nic && priv.date_of_birth === nic.dob ? "matches" : "does not match") + " the NIC." },
      { kind: nic && priv.gender === nic.gender ? "ok" : "bad", text: "Gender saved in the app " + (nic && priv.gender === nic.gender ? "matches" : "does not match") + " the NIC." },
      { kind: nic && nic.age >= 18 ? "ok" : "bad", text: nic ? "Age " + nic.age + (nic.age >= 18 ? " (18 or older)." : " (must be 18 or older).") : "Age could not be read (must be 18 or older)." },
    ];
    const isEmployer = p.role === "employer";
    const name = p.business_name || p.full_name || "Unnamed";

    const approveBtn = h("button", { class: "btn btn-success", type: "button" }, ico("badge", 16), "Verify account");
    const rejectBtn = h("button", { class: "btn btn-danger", type: "button" }, ico("x", 16), "Reject");
    let checklist = null;
    if (tab === "pending") {
      checklist = makeChecklist(
        ["NIC photos (front and back) are clear and readable.", "The NIC number shown above matches the NIC photo.", "The selfie matches the face on the NIC.", "The name on the NIC matches the profile name."],
        (ok) => (approveBtn.disabled = !ok)
      );
      approveBtn.disabled = true;
    }
    const doApprove = async () => {
      approveBtn.disabled = rejectBtn.disabled = true;
      try {
        await rpc("admin_review_account", { p_user: p.id, p_approve: true, p_note: null });
        toast("Verified: " + name, "ok");
        api.done();
      } catch (err) { toast(err.message, "error"); approveBtn.disabled = rejectBtn.disabled = false; }
    };
    const doReject = async () => {
      const note = await reasonModal({ title: "Reject this account", hint: "The user gets a notification with your reason and can upload new details.", chips: ACCOUNT_REASONS });
      if (!note) return;
      try {
        await rpc("admin_review_account", { p_user: p.id, p_approve: false, p_note: note });
        toast("Rejected: " + name);
        api.done();
      } catch (err) { toast(err.message, "error"); }
    };
    approveBtn.addEventListener("click", doApprove);
    rejectBtn.addEventListener("click", doReject);
    api.actions = {
      approve: () => (approveBtn.disabled ? toast("Tick all the checks first.", "error") : approveBtn.click()),
      reject: () => rejectBtn.click(),
    };

    return h(
      "div",
      {},
      h(
        "div",
        { class: "d-head" },
        h("div", { style: "display:flex;gap:14px;align-items:center" }, avatar(name, "lg"), h("div", {}, h("h2", { style: "margin:0 0 6px" }, name), h("div", { class: "meta" }, pill(p.role || "user", "", true), tab === "verified" ? pill("Verified", "ok") : tab === "rejected" ? pill("Rejected", "bad") : pill("Waiting for review", "warn"), p.business_type ? pill(p.business_type.replace("_", " "), "", true) : null)))
      ),
      h(
        "div",
        { class: "d-body" },
        h(
          "div",
          { class: "facts" },
          fact("phone", "Phone", phone),
          fact("mail", "E-mail", priv.email),
          fact("idcard", "NIC number", priv.nic_number),
          fact("calendar", "Birth date (saved)", priv.date_of_birth ? fmtDate(priv.date_of_birth) + (priv.gender ? " · " + priv.gender : "") : null),
          fact("pin", "Location", p.location),
          isEmployer ? fact("building", "Address", priv.address) : fact("user", "Emergency contact", priv.emergency_name ? priv.emergency_name + " · " + (priv.emergency_phone || "") : null),
          fact("clock", "Submitted", priv.submitted_at ? fmtDateTime(priv.submitted_at) : null),
          fact("calendar", "Joined", fmtDate(p.created_at))
        ),
        p.bio ? h("div", {}, h("div", { class: "section-title" }, isEmployer ? "About the business" : "About"), h("div", { class: "desc" }, p.bio)) : null,
        flagBox("NIC checks (automatic)", flags),
        h("div", {}, h("div", { class: "section-title" }, "Identity photos (click to zoom)"), h("div", { class: "docs" }, docTile("NIC front", priv.nic_front_path), docTile("NIC back", priv.nic_back_path), docTile("Selfie", priv.selfie_path))),
        tab === "rejected" && priv.review_note ? h("div", { class: "rej" }, "Rejected: " + priv.review_note) : null,
        checklist ? h("div", {}, h("div", { class: "section-title" }, "Your review"), checklist) : null
      ),
      h(
        "div",
        { class: "actionbar" },
        tab !== "verified" ? approveBtn : null,
        tab !== "rejected" ? rejectBtn : null,
        h("span", { class: "spacer" }),
        tab === "pending" ? h("span", { class: "muted" }, h("kbd", {}, "A"), " verify  ", h("kbd", {}, "R"), " reject") : null
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
    const pending = state.stats ? Number(state.stats.pending_accounts || 0) : 0;
    const wrap = h("div", {}, tabsBar([["pending", "Waiting", pending], ["verified", "Verified"], ["rejected", "Rejected"]], tab, "accounts"));
    if (!profs.length) {
      wrap.append(h("div", { class: "card" }, empty(tab === "pending" ? "badge" : "inbox", tab === "pending" ? "All caught up" : "Nothing here", tab === "pending" ? "No accounts are waiting for an identity check." : "No " + tab + " accounts yet.")));
      return wrap;
    }
    const ids = profs.map((p) => p.id);
    const [{ data: privs }, users] = await Promise.all([sb.from("profile_private").select("*").in("user_id", ids), rpc("admin_list_users")]);
    const privBy = Object.fromEntries((privs || []).map((x) => [x.user_id, x]));
    const phoneBy = Object.fromEntries((users || []).map((u) => [u.id, phoneText(u.phone)]));
    const items = profs.map((p) => ({ id: p.id, p, priv: privBy[p.id], phone: phoneBy[p.id] }));
    const when = (a) => new Date((a.priv && a.priv.submitted_at) || a.p.created_at).getTime();
    items.sort((a, b) => (tab === "pending" ? when(a) - when(b) : when(b) - when(a)));
    wrap.append(buildQueue({ items, listItem: accountListItem, detail: (a, api) => accountDetail(a, tab, api), hint: tab === "pending" ? "J / K to move · A verify · R reject" : null }));
    return wrap;
  }

  // ---- users ----------------------------------------------------------
  const VSTATUS = { verified: ["Verified", "ok"], pending: ["Waiting", "warn"], rejected: ["Rejected", "bad"], unverified: ["Not verified", ""] };

  function userDrawer(u) {
    const [vt, vk] = VSTATUS[u.verification_status] || VSTATUS.unverified;
    const name = u.business_name || u.full_name || "Unnamed";
    const kv = (k, v) => h("div", {}, h("span", {}, k), h("b", {}, v == null || v === "" ? "–" : v));
    openDrawer(
      h(
        "div",
        { class: "drawer", role: "dialog", "aria-modal": "true" },
        h("div", { class: "d-top" }, h("b", {}, "User details"), h("button", { class: "btn btn-icon btn-ghost", type: "button", "aria-label": "Close", onclick: closeDrawer }, ico("x", 18))),
        h(
          "div",
          { class: "d-in" },
          h("div", { class: "who" }, avatar(name, "lg"), h("div", {}, h("h3", {}, name), h("div", { style: "display:flex;gap:6px;margin-top:6px" }, pill(u.role || "user", "", true), pill(vt, vk)))),
          h("div", { class: "kv" }, kv("Phone", phoneText(u.phone)), kv("Joined", fmtDate(u.created_at)), kv("Last sign-in", u.last_sign_in_at ? timeAgo(u.last_sign_in_at) : null), kv(u.role === "employer" ? "Jobs posted" : "Applications", u.role === "employer" ? u.jobs_count : u.applications_count), kv("User ID", u.id)),
          u.verification_status === "pending"
            ? h("button", { class: "btn btn-primary", type: "button", onclick: () => { closeDrawer(); state.focusId = u.id; location.hash = "#/accounts/pending"; } }, ico("shield", 16), "Open identity review")
            : null,
          h("button", { class: "btn", type: "button", onclick: () => { if (navigator.clipboard) navigator.clipboard.writeText(u.id); toast("User ID copied", "ok"); } }, ico("copy", 16), "Copy user ID")
        )
      )
    );
  }

  async function viewUsers() {
    const users = (await rpc("admin_list_users")) || [];
    renderNav("users");
    const search = h("input", { class: "input", placeholder: "Search name or phone…", "aria-label": "Search users" });
    const role = h("select", { class: "select", "aria-label": "Role" }, h("option", { value: "" }, "All roles"), h("option", { value: "worker" }, "Workers"), h("option", { value: "employer" }, "Employers"));
    const vs = h("select", { class: "select", "aria-label": "Verification" }, h("option", { value: "" }, "Any verification"), ...Object.keys(VSTATUS).map((k) => h("option", { value: k }, VSTATUS[k][0])));
    const count = h("span", { class: "muted" });
    const table = dataTable({
      pageSize: 25,
      onRowClick: userDrawer,
      emptyIcon: "users",
      emptyTitle: "No users match",
      emptyText: "Try a different search or filter.",
      columns: [
        { label: "User", sort: (u) => (u.business_name || u.full_name || "").toLowerCase(), csv: (u) => u.business_name || u.full_name, render: (u) => h("div", { class: "cell-user" }, avatar(u.business_name || u.full_name, "sm"), h("div", {}, h("b", {}, u.full_name || "Unnamed"), u.business_name ? h("small", {}, u.business_name) : null)) },
        { label: "Role", sort: (u) => u.role, csv: (u) => u.role, render: (u) => pill(u.role || "–", "", true) },
        { label: "Phone", csv: (u) => phoneText(u.phone), render: (u) => phoneText(u.phone) || "–" },
        { label: "Verification", sort: (u) => u.verification_status, csv: (u) => u.verification_status, render: (u) => { const [t, k] = VSTATUS[u.verification_status] || VSTATUS.unverified; return pill(t, k); } },
        { label: "Activity", csv: (u) => (u.role === "employer" ? u.jobs_count + " jobs" : u.applications_count + " applications"), render: (u) => (u.role === "employer" ? u.jobs_count + " jobs" : u.applications_count + " applied") },
        { label: "Joined", sort: (u) => u.created_at, csv: (u) => u.created_at, render: (u) => fmtDate(u.created_at) },
        { label: "Last sign-in", sort: (u) => u.last_sign_in_at, csv: (u) => u.last_sign_in_at, render: (u) => (u.last_sign_in_at ? timeAgo(u.last_sign_in_at) : "–") },
      ],
      rows: users,
    });
    function apply() {
      const q = search.value.trim().toLowerCase();
      const rows = users.filter((u) => (!role.value || u.role === role.value) && (!vs.value || u.verification_status === vs.value) && (!q || (u.full_name || "").toLowerCase().includes(q) || (u.business_name || "").toLowerCase().includes(q) || (u.phone || "").includes(q)));
      count.textContent = rows.length + " of " + users.length + " users";
      table.setRows(rows);
    }
    [search, role, vs].forEach((el) => el.addEventListener("input", apply));
    count.textContent = users.length + " of " + users.length + " users";
    return h("div", { class: "card table-card" }, h("div", { class: "toolbar" }, h("div", { class: "input-wrap" }, ico("search", 16), search), role, vs, h("span", { class: "spacer" }), count, h("button", { class: "btn btn-sm", type: "button", onclick: () => table.csv("joblink-users.csv") }, ico("download", 14), "Export CSV")), table.el);
  }

  // ---- all jobs -------------------------------------------------------
  async function viewAllJobs() {
    let jobs = await fetchJobs({ limit: 300 });
    renderNav("alljobs");
    const search = h("input", { class: "input", placeholder: "Search title or employer…", "aria-label": "Search jobs" });
    const ap = h("select", { class: "select", "aria-label": "Review status" }, h("option", { value: "" }, "Any review status"), h("option", { value: "pending" }, "Waiting"), h("option", { value: "approved" }, "Approved"), h("option", { value: "rejected" }, "Rejected"));
    const st = h("select", { class: "select", "aria-label": "Open or closed" }, h("option", { value: "" }, "Open and closed"), h("option", { value: "active" }, "Open"), h("option", { value: "closed" }, "Closed"));
    const count = h("span", { class: "muted" });

    async function act(fn, okMsg) {
      try { await fn(); toast(okMsg, "ok"); jobs = await fetchJobs({ limit: 300 }); apply(); refreshBadges(); }
      catch (err) { toast(err.message, "error"); }
    }
    const APK = { approved: "ok", rejected: "bad", pending: "warn" };
    const APT = { approved: "Approved", rejected: "Rejected", pending: "Waiting" };
    const table = dataTable({
      pageSize: 25,
      emptyIcon: "briefcase",
      emptyTitle: "No jobs match",
      emptyText: "Try a different search or filter.",
      columns: [
        { label: "Job", sort: (j) => j.title.toLowerCase(), csv: (j) => j.title, render: (j) => h("div", {}, h("b", {}, j.title), h("div", { class: "muted" }, j.category + " · " + j.location)) },
        { label: "Employer", sort: (j) => employerName(j.employer).toLowerCase(), csv: (j) => employerName(j.employer), render: (j) => employerName(j.employer) },
        { label: "Review", sort: (j) => j.approval_status, csv: (j) => j.approval_status, render: (j) => pill(APT[j.approval_status] || j.approval_status, APK[j.approval_status]) },
        { label: "Status", sort: (j) => j.status, csv: (j) => j.status, render: (j) => pill(j.status === "active" ? "Open" : "Closed", j.status === "active" ? "ok" : "") },
        { label: "Pay", sort: (j) => Number(j.pay), csv: (j) => j.pay, render: (j) => money(j.pay) },
        { label: "Hired", csv: (j) => j.positions_filled + "/" + j.workers_needed, render: (j) => j.positions_filled + "/" + j.workers_needed },
        { label: "Posted", sort: (j) => j.created_at, csv: (j) => j.created_at, render: (j) => timeAgo(j.created_at) },
        {
          label: "Actions",
          render: (j) => {
            const acts = [];
            if (j.approval_status !== "approved") acts.push(h("button", { class: "btn btn-sm btn-success", type: "button", onclick: () => act(() => rpc("admin_review_job", { p_job: j.id, p_approve: true, p_reason: null }), "Approved") }, "Approve"));
            if (j.approval_status !== "rejected")
              acts.push(h("button", { class: "btn btn-sm btn-danger", type: "button", onclick: async () => { const r = await reasonModal({ title: "Reject this job ad", chips: JOB_REASONS }); if (r) act(() => rpc("admin_review_job", { p_job: j.id, p_approve: false, p_reason: r }), "Rejected"); } }, "Reject"));
            acts.push(h("button", { class: "btn btn-sm", type: "button", onclick: () => act(() => rpc("admin_set_job_status", { p_job: j.id, p_status: j.status === "active" ? "closed" : "active" }), j.status === "active" ? "Closed" : "Reopened") }, j.status === "active" ? "Close" : "Reopen"));
            return h("div", { style: "display:flex;gap:6px" }, acts);
          },
        },
      ],
      rows: jobs,
    });
    function apply() {
      const q = search.value.trim().toLowerCase();
      const rows = jobs.filter((j) => (!ap.value || j.approval_status === ap.value) && (!st.value || j.status === st.value) && (!q || j.title.toLowerCase().includes(q) || employerName(j.employer).toLowerCase().includes(q)));
      count.textContent = rows.length + " of " + jobs.length + " jobs";
      table.setRows(rows);
    }
    [search, ap, st].forEach((el) => el.addEventListener("input", apply));
    count.textContent = jobs.length + " of " + jobs.length + " jobs";
    return h("div", { class: "card table-card" }, h("div", { class: "toolbar" }, h("div", { class: "input-wrap" }, ico("search", 16), search), ap, st, h("span", { class: "spacer" }), count, h("button", { class: "btn btn-sm", type: "button", onclick: () => table.csv("joblink-jobs.csv") }, ico("download", 14), "Export CSV")), table.el);
  }

  // ---- audit log ------------------------------------------------------
  const ACTIONS = {
    job_approved: ["Approved a job ad", "ok"],
    job_rejected: ["Rejected a job ad", "bad"],
    job_closed: ["Closed a job", ""],
    job_reopened: ["Reopened a job", ""],
    account_verified: ["Verified an account", "info"],
    account_rejected: ["Rejected an account", "bad"],
  };

  async function viewAudit() {
    const { data, error } = await sb.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) throw new Error(error.message);
    renderNav("audit");
    const rowsAll = data || [];
    const filter = h("select", { class: "select", "aria-label": "Action" }, h("option", { value: "" }, "All actions"), ...Object.keys(ACTIONS).map((k) => h("option", { value: k }, ACTIONS[k][0])));
    const table = dataTable({
      pageSize: 25,
      emptyIcon: "audit",
      emptyTitle: "No admin actions yet",
      emptyText: "Approvals and rejections will be listed here.",
      columns: [
        { label: "When", sort: (a) => a.created_at, csv: (a) => a.created_at, render: (a) => fmtDateTime(a.created_at) },
        { label: "Admin", csv: (a) => a.admin_email, render: (a) => a.admin_email || "–" },
        { label: "Action", csv: (a) => a.action, render: (a) => { const x = ACTIONS[a.action]; return pill(x ? x[0] : a.action, x ? x[1] : ""); } },
        { label: "Target", csv: (a) => (a.target_type || "") + " " + (a.target_id || ""), render: (a) => (a.target_type || "") + " " + String(a.target_id || "").slice(0, 8) },
        { label: "Note", csv: (a) => a.note, render: (a) => a.note || "" },
      ],
      rows: rowsAll,
    });
    filter.addEventListener("input", () => table.setRows(rowsAll.filter((a) => !filter.value || a.action === filter.value)));
    return h("div", { class: "card table-card" }, h("div", { class: "toolbar" }, filter, h("span", { class: "spacer" }), h("button", { class: "btn btn-sm", type: "button", onclick: () => table.csv("joblink-audit-log.csv") }, ico("download", 14), "Export CSV")), table.el);
  }

  // ---- dashboard ------------------------------------------------------
  function kpi({ icon, label, value, sub, kind, href }) {
    return h(href ? "a" : "div", { class: "card kpi " + (kind || ""), href: href || null }, h("div", { class: "chip" }, ico(icon, 22)), h("div", {}, h("div", { class: "num" }, value), h("div", { class: "lbl" }, label), sub ? h("div", { class: "sub" }, sub) : null));
  }

  function lastDays(n) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      out.push({ key, label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), short: String(d.getDate()), workers: 0, employers: 0 });
    }
    return out;
  }

  async function viewDashboard() {
    const since = new Date();
    since.setDate(since.getDate() - 13);
    since.setHours(0, 0, 0, 0);
    const [stats, pendJobs, pendProfs, signups, cats, audit] = await Promise.all([
      rpc("admin_stats"),
      fetchJobs({ approval: "pending", limit: 5 }),
      sb.from("profiles").select("id, full_name, business_name, role, created_at").eq("verification_status", "pending").limit(5),
      sb.from("profiles").select("created_at, role").gte("created_at", since.toISOString()).limit(2000),
      sb.from("jobs").select("category").limit(2000),
      sb.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(6),
    ]);
    state.stats = stats;
    renderNav("dashboard");

    const days = lastDays(14);
    const byKey = Object.fromEntries(days.map((d) => [d.key, d]));
    (signups.data || []).forEach((p) => {
      const d = new Date(p.created_at);
      const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      if (byKey[key]) byKey[key][p.role === "employer" ? "employers" : "workers"] += 1;
    });
    const catCount = {};
    (cats.data || []).forEach((j) => (catCount[j.category] = (catCount[j.category] || 0) + 1));
    const catItems = Object.entries(catCount).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8);
    const verifiedPct = stats.total_users ? Math.round((stats.verified_users / stats.total_users) * 100) : 0;
    const hour = new Date().getHours();
    const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const who = ((state.user && state.user.email) || "admin").split("@")[0];

    const attention = (title, link, rows) =>
      h("div", { class: "card" }, h("div", { class: "card-head" }, h("h3", {}, title), h("a", { class: "more", href: link }, "Open queue →")), h("div", { class: "card-body" }, rows.length ? rows : h("p", { class: "muted" }, "Nothing waiting. All caught up! 🎉")));

    return h(
      "div",
      {},
      h("p", { class: "muted", style: "margin:-4px 0 16px" }, hello + ", " + who + ". Here is what needs your attention today."),
      h(
        "div",
        { class: "grid kpis" },
        kpi({ icon: "jobreview", label: "Job ads to review", value: stats.pending_jobs, kind: Number(stats.pending_jobs) > 0 ? "warn" : "ok", href: "#/jobs/pending" }),
        kpi({ icon: "shield", label: "Accounts to check", value: stats.pending_accounts, kind: Number(stats.pending_accounts) > 0 ? "warn" : "ok", href: "#/accounts/pending" }),
        kpi({ icon: "briefcase", label: "Live jobs", value: stats.live_jobs, sub: stats.total_jobs + " jobs in total", href: "#/alljobs" }),
        kpi({ icon: "users", label: "Users", value: stats.total_users, sub: stats.workers + " workers · " + stats.employers + " employers", href: "#/users" }),
        kpi({ icon: "badge", label: "Verified accounts", value: stats.verified_users, sub: verifiedPct + "% of all users", kind: "ok", href: "#/users" }),
        kpi({ icon: "trend", label: "Applications", value: stats.applications, sub: stats.hired + " workers hired" })
      ),
      h(
        "div",
        { class: "grid two" },
        attention(
          "Job ads waiting",
          "#/jobs/pending",
          pendJobs.map((j) => h("div", { class: "list-row" }, h("div", { class: "q-thumb" }, safeUrl(j.image_url) ? h("img", { src: safeUrl(j.image_url), alt: "", referrerpolicy: "no-referrer" }) : ico("image", 18)), h("div", { class: "grow" }, h("b", {}, j.title), h("small", { class: "muted" }, employerName(j.employer) + " · " + timeAgo(j.created_at))), h("a", { class: "btn btn-sm", href: "#/jobs/pending" }, "Review")))
        ),
        attention(
          "Accounts waiting",
          "#/accounts/pending",
          (pendProfs.data || []).map((p) => h("div", { class: "list-row" }, avatar(p.business_name || p.full_name, "sm"), h("div", { class: "grow" }, h("b", {}, p.business_name || p.full_name || "Unnamed"), h("small", { class: "muted" }, (p.role || "user") + " · joined " + timeAgo(p.created_at))), h("a", { class: "btn btn-sm", href: "#/accounts/pending" }, "Review")))
        )
      ),
      h(
        "div",
        { class: "grid two", style: "margin-top:16px" },
        h("div", { class: "card" }, h("div", { class: "card-head" }, h("h3", {}, "New sign-ups · last 14 days"), h("div", { class: "legend" }, h("span", {}, h("i", { style: "background:var(--brand)" }), "Workers"), h("span", {}, h("i", { style: "background:#f59e0b" }), "Employers"))), h("div", { class: "card-body" }, stackedBars(days))),
        h("div", { class: "card" }, h("div", { class: "card-head" }, h("h3", {}, "Jobs by category")), h("div", { class: "card-body" }, catItems.length ? hbars(catItems) : h("p", { class: "muted" }, "No jobs yet.")))
      ),
      h(
        "div",
        { class: "card", style: "margin-top:16px" },
        h("div", { class: "card-head" }, h("h3", {}, "Recent admin activity"), h("a", { class: "more", href: "#/audit" }, "View all →")),
        h("div", { class: "card-body" }, (audit.data || []).length ? (audit.data || []).map((a) => { const x = ACTIONS[a.action]; return h("div", { class: "list-row" }, pill(x ? x[0] : a.action, x ? x[1] : ""), h("div", { class: "grow" }, h("small", { class: "muted" }, (a.admin_email || "admin") + (a.note ? " · " + a.note : ""))), h("small", { class: "muted" }, timeAgo(a.created_at))); }) : h("p", { class: "muted" }, "No admin actions yet."))
      )
    );
  }

  // ---------------------------------------------------------------- router
  const ROUTES = {
    dashboard: { title: "Dashboard", crumb: "Overview", view: viewDashboard },
    jobs: { title: "Job ads", crumb: "Review", view: viewJobs },
    accounts: { title: "Account checks", crumb: "Review", view: viewAccounts },
    users: { title: "Users", crumb: "Manage", view: viewUsers },
    alljobs: { title: "All jobs", crumb: "Manage", view: viewAllJobs },
    audit: { title: "Audit log", crumb: "Manage", view: viewAudit },
  };

  function headActions() {
    return [
      h("button", { class: "btn btn-sm", type: "button", onclick: render }, ico("refresh", 15), "Refresh"),
      h("button", { class: "btn btn-sm btn-icon", type: "button", "aria-label": "Switch theme", onclick: () => { applyTheme(isDark() ? "light" : "dark"); $("#head-actions").replaceChildren(...headActions()); } }, ico(isDark() ? "sun" : "moon", 16)),
    ];
  }

  async function render() {
    const { route, sub } = parseHash();
    const def = ROUTES[route] || ROUTES.dashboard;
    const token = ++state.token;
    state.queue = null;
    closeDrawer();
    renderNav(ROUTES[route] ? route : "dashboard");
    $("#sidebar").classList.remove("open");
    $("#title").textContent = def.title;
    $("#crumb").textContent = "JobLink LK  /  " + def.crumb;
    $("#head-actions").replaceChildren(...headActions());
    const view = $("#view");
    view.replaceChildren(skeleton(4));
    try {
      const node = await def.view(sub);
      if (token === state.token) view.replaceChildren(node);
    } catch (err) {
      if (token === state.token) view.replaceChildren(h("div", { class: "card" }, empty("warning", "Something went wrong", err.message || String(err))));
    }
  }
  window.addEventListener("hashchange", () => !$("#app").hidden && render());

  // keyboard shortcuts for the review queues
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    if (!$("#overlay").hidden || !$("#drawer").hidden || $("#app").hidden) return;
    const q = state.queue;
    if (!q) return;
    if (e.key === "j" || e.key === "ArrowDown") { q.next(); e.preventDefault(); }
    else if (e.key === "k" || e.key === "ArrowUp") { q.prev(); e.preventDefault(); }
    else if (e.key === "a" && q.actions.approve) q.actions.approve();
    else if (e.key === "r" && q.actions.reject) q.actions.reject();
  });

  // ---------------------------------------------------------------- login / boot
  function show(which) {
    for (const id of ["setup", "login", "app"]) $("#" + id).hidden = id !== which;
  }
  function showLogin(message) {
    show("login");
    $("#login-error").textContent = message || "";
    setBusy(false);
  }
  function setBusy(busy) {
    const b = $("#login-btn");
    b.disabled = busy;
    b.replaceChildren(busy ? h("span", { class: "spinner" }) : "Sign in");
  }

  function decorateStaticUi() {
    $("#email-wrap").prepend(ico("mail", 16));
    $("#pw-wrap").prepend(ico("key", 16));
    const pw = $("#login-password");
    const toggle = h("button", { class: "pw-toggle", type: "button", onclick: () => { pw.type = pw.type === "password" ? "text" : "password"; toggle.textContent = pw.type === "password" ? "Show" : "Hide"; } }, "Show");
    $("#pw-wrap").append(toggle);
    $("#auth-points").replaceChildren(
      ...[["shield", "Verify identities with NIC and selfie checks"], ["jobreview", "Approve job ads before workers see them"], ["audit", "Every admin action is recorded"]].map(([i, t]) => h("li", {}, h("span", { class: "chip" }, ico(i, 18)), t))
    );
    $("#signout").replaceChildren(ico("logout", 15), "Sign out");
    $("#menu-btn").replaceChildren(ico("menu", 18));
    $("#menu-btn").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
  }

  // Accept sloppy input: quotes, spaces, a trailing "/" or a pasted path like "/rest/v1/"
  function cleanUrl(raw) {
    const v = String(raw || "").trim().replace(/^["']|["']$/g, "");
    try { return new URL(v).origin; } catch (e) { return v; }
  }
  const cleanKey = (raw) => String(raw || "").trim().replace(/^["']|["']$/g, "");

  async function enter(user) {
    let isAdmin = false;
    try { isAdmin = (await sb.rpc("is_admin")).data === true; } catch (e) { isAdmin = false; }
    if (!isAdmin) {
      await sb.auth.signOut();
      showLogin("This account is not an admin.");
      return;
    }
    state.user = user;
    const email = user.email || "";
    $("#me").replaceChildren(avatar(email, "sm"), h("div", { class: "who" }, h("b", {}, email), h("span", {}, "Administrator")));
    show("app");
    if (!location.hash) location.hash = "#/dashboard";
    await render();
    refreshBadges();
    clearInterval(state.poll);
    state.poll = setInterval(refreshBadges, 60000);
  }

  async function boot() {
    initTheme();
    decorateStaticUi();
    const url = cleanUrl(cfg.SUPABASE_URL);
    const key = cleanKey(cfg.SUPABASE_ANON_KEY);
    if (!url || !key || /YOUR-/.test(url + key)) { show("setup"); return; }
    sb = window.supabase.createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });

    $("#login-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      setBusy(true);
      $("#login-error").textContent = "";
      const { data, error } = await sb.auth.signInWithPassword({ email: $("#login-email").value.trim(), password: $("#login-password").value });
      if (error || !data.user) { showLogin(error ? error.message : "Could not sign in"); return; }
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
