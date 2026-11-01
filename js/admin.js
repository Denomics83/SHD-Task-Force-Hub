/* Desktop admin. Email login, admin-only writes through Supabase RLS. */
(function () {
  var sb = STF.sb;
  var quills = {};
  var editingBuild = null;
  var editingBuilder = null;
  var buildReady = false;

  function $(id) { return document.getElementById(id); }
  function status(id, msg, kind) {
    var node = $(id);
    if (!node) return;
    node.textContent = msg || "";
    node.className = "admin-status" + (kind ? " is-" + kind : "");
  }
  function show(name) {
    document.querySelectorAll("[data-view]").forEach(function (el) {
      el.hidden = el.getAttribute("data-view") !== name;
    });
    if (name === "dash") loadDash();
    if (name === "update") ensureQuill("update-body");
    if (name === "event") {
      ensureQuill("event-body", true);
      loadTemplateSelect();
    }
    if (name === "templates") {
      ensureQuill("template-body");
      loadTemplates();
    }
    if (name === "build") openBuild(editingBuild);
    if (name === "builder") openBuilder(editingBuilder);
    window.scrollTo(0, 0);
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function toLocal(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  function parseLocal(value) {
    var text = String(value || "").trim();
    if (!text) return null;
    var match = text.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!match) return null;
    var d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }
  function fromLocal(value) {
    var d = parseLocal(value);
    return d ? d.toISOString() : null;
  }
  function setTimeError(msg) {
    var node = $("event-time-error");
    if (!node) return;
    node.hidden = !msg;
    node.textContent = msg || "";
  }
  function eventTimeError() {
    var endText = String($("event-end").value || "").trim();
    if (!endText) return "";
    var end = parseLocal(endText);
    if (!end) return "End time must be after the start";
    var start = parseLocal($("event-start").value);
    if (start && end.getTime() < start.getTime()) return "End time must be after the start";
    return "";
  }
  function stamp(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleString();
  }

  function ensureQuill(id, images) {
    if (quills[id]) return quills[id];
    var quill = new Quill("#" + id, {
      theme: "snow",
      modules: {
        toolbar: images
          ? [["bold", "italic"], [{ header: [2, 3, false] }], [{ list: "ordered" }, { list: "bullet" }], ["link", "image"], ["clean"]]
          : [["bold", "italic"], [{ header: [2, 3, false] }], [{ list: "ordered" }, { list: "bullet" }], ["link"], ["clean"]]
      }
    });
    if (images) {
      quill.getModule("toolbar").addHandler("image", function () {
        pickImage(function (url) {
          var range = quill.getSelection(true);
          quill.insertEmbed(range ? range.index : 0, "image", url);
        });
      });
    }
    quills[id] = quill;
    return quill;
  }
  function quillHTML(id) {
    var quill = quills[id];
    if (!quill) return "";
    var text = quill.getText().replace(/\u200b/g, "").trim();
    if (!text && !quill.root.querySelector("img")) return "";
    return quill.root.innerHTML;
  }
  function setQuill(id, html) {
    var quill = ensureQuill(id, id === "event-body");
    quill.setContents([]);
    if (html) quill.clipboard.dangerouslyPasteHTML(html);
  }

  async function uploadImage(file, folder) {
    if (!file) return "";
    if (file.size > 5 * 1024 * 1024) throw new Error("Image must be 5MB or smaller.");
    var ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    var path = folder + "/" + (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())) + "." + ext;
    var res = await sb.storage.from("media").upload(path, file, { contentType: file.type, upsert: false });
    if (res.error) throw res.error;
    return sb.storage.from("media").getPublicUrl(path).data.publicUrl;
  }
  function pickImage(done) {
    var input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp,image/gif,image/avif";
    input.addEventListener("change", async function () {
      if (!input.files[0]) return;
      try {
        done(await uploadImage(input.files[0], "inline"));
      } catch (err) {
        status("event-status", err.message || String(err), "err");
      }
    });
    input.click();
  }
  function artHostFor(hidden) {
    if (!hidden) return null;
    if (hidden.id === "event-image-url") return $("event-art-pick");
    if (hidden.id === "template-image-url") return $("template-art-pick");
    return null;
  }
  function markArt(hidden) {
    var host = artHostFor(hidden);
    if (!host) return;
    var value = hidden.value || "";
    host.querySelectorAll("[data-art]").forEach(function (el) {
      el.classList.toggle("is-on", el.getAttribute("data-art") === value);
    });
  }
  function setCardImage(hidden, img, file, auto) {
    hidden.value = file || "";
    hidden.dataset.auto = auto ? "1" : "";
    if (img) {
      img.hidden = !file;
      if (file) img.src = file;
    }
    markArt(hidden);
    if (hidden.id === "event-image-url") suggestClanActivity();
  }
  function mountArtPickers() {
    if (!STF.EVENT_CARDS) return;
    ["event-art-pick", "template-art-pick"].forEach(function (id) {
      var host = $(id);
      if (!host || host.dataset.ready) return;
      host.dataset.ready = "1";
      host.innerHTML = STF.EVENT_CARDS.map(function (card) {
        var caption = card.caption || card.label;
        return '<button type="button" class="art-thumb" data-art="' + STF.esc(card.file) + '" title="' + STF.esc(caption) + '"><img src="' + STF.esc(card.file) + '" alt="' + STF.esc(caption) + '"><span>' + STF.esc(caption) + "</span></button>";
      }).join("");
      host.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-art]");
        if (!btn || !host.contains(btn)) return;
        var isEvent = host.id === "event-art-pick";
        setCardImage(
          $(isEvent ? "event-image-url" : "template-image-url"),
          $(isEvent ? "event-image-preview" : "template-image-preview"),
          btn.getAttribute("data-art"),
          false
        );
      });
    });
  }
  function suggestClanActivity() {
    var select = $("event-activity");
    if (!select || !$("event-kind") || $("event-kind").value !== "clan" || !STF.clanActivity) return;
    if (select.dataset.manual === "1") return;
    var found = STF.clanActivity($("event-title").value, $("event-image-url").value);
    select.value = found.type || "";
  }
  function suggestClanArt() {
    if (!$("event-kind") || $("event-kind").value !== "clan" || !STF.eventCardPath) return;
    var hidden = $("event-image-url");
    if (hidden.dataset.auto !== "1" && hidden.value) return;
    var found = STF.clanActivity ? STF.clanActivity($("event-title").value, "") : { type: "" };
    var gate = STF.clanGateArt ? STF.clanGateArt(found.type) : "";
    var path = gate || STF.eventCardPath($("event-title").value);
    var img = $("event-image-preview");
    if (!path) {
      if (hidden.dataset.auto === "1") setCardImage(hidden, img, "", false);
      return;
    }
    setCardImage(hidden, img, path, true);
    suggestClanActivity();
  }
  function setMapPreview(urlInput, img, url) {
    urlInput.value = url || "";
    if (!img) return;
    img.hidden = !url;
    if (url) img.src = url;
  }
  function bindMapFields(prefix) {
    var file = $(prefix + "-map-file");
    var url = $(prefix + "-map-url");
    var img = $(prefix + "-map-preview");
    if (file) {
      file.addEventListener("change", async function () {
        if (!file.files[0]) return;
        try {
          var uploaded = await uploadImage(file.files[0], "maps");
          setMapPreview(url, img, uploaded);
        } catch (err) {
          status(prefix + "-status", err.message || String(err), "err");
        }
      });
    }
    if (url) {
      url.addEventListener("input", function () {
        setMapPreview(url, img, url.value.trim());
      });
    }
  }
  function previewFile(input, img, hidden) {
    input.addEventListener("change", async function () {
      if (!input.files[0]) return;
      try {
        var url = await uploadImage(input.files[0], input.id.indexOf("template") === 0 ? "templates" : "events");
        setCardImage(hidden, img, url, false);
      } catch (err) {
        status(input.id.indexOf("template") === 0 ? "template-status" : "event-status", err.message || String(err), "err");
      }
    });
  }

  function rowButtons(kind, id) {
    var builder = kind === "build" ? '<button type="button" data-edit="builder" data-id="' + id + '">Builder</button>' : "";
    return '<span class="desk-row-actions"><button type="button" data-edit="' + kind + '" data-id="' + id + '">Edit</button>' + builder + '<button type="button" data-del="' + kind + '" data-id="' + id + '">Delete</button></span>';
  }

  async function loadDash() {
    status("dash-status", "Loading…");
    var updates = await sb.from("updates").select("id, type, title, published_at").order("published_at", { ascending: false });
    var events = await sb.from("events").select("id, kind, title, starts_at").order("starts_at", { ascending: false });
    var builds = await sb.from("builds").select("id, name, category, published").order("created_at", { ascending: false });
    $("list-updates").innerHTML = (updates.data || []).map(function (row) {
      return '<article class="desk-row"><strong>' + STF.esc(row.title) + '</strong><small>' + STF.esc(row.type) + " · " + STF.esc(stamp(row.published_at)) + "</small>" + rowButtons("update", row.id) + "</article>";
    }).join("") || '<p class="lede">No updates yet.</p>';
    $("list-events").innerHTML = (events.data || []).map(function (row) {
      return '<article class="desk-row"><strong>' + STF.esc(row.title) + '</strong><small>' + STF.esc(row.kind) + " · " + STF.esc(stamp(row.starts_at)) + "</small>" + rowButtons("event", row.id) + "</article>";
    }).join("") || '<p class="lede">No events yet.</p>';
    $("list-builds").innerHTML = (builds.data || []).map(function (row) {
      return '<article class="desk-row"><strong>' + STF.esc(row.name) + '</strong><small>' + STF.esc(row.category) + (row.published ? "" : " · hidden") + "</small>" + rowButtons("build", row.id) + "</article>";
    }).join("") || '<p class="lede">No builds yet.</p>';
    var err = (updates.error && updates.error.message) || (events.error && events.error.message) || (builds.error && builds.error.message);
    status("dash-status", err || "", err ? "err" : "");
  }

  function resetUpdate() {
    $("update-form").reset();
    $("update-id").value = "";
    $("update-heading").textContent = "Add update";
    $("update-published").value = "Stamped when you publish";
    setQuill("update-body", "");
    setQuill("update-patch", "");
    togglePatch();
  }
  function togglePatch() {
    var patch = $("update-type").value === "patch";
    $("update-patch-wrap").hidden = !patch;
    if (patch) ensureQuill("update-patch");
  }
  function updatePayload() {
    return {
      type: $("update-type").value,
      title: $("update-title").value.trim(),
      body_html: quillHTML("update-body"),
      patch_notes_html: $("update-type").value === "patch" ? quillHTML("update-patch") : "",
      scheduled_at: fromLocal($("update-when").value)
    };
  }
  async function saveUpdate() {
    var payload = updatePayload();
    if (!payload.title || !payload.scheduled_at) throw new Error("Title and schedule are required.");
    var id = $("update-id").value;
    var res = id
      ? await sb.from("updates").update(payload).eq("id", id).select("id").single()
      : await sb.from("updates").insert(payload).select("id, published_at").single();
    if (res.error) throw res.error;
    if (!id && res.data) {
      $("update-id").value = res.data.id;
      $("update-published").value = stamp(res.data.published_at);
    }
    return res.data;
  }

  async function loadTemplateSelect() {
    var res = await sb.from("event_templates").select("id, name, title, description_html, image_url, duration_hours, map_image, map_caption").order("name");
    var select = $("event-template");
    var current = select.value;
    select.innerHTML = '<option value="">Choose a template</option>' + (res.data || []).map(function (row) {
      return '<option value="' + row.id + '">' + STF.esc(row.name) + "</option>";
    }).join("");
    if (current) select.value = current;
    select._rows = res.data || [];
  }
  function applyTemplate() {
    var id = $("event-template").value;
    var row = ($("event-template")._rows || []).filter(function (item) { return item.id === id; })[0];
    if (!row) return;
    $("event-title").value = row.title || "";
    setQuill("event-body", row.description_html || "");
    setCardImage($("event-image-url"), $("event-image-preview"), row.image_url || "", false);
    if (!$("event-map-url").value.trim()) {
      setMapPreview($("event-map-url"), $("event-map-preview"), row.map_image || "");
      $("event-map-caption").value = row.map_caption || "";
    }
    fillRotationEnd();
  }
  function templateDurationMs() {
    var id = $("event-template").value;
    var row = ($("event-template")._rows || []).filter(function (item) { return item.id === id; })[0];
    var hours = row ? Number(row.duration_hours) : 0;
    if (!hours || hours <= 0) return 0;
    return hours * 3600000;
  }
  function fillRotationEnd() {
    if ($("event-kind").value !== "rotation") return;
    var start = parseLocal($("event-start").value);
    var ms = templateDurationMs();
    if (!start || !ms) return;
    $("event-end").value = toLocal(new Date(start.getTime() + ms).toISOString());
  }
  function onEventTimeChanged() {
    if ($("event-kind").value === "rotation") fillRotationEnd();
    setTimeError(eventTimeError());
  }
  function toggleEventKind() {
    var kind = $("event-kind").value;
    $("event-rotation").hidden = kind !== "rotation";
    $("event-activity-label").hidden = kind !== "clan";
    $("event-end").required = kind !== "clan";
    $("event-end-label").hidden = false;
    if (kind === "rotation") fillRotationEnd();
    setTimeError(eventTimeError());
  }
  function resetEvent() {
    $("event-form").reset();
    $("event-id").value = "";
    $("event-heading").textContent = "Add event";
    setCardImage($("event-image-url"), $("event-image-preview"), "", false);
    setMapPreview($("event-map-url"), $("event-map-preview"), "");
    $("event-map-caption").value = "";
    $("event-activity").dataset.manual = "";
    setQuill("event-body", "");
    $("event-start").value = "";
    $("event-end").value = "";
    setTimeError("");
    toggleEventKind();
  }
  async function saveEvent() {
    if ($("event-kind").value === "rotation") fillRotationEnd();
    var timeError = eventTimeError();
    if (timeError) {
      setTimeError(timeError);
      throw new Error(timeError);
    }
    setTimeError("");
    var kind = $("event-kind").value;
    var endText = String($("event-end").value || "").trim();
    var endsAt = endText ? fromLocal(endText) : null;
    if (kind === "clan" && !endText) endsAt = null;
    var payload = {
      kind: kind,
      template_id: kind === "rotation" ? ($("event-template").value || null) : null,
      title: $("event-title").value.trim(),
      description_html: quillHTML("event-body"),
      image_url: $("event-image-url").value || null,
      map_image: $("event-map-url").value.trim() || null,
      map_caption: $("event-map-caption").value.trim() || null,
      activity_type: kind === "clan" ? ($("event-activity").value || null) : null,
      starts_at: fromLocal($("event-start").value),
      ends_at: endsAt
    };
    if (!payload.title || !payload.starts_at) throw new Error("Title and start are required.");
    if (kind !== "clan" && !payload.ends_at) throw new Error("End time is required.");
    if (payload.ends_at && payload.ends_at < payload.starts_at) throw new Error("End time must be after the start");
    if (kind === "rotation" && !payload.map_image) {
      var template = ($("event-template")._rows || []).filter(function (item) { return item.id === payload.template_id; })[0];
      if (template) {
        payload.map_image = template.map_image || null;
        if (!payload.map_caption) payload.map_caption = template.map_caption || null;
      }
    }
    var id = $("event-id").value;
    var res = id
      ? await sb.from("events").update(payload).eq("id", id).select("id").single()
      : await sb.from("events").insert(payload).select("id").single();
    if (res.error) throw res.error;
    if (!id && res.data) $("event-id").value = res.data.id;
  }

  async function loadTemplates() {
    var res = await sb.from("event_templates").select("*").order("name");
    $("template-list").innerHTML = (res.data || []).map(function (row) {
      return '<article class="desk-row"><strong>' + STF.esc(row.name) + '</strong><small>' + STF.esc(row.title) + " · " + STF.esc(String(row.duration_hours || "")) + "h</small>" + rowButtons("template", row.id) + "</article>";
    }).join("") || '<p class="lede">No templates yet. Five to ten rotation templates is the expected set.</p>';
    $("template-list")._rows = res.data || [];
  }
  function resetTemplate() {
    $("template-id").value = "";
    $("template-name").value = "";
    $("template-title").value = "";
    $("template-hours").value = "168";
    setCardImage($("template-image-url"), $("template-image-preview"), "", false);
    setMapPreview($("template-map-url"), $("template-map-preview"), "");
    $("template-map-caption").value = "";
    setQuill("template-body", "");
  }
  async function saveTemplate() {
    var payload = {
      name: $("template-name").value.trim(),
      title: $("template-title").value.trim(),
      description_html: quillHTML("template-body"),
      duration_hours: Number($("template-hours").value),
      image_url: $("template-image-url").value || null,
      map_image: $("template-map-url").value.trim() || null,
      map_caption: $("template-map-caption").value.trim() || null
    };
    if (!payload.name || !payload.title) throw new Error("Name and title are required.");
    var id = $("template-id").value;
    var res = id
      ? await sb.from("event_templates").update(payload).eq("id", id).select("id").single()
      : await sb.from("event_templates").insert(payload).select("id").single();
    if (res.error) throw res.error;
    if (!id && res.data) $("template-id").value = res.data.id;
    await loadTemplates();
  }

  async function fillPlaystyles() {
    var doc = await STF.fetchJSON("data/td2/playstyles.json");
    var list = Array.isArray(doc) ? doc : (doc.items || []);
    $("build-playstyle").innerHTML = list.map(function (name) {
      return '<option value="' + STF.esc(name) + '">' + STF.esc(name) + "</option>";
    }).join("");
  }
  async function openBuild(record) {
    if (!buildReady) {
      await fillPlaystyles();
      buildReady = true;
    }
    editingBuild = record;
    $("build-heading").textContent = record ? "Edit build" : "Add build";
    $("build-id").value = record ? record.id : "";
    $("build-name").value = record ? record.name : "";
    $("build-category").value = record ? record.category : "solo";
    if (record && record.playstyle) $("build-playstyle").value = record.playstyle;
    $("build-short").value = record ? (record.short_description || "") : "";
    $("build-short-count").textContent = ($("build-short").value.length) + " / 140";
    $("build-published").checked = record ? !!record.published : true;
    setQuill("build-notes", record ? record.notes_html || "" : "");
    $("build-source-url").value = record && record.source_url ? record.source_url : "";
    $("build-source-id").value = record && record.source_id ? record.source_id : "";
    $("build-import-url").value = record && record.source_url ? record.source_url : "";
    $("build-resync").hidden = !(record && record.source_url);
    $("build-form")._sourceRaw = record && record.source_raw ? record.source_raw : null;
    await BuildAdmin.mount($("build-board"), record);
  }
  async function importBuildStation(url) {
    var link = (url || "").trim();
    if (!link) throw new Error("Paste a Build Station link.");
    var res = await sb.functions.invoke("buildstation-import", { body: { url: link } });
    if (res.error) throw new Error(res.error.message || "Import failed.");
    var data = res.data || {};
    if (data.error) throw new Error(data.error);
    if (!data.normalized) throw new Error("Build Station did not return a build.");
    if (!$("build-name").value.trim() && data.name) $("build-name").value = data.name;
    $("build-source-url").value = data.source_url || link;
    $("build-source-id").value = data.source_id || "";
    $("build-import-url").value = data.source_url || link;
    $("build-form")._sourceRaw = data.raw || null;
    $("build-resync").hidden = false;
    var misses = BuildAdmin.applyImport(data.normalized);
    if (misses.length) {
      throw new Error("Imported, with catalog gaps: " + misses.join(", "));
    }
  }
  async function saveBuild() {
    var short = $("build-short").value.trim();
    if (short.length > 140) throw new Error("Short description is over 140 characters.");
    var payload = {
      category: $("build-category").value,
      playstyle: $("build-playstyle").value,
      name: $("build-name").value.trim(),
      short_description: short,
      notes_html: quillHTML("build-notes"),
      loadout: BuildAdmin.read(),
      published: $("build-published").checked,
      source_url: $("build-source-url").value.trim() || null,
      source_id: $("build-source-id").value.trim() || null,
      source_raw: $("build-form")._sourceRaw || null
    };
    if (!payload.name) throw new Error("Name is required.");
    var id = $("build-id").value;
    var res = id
      ? await sb.from("builds").update(payload).eq("id", id).select("id").single()
      : await sb.from("builds").insert(payload).select("id").single();
    if (res.error) throw res.error;
    if (!id && res.data) $("build-id").value = res.data.id;
  }

  async function edit(kind, id) {
    if (kind === "update") {
      var res = await sb.from("updates").select("*").eq("id", id).single();
      if (res.error) return status("dash-status", res.error.message, "err");
      show("update");
      var row = res.data;
      $("update-id").value = row.id;
      $("update-heading").textContent = "Edit update";
      $("update-type").value = row.type;
      $("update-title").value = row.title || "";
      $("update-when").value = toLocal(row.scheduled_at);
      $("update-published").value = stamp(row.published_at);
      togglePatch();
      setQuill("update-body", row.body_html || "");
      if (row.type === "patch") setQuill("update-patch", row.patch_notes_html || "");
      return;
    }
    if (kind === "event") {
      var eventRes = await sb.from("events").select("*").eq("id", id).single();
      if (eventRes.error) return status("dash-status", eventRes.error.message, "err");
      show("event");
      var eventRow = eventRes.data;
      $("event-id").value = eventRow.id;
      $("event-heading").textContent = "Edit event";
      $("event-kind").value = eventRow.kind;
      toggleEventKind();
      await loadTemplateSelect();
      if (eventRow.template_id) $("event-template").value = eventRow.template_id;
      $("event-title").value = eventRow.title || "";
      $("event-activity").value = eventRow.activity_type || "";
      $("event-activity").dataset.manual = eventRow.activity_type ? "1" : "";
      setQuill("event-body", eventRow.description_html || "");
      $("event-start").value = toLocal(eventRow.starts_at);
      $("event-end").value = toLocal(eventRow.ends_at);
      setCardImage($("event-image-url"), $("event-image-preview"), eventRow.image_url || "", false);
      setMapPreview($("event-map-url"), $("event-map-preview"), eventRow.map_image || "");
      $("event-map-caption").value = eventRow.map_caption || "";
      return;
    }
    if (kind === "template") {
      var rows = $("template-list")._rows || [];
      var found = rows.filter(function (row) { return row.id === id; })[0];
      if (!found) return;
      show("templates");
      $("template-id").value = found.id;
      $("template-name").value = found.name || "";
      $("template-title").value = found.title || "";
      $("template-hours").value = found.duration_hours || 168;
      setCardImage($("template-image-url"), $("template-image-preview"), found.image_url || "", false);
      setMapPreview($("template-map-url"), $("template-map-preview"), found.map_image || "");
      $("template-map-caption").value = found.map_caption || "";
      setQuill("template-body", found.description_html || "");
      return;
    }
    if (kind === "build" || kind === "builder") {
      var buildRes = await sb.from("builds").select("*").eq("id", id).single();
      if (buildRes.error) return status("dash-status", buildRes.error.message, "err");
      if (kind === "builder") {
        editingBuilder = buildRes.data;
        show("builder");
        return;
      }
      editingBuild = buildRes.data;
      show("build");
    }
  }

  function openBuilder(record) {
    editingBuilder = record;
    if (!window.ShadeBuilder || !$("builder-root")) return;
    ShadeBuilder.mount($("builder-root"), { record: record, onSave: saveBuilder });
  }

  async function saveBuilder(body) {
    var payload = {
      category: body.category,
      playstyle: body.playstyle,
      name: body.name,
      short_description: body.short_description,
      notes_html: body.notes_html,
      loadout: body.loadout,
      published: body.published
    };
    if (!payload.name) throw new Error("Name is required.");
    var res = body.id
      ? await sb.from("builds").update(payload).eq("id", body.id).select("id").single()
      : await sb.from("builds").insert(payload).select("id").single();
    if (res.error) throw res.error;
    return res.data && res.data.id;
  }

  async function remove(kind, id) {
    if (!window.confirm("Delete this " + kind + "?")) return;
    var table = { update: "updates", event: "events", build: "builds", template: "event_templates" }[kind];
    var res = await sb.from(table).delete().eq("id", id);
    if (res.error) {
      status(kind === "template" ? "template-status" : "dash-status", res.error.message, "err");
      return;
    }
    if (kind === "template") loadTemplates();
    else loadDash();
  }

  function openPreview() {
    var payload = updatePayload();
    $("preview-body").innerHTML =
      '<article class="upd-entry"><div><h2>' + STF.esc(payload.title || "Untitled") + "</h2>" +
      '<p class="upd-desc">' + STF.esc(STF.plainText(payload.body_html)) + "</p>" +
      '<time class="upd-stamp">' + STF.esc(stamp(payload.scheduled_at)) + "</time></div></article>" +
      '<div class="rich-html">' + STF.safeHTML(payload.body_html) + "</div>" +
      (payload.patch_notes_html ? '<h2 class="upd-h is-accent">Patch notes</h2><div class="rich-html">' + STF.safeHTML(payload.patch_notes_html) + "</div>" : "");
    $("preview-modal").hidden = false;
  }

  async function boot() {
    if (!sb) {
      status("admin-login-status", "Supabase did not load.", "err");
      return;
    }
    var pack = await STF.profile();
    if (!pack || !pack.session) {
      show("login");
      return;
    }
    if (!pack.profile || !pack.profile.is_admin) {
      await sb.auth.signOut();
      show("login");
      status("admin-login-status", "Not authorised", "err");
      return;
    }
    document.body.classList.remove("is-logged-out");
    $("desk-logout").hidden = false;
    show("dash");
  }

  document.addEventListener("click", function (e) {
    var go = e.target.closest("[data-go]");
    if (go) {
      if (go.getAttribute("data-go") === "update") resetUpdate();
      if (go.getAttribute("data-go") === "event") resetEvent();
      if (go.getAttribute("data-go") === "build") editingBuild = null;
      if (go.getAttribute("data-go") === "builder") editingBuilder = null;
      show(go.getAttribute("data-go"));
      return;
    }
    var editBtn = e.target.closest("[data-edit]");
    if (editBtn) edit(editBtn.getAttribute("data-edit"), editBtn.getAttribute("data-id"));
    var delBtn = e.target.closest("[data-del]");
    if (delBtn) remove(delBtn.getAttribute("data-del"), delBtn.getAttribute("data-id"));
  });

  $("admin-login").addEventListener("submit", async function (e) {
    e.preventDefault();
    status("admin-login-status", "Signing in…");
    var res = await sb.auth.signInWithPassword({
      email: e.target.email.value.trim(),
      password: e.target.password.value
    });
    if (res.error) return status("admin-login-status", res.error.message, "err");
    var pack = await STF.profile();
    if (!pack || !pack.profile || !pack.profile.is_admin) {
      await sb.auth.signOut();
      return status("admin-login-status", "Not authorised", "err");
    }
    status("admin-login-status", "");
    document.body.classList.remove("is-logged-out");
    $("desk-logout").hidden = false;
    show("dash");
  });
  $("desk-logout").addEventListener("click", async function () {
    await sb.auth.signOut();
    document.body.classList.add("is-logged-out");
    $("desk-logout").hidden = true;
    show("login");
  });
  $("update-type").addEventListener("change", togglePatch);
  $("update-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    try {
      status("update-status", "Publishing…");
      await saveUpdate();
      status("update-status", "Published.", "ok");
    } catch (err) {
      status("update-status", err.message || String(err), "err");
    }
  });
  $("update-preview").addEventListener("click", openPreview);
  $("preview-close").addEventListener("click", function () { $("preview-modal").hidden = true; });
  $("preview-publish").addEventListener("click", async function () {
    try {
      await saveUpdate();
      $("preview-modal").hidden = true;
      status("update-status", "Published.", "ok");
    } catch (err) {
      status("update-status", err.message || String(err), "err");
      $("preview-modal").hidden = true;
    }
  });
  $("event-kind").addEventListener("change", function () {
    toggleEventKind();
    var hidden = $("event-image-url");
    if ($("event-kind").value !== "clan" && hidden && hidden.dataset.auto === "1") {
      setCardImage(hidden, $("event-image-preview"), "", false);
    }
    suggestClanArt();
  });
  $("event-title").addEventListener("input", function () {
    suggestClanArt();
    suggestClanActivity();
  });
  $("event-activity").addEventListener("change", function () {
    $("event-activity").dataset.manual = "1";
  });
  $("event-template").addEventListener("change", applyTemplate);
  $("event-start").addEventListener("change", onEventTimeChanged);
  $("event-start").addEventListener("input", onEventTimeChanged);
  $("event-end").addEventListener("change", function () { setTimeError(eventTimeError()); });
  $("event-end").addEventListener("input", function () { setTimeError(eventTimeError()); });
  $("event-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    try {
      status("event-status", "Saving…");
      await saveEvent();
      status("event-status", "Saved.", "ok");
    } catch (err) {
      status("event-status", err.message || String(err), "err");
    }
  });
  $("template-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    try {
      status("template-status", "Saving…");
      await saveTemplate();
      status("template-status", "Saved.", "ok");
    } catch (err) {
      status("template-status", err.message || String(err), "err");
    }
  });
  $("template-new").addEventListener("click", resetTemplate);
  $("build-short").addEventListener("input", function () {
    $("build-short-count").textContent = $("build-short").value.length + " / 140";
  });
  $("build-import").addEventListener("click", async function () {
    try {
      status("build-import-status", "Importing…");
      await importBuildStation($("build-import-url").value);
      status("build-import-status", "Imported onto our catalog. Review the slots, then save.", "ok");
    } catch (err) {
      status("build-import-status", err.message || String(err), "err");
    }
  });
  $("build-resync").addEventListener("click", async function () {
    try {
      status("build-import-status", "Re-syncing…");
      await importBuildStation($("build-source-url").value || $("build-import-url").value);
      status("build-import-status", "Re-synced onto our catalog. Save to keep it.", "ok");
    } catch (err) {
      status("build-import-status", err.message || String(err), "err");
    }
  });
  $("build-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    try {
      status("build-status", "Saving…");
      await saveBuild();
      status("build-status", "Saved.", "ok");
    } catch (err) {
      status("build-status", err.message || String(err), "err");
    }
  });
  mountArtPickers();
  previewFile($("event-image"), $("event-image-preview"), $("event-image-url"));
  bindMapFields("event");
  bindMapFields("template");
  previewFile($("template-image"), $("template-image-preview"), $("template-image-url"));

  boot();
})();
