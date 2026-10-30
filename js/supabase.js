/* Shade Hub Supabase client. Publishable key is safe in the browser. */
window.STF = window.STF || {};

STF.SUPABASE_URL = "https://egojdxwpfjfwihykhnik.supabase.co";
STF.SUPABASE_KEY = "sb_publishable_nDRveyTetGdTCIMCflxtjg_fLdGBYhh";

if (window.supabase && window.supabase.createClient) {
  STF.sb = window.supabase.createClient(STF.SUPABASE_URL, STF.SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
}

STF.safeHTML = function (html) {
  var raw = String(html || "");
  if (!window.DOMPurify) return "";
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: ["p", "br", "strong", "b", "em", "i", "u", "h2", "h3", "ul", "ol", "li", "a", "img", "blockquote"],
    ALLOWED_ATTR: ["href", "src", "alt", "target", "rel"],
    ALLOWED_URI_REGEXP: /^https?:\/\//i
  });
};

STF.plainText = function (html) {
  var node = document.createElement("div");
  node.innerHTML = STF.safeHTML(html);
  return (node.textContent || "").replace(/\s+/g, " ").trim();
};

STF.mediaPublicUrl = function (path) {
  return STF.SUPABASE_URL + "/storage/v1/object/public/media/" + String(path || "").replace(/^\/+/, "");
};

STF.profile = async function () {
  if (!STF.sb) return null;
  var sessionRes = await STF.sb.auth.getSession();
  var session = sessionRes.data && sessionRes.data.session;
  if (!session) return null;
  var res = await STF.sb.from("profiles").select("id, gamer_tag, is_member, is_admin").eq("id", session.user.id).maybeSingle();
  return { session: session, profile: res.data || null, error: res.error };
};

STF.openAccount = function () {
  var old = document.getElementById("signin-panel");
  if (old) {
    old.remove();
    return;
  }
  var el = document.createElement("div");
  el.id = "signin-panel";
  el.className = "signin-panel";
  el.innerHTML =
    '<div class="signin-card" role="dialog" aria-labelledby="signin-title">' +
    '<h2 id="signin-title">Account</h2>' +
    '<div class="acct-tabs">' +
    '<button type="button" data-acct="login" aria-selected="true">Log in</button>' +
    '<button type="button" data-acct="signup" aria-selected="false">Sign up</button>' +
    "</div>" +
    '<form id="acct-login">' +
    '<label>Email <input name="email" type="email" autocomplete="username" required></label>' +
    '<label>Password <input name="password" type="password" autocomplete="current-password" minlength="8" required></label>' +
    '<button class="admin-btn" type="submit">Log in</button>' +
    "</form>" +
    '<form id="acct-signup" hidden>' +
    '<label>Email <input name="email" type="email" autocomplete="username" required></label>' +
    '<label>Gamer tag <input name="gamer_tag" minlength="2" maxlength="24" required></label>' +
    '<label>Password <input name="password" type="password" autocomplete="new-password" minlength="8" required></label>' +
    '<button class="admin-btn" type="submit">Sign up</button>' +
    "</form>" +
    '<div id="acct-session" hidden></div>' +
    '<p id="acct-status" class="admin-status" role="status"></p>' +
    '<button type="button" class="admin-btn admin-btn-ghost" id="signin-close">Close</button>' +
    "</div>";
  document.body.appendChild(el);

  function status(msg, kind) {
    var node = el.querySelector("#acct-status");
    node.textContent = msg || "";
    node.className = "admin-status" + (kind ? " is-" + kind : "");
  }

  function showTab(name) {
    el.querySelector("#acct-login").hidden = name !== "login";
    el.querySelector("#acct-signup").hidden = name !== "signup";
    el.querySelectorAll(".acct-tabs button").forEach(function (btn) {
      btn.setAttribute("aria-selected", btn.getAttribute("data-acct") === name ? "true" : "false");
    });
  }

  el.querySelector(".acct-tabs").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-acct]");
    if (btn) showTab(btn.getAttribute("data-acct"));
  });
  el.querySelector("#signin-close").addEventListener("click", function () { el.remove(); });
  el.addEventListener("click", function (e) { if (e.target === el) el.remove(); });

  function paintSession(pack) {
    var box = el.querySelector("#acct-session");
    var logged = pack && pack.session;
    el.querySelector(".acct-tabs").hidden = !!logged;
    el.querySelector("#acct-login").hidden = !!logged;
    el.querySelector("#acct-signup").hidden = true;
    if (!logged) {
      box.hidden = true;
      showTab("login");
      return;
    }
    var tag = (pack.profile && pack.profile.gamer_tag) || "Agent";
    var flags = [];
    if (pack.profile && pack.profile.is_admin) flags.push("Admin");
    else if (pack.profile && pack.profile.is_member) flags.push("Member");
    else flags.push("Awaiting clan approval");
    box.hidden = false;
    box.innerHTML =
      "<p><strong>" + STF.esc(tag) + "</strong></p>" +
      "<p>" + STF.esc(flags.join(" · ")) + "</p>" +
      '<button type="button" class="admin-btn" id="acct-logout">Log out</button>';
    box.querySelector("#acct-logout").addEventListener("click", async function () {
      await STF.sb.auth.signOut();
      status("Logged out.", "ok");
      paintSession(null);
      if (typeof STF.onAuth === "function") STF.onAuth();
    });
  }

  el.querySelector("#acct-login").addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!STF.sb) return status("Supabase did not load.", "err");
    status("Signing in…");
    var form = e.target;
    var res = await STF.sb.auth.signInWithPassword({
      email: form.email.value.trim(),
      password: form.password.value
    });
    if (res.error) return status(res.error.message, "err");
    var pack = await STF.profile();
    status("Logged in.", "ok");
    paintSession(pack);
    if (typeof STF.onAuth === "function") STF.onAuth();
  });

  el.querySelector("#acct-signup").addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!STF.sb) return status("Supabase did not load.", "err");
    var form = e.target;
    var password = form.password.value;
    var tag = form.gamer_tag.value.trim();
    if (password.length < 8) return status("Password must be at least 8 characters.", "err");
    if (tag.length < 2) return status("Gamer tag must be at least 2 characters.", "err");
    status("Creating account…");
    var res = await STF.sb.auth.signUp({
      email: form.email.value.trim(),
      password: password,
      options: { data: { gamer_tag: tag } }
    });
    if (res.error) return status(res.error.message, "err");
    if (!res.data.session) {
      status("Check your email to confirm, then log in.", "ok");
      showTab("login");
      return;
    }
    var pack = await STF.profile();
    status("Account created.", "ok");
    paintSession(pack);
    if (typeof STF.onAuth === "function") STF.onAuth();
  });

  STF.profile().then(function (pack) {
    if (pack && pack.session) paintSession(pack);
  }).catch(function () {});
};
