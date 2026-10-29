/* Clan chat preview. Messages are { sender, body, created_at }.
   Send stays in memory. A later Supabase Realtime channel can replace `messages`
   and call render() on insert. */
(function () {
  STF.mountChrome("chat");
  var log = document.getElementById("chat-log");
  var form = document.getElementById("chat-form");
  if (!log || !form) return;

  var ME = "You";
  var messages = [
    { sender: "Shade", body: "Reset is 08:00 UTC. Check targeted loot after you log in.", created_at: "2026-10-29T07:12:00.000Z" },
    { sender: "Rook", body: "Who is on for Dark Hours Sunday?", created_at: "2026-10-29T09:40:00.000Z" },
    { sender: "You", body: "I can tank the first boss.", created_at: "2026-10-29T09:44:00.000Z" },
    { sender: "Ivy", body: "Bring a reviver. Do not stand in the fire.", created_at: "2026-10-29T09:51:00.000Z" }
  ];

  function clock(iso) {
    return new Intl.DateTimeFormat("en-AU", {
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date(iso));
  }

  function render() {
    log.innerHTML = messages.map(function (msg) {
      var mine = msg.sender === ME;
      return (
        '<article class="chat-msg' + (mine ? " is-mine" : "") + '">' +
        '<header><strong>' + STF.esc(msg.sender) + "</strong><time>" + STF.esc(clock(msg.created_at)) + "</time></header>" +
        "<p>" + STF.esc(msg.body) + "</p></article>"
      );
    }).join("");
    log.scrollTop = log.scrollHeight;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var input = form.elements.body;
    var body = String(input.value || "").trim();
    if (!body) return;
    messages.push({ sender: ME, body: body, created_at: new Date().toISOString() });
    input.value = "";
    render();
  });

  render();
})();
