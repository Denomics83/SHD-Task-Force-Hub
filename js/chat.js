/* Clan chat. Realtime stays connected only while this page is open. */
(function () {
  STF.mountChrome("chat");
  var log = document.getElementById("chat-log");
  var form = document.getElementById("chat-form");
  var note = document.querySelector(".chat-note");
  if (!log || !form) return;

  var me = null;
  var messages = [];
  var channel = null;

  function clock(iso) {
    return new Intl.DateTimeFormat("en-AU", { hour: "numeric", minute: "2-digit" }).format(new Date(iso));
  }

  function render() {
    log.innerHTML = messages.map(function (msg) {
      var mine = me && msg.sender_id === me;
      var name = msg.gamer_tag || "Agent";
      return (
        '<article class="chat-msg' + (mine ? " is-mine" : "") + '">' +
        '<header><strong>' + STF.esc(name) + "</strong><time>" + STF.esc(clock(msg.created_at)) + "</time></header>" +
        "<p>" + STF.esc(msg.body) + "</p></article>"
      );
    }).join("");
    log.scrollTop = log.scrollHeight;
  }

  function lock(message) {
    if (note) note.textContent = message;
    form.hidden = true;
    log.innerHTML = '<p class="lede">' + STF.esc(message) + "</p>";
  }

  function tagFrom(row) {
    if (row.profiles && row.profiles.gamer_tag) return row.profiles.gamer_tag;
    if (row.gamer_tag) return row.gamer_tag;
    return "Agent";
  }

  async function start() {
    if (!STF.sb) return lock("Chat is unavailable.");
    var pack = await STF.profile();
    if (!pack || !pack.session) return lock("Sign in to use clan chat.");
    if (!pack.profile || !pack.profile.is_member) return lock("Awaiting clan approval.");
    me = pack.session.user.id;
    if (note) note.textContent = "Clan chat";
    form.hidden = false;
    var res = await STF.sb.from("messages").select("id, sender_id, body, created_at, profiles(gamer_tag)").order("created_at", { ascending: true });
    if (res.error) return lock(res.error.message);
    messages = (res.data || []).map(function (row) {
      row.gamer_tag = tagFrom(row);
      return row;
    });
    render();
    channel = STF.sb.channel("clan-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async function (payload) {
        var row = payload.new;
        if (messages.some(function (item) { return String(item.id) === String(row.id); })) return;
        var who = await STF.sb.from("profiles").select("gamer_tag").eq("id", row.sender_id).maybeSingle();
        row.gamer_tag = (who.data && who.data.gamer_tag) || "Agent";
        messages.push(row);
        render();
      })
      .subscribe();
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var input = form.elements.body;
    var body = String(input.value || "").trim();
    if (!body || !me) return;
    input.value = "";
    var res = await STF.sb.from("messages").insert({ body: body }).select("id, sender_id, body, created_at").single();
    if (res.error) {
      if (note) note.textContent = res.error.message;
      return;
    }
    if (!messages.some(function (item) { return String(item.id) === String(res.data.id); })) {
      var pack = await STF.profile();
      res.data.gamer_tag = (pack.profile && pack.profile.gamer_tag) || "You";
      messages.push(res.data);
      render();
    }
  });

  function disconnect() {
    if (channel && STF.sb) STF.sb.removeChannel(channel);
    channel = null;
  }
  window.addEventListener("pagehide", disconnect);
  STF.onAuth = function () { location.reload(); };
  start();
})();
