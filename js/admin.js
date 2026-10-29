/* Events admin. Token stays in localStorage. Never written to the repo. */
(function () {
  STF.mountChrome("");
  mountAdminBack();
  var REPO = "Denomics83/SHD-Task-Force-Hub";
  var TOKEN_KEY = "stf_gh_token";
  var ZONE = "Australia/Melbourne";
  var statusEl = document.getElementById("admin-status");
  var loginBox = document.getElementById("login-box");
  var appBox = document.getElementById("app-box");
  var typeSelect = document.getElementById("type-select");
  var typeForm = document.getElementById("type-form");
  var eventForm = document.getElementById("event-form");
  var eventType = document.getElementById("event-type");
  var instanceList = document.getElementById("instance-list");
  var typesDoc = { types: [] };
  var eventsDoc = { events: [] };
  var seasonDoc = {};
  var manhuntDoc = { weeks: [] };
  var journeyDoc = { seasons: {} };
  var typesSha = "";
  var eventsSha = "";
  var seasonSha = "";
  var manhuntSha = "";
  var journeySha = "";
  var journeyShown = "";
  var journeyOpen = 0;

  function setStatus(msg, ok) {
    [document.getElementById("login-status"), statusEl].forEach(function (el) {
      if (!el) return;
      el.textContent = msg || "";
      el.hidden = !msg;
      el.className = "admin-status" + (ok ? " is-ok" : msg ? " is-err" : "");
    });
  }

  function mountAdminBack() {
    var top = document.querySelector(".topbar");
    var pill = document.querySelector(".hub-pill");
    if (pill) pill.hidden = true;
    if (!top || document.getElementById("admin-back")) return;
    var back = document.createElement("button");
    back.type = "button";
    back.id = "admin-back";
    back.className = "upd-header-back";
    back.setAttribute("aria-label", "Back");
    back.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    back.addEventListener("click", function () {
      var dest = "";
      try {
        if (document.referrer) {
          var url = new URL(document.referrer);
          if (url.origin === location.origin && url.pathname.indexOf("admin.html") === -1) dest = document.referrer;
        }
      } catch (err) {}
      location.href = dest || (location.hash === "#events" ? "resources.html" : "events.html");
    });
    top.appendChild(back);
  }

  function token() {
    return localStorage.getItem(TOKEN_KEY) || "";
  }

  function b64(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function unb64(b64text) {
    var bin = atob(String(b64text || "").replace(/\n/g, ""));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  async function gh(path, options) {
    var res = await fetch("https://api.github.com" + path, {
      method: (options && options.method) || "GET",
      headers: {
        Authorization: "Bearer " + token(),
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json"
      },
      body: options && options.body ? options.body : undefined
    });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(data.message || ("GitHub " + res.status));
    return data;
  }

  async function readFile(filePath) {
    var data = await gh("/repos/" + REPO + "/contents/" + filePath + "?ref=main");
    return { json: JSON.parse(unb64(data.content)), sha: data.sha };
  }

  async function writeFile(filePath, obj, sha, message) {
    var body = {
      message: message,
      content: b64(JSON.stringify(obj, null, 2) + "\n"),
      sha: sha,
      branch: "main"
    };
    return gh("/repos/" + REPO + "/contents/" + filePath, {
      method: "PUT",
      body: JSON.stringify(body)
    });
  }

  async function readRaw(filePath) {
    try {
      return await gh("/repos/" + REPO + "/contents/" + filePath + "?ref=main");
    } catch (err) {
      if (/not found/i.test(err.message)) return null;
      throw err;
    }
  }

  async function writeBinary(filePath, contentB64, sha, message) {
    var body = { message: message, content: contentB64, branch: "main" };
    if (sha) body.sha = sha;
    return gh("/repos/" + REPO + "/contents/" + filePath, {
      method: "PUT",
      body: JSON.stringify(body)
    });
  }

  async function deletePath(filePath, sha, message) {
    return gh("/repos/" + REPO + "/contents/" + filePath, {
      method: "DELETE",
      body: JSON.stringify({ message: message, sha: sha, branch: "main" })
    });
  }

  function melbourneToUtc(value) {
    var bits = String(value || "").split("T");
    var date = (bits[0] || "").split("-");
    var time = (bits[1] || "00:00").split(":");
    if (date.length < 3) return "";
    var y = +date[0], mo = +date[1], d = +date[2], h = +time[0] || 0, mi = +time[1] || 0;
    var fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: ZONE, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
    function asUTC(ms) {
      var map = {};
      fmt.formatToParts(new Date(ms)).forEach(function (p) { map[p.type] = p.value; });
      return Date.UTC(+map.year, +map.month - 1, +map.day, +map.hour, +map.minute, +map.second);
    }
    var target = Date.UTC(y, mo - 1, d, h, mi, 0);
    var guess = target;
    for (var i = 0; i < 3; i++) guess -= asUTC(guess) - target;
    return new Date(guess).toISOString();
  }

  function utcToMelbourneInput(iso) {
    var parts = {};
    new Intl.DateTimeFormat("en-CA", {
      timeZone: ZONE, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit"
    }).formatToParts(new Date(iso)).forEach(function (p) { parts[p.type] = p.value; });
    return parts.year + "-" + parts.month + "-" + parts.day + "T" + parts.hour + ":" + parts.minute;
  }

  function melbourneLabel(iso) {
    return new Intl.DateTimeFormat("en-AU", {
      timeZone: ZONE,
      day: "numeric", month: "short", year: "numeric",
      hour: "numeric", minute: "2-digit"
    }).format(new Date(iso));
  }

  function fillTypeForm(type) {
    var blank = {
      id: "", name: "", description: "", rewards: "add details", modifiers: "add details",
      tasks: "add details", accent: "#ff7f00", image: "", source: "Source · checked 29 Oct 2026", suggested: ""
    };
    var row = type || blank;
    ["id", "name", "description", "rewards", "modifiers", "tasks", "accent", "image", "source", "suggested"].forEach(function (key) {
      if (typeForm.elements[key]) typeForm.elements[key].value = row[key] == null ? "" : row[key];
    });
    var del = document.getElementById("type-delete");
    if (del) del.hidden = !type;
  }

  function renderTypeSelect() {
    var current = typeSelect.value;
    typeSelect.innerHTML = '<option value="">New type</option>' + typesDoc.types.map(function (t) {
      return '<option value="' + STF.esc(t.id) + '">' + STF.esc(t.name) + "</option>";
    }).join("");
    typeSelect.value = current && typesDoc.types.some(function (t) { return t.id === current; }) ? current : "";
    eventType.innerHTML = typesDoc.types.map(function (t) {
      return '<option value="' + STF.esc(t.id) + '">' + STF.esc(t.name) + "</option>";
    }).join("");
    renderMapTargets();
  }

  function renderInstances() {
    var byId = {};
    typesDoc.types.forEach(function (t) { byId[t.id] = t; });
    var rows = eventsDoc.events.slice().sort(function (a, b) { return a.start < b.start ? -1 : 1; });
    if (!rows.length) {
      instanceList.innerHTML = '<p class="lede">No scheduled events.</p>';
      return;
    }
    instanceList.innerHTML = rows.map(function (ev) {
      var type = byId[ev.typeId];
      return (
        '<article class="admin-instance">' +
        "<strong>" + STF.esc(type ? type.name : ev.typeId) + "</strong>" +
        "<p>" + STF.esc(melbourneLabel(ev.start)) + " – " + STF.esc(melbourneLabel(ev.end)) + " Melbourne</p>" +
        (ev.note ? "<p>" + STF.esc(ev.note) + "</p>" : "") +
        '<button type="button" class="admin-btn admin-btn-ghost" data-delete="' + STF.esc(ev.id) + '">Delete</button>' +
        "</article>"
      );
    }).join("");
    renderMapTargets();
  }

  async function loadDocs() {
    var files = await Promise.all([
      readFile("data/event-types.json"),
      readFile("data/events.json"),
      readFile("data/season.json"),
      readFile("data/manhunt.json"),
      readFile("data/journey.json")
    ]);
    typesDoc = files[0].json;
    typesSha = files[0].sha;
    eventsDoc = files[1].json;
    eventsSha = files[1].sha;
    seasonDoc = files[2].json;
    seasonSha = files[2].sha;
    manhuntDoc = files[3].json;
    manhuntSha = files[3].sha;
    journeyDoc = files[4].json;
    journeySha = files[4].sha;
    if (!typesDoc.types) typesDoc.types = [];
    if (!eventsDoc.events) eventsDoc.events = [];
    if (!manhuntDoc.weeks) manhuntDoc.weeks = [];
    if (!journeyDoc.seasons) journeyDoc.seasons = {};
    renderTypeSelect();
    fillTypeForm(null);
    renderInstances();
    document.getElementById("theme-input").value = seasonDoc.theme || "Add the season theme here";
    renderManhunt();
    renderJourney();
    focusEventsAdmin();
  }

  function focusEventsAdmin() {
    var on = (location.hash || "") === "#events";
    document.querySelectorAll("[data-admin-extra]").forEach(function (el) { el.hidden = on; });
  }

  function showApp(on) {
    loginBox.hidden = on;
    appBox.hidden = !on;
    document.body.classList.toggle("is-logged-out", !on);
  }

  async function login() {
    var value = document.getElementById("token-input").value.trim();
    if (!value) return;
    localStorage.setItem(TOKEN_KEY, value);
    document.getElementById("token-input").value = "";
    setStatus("");
    try {
      await loadDocs();
      showApp(true);
      setStatus("");
    } catch (err) {
      localStorage.removeItem(TOKEN_KEY);
      showApp(false);
      setStatus(err.message || "Login failed.");
    }
  }

  document.getElementById("login-btn").addEventListener("click", login);
  document.getElementById("logout-btn").addEventListener("click", function () {
    localStorage.removeItem(TOKEN_KEY);
    showApp(false);
    setStatus("");
  });

  typeSelect.addEventListener("change", function () {
    var found = typesDoc.types.filter(function (t) { return t.id === typeSelect.value; })[0];
    fillTypeForm(found || null);
  });

  typeForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    var fd = new FormData(typeForm);
    var next = {
      id: String(fd.get("id") || "").trim(),
      name: String(fd.get("name") || "").trim(),
      description: String(fd.get("description") || "").trim(),
      rewards: String(fd.get("rewards") || ""),
      modifiers: String(fd.get("modifiers") || ""),
      tasks: String(fd.get("tasks") || ""),
      accent: String(fd.get("accent") || "#ff7f00"),
      image: String(fd.get("image") || "").trim(),
      source: String(fd.get("source") || "").trim(),
      suggested: String(fd.get("suggested") || "")
    };
    if (!/^[a-z0-9-]+$/.test(next.id)) return setStatus("Id must be lowercase letters, numbers, and hyphens.");
    var previous = typeSelect.value;
    var idx = typesDoc.types.findIndex(function (t) { return t.id === previous; });
    if (!previous) {
      if (typesDoc.types.some(function (t) { return t.id === next.id; })) return setStatus("That id already exists.");
      typesDoc.types.push(next);
    } else if (idx >= 0) {
      if (next.id !== previous && typesDoc.types.some(function (t) { return t.id === next.id; })) {
        return setStatus("That id already exists.");
      }
      typesDoc.types[idx] = next;
      if (next.id !== previous) {
        eventsDoc.events.forEach(function (ev) {
          if (ev.typeId === previous) ev.typeId = next.id;
        });
      }
    }
    setStatus("Saving type…");
    try {
      var savedType = await writeFile("data/event-types.json", typesDoc, typesSha, "Update event type " + next.name);
      typesSha = savedType.content.sha;
      if (next.id !== previous && previous) {
        var savedEvents = await writeFile("data/events.json", eventsDoc, eventsSha, "Point events at renamed type " + next.id);
        eventsSha = savedEvents.content.sha;
      }
      typeSelect.value = next.id;
      renderTypeSelect();
      typeSelect.value = next.id;
      renderInstances();
      setStatus("Saved " + next.name + ". Live in about 1 minute.", true);
    } catch (err) {
      setStatus(err.message || "Save failed.");
    }
  });

  eventForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    var fd = new FormData(eventForm);
    var start = melbourneToUtc(fd.get("start"));
    var end = melbourneToUtc(fd.get("end"));
    if (!start || !end || start >= end) return setStatus("End must be after start.");
    var ev = {
      id: "evt-" + Date.now(),
      typeId: String(fd.get("typeId") || ""),
      start: start,
      end: end,
      note: String(fd.get("note") || "").trim()
    };
    eventsDoc.events.push(ev);
    setStatus("Saving event…");
    try {
      var saved = await writeFile("data/events.json", eventsDoc, eventsSha, "Schedule event " + ev.typeId);
      eventsSha = saved.content.sha;
      eventForm.reset();
      renderInstances();
      setStatus("Event scheduled. Live in about 1 minute.", true);
    } catch (err) {
      eventsDoc.events.pop();
      setStatus(err.message || "Save failed.");
    }
  });

  instanceList.addEventListener("click", async function (e) {
    var btn = e.target.closest("[data-delete]");
    if (!btn) return;
    var id = btn.getAttribute("data-delete");
    eventsDoc.events = eventsDoc.events.filter(function (ev) { return ev.id !== id; });
    setStatus("Deleting…");
    try {
      var saved = await writeFile("data/events.json", eventsDoc, eventsSha, "Remove scheduled event " + id);
      eventsSha = saved.content.sha;
      renderInstances();
      setStatus("Deleted. Live in about 1 minute.", true);
    } catch (err) {
      setStatus(err.message || "Delete failed. Reload and try again.");
      try { await loadDocs(); } catch (e2) {}
    }
  });

  function blankWeek(n) {
    return {
      week: n,
      scout: "Scout " + n,
      label: "",
      tasks: ["Task 1 — add task", "Task 2 — add task", "Task 3 — add task"]
    };
  }

  function collectManhunt() {
    if (!document.querySelector("[data-mh-week]")) return;
    manhuntDoc.season = document.getElementById("mh-season").value.trim();
    manhuntDoc.note = document.getElementById("mh-note").value;
    var weeks = [];
    document.querySelectorAll("[data-mh-week]").forEach(function (node) {
      var i = +node.getAttribute("data-mh-week");
      var prev = (manhuntDoc.weeks || [])[i] || {};
      var tasks = [0, 1, 2].map(function (t) {
        return node.querySelector('[data-mh-task="' + t + '"]').value;
      });
      var next = Object.assign({}, prev, {
        week: i + 1,
        scout: node.querySelector("[data-mh-scout]").value.trim() || ("Scout " + (i + 1)),
        tasks: tasks
      });
      var label = node.querySelector("[data-mh-label]").value.trim();
      if (label) next.label = label;
      else delete next.label;
      weeks[i] = next;
    });
    manhuntDoc.weeks = weeks.filter(Boolean);
    var title = document.getElementById("mh-climax-title").value.trim();
    var task = document.getElementById("mh-climax-task").value.trim();
    if (!title && !task) delete manhuntDoc.climax;
    else manhuntDoc.climax = Object.assign({}, manhuntDoc.climax || {}, { title: title, task: task });
  }

  function renderManhunt() {
    var weeks = manhuntDoc.weeks || [];
    document.getElementById("mh-season").value = manhuntDoc.season || "";
    document.getElementById("mh-note").value = manhuntDoc.note || "";
    document.getElementById("mh-count").value = String(weeks.length || 13);
    var climax = manhuntDoc.climax || {};
    document.getElementById("mh-climax-title").value = climax.title || "";
    document.getElementById("mh-climax-task").value = climax.task || "";
    document.getElementById("mh-weeks").innerHTML = weeks.map(function (week, i) {
      var tasks = (week.tasks || []).slice(0, 3);
      while (tasks.length < 3) tasks.push("");
      return (
        '<article class="admin-acc" data-mh-week="' + i + '">' +
        '<button type="button" class="admin-acc-btn" data-mh-toggle="' + i + '">Week ' + (i + 1) + " · " + STF.esc(week.scout || ("Scout " + (i + 1))) + "</button>" +
        '<div class="admin-acc-body" hidden>' +
        '<label>Label <input data-mh-label value="' + STF.esc(week.label || "") + '" placeholder="Optional"></label>' +
        '<label>Scout <input data-mh-scout value="' + STF.esc(week.scout || "") + '"></label>' +
        '<label>Task 1 <input data-mh-task="0" value="' + STF.esc(tasks[0]) + '"></label>' +
        '<label>Task 2 <input data-mh-task="1" value="' + STF.esc(tasks[1]) + '"></label>' +
        '<label>Task 3 <input data-mh-task="2" value="' + STF.esc(tasks[2]) + '"></label>' +
        "</div></article>"
      );
    }).join("");
  }

  function resizeManhunt(n) {
    if (document.querySelector("[data-mh-week]")) collectManhunt();
    n = Math.max(1, Math.min(20, n || 1));
    manhuntDoc.weeks = manhuntDoc.weeks || [];
    while (manhuntDoc.weeks.length < n) manhuntDoc.weeks.push(blankWeek(manhuntDoc.weeks.length + 1));
    if (manhuntDoc.weeks.length > n) manhuntDoc.weeks = manhuntDoc.weeks.slice(0, n);
    renderManhunt();
  }

  function blankMission(n) {
    var tasks = [];
    for (var t = 1; t <= 10; t++) tasks.push("Task " + t + " — add task");
    return { name: "Mission " + n + " — add name", unlocks: "", tasks: tasks };
  }

  function defaultMissions() {
    var list = [];
    for (var i = 1; i <= 7; i++) list.push(blankMission(i));
    return list;
  }

  function seasonKeys(doc) {
    var keys = Object.keys((doc && doc.seasons) || {});
    if (seasonDoc.id && keys.indexOf(seasonDoc.id) < 0) keys.unshift(seasonDoc.id);
    return keys;
  }

  function fillSeasonSelect(sel, keys, current) {
    sel.innerHTML = keys.map(function (key) {
      return '<option value="' + STF.esc(key) + '">' + STF.esc(key) + "</option>";
    }).join("");
    sel.value = current && keys.indexOf(current) >= 0 ? current : (keys[0] || "");
  }

  function collectJourneyInto(key) {
    if (!key || !document.querySelector("[data-j-mission]")) return;
    if (!journeyDoc.seasons[key]) journeyDoc.seasons[key] = { missions: [] };
    var missions = [];
    document.querySelectorAll("[data-j-mission]").forEach(function (node) {
      var i = +node.getAttribute("data-j-mission");
      var tasks = [];
      node.querySelectorAll("[data-j-task]").forEach(function (input) { tasks.push(input.value); });
      missions[i] = {
        name: node.querySelector("[data-j-name]").value,
        unlocks: node.querySelector("[data-j-unlocks]").value.trim(),
        tasks: tasks
      };
    });
    journeyDoc.seasons[key].missions = missions.filter(Boolean);
  }

  function renderJourney() {
    var sel = document.getElementById("journey-season");
    var keys = seasonKeys(journeyDoc);
    fillSeasonSelect(sel, keys, journeyShown || seasonDoc.id || "");
    journeyShown = sel.value;
    if (!journeyDoc.seasons[journeyShown]) journeyDoc.seasons[journeyShown] = { missions: defaultMissions() };
    var missions = journeyDoc.seasons[journeyShown].missions || [];
    document.getElementById("journey-missions").innerHTML = missions.map(function (mission, i) {
      var tasks = mission.tasks || [];
      return (
        '<article class="admin-acc" data-j-mission="' + i + '">' +
        '<button type="button" class="admin-acc-btn" data-j-toggle="' + i + '">' + STF.esc(mission.name || ("Mission " + (i + 1))) + "</button>" +
        '<div class="admin-acc-body"' + (i === journeyOpen ? "" : " hidden") + ">" +
        '<label>Name <input data-j-name value="' + STF.esc(mission.name || "") + '"></label>' +
        '<label>Unlocks <input data-j-unlocks value="' + STF.esc(mission.unlocks || "") + '" placeholder="Optional. Which global modifier this unlocks"></label>' +
        tasks.map(function (task, t) {
          return '<label>Task ' + (t + 1) + ' <input data-j-task value="' + STF.esc(task) + '"></label>';
        }).join("") +
        '<p class="admin-row">' +
        '<button type="button" class="admin-btn admin-btn-ghost" data-j-add-task="' + i + '">Add task</button>' +
        '<button type="button" class="admin-btn admin-btn-ghost" data-j-remove-task="' + i + '">Remove task</button>' +
        '<button type="button" class="admin-btn admin-btn-ghost" data-j-remove="' + i + '">Remove mission</button>' +
        "</p></div></article>"
      );
    }).join("");
  }

  function findMapHolder() {
    var sel = document.getElementById("map-target");
    if (!sel || !sel.value) return null;
    var cut = sel.value.indexOf(":");
    var kind = sel.value.slice(0, cut);
    var id = sel.value.slice(cut + 1);
    if (kind === "season" && seasonDoc && seasonDoc.id === id) {
      return { id: id, holder: seasonDoc, doc: seasonDoc, file: "data/season.json", sha: seasonSha, setSha: function (s) { seasonSha = s; } };
    }
    if (kind === "type") {
      var type = typesDoc.types.filter(function (row) { return row.id === id; })[0];
      if (!type) return null;
      return { id: id, holder: type, doc: typesDoc, file: "data/event-types.json", sha: typesSha, setSha: function (s) { typesSha = s; } };
    }
    if (kind === "event") {
      var ev = eventsDoc.events.filter(function (row) { return row.id === id; })[0];
      if (!ev) return null;
      return { id: id, holder: ev, doc: eventsDoc, file: "data/events.json", sha: eventsSha, setSha: function (s) { eventsSha = s; } };
    }
    return null;
  }

  function fillMapForm() {
    var ref = findMapHolder();
    var note = document.getElementById("map-current");
    var preview = document.getElementById("map-preview");
    if (!note || !preview) return;
    if (!ref) {
      note.textContent = "";
      preview.hidden = true;
      return;
    }
    document.getElementById("map-caption").value = ref.holder.mapCaption || "";
    if (ref.holder.mapImage) {
      note.textContent = "Current file: " + ref.holder.mapImage;
      preview.hidden = false;
      preview.src = ref.holder.mapImage;
    } else {
      note.textContent = "No map yet. The season page keeps the altar plot until you upload one.";
      preview.hidden = true;
      preview.removeAttribute("src");
    }
  }

  function renderMapTargets() {
    var sel = document.getElementById("map-target");
    if (!sel || !seasonDoc || !seasonDoc.id) return;
    var current = sel.value;
    var opts = ['<option value="season:' + STF.esc(seasonDoc.id) + '">Season · ' + STF.esc(seasonDoc.name || seasonDoc.id) + "</option>"];
    typesDoc.types.forEach(function (t) {
      opts.push('<option value="type:' + STF.esc(t.id) + '">Type · ' + STF.esc(t.name) + "</option>");
    });
    eventsDoc.events.forEach(function (ev) {
      var type = typesDoc.types.filter(function (t) { return t.id === ev.typeId; })[0];
      opts.push('<option value="event:' + STF.esc(ev.id) + '">Event · ' + STF.esc((type && type.name) || ev.typeId) + "</option>");
    });
    sel.innerHTML = opts.join("");
    var values = Array.prototype.map.call(sel.options, function (o) { return o.value; });
    sel.value = values.indexOf(current) >= 0 ? current : values[0];
    fillMapForm();
  }

  function resizeImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var max = 1600;
        var w = img.naturalWidth || img.width;
        var h = img.naturalHeight || img.height;
        if (w > max) {
          h = Math.round(h * (max / w));
          w = max;
        }
        var canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        var mime = file.type === "image/png" ? "image/png" : file.type === "image/webp" ? "image/webp" : "image/jpeg";
        var ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
        canvas.toBlob(function (blob) {
          URL.revokeObjectURL(url);
          if (!blob) return reject(new Error("Could not compress that image."));
          var reader = new FileReader();
          reader.onload = function () { resolve({ b64: String(reader.result).split(",")[1], ext: ext }); };
          reader.onerror = function () { reject(new Error("Could not read that image.")); };
          reader.readAsDataURL(blob);
        }, mime, 0.82);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read that image."));
      };
      img.src = url;
    });
  }

  document.getElementById("type-delete").addEventListener("click", async function () {
    var id = typeSelect.value;
    if (!id) return;
    var used = eventsDoc.events.filter(function (ev) { return ev.typeId === id; });
    var found = typesDoc.types.filter(function (t) { return t.id === id; })[0];
    var name = (found && found.name) || id;
    var msg = used.length
      ? used.length + " scheduled event" + (used.length === 1 ? " uses" : "s use") + " " + name + ". Delete this type anyway? Those events stay on the calendar, but they will no longer match a type."
      : "Delete " + name + "?";
    if (!confirm(msg)) return;
    var previous = typesDoc.types.slice();
    typesDoc.types = typesDoc.types.filter(function (t) { return t.id !== id; });
    setStatus("Deleting type…");
    try {
      var saved = await writeFile("data/event-types.json", typesDoc, typesSha, "Delete event type " + name);
      typesSha = saved.content.sha;
      typeSelect.value = "";
      renderTypeSelect();
      fillTypeForm(null);
      renderInstances();
      setStatus("Deleted " + name + ". The schedule dropdown is updated.", true);
    } catch (err) {
      typesDoc.types = previous;
      setStatus(err.message || "Delete failed.");
    }
  });

  document.getElementById("theme-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    seasonDoc.theme = document.getElementById("theme-input").value.trim() || "Add the season theme here";
    setStatus("Saving theme…");
    try {
      var saved = await writeFile("data/season.json", seasonDoc, seasonSha, "Update season theme");
      seasonSha = saved.content.sha;
      setStatus("Season theme saved. Live in about 1 minute.", true);
    } catch (err) {
      setStatus(err.message || "Save failed.");
    }
  });

  document.getElementById("mh-count").addEventListener("change", function () {
    resizeManhunt(+document.getElementById("mh-count").value);
  });

  document.getElementById("mh-weeks").addEventListener("click", function (e) {
    var toggle = e.target.closest("[data-mh-toggle]");
    if (!toggle) return;
    var body = toggle.parentElement.querySelector(".admin-acc-body");
    var open = body.hidden;
    document.querySelectorAll("#mh-weeks .admin-acc-body").forEach(function (el) { el.hidden = true; });
    body.hidden = !open;
  });

  document.getElementById("manhunt-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    resizeManhunt(+document.getElementById("mh-count").value);
    collectManhunt();
    setStatus("Saving manhunt…");
    try {
      var saved = await writeFile("data/manhunt.json", manhuntDoc, manhuntSha, "Update manhunt");
      manhuntSha = saved.content.sha;
      setStatus("Manhunt saved. Live in about 1 minute.", true);
    } catch (err) {
      setStatus(err.message || "Save failed.");
    }
  });

  document.getElementById("journey-season").addEventListener("change", function () {
    var next = document.getElementById("journey-season").value;
    collectJourneyInto(journeyShown);
    journeyShown = next;
    journeyOpen = 0;
    if (!journeyDoc.seasons[next]) journeyDoc.seasons[next] = { missions: defaultMissions() };
    renderJourney();
  });

  document.getElementById("journey-missions").addEventListener("click", function (e) {
    var toggle = e.target.closest("[data-j-toggle]");
    if (toggle) {
      var body = toggle.parentElement.querySelector(".admin-acc-body");
      var open = body.hidden;
      document.querySelectorAll("#journey-missions .admin-acc-body").forEach(function (el) { el.hidden = true; });
      body.hidden = !open;
      return;
    }
    var addTask = e.target.closest("[data-j-add-task]");
    var removeTask = e.target.closest("[data-j-remove-task]");
    var removeMission = e.target.closest("[data-j-remove]");
    if (!addTask && !removeTask && !removeMission) return;
    collectJourneyInto(journeyShown);
    var missions = journeyDoc.seasons[journeyShown].missions;
    if (addTask) {
      var ai = +addTask.getAttribute("data-j-add-task");
      var tasks = missions[ai].tasks;
      tasks.push("Task " + (tasks.length + 1) + " — add task");
      journeyOpen = ai;
    } else if (removeTask) {
      var ri = +removeTask.getAttribute("data-j-remove-task");
      if (missions[ri].tasks.length) missions[ri].tasks.pop();
      journeyOpen = ri;
    } else if (removeMission) {
      var mi = +removeMission.getAttribute("data-j-remove");
      if (!confirm("Remove this mission?")) return;
      missions.splice(mi, 1);
      journeyOpen = 0;
    }
    renderJourney();
  });

  document.getElementById("journey-add").addEventListener("click", function () {
    collectJourneyInto(journeyShown);
    var missions = journeyDoc.seasons[journeyShown].missions;
    missions.push(blankMission(missions.length + 1));
    journeyOpen = missions.length - 1;
    renderJourney();
  });

  document.getElementById("journey-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    collectJourneyInto(journeyShown);
    setStatus("Saving journey…");
    try {
      var saved = await writeFile("data/journey.json", journeyDoc, journeySha, "Update journey " + journeyShown);
      journeySha = saved.content.sha;
      setStatus("Journey saved. Live in about 1 minute.", true);
    } catch (err) {
      setStatus(err.message || "Save failed.");
    }
  });

  window.addEventListener("hashchange", focusEventsAdmin);
  focusEventsAdmin();

  document.getElementById("map-target").addEventListener("change", fillMapForm);

  document.getElementById("map-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    var ref = findMapHolder();
    if (!ref) return setStatus("Choose a season or event.");
    if (!/^[A-Za-z0-9._-]+$/.test(ref.id)) return setStatus("That id cannot be used as a file name.");
    var fileInput = document.getElementById("map-file");
    var file = fileInput.files[0];
    var caption = document.getElementById("map-caption").value.trim();
    if (!file && !ref.holder.mapImage) return setStatus("Choose an image first.");
    setStatus(file ? "Resizing and saving map…" : "Saving caption…");
    try {
      if (file) {
        var packed = await resizeImage(file);
        var path = "assets/maps/" + ref.id + "." + packed.ext;
        var existing = await readRaw(path);
        await writeBinary(path, packed.b64, existing && existing.sha, "Update map image " + ref.id);
        if (ref.holder.mapImage && ref.holder.mapImage !== path) {
          var old = await readRaw(ref.holder.mapImage);
          if (old && old.sha) await deletePath(ref.holder.mapImage, old.sha, "Replace map image " + ref.id);
        }
        ref.holder.mapImage = path;
      }
      if (caption) ref.holder.mapCaption = caption;
      else delete ref.holder.mapCaption;
      var saved = await writeFile(ref.file, ref.doc, ref.sha, "Update map for " + ref.id);
      ref.setSha(saved.content.sha);
      fileInput.value = "";
      fillMapForm();
      setStatus("Map saved. Live in about 1 minute.", true);
    } catch (err) {
      setStatus(err.message || "Map save failed.");
    }
  });

  document.getElementById("map-remove").addEventListener("click", async function () {
    var ref = findMapHolder();
    if (!ref || !ref.holder.mapImage) return setStatus("No map to remove.");
    if (!confirm("Remove this map?")) return;
    setStatus("Removing map…");
    try {
      var old = await readRaw(ref.holder.mapImage);
      if (old && old.sha) await deletePath(ref.holder.mapImage, old.sha, "Remove map image " + ref.id);
      delete ref.holder.mapImage;
      delete ref.holder.mapCaption;
      var saved = await writeFile(ref.file, ref.doc, ref.sha, "Remove map for " + ref.id);
      ref.setSha(saved.content.sha);
      fillMapForm();
      setStatus("Map removed. Live in about 1 minute.", true);
    } catch (err) {
      setStatus(err.message || "Could not remove the map.");
    }
  });

  if (token()) {
    loadDocs().then(function () {
      showApp(true);
      setStatus("");
    }).catch(function (err) {
      localStorage.removeItem(TOKEN_KEY);
      showApp(false);
      setStatus(err.message || "Saved token was rejected.");
    });
  }
})();
