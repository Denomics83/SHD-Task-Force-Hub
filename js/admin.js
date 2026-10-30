/* Desktop admin. Email login, admin-only writes through Supabase RLS. */
(function () {
  var sb = STF.sb;
  var quills = {};
  var editingBuild = null;
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
    window.scrollTo(0, 0);
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function toLocal(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  function fromLocal(value) {
    if (!value) return null;
    var d = new Date(value);
    return isNaN(d.getTime()) ? null : d.toISOString();
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
  function previewFile(input, img, hidden) {
    input.addEventListener("change", async function () {
      if (!input.files[0]) return;
      try {
        var url = await uploadImage(input.files[0], input.id.indexOf("template") === 0 ? "templates" : "events");
        hidden.value = url;
        img.src = url;
        img.hidden = false;
      } catch (err) {
        status(input.id.indexOf("template") === 0 ? "template-status" : "event-status", err.message || String(err), "err");
      }
    });
  }

  function rowButtons(kind, id) {
    return '<span class="desk-row-actions"><button type="button" data-edit="' + kind + '" data-id="' + id + '">Edit</button><button type="button" data-del="' + kind + '" data-id="' + id + '">Delete</button></span>';
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
    var res = await sb.from("event_templates").select("id, name, title, description_html, image_url, duration_hours").order("name");
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
    $("event-image-url").value = row.image_url || "";
    var img = $("event-image-preview");
    img.hidden = !row.image_url;
    if (row.image_url) img.src = row.image_url;
    if ($("event-start").value && row.duration_hours) {
      var start = new Date($("event-start").value);
      $("event-end").value = toLocal(new Date(start.getTime() + row.duration_hours * 3600000).toISOString());
    }
  }
  function toggleEventKind() {
    var kind = $("event-kind").value;
    $("event-rotation").hidden = kind !== "rotation";
    $("event-end").required = kind !== "clan";
    $("event-end-label").hidden = false;
  }
  function resetEvent() {
    $("event-form").reset();
    $("event-id").value = "";
    $("event-heading").textContent = "Add event";
    $("event-image-url").value = "";
    $("event-image-preview").hidden = true;
    setQuill("event-body", "");
    toggleEventKind();
  }
  async function saveEvent() {
    var kind = $("event-kind").value;
    var payload = {
      kind: kind,
      template_id: kind === "rotation" ? ($("event-template").value || null) : null,
      title: $("event-title").value.trim(),
      description_html: quillHTML("event-body"),
      image_url: $("event-image-url").value || null,
      starts_at: fromLocal($("event-start").value),
      ends_at: fromLocal($("event-end").value)
    };
    if (!payload.title || !payload.starts_at) throw new Error("Title and start are required.");
    if (kind !== "clan" && !payload.ends_at) throw new Error("End time is required.");
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
    $("template-image-url").value = "";
    $("template-image-preview").hidden = true;
    setQuill("template-body", "");
  }
  async function saveTemplate() {
    var payload = {
      name: $("template-name").value.trim(),
      title: $("template-title").value.trim(),
      description_html: quillHTML("template-body"),
      duration_hours: Number($("template-hours").value),
      image_url: $("template-image-url").value || null
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
    await BuildAdmin.mount($("build-board"), record);
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
      published: $("build-published").checked
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
      setQuill("event-body", eventRow.description_html || "");
      $("event-start").value = toLocal(eventRow.starts_at);
      $("event-end").value = toLocal(eventRow.ends_at);
      $("event-image-url").value = eventRow.image_url || "";
      $("event-image-preview").hidden = !eventRow.image_url;
      if (eventRow.image_url) $("event-image-preview").src = eventRow.image_url;
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
      $("template-image-url").value = found.image_url || "";
      $("template-image-preview").hidden = !found.image_url;
      if (found.image_url) $("template-image-preview").src = found.image_url;
      setQuill("template-body", found.description_html || "");
      return;
    }
    if (kind === "build") {
      var buildRes = await sb.from("builds").select("*").eq("id", id).single();
      if (buildRes.error) return status("dash-status", buildRes.error.message, "err");
      editingBuild = buildRes.data;
      show("build");
    }
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
  $("event-kind").addEventListener("change", toggleEventKind);
  $("event-template").addEventListener("change", applyTemplate);
  $("event-start").addEventListener("change", function () {
    if ($("event-kind").value === "rotation") applyTemplate();
  });
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
  previewFile($("event-image"), $("event-image-preview"), $("event-image-url"));
  previewFile($("template-image"), $("template-image-preview"), $("template-image-url"));

  boot();
})();
