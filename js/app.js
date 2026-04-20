/* CoupleGoals - main controller */
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const gate = $('#profile-gate');
  const header = $('.app-header');
  const main = $('#main');
  const tabbar = $('.tabbar');
  const toast = $('#toast');
  const modal = $('#modal');
  const sheet = $('#modal-sheet');

  let currentView = 'dashboard';
  let calMonthOffset = 0;

  function init() {
    if (DB.state.currentUser) {
      enterApp();
    } else {
      gate.hidden = false;
    }
    bindProfileGate();
    bindTabs();
    bindHeader();
    bindModal();
    bindMainDelegation();
  }

  function bindMainDelegation() {
    main.addEventListener('click', async (e) => {
      const nav = e.target.closest('[data-cal-nav]');
      if (nav) { calMonthOffset += parseInt(nav.dataset.calNav); renderView('calendar'); return; }
      const cell = e.target.closest('[data-day]');
      if (cell) { openDayDetail(cell.dataset.day); return; }
      const meal = e.target.closest('[data-meal-id]');
      if (meal) { openMealActions(meal.dataset.mealId); return; }
      const wk = e.target.closest('[data-workout-id]');
      if (wk) { openWorkoutActions(wk.dataset.workoutId); return; }
      const wg = e.target.closest('[data-weight-id]');
      if (wg) { openWeightEdit(wg.dataset.weightId); return; }
      const ph = e.target.closest('[data-photo]');
      if (ph && ph.dataset.photo) { openPhotoViewer(ph.dataset.photo, ph.dataset.progressId); return; }
      const act = e.target.closest('[data-action]');
      if (act) {
        if (act.dataset.action === 'log-weight') openWeightSheet(act.dataset.user);
        else if (act.dataset.action === 'log-photo') openPhotoSheet(act.dataset.user);
        return;
      }
      if (e.target.closest('#add-meal-btn')) openMealSheet();
      if (e.target.closest('#add-workout-btn')) openWorkoutSheet();
      if (e.target.closest('#recipe-btn')) openRecipeSheet();
      if (e.target.closest('#library-btn')) openLibrary();
      if (e.target.closest('#hf-scan-btn')) openHFScan();
    });
  }

  function bindProfileGate() {
    $$('.profile-btn').forEach(btn => btn.addEventListener('click', () => {
      DB.setUser(btn.dataset.user);
      enterApp();
    }));
    $('#couple-view-btn').addEventListener('click', () => {
      DB.setUser('couple');
      enterApp();
    });
  }

  function enterApp() {
    gate.hidden = true;
    header.hidden = false;
    main.hidden = false;
    tabbar.hidden = false;
    updateHeader();
    renderView(currentView);
    Notifications.ensurePermission().then(() => Notifications.checkReminders());
  }

  function updateHeader() {
    const id = DB.state.currentUser;
    const avatar = $('#header-avatar');
    avatar.className = 'avatar-mini ' + id;
    if (id === 'couple') {
      avatar.textContent = '♥';
      $('#header-name').textContent = 'Edouard & Elsa';
      $('#header-sub').textContent = 'Vue couple';
    } else {
      const u = DB.state.users[id];
      avatar.textContent = u.name[0];
      $('#header-name').textContent = u.name;
      $('#header-sub').textContent = `Objectif -${u.targetFatLossGramsPerWeek} g gras/sem · ${DB.dailyTarget(u)} kcal/j`;
    }
  }

  function bindHeader() {
    $('#switch-user-btn').addEventListener('click', () => {
      DB.setUser(null);
      gate.hidden = false;
      header.hidden = true;
      main.hidden = true;
      tabbar.hidden = true;
    });
    $('#settings-btn').addEventListener('click', () => {
      currentView = 'settings';
      renderView('settings');
      $$('.tab').forEach(t => t.classList.remove('active'));
    });
  }

  function bindTabs() {
    $$('.tab').forEach(t => t.addEventListener('click', () => {
      const v = t.dataset.view;
      if (t.dataset.action === 'quick-add') {
        openMealSheet();
        return;
      }
      $$('.tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      currentView = v;
      renderView(v);
    }));
  }

  function bindModal() {
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('[data-close]')) closeModal();
    });
  }
  function openModal(html) {
    sheet.innerHTML = html;
    modal.hidden = false;
  }
  function closeModal() { modal.hidden = true; sheet.innerHTML = ''; }

  function renderView(name) {
    const views = $$('.view');
    views.forEach(v => v.hidden = v.dataset.view !== name);
    const host = views.find(v => v.dataset.view === name);
    const uid = DB.state.currentUser;
    if (name === 'dashboard') host.innerHTML = Views.renderDashboard(uid);
    else if (name === 'calendar') host.innerHTML = Views.renderCalendar(uid, calMonthOffset);
    else if (name === 'meals') host.innerHTML = Views.renderMeals(uid);
    else if (name === 'weight') host.innerHTML = Views.renderWeight(uid);
    else if (name === 'workouts') host.innerHTML = Views.renderWorkouts(uid);
    else if (name === 'settings') host.innerHTML = Views.renderSettings();
    bindViewActions(host);
    resolvePhotoThumbs(host);
    updateHeader();
  }

  function bindViewActions(host) {
    // Settings form bindings
    if (currentView === 'settings') {
      host.querySelectorAll('input[data-profile]').forEach(inp => inp.addEventListener('change', () => {
        const id = inp.dataset.profile, field = inp.dataset.field;
        const v = parseFloat(inp.value);
        if (!isNaN(v)) DB.updateUserProfile(id, { [field]: v });
        renderView('settings');
      }));
      const hf = host.querySelector('#hf-count');
      if (hf) hf.addEventListener('change', () => { DB.setSetting('helloFreshPerWeek', parseInt(hf.value) || 0); showToast('Enregistré'); });
      const key = host.querySelector('#ai-key');
      if (key) key.addEventListener('change', () => { DB.setSetting('aiApiKey', key.value.trim()); showToast('Clé enregistrée'); });
      const notif = host.querySelector('#notif-toggle');
      if (notif) notif.addEventListener('change', () => { DB.setSetting('notifications', notif.checked); });
      const perm = host.querySelector('#notif-perm');
      if (perm) perm.addEventListener('click', async () => {
        const r = await Notifications.ensurePermission();
        showToast(r === 'granted' ? 'Notifications activées' : 'Permission refusée');
      });
      const exp = host.querySelector('#export-data');
      if (exp) exp.addEventListener('click', exportJSON);
      const weekly = host.querySelector('#export-weekly');
      if (weekly) weekly.addEventListener('click', exportWeeklyReport);
      const reset = host.querySelector('#reset-data');
      if (reset) reset.addEventListener('click', () => {
        if (confirm('Tout effacer définitivement ?')) {
          localStorage.removeItem('couplegoals.v1');
          indexedDB.deleteDatabase('couplegoals');
          location.reload();
        }
      });
    }
  }

  async function resolvePhotoThumbs(host) {
    const thumbs = $$('[data-photo]', host).filter(el => el.dataset.photo);
    for (const el of thumbs) {
      const url = await DB.photoUrl(el.dataset.photo);
      if (url) {
        el.innerHTML = `<img src="${url}" alt="photo" />` + (el.querySelector('.date')?.outerHTML || '');
      }
    }
  }

  // ---- MEAL ----
  function openMealSheet(prefill = {}) {
    const existing = prefill.existing;
    openModal(Views.mealForm(prefill));
    let selectedUser = existing?.userId || (DB.state.currentUser === 'couple' ? 'edouard' : DB.state.currentUser);
    let selectedKind = existing?.kind || prefill.prefillKind || '';
    let selectedCheat = existing?.isCheat ? (existing.cheatType || '') : '';
    let photoBlob = null;

    chipGroup('#meal-user-chips', 'user', v => selectedUser = v);
    chipGroup('#meal-kind-chips', 'kind', v => selectedKind = v);
    chipGroup('#meal-cheat-chips', 'cheat', v => selectedCheat = v);

    const photoInput = $('#meal-photo', sheet);
    photoInput.addEventListener('change', () => {
      photoBlob = photoInput.files[0] || null;
      $('#meal-photo-preview', sheet).textContent = photoBlob ? `📎 ${photoBlob.name}` : '';
    });

    $('#ai-estimate', sheet).addEventListener('click', async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const btn = sheet.querySelector('#ai-estimate');
      const fb = sheet.querySelector('#ai-feedback');
      const desc = $('#meal-title', sheet).value.trim();
      if (!desc && !photoBlob) {
        fb.hidden = false;
        fb.className = 'ai-feedback err';
        fb.textContent = 'Écris une description ou ajoute une photo d\'abord.';
        return;
      }
      if (!DB.state.settings.aiApiKey) {
        fb.hidden = false;
        fb.className = 'ai-feedback err';
        fb.textContent = 'Ajoute ta clé API Anthropic dans ⚙ Paramètres.';
        return;
      }
      btn.disabled = true;
      btn.textContent = '🔄 Analyse en cours…';
      fb.hidden = false;
      fb.className = 'ai-feedback info';
      fb.textContent = 'Appel à Claude en cours…';
      try {
        const res = photoBlob ? await AI.estimateFromPhoto(photoBlob, desc) : await AI.estimateFromText(desc);
        $('#meal-calories', sheet).value = res.calories;
        if (!desc && res.items?.length) $('#meal-title', sheet).value = res.items.map(i => `${i.name} ${i.qty || ''}`.trim()).join(', ');
        fb.className = 'ai-feedback ok';
        const items = (res.items || []).map(i => `• ${i.name}${i.qty ? ' (' + i.qty + ')' : ''} — ${i.kcal || '?'} kcal`).join('<br>');
        fb.innerHTML = `<strong>≈ ${res.calories} kcal</strong> · confiance ${res.confidence || 'medium'}${items ? '<br><br>' + items : ''}${res.notes ? '<br><em>' + Views.esc(res.notes) + '</em>' : ''}`;
      } catch (err) {
        fb.className = 'ai-feedback err';
        fb.textContent = 'Erreur : ' + (err.message || err);
      } finally {
        btn.disabled = false;
        btn.textContent = '🤖 Estimer les calories avec l\'IA';
      }
    });

    $('#save-meal', sheet).addEventListener('click', async () => {
      const title = $('#meal-title', sheet).value.trim();
      const calories = parseInt($('#meal-calories', sheet).value) || 0;
      if (!title) { showToast('Décris le repas'); return; }
      let photoId = existing?.photoId || null;
      if (photoBlob) {
        if (existing?.photoId) await DB.deletePhoto(existing.photoId);
        photoId = await DB.savePhoto(photoBlob);
      }
      const patch = {
        userId: selectedUser,
        kind: selectedKind || 'snack',
        title, calories,
        photoId,
        isCheat: !!selectedCheat,
        cheatType: selectedCheat || null
      };
      if (existing) {
        DB.updateMeal(existing.id, patch);
      } else {
        DB.addMeal(patch);
        if (selectedCheat) Notifications.onCheatLogged(selectedUser, selectedCheat);
      }
      closeModal();
      showToast(existing ? 'Repas mis à jour' : 'Repas enregistré');
      renderView(currentView);
    });
  }

  function openMealActions(id) {
    const m = DB.state.meals.find(x => x.id === id); if (!m) return;
    openModal(`
      <button class="sheet-close" data-close>×</button>
      <h2 class="sheet-title">${Views.esc(m.title)}</h2>
      <div class="card-sub">${Views.fmtDateTime(m.date)} · ${Views.fmt(m.calories)} kcal${m.isCheat ? ' · écart' : ''}</div>
      ${m.photoId ? `<div id="meal-photo-preview-big" style="margin-top:14px;border-radius:12px;overflow:hidden"></div>` : ''}
      <div style="height:14px"></div>
      <button class="btn primary block" id="edit-meal">✏️ Modifier</button>
      <div style="height:8px"></div>
      <button class="btn danger block" id="del-meal">Supprimer</button>
    `);
    if (m.photoId) DB.photoUrl(m.photoId).then(url => {
      if (url) $('#meal-photo-preview-big', sheet).innerHTML = `<img src="${url}" style="width:100%;display:block" />`;
    });
    $('#edit-meal', sheet).addEventListener('click', () => {
      closeModal();
      openMealSheet({ existing: m });
    });
    $('#del-meal', sheet).addEventListener('click', async () => {
      if (!confirm('Supprimer ce repas ?')) return;
      await DB.deleteMeal(id);
      closeModal();
      renderView(currentView);
      showToast('Supprimé');
    });
  }

  // ---- CALENDAR / DAY DETAIL ----
  function openDayDetail(ymd) {
    openModal(Views.dayDetailForm(ymd));
    sheet.addEventListener('click', (e) => {
      const plan = e.target.closest('[data-plan]');
      if (plan) { openPlannedCheatSheet(plan.dataset.plan, plan.dataset.date); return; }
      const del = e.target.closest('[data-del-planned]');
      if (del) {
        DB.deletePlannedCheat(del.dataset.delPlanned);
        openDayDetail(ymd);
        renderView(currentView);
        return;
      }
    });
  }

  function openPlannedCheatSheet(userId, dateYmd) {
    openModal(Views.plannedCheatForm(userId, dateYmd));
    let selectedType = '';
    chipGroup('#planned-type-chips', 'type', v => selectedType = v);
    $('#save-planned', sheet).addEventListener('click', () => {
      if (!selectedType) { showToast('Choisis un type'); return; }
      DB.addPlannedCheat({
        userId,
        date: dateYmd,
        cheatType: selectedType,
        note: $('#planned-note', sheet).value.trim()
      });
      closeModal();
      showToast('Écart planifié');
      renderView(currentView);
    });
  }

  // ---- WEIGHT ----
  function openWeightSheet(userId, existing) {
    openModal(Views.weightForm(userId, existing));
    $('#save-weight', sheet).addEventListener('click', async () => {
      const v = parseFloat($('#weight-value', sheet).value);
      if (isNaN(v)) { showToast('Poids invalide'); return; }
      const ph = $('#weight-photo', sheet).files[0];
      let photoId = existing?.photoId || null;
      if (ph) {
        if (existing?.photoId) await DB.deletePhoto(existing.photoId);
        photoId = await DB.savePhoto(ph);
      }
      if (existing) {
        DB.updateWeight(existing.id, { weight: v, photoId });
      } else {
        DB.addWeight({ userId, weight: v, photoId });
      }
      DB.updateUserProfile(userId, { weight: v });
      closeModal();
      showToast(existing ? 'Pesée mise à jour' : 'Pesée enregistrée');
      renderView(currentView);
    });
    const delBtn = $('#delete-weight', sheet);
    if (delBtn) delBtn.addEventListener('click', async () => {
      if (!confirm('Supprimer cette pesée ?')) return;
      await DB.deleteWeight(delBtn.dataset.id);
      closeModal();
      showToast('Supprimée');
      renderView(currentView);
    });
  }

  function openWeightEdit(id) {
    const w = DB.state.weights.find(x => x.id === id); if (!w) return;
    openWeightSheet(w.userId, w);
  }

  function openPhotoSheet(userId) {
    openModal(Views.photoForm(userId));
    $('#save-progress-photo', sheet).addEventListener('click', async () => {
      const file = $('#progress-photo', sheet).files[0];
      if (!file) { showToast('Sélectionne une photo'); return; }
      const photoId = await DB.savePhoto(file);
      DB.addPhoto({ userId, photoId, note: $('#progress-note', sheet).value.trim() });
      closeModal();
      showToast('Photo enregistrée');
      renderView(currentView);
    });
  }

  function openPhotoViewer(photoId, progressId) {
    openModal(Views.photoViewer(photoId, progressId));
    DB.photoUrl(photoId).then(url => {
      if (url) $('#photo-viewer-img', sheet).innerHTML = `<img src="${url}" style="width:100%;border-radius:12px" />`;
    });
    const delBtn = $('#delete-progress-photo', sheet);
    if (delBtn) delBtn.addEventListener('click', async () => {
      if (!confirm('Supprimer cette photo ?')) return;
      await DB.deleteProgressPhoto(delBtn.dataset.id);
      closeModal();
      showToast('Supprimée');
      renderView(currentView);
    });
  }

  // ---- WORKOUT ----
  function openWorkoutSheet(existing) {
    openModal(Views.workoutForm(existing));
    let selectedUser = existing?.userId || (DB.state.currentUser === 'couple' ? 'edouard' : DB.state.currentUser);
    let selectedType = '';
    chipGroup('#wk-user-chips', 'user', v => selectedUser = v);
    chipGroup('#wk-type-chips', 'type', v => selectedType = v);

    $('#ai-workout', sheet).addEventListener('click', async (ev) => {
      ev.preventDefault();
      const btn = $('#ai-workout', sheet);
      const fb = $('#ai-wk-feedback', sheet);
      const desc = $('#wk-desc', sheet).value.trim();
      if (!desc) {
        fb.hidden = false; fb.className = 'ai-feedback err';
        fb.textContent = 'Décris ta séance (ex: "35 min de course modérée").';
        return;
      }
      if (!DB.state.settings.aiApiKey) {
        fb.hidden = false; fb.className = 'ai-feedback err';
        fb.textContent = 'Ajoute ta clé API Anthropic dans ⚙ Paramètres.';
        return;
      }
      btn.disabled = true; btn.textContent = '🔄 Analyse…';
      fb.hidden = false; fb.className = 'ai-feedback info';
      fb.textContent = 'Appel à Claude…';
      try {
        const user = DB.state.users[selectedUser];
        const res = await AI.estimateWorkout(desc, user);
        if (res.type) $('#wk-type-custom', sheet).value = res.type;
        if (res.duration) $('#wk-duration', sheet).value = res.duration;
        if (res.calories) $('#wk-calories', sheet).value = res.calories;
        fb.className = 'ai-feedback ok';
        fb.innerHTML = `<strong>${Views.esc(res.type)}</strong> · ${res.duration} min · ≈ ${res.calories} kcal${res.notes ? '<br><em>' + Views.esc(res.notes) + '</em>' : ''}`;
      } catch (err) {
        fb.className = 'ai-feedback err';
        fb.textContent = 'Erreur : ' + (err.message || err);
      } finally {
        btn.disabled = false; btn.textContent = '🤖 Estimer durée + calories via l\'IA';
      }
    });

    $('#save-workout', sheet).addEventListener('click', () => {
      const custom = $('#wk-type-custom', sheet).value.trim();
      const type = [selectedType, custom].filter(Boolean).join(' · ') || 'Séance';
      const duration = parseInt($('#wk-duration', sheet).value) || 0;
      const calories = parseInt($('#wk-calories', sheet).value) || 0;
      if (!duration) { showToast('Durée manquante'); return; }
      const patch = { userId: selectedUser, type, duration, calories };
      if (existing) DB.updateWorkout(existing.id, patch);
      else DB.addWorkout(patch);
      closeModal();
      showToast(existing ? 'Séance mise à jour' : 'Séance enregistrée');
      renderView(currentView);
    });

    const delBtn = $('#delete-workout', sheet);
    if (delBtn) delBtn.addEventListener('click', () => {
      if (!confirm('Supprimer cette séance ?')) return;
      DB.deleteWorkout(delBtn.dataset.id);
      closeModal();
      showToast('Supprimée');
      renderView(currentView);
    });
  }

  function openWorkoutActions(id) {
    const w = DB.state.workouts.find(x => x.id === id); if (!w) return;
    openWorkoutSheet(w);
  }

  // ---- RECIPE (AI) ----
  function openRecipeSheet() {
    openModal(Views.recipeForm());
    let selectedUser = DB.state.currentUser === 'couple' ? 'edouard' : DB.state.currentUser;
    let selectedKind = '';
    chipGroup('#recipe-user-chips', 'user', v => selectedUser = v);
    chipGroup('#recipe-kind-chips', 'kind', v => selectedKind = v);

    $('#recipe-generate', sheet).addEventListener('click', async () => {
      const btn = $('#recipe-generate', sheet);
      const fb = $('#recipe-feedback', sheet);
      const result = $('#recipe-result', sheet);
      const kcal = parseInt($('#recipe-kcal', sheet).value) || 500;
      const hint = $('#recipe-hint', sheet).value.trim();
      if (!selectedKind) { selectedKind = 'dinner'; }
      if (!DB.state.settings.aiApiKey) {
        fb.hidden = false; fb.className = 'ai-feedback err';
        fb.textContent = 'Ajoute ta clé API Anthropic dans ⚙ Paramètres.';
        return;
      }
      btn.disabled = true; btn.textContent = '🔄 Génération…';
      fb.hidden = false; fb.className = 'ai-feedback info';
      fb.textContent = 'Claude cuisine une recette pour toi…';
      result.hidden = true; result.innerHTML = '';
      try {
        const user = DB.state.users[selectedUser];
        const recipe = await AI.generateRecipe({ user, remainingKcal: kcal, mealKind: selectedKind, userHint: hint });
        fb.hidden = true;
        result.hidden = false;
        result.innerHTML = Views.recipeResult(recipe);
        result.dataset.userId = selectedUser;
        result.dataset.kind = selectedKind;
        const logBtn = $('#recipe-log-meal', sheet);
        if (logBtn) logBtn.addEventListener('click', () => {
          const title = logBtn.dataset.title;
          const calories = parseInt(logBtn.dataset.kcal) || 0;
          DB.addMeal({ userId: selectedUser, kind: selectedKind, title, calories, isCheat: false, cheatType: null });
          closeModal();
          showToast('Recette ajoutée comme repas');
          renderView(currentView);
        });
        const saveBtn = $('#recipe-save-library', sheet);
        if (saveBtn) saveBtn.addEventListener('click', () => {
          DB.addRecipe({ ...recipe, source: 'ai' });
          saveBtn.textContent = '✓ Ajoutée à la bibliothèque';
          saveBtn.disabled = true;
          showToast('Recette sauvée');
        });
      } catch (err) {
        fb.className = 'ai-feedback err';
        fb.textContent = 'Erreur : ' + (err.message || err);
      } finally {
        btn.disabled = false; btn.textContent = '🍳 Générer une recette';
      }
    });
  }

  // ---- RECIPE LIBRARY ----
  function openLibrary() {
    openModal(Views.libraryForm());
    sheet.addEventListener('click', (e) => {
      const r = e.target.closest('[data-recipe-id]');
      if (r) openRecipeDetail(r.dataset.recipeId);
    });
  }

  function openRecipeDetail(id) {
    const r = (DB.state.recipes || []).find(x => x.id === id); if (!r) return;
    openModal(Views.recipeDetail(r));
    $('#lib-log-meal', sheet).addEventListener('click', () => {
      const userId = DB.state.currentUser === 'couple' ? 'edouard' : DB.state.currentUser;
      DB.addMeal({
        userId,
        kind: 'dinner',
        title: r.title,
        calories: r.calories || 0,
        isCheat: false,
        cheatType: null
      });
      closeModal();
      showToast('Logué comme repas');
      renderView(currentView);
    });
    $('#lib-delete', sheet).addEventListener('click', async () => {
      if (!confirm('Supprimer cette recette de la bibliothèque ?')) return;
      await DB.deleteRecipe(id);
      closeModal();
      openLibrary();
      renderView(currentView);
    });
  }

  // ---- HELLOFRESH SCAN ----
  function openHFScan() {
    openModal(Views.hfScanForm());
    let photoBlob = null;
    $('#hf-photo', sheet).addEventListener('change', (e) => {
      photoBlob = e.target.files[0] || null;
    });
    $('#hf-scan', sheet).addEventListener('click', async () => {
      const btn = $('#hf-scan', sheet);
      const fb = $('#hf-feedback', sheet);
      const res = $('#hf-result', sheet);
      if (!photoBlob) {
        fb.hidden = false; fb.className = 'ai-feedback err';
        fb.textContent = 'Sélectionne ou prends une photo de la carte.';
        return;
      }
      if (!DB.state.settings.aiApiKey) {
        fb.hidden = false; fb.className = 'ai-feedback err';
        fb.textContent = 'Ajoute ta clé API Anthropic dans ⚙ Paramètres.';
        return;
      }
      btn.disabled = true; btn.textContent = '🔄 Analyse OCR…';
      fb.hidden = false; fb.className = 'ai-feedback info';
      fb.textContent = 'Claude lit ta carte recette…';
      res.hidden = true; res.innerHTML = '';
      try {
        const recipe = await AI.scanRecipeCard(photoBlob);
        const photoId = await DB.savePhoto(photoBlob);
        const saved = DB.addRecipe({ ...recipe, source: 'hellofresh', photoId });
        fb.className = 'ai-feedback ok';
        fb.innerHTML = `<strong>✓ Extraite :</strong> ${Views.esc(saved.title || 'Recette')} · ${saved.calories || '?'} kcal<br>confiance ${recipe.confidence || 'medium'} · sauvée dans la bibliothèque`;
        res.hidden = false;
        res.innerHTML = Views.recipeResult(saved);
        const log = $('#recipe-log-meal', sheet);
        if (log) log.addEventListener('click', () => {
          const userId = DB.state.currentUser === 'couple' ? 'edouard' : DB.state.currentUser;
          DB.addMeal({
            userId, kind: 'dinner',
            title: saved.title,
            calories: saved.calories || 0,
            isCheat: false, cheatType: null
          });
          closeModal();
          showToast('Logué comme repas');
          renderView(currentView);
        });
        const save2 = $('#recipe-save-library', sheet);
        if (save2) { save2.textContent = '✓ Déjà dans la bibliothèque'; save2.disabled = true; }
      } catch (err) {
        fb.className = 'ai-feedback err';
        fb.textContent = 'Erreur : ' + (err.message || err);
      } finally {
        btn.disabled = false; btn.textContent = '🤖 Analyser la carte';
      }
    });
  }

  // ---- WEEKLY REPORT ----
  function exportWeeklyReport() {
    const html = Views.weeklyReport(DB.startOfWeek());
    const win = window.open('', '_blank');
    if (!win) {
      // Fallback: download
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `couplegoals-semaine-${new Date().toISOString().slice(0,10)}.html`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Rapport téléchargé');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  // ---- helpers ----
  function chipGroup(selector, attr, onChange) {
    const el = $(selector, sheet);
    if (!el) return;
    el.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      el.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      onChange(chip.dataset[attr]);
    });
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.hidden = true, 1800);
  }

  function exportJSON() {
    const data = JSON.stringify(DB.state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `couplegoals-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
