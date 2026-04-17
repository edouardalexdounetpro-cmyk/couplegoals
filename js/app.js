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
      const ph = e.target.closest('[data-photo]');
      if (ph && ph.dataset.photo) { openPhotoViewer(ph.dataset.photo); return; }
      const act = e.target.closest('[data-action]');
      if (act) {
        if (act.dataset.action === 'log-weight') openWeightSheet(act.dataset.user);
        else if (act.dataset.action === 'log-photo') openPhotoSheet(act.dataset.user);
        return;
      }
      if (e.target.closest('#add-meal-btn')) openMealSheet();
      if (e.target.closest('#add-workout-btn')) openWorkoutSheet();
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
    openModal(Views.mealForm(prefill));
    let selectedUser = DB.state.currentUser === 'couple' ? 'edouard' : DB.state.currentUser;
    let selectedKind = prefill.prefillKind || '';
    let selectedCheat = '';
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
      let photoId = null;
      if (photoBlob) photoId = await DB.savePhoto(photoBlob);
      DB.addMeal({
        userId: selectedUser,
        kind: selectedKind || 'snack',
        title, calories,
        photoId,
        isCheat: !!selectedCheat,
        cheatType: selectedCheat || null
      });
      if (selectedCheat) Notifications.onCheatLogged(selectedUser, selectedCheat);
      closeModal();
      showToast('Repas enregistré');
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
      <button class="btn danger block" id="del-meal">Supprimer</button>
    `);
    if (m.photoId) DB.photoUrl(m.photoId).then(url => {
      if (url) $('#meal-photo-preview-big', sheet).innerHTML = `<img src="${url}" style="width:100%;display:block" />`;
    });
    $('#del-meal', sheet).addEventListener('click', async () => {
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
  function openWeightSheet(userId) {
    openModal(Views.weightForm(userId));
    $('#save-weight', sheet).addEventListener('click', async () => {
      const v = parseFloat($('#weight-value', sheet).value);
      if (isNaN(v)) { showToast('Poids invalide'); return; }
      const ph = $('#weight-photo', sheet).files[0];
      let photoId = ph ? await DB.savePhoto(ph) : null;
      DB.addWeight({ userId, weight: v, photoId });
      DB.updateUserProfile(userId, { weight: v });
      closeModal();
      showToast('Pesée enregistrée');
      renderView(currentView);
    });
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

  function openPhotoViewer(photoId) {
    openModal(Views.photoViewer(photoId));
    DB.photoUrl(photoId).then(url => {
      if (url) $('#photo-viewer-img', sheet).innerHTML = `<img src="${url}" style="width:100%;border-radius:12px" />`;
    });
  }

  // ---- WORKOUT ----
  function openWorkoutSheet() {
    openModal(Views.workoutForm());
    let selectedUser = DB.state.currentUser === 'couple' ? 'edouard' : DB.state.currentUser;
    let selectedType = '';
    chipGroup('#wk-user-chips', 'user', v => selectedUser = v);
    chipGroup('#wk-type-chips', 'type', v => selectedType = v);
    $('#save-workout', sheet).addEventListener('click', () => {
      const custom = $('#wk-type-custom', sheet).value.trim();
      const type = [selectedType, custom].filter(Boolean).join(' · ') || 'Séance';
      const duration = parseInt($('#wk-duration', sheet).value) || 0;
      const calories = parseInt($('#wk-calories', sheet).value) || 0;
      if (!duration) { showToast('Durée manquante'); return; }
      DB.addWorkout({ userId: selectedUser, type, duration, calories });
      closeModal();
      showToast('Séance enregistrée');
      renderView(currentView);
    });
  }

  function openWorkoutActions(id) {
    const w = DB.state.workouts.find(x => x.id === id); if (!w) return;
    openModal(`
      <button class="sheet-close" data-close>×</button>
      <h2 class="sheet-title">${Views.esc(w.type)}</h2>
      <div class="card-sub">${Views.fmtDateTime(w.date)} · ${Views.fmt(w.duration)} min${w.calories ? ' · ' + Views.fmt(w.calories) + ' kcal' : ''}</div>
      <div style="height:14px"></div>
      <button class="btn danger block" id="del-wk">Supprimer</button>
    `);
    $('#del-wk', sheet).addEventListener('click', () => {
      DB.deleteWorkout(id);
      closeModal();
      renderView(currentView);
      showToast('Supprimé');
    });
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
