/* CoupleGoals - UI rendering */
(function (global) {
  const fmt = (n, d = 0) => n == null || isNaN(n) ? '—' : Number(n).toFixed(d).replace('.', ',');
  const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  const fmtDateTime = (d) => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function renderHero(userId) {
    if (userId === 'couple') {
      const e = renderHeroOne('edouard'); const l = renderHeroOne('elsa');
      return `<div class="hero"><div class="hero-label">Vue couple</div>
        <div class="hero-big">💕 Edouard & Elsa</div>
        <div class="hero-sub">Synthèse des deux profils</div>
        <div class="hero-grid">
          <div class="hero-stat"><div class="label">Edouard</div><div class="val">${fmt(DB.caloriesToday('edouard'))} / ${fmt(DB.dailyTarget(DB.state.users.edouard))} kcal</div></div>
          <div class="hero-stat"><div class="label">Elsa</div><div class="val">${fmt(DB.caloriesToday('elsa'))} / ${fmt(DB.dailyTarget(DB.state.users.elsa))} kcal</div></div>
        </div></div>`;
    }
    return renderHeroOne(userId);
  }
  function renderHeroOne(userId) {
    const u = DB.state.users[userId];
    const target = DB.dailyTarget(u);
    const intake = DB.caloriesToday(userId);
    const remaining = target - intake;
    const last = DB.latestWeight(userId);
    const start = DB.startingWeight(userId);
    const diff = last && start ? last.weight - start.weight : null;
    return `<div class="hero ${userId}">
      <div class="hero-label">Aujourd'hui</div>
      <div class="hero-big">${fmt(intake)} <span style="font-size:18px;opacity:.75">/ ${fmt(target)} kcal</span></div>
      <div class="hero-sub">${remaining >= 0 ? `Il reste ${fmt(remaining)} kcal` : `${fmt(-remaining)} kcal au-dessus`}</div>
      <div class="hero-grid">
        <div class="hero-stat"><div class="label">Poids actuel</div><div class="val">${last ? fmt(last.weight, 1) + ' kg' : '—'}</div></div>
        <div class="hero-stat"><div class="label">Variation</div><div class="val">${diff == null ? '—' : (diff > 0 ? '+' : '') + fmt(diff, 1) + ' kg'}</div></div>
      </div></div>`;
  }

  function renderDashboard(userId) {
    if (userId === 'couple') {
      return `
        ${renderHero('couple')}
        <div class="section-title">Edouard</div>
        ${dashboardCards('edouard', true)}
        <div class="section-title">Elsa</div>
        ${dashboardCards('elsa', true)}
      `;
    }
    return `
      ${renderHero(userId)}
      ${dashboardCards(userId, false)}
      <div class="section-title">Derniers repas</div>
      ${recentMealsList(userId, 4)}
    `;
  }

  function dashboardCards(userId, compact) {
    const u = DB.state.users[userId];
    const intake = DB.caloriesToday(userId);
    const target = DB.dailyTarget(u);
    const ratio = Math.min(1, intake / Math.max(1, target));
    const pb = ratio > 1.1 ? 'warn' : ratio > 0.9 ? 'warn' : 'ok';
    const cheats = DB.cheatSummary(userId);
    const w = DB.nextWeighIn(userId);
    const p = DB.nextPhoto(userId);

    return `
      <div class="kpi-grid">
        <div class="kpi">
          <div class="kpi-label">Objectif journalier</div>
          <div class="kpi-value">${fmt(target)}</div>
          <div class="kpi-foot">TDEE ${fmt(DB.tdee(u))} − déficit ${fmt(DB.dailyDeficit(u))} kcal</div>
          <div class="progress ${pb}"><span style="width:${Math.min(100, ratio * 100)}%"></span></div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Prochaine pesée</div>
          <div class="kpi-value">${w.overdue ? '⚠️' : 'J-' + w.daysUntil}</div>
          <div class="kpi-foot">${w.lastDate ? 'Dernière : ' + fmtDate(w.lastDate) : 'Jamais enregistrée'}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Prochaine photo</div>
          <div class="kpi-value">${p.overdue ? '⚠️' : 'J-' + p.daysUntil}</div>
          <div class="kpi-foot">${p.lastDate ? 'Dernière : ' + fmtDate(p.lastDate) : 'Jamais enregistrée'}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Hello Fresh</div>
          <div class="kpi-value">${DB.state.settings.helloFreshPerWeek}</div>
          <div class="kpi-foot">repas / semaine</div>
        </div>
      </div>
      <div class="section-title">Écarts autorisés</div>
      ${cheats.map(c => cheatRow(c)).join('')}
    `;
  }

  function cheatRow(c) {
    const pips = Array.from({ length: c.limit }, (_, i) => {
      const used = i < c.used;
      const over = i >= c.limit && used;
      return `<span class="pip ${used ? 'used' : ''} ${over ? 'blocked' : ''}"></span>`;
    }).join('');
    const over = c.used > c.limit;
    return `<div class="cheat">
      <div class="cheat-info">
        <span class="cheat-emoji">${c.emoji}</span>
        <div>
          <div class="card-title">${c.label}</div>
          <div class="card-sub">${c.used}/${c.limit} ${c.period === 'week' ? 'cette semaine' : 'ce mois'}${over ? ' · dépassé' : ''}</div>
        </div>
      </div>
      <div class="cheat-pips">${pips}</div>
    </div>`;
  }

  function recentMealsList(userId, limit) {
    const list = (userId === 'couple' ? DB.state.meals : DB.state.meals.filter(m => m.userId === userId))
      .slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);
    if (!list.length) return `<div class="empty">Aucun repas enregistré</div>`;
    return `<div class="entry-list">${list.map(renderMealEntry).join('')}</div>`;
  }

  function renderMealEntry(m) {
    const user = DB.state.users[m.userId]?.name || m.userId;
    const kind = { breakfast: 'Petit-déj', lunch: 'Déj', dinner: 'Dîner', snack: 'Snack' }[m.kind] || m.kind || '';
    return `<div class="entry" data-meal-id="${m.id}">
      <div class="entry-thumb" data-photo="${m.photoId || ''}">${m.photoId ? '' : '🍽'}</div>
      <div class="entry-main">
        <div class="entry-title">${esc(m.title || 'Repas')}</div>
        <div class="entry-sub">${fmtDateTime(m.date)} · ${user} · ${kind}</div>
      </div>
      <div class="entry-right">
        <div class="value">${fmt(m.calories)} kcal</div>
        ${m.isCheat ? `<span class="tag cheat">écart</span>` : ''}
      </div>
    </div>`;
  }

  function renderMeals(userId) {
    const list = (userId === 'couple' ? DB.state.meals : DB.state.meals.filter(m => m.userId === userId))
      .slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    return `
      <div class="section-title">Repas</div>
      <button class="btn primary block" id="add-meal-btn">+ Ajouter un repas</button>
      <div style="height:12px"></div>
      ${list.length ? `<div class="entry-list">${list.map(renderMealEntry).join('')}</div>` : `<div class="empty">Aucun repas. Commence par ajouter ton premier.</div>`}
    `;
  }

  function renderWeight(userId) {
    const users = userId === 'couple' ? ['edouard', 'elsa'] : [userId];
    let html = `<div class="section-title">Suivi du poids</div>`;
    for (const uid of users) {
      const u = DB.state.users[uid];
      const list = DB.state.weights.filter(w => w.userId === uid).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
      const start = list[list.length - 1];
      const last = list[0];
      const diff = last && start ? last.weight - start.weight : null;
      const w = DB.nextWeighIn(uid);
      const p = DB.nextPhoto(uid);
      html += `
        <div class="card">
          <div class="card-row">
            <div>
              <div class="card-title">${u.name}</div>
              <div class="card-sub">${last ? fmt(last.weight, 1) + ' kg · ' + fmtDate(last.date) : 'Aucune pesée'}</div>
            </div>
            <div class="right">
              <div class="card-title">${diff == null ? '—' : (diff > 0 ? '+' : '') + fmt(diff, 1) + ' kg'}</div>
              <div class="card-sub">vs départ</div>
            </div>
          </div>
          <div style="height:10px"></div>
          <div class="row">
            <button class="btn primary small" data-action="log-weight" data-user="${uid}">⚖ Peser ${w.overdue ? '(à faire)' : ''}</button>
            <button class="btn small" data-action="log-photo" data-user="${uid}">📷 Photo ${p.overdue ? '(à faire)' : ''}</button>
          </div>
        </div>
        ${weightChart(uid)}
        ${photoStrip(uid)}
      `;
    }
    return html;
  }

  function weightChart(userId) {
    const list = DB.state.weights.filter(w => w.userId === userId).slice().sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-14);
    if (!list.length) return `<div class="empty">Pas encore de pesée. Ajoute-en une pour démarrer le suivi.</div>`;
    const max = Math.max(...list.map(w => w.weight));
    const min = Math.min(...list.map(w => w.weight));
    const span = Math.max(0.5, max - min);
    return `<div class="card">
      <div class="card-title">Évolution (${list.length} pesées)</div>
      <div class="bars">
        ${list.map(w => {
          const h = 10 + ((w.weight - min) / span) * 90;
          return `<div class="bar" style="height:${h}%" title="${fmt(w.weight, 1)} kg"></div>`;
        }).join('')}
      </div>
      <div class="card-sub">min ${fmt(min, 1)} kg · max ${fmt(max, 1)} kg</div>
    </div>`;
  }

  function photoStrip(userId) {
    const list = DB.state.photos.filter(p => p.userId === userId).slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
    if (!list.length) return '';
    return `<div class="card">
      <div class="card-title">Photos de progression</div>
      <div class="photo-strip">
        ${list.map(p => `<div class="photo-thumb" data-photo="${p.photoId}"><div class="date">${fmtDate(p.date)}</div></div>`).join('')}
      </div>
    </div>`;
  }

  function renderWorkouts(userId) {
    const list = (userId === 'couple' ? DB.state.workouts : DB.state.workouts.filter(w => w.userId === userId))
      .slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    const totalWeek = list.filter(w => new Date(w.date) >= DB.startOfWeek()).reduce((s, w) => s + (w.duration || 0), 0);
    return `
      <div class="section-title">Sport</div>
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-label">Cette semaine</div><div class="kpi-value">${fmt(totalWeek)}</div><div class="kpi-foot">minutes</div></div>
        <div class="kpi"><div class="kpi-label">Séances</div><div class="kpi-value">${list.filter(w => new Date(w.date) >= DB.startOfWeek()).length}</div><div class="kpi-foot">7 derniers jours</div></div>
      </div>
      <button class="btn primary block" id="add-workout-btn">+ Ajouter une séance</button>
      <div style="height:12px"></div>
      ${list.length ? `<div class="entry-list">${list.map(renderWorkoutEntry).join('')}</div>` : `<div class="empty">Aucune séance consignée.</div>`}
    `;
  }

  // ---- Calendar ----
  const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const DAYS_FR = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  function renderCalendar(userId, monthOffset = 0) {
    const today = new Date();
    const ref = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const year = ref.getFullYear();
    const month = ref.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDow = (firstDay.getDay() + 6) % 7; // Mon = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);

    const showBoth = userId === 'couple';
    const viewUsers = showBoth ? ['edouard', 'elsa'] : [userId];

    return `
      <div class="section-title">Calendrier</div>
      <div class="cal-header">
        <button class="icon-btn" data-cal-nav="-1">‹</button>
        <div class="cal-title">${MONTHS_FR[month]} ${year}</div>
        <button class="icon-btn" data-cal-nav="1">›</button>
      </div>
      <div class="cal-dow">${DAYS_FR.map(d => `<div>${d}</div>`).join('')}</div>
      <div class="cal-grid">
        ${cells.map(c => calCell(c, viewUsers, today)).join('')}
      </div>
      <div class="cal-legend">
        <span><i class="dot ok"></i> Objectif tenu</span>
        <span><i class="dot warn"></i> Limite</span>
        <span><i class="dot bad"></i> Dépassé</span>
        <span>⏰ Écart planifié</span>
      </div>
      ${renderPlannedThisMonth(ref, userId)}
    `;
  }

  function calCell(date, users, today) {
    if (!date) return '<div class="cal-cell empty"></div>';
    const isToday = date.toDateString() === today.toDateString();
    const isFuture = date > today && !isToday;
    let dots = '';
    const logged = [];
    for (const u of users) {
      const s = DB.dayStatus(u, date);
      if (s !== 'none') {
        const cls = s === 'hit' ? 'ok' : s === 'close' ? 'warn' : 'bad';
        dots += `<i class="dot ${cls}"></i>`;
        logged.push(u);
      }
    }
    const planned = users.flatMap(u => DB.plannedCheatsForDay(date, u));
    const cheated = users.flatMap(u => DB.dayMeals(u, date).filter(m => m.isCheat));
    const ymd = DB.ymd(date);
    return `<button class="cal-cell ${isToday ? 'today' : ''} ${isFuture ? 'future' : ''}" data-day="${ymd}">
      <div class="cal-num">${date.getDate()}</div>
      <div class="cal-dots">${dots}</div>
      <div class="cal-emoji">${cheated.map(c => DB.CHEAT_LIMITS[c.cheatType]?.emoji || '⚠').join('')}${planned.map(p => '⏰').join('')}</div>
    </button>`;
  }

  function renderPlannedThisMonth(ref, userId) {
    const list = DB.plannedCheatsInMonth(ref, userId).slice().sort((a, b) => a.date.localeCompare(b.date));
    if (!list.length) return '';
    return `
      <div class="section-title">Écarts planifiés ce mois</div>
      <div class="entry-list">
        ${list.map(p => {
          const def = DB.CHEAT_LIMITS[p.cheatType] || { emoji: '⚠', label: p.cheatType };
          const u = DB.state.users[p.userId]?.name || p.userId;
          return `<div class="entry" data-planned-id="${p.id}">
            <div class="entry-thumb">${def.emoji}</div>
            <div class="entry-main">
              <div class="entry-title">${def.label} · ${u}</div>
              <div class="entry-sub">${fmtDate(p.date)}${p.note ? ' · ' + esc(p.note) : ''}</div>
            </div>
            <div class="entry-right"><span class="tag cheat">planifié</span></div>
          </div>`;
        }).join('')}
      </div>
    `;
  }

  function dayDetailForm(dateYmd) {
    const date = new Date(dateYmd + 'T12:00:00');
    const isPast = date < DB.startOfDay(new Date());
    const userIds = ['edouard', 'elsa'];
    let html = `
      <button class="sheet-close" data-close>×</button>
      <h2 class="sheet-title">${date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
    `;
    for (const uid of userIds) {
      const u = DB.state.users[uid];
      const meals = DB.dayMeals(uid, date);
      const kcal = meals.reduce((s, m) => s + (m.calories || 0), 0);
      const target = DB.dailyTarget(u);
      const workouts = DB.dayWorkouts(uid, date);
      const planned = DB.plannedCheatsForDay(date, uid);
      const cheats = meals.filter(m => m.isCheat);
      const status = DB.dayStatus(uid, date);
      const statusLabel = { hit: '✅ objectif', close: '⚠ limite', over: '❌ dépassé', none: '— aucune saisie' }[status];
      html += `
        <div class="card" style="border-left:3px solid var(--${uid})">
          <div class="card-row">
            <div>
              <div class="card-title">${u.name}</div>
              <div class="card-sub">${fmt(kcal)}/${fmt(target)} kcal · ${statusLabel}</div>
            </div>
            <button class="btn small" data-plan="${uid}" data-date="${dateYmd}">+ Écart</button>
          </div>
          ${planned.length ? `<div style="margin-top:10px" class="entry-list">
            ${planned.map(p => {
              const def = DB.CHEAT_LIMITS[p.cheatType] || { emoji: '⚠', label: p.cheatType };
              return `<div class="entry" data-planned-id="${p.id}">
                <div class="entry-thumb">${def.emoji}⏰</div>
                <div class="entry-main">
                  <div class="entry-title">${def.label}</div>
                  <div class="entry-sub">planifié${p.note ? ' · ' + esc(p.note) : ''}</div>
                </div>
                <div class="entry-right"><button class="btn small danger" data-del-planned="${p.id}">✕</button></div>
              </div>`;
            }).join('')}
          </div>` : ''}
          ${cheats.length ? `<div style="margin-top:10px">
            ${cheats.map(m => {
              const def = DB.CHEAT_LIMITS[m.cheatType] || { emoji: '⚠' };
              return `<span class="tag cheat" style="margin-right:4px">${def.emoji} ${esc(m.title)}</span>`;
            }).join('')}
          </div>` : ''}
          ${meals.length ? `<div style="margin-top:10px;font-size:13px;color:var(--text-dim)">
            ${meals.length} repas${workouts.length ? ' · ' + workouts.length + ' séance' + (workouts.length > 1 ? 's' : '') : ''}
          </div>` : ''}
        </div>
      `;
    }
    return html;
  }

  function plannedCheatForm(userId, dateYmd) {
    const u = DB.state.users[userId];
    const cheats = Object.entries(DB.CHEAT_LIMITS);
    return `
      <button class="sheet-close" data-close>×</button>
      <h2 class="sheet-title">Planifier un écart · ${u.name}</h2>
      <div class="card-sub" style="margin-bottom:14px">Le ${fmtDate(dateYmd)}</div>
      <div class="field">
        <label>Type d'écart</label>
        <div class="chip-row" id="planned-type-chips">
          ${cheats.map(([k, v]) => `<div class="chip" data-type="${k}">${v.emoji} ${v.label}</div>`).join('')}
        </div>
      </div>
      <div class="field">
        <label>Note (optionnel)</label>
        <input type="text" id="planned-note" placeholder="ex: anniversaire de Paul" />
      </div>
      <button class="btn primary block" id="save-planned" data-user="${userId}" data-date="${dateYmd}">Planifier</button>
    `;
  }

  function renderWorkoutEntry(w) {
    const user = DB.state.users[w.userId]?.name || '';
    return `<div class="entry" data-workout-id="${w.id}">
      <div class="entry-thumb">💪</div>
      <div class="entry-main">
        <div class="entry-title">${esc(w.type || 'Séance')}</div>
        <div class="entry-sub">${fmtDateTime(w.date)} · ${user} · ${fmt(w.duration)} min</div>
      </div>
      <div class="entry-right">
        <div class="value">${w.calories ? fmt(w.calories) + ' kcal' : '—'}</div>
      </div>
    </div>`;
  }

  function renderSettings() {
    const s = DB.state.settings;
    const e = DB.state.users.edouard;
    const l = DB.state.users.elsa;
    return `
      <div class="section-title">Profils</div>
      ${profileCard(e)}
      ${profileCard(l)}
      <div class="section-title">Hello Fresh</div>
      <div class="card">
        <div class="field">
          <label>Repas Hello Fresh par semaine</label>
          <input type="number" id="hf-count" value="${s.helloFreshPerWeek}" min="0" max="14" />
        </div>
      </div>
      <div class="section-title">IA (estimation de calories)</div>
      <div class="card">
        <div class="field">
          <label>Clé API Anthropic (stockée localement)</label>
          <input type="password" id="ai-key" placeholder="sk-ant-..." value="${esc(s.aiApiKey || '')}" />
        </div>
        <div class="card-sub">La clé ne quitte pas ton téléphone. Elle sert à analyser tes photos d'assiette pour estimer les calories.</div>
      </div>
      <div class="section-title">Notifications</div>
      <div class="card">
        <label class="card-row" style="cursor:pointer">
          <span>Activer les rappels (pesée, photo, écarts)</span>
          <input type="checkbox" id="notif-toggle" ${s.notifications ? 'checked' : ''} />
        </label>
        <div style="height:8px"></div>
        <button class="btn small" id="notif-perm">Autoriser les notifications</button>
      </div>
      <div class="section-title">Données</div>
      <div class="card">
        <button class="btn small block" id="export-data">Exporter (JSON)</button>
        <div style="height:8px"></div>
        <button class="btn danger small block" id="reset-data">Réinitialiser toutes les données</button>
      </div>
      <div style="height:40px"></div>
      <div class="empty">CoupleGoals v1 — Edouard ♥ Elsa</div>
    `;
  }

  function profileCard(u) {
    return `<div class="card">
      <div class="card-title">${u.name}</div>
      <div class="row">
        <div class="field"><label>Poids (kg)</label><input type="number" step="0.1" data-profile="${u.id}" data-field="weight" value="${u.weight}"></div>
        <div class="field"><label>Taille (cm)</label><input type="number" step="0.1" data-profile="${u.id}" data-field="height" value="${u.height}"></div>
      </div>
      <div class="row">
        <div class="field"><label>Âge</label><input type="number" data-profile="${u.id}" data-field="age" value="${u.age}"></div>
        <div class="field"><label>Objectif (g gras/sem)</label><input type="number" data-profile="${u.id}" data-field="targetFatLossGramsPerWeek" value="${u.targetFatLossGramsPerWeek}"></div>
      </div>
      <div class="card-sub">BMR ${fmt(DB.bmr(u))} · TDEE ${fmt(DB.tdee(u))} · cible ${fmt(DB.dailyTarget(u))} kcal/j</div>
    </div>`;
  }

  // ---- Modal builders ----
  function mealForm({ prefillKind } = {}) {
    const userId = DB.state.currentUser === 'couple' ? 'edouard' : DB.state.currentUser;
    const cheats = Object.entries(DB.CHEAT_LIMITS);
    return `
      <button class="sheet-close" data-close>×</button>
      <h2 class="sheet-title">Nouveau repas</h2>
      <div class="field">
        <label>Pour qui ?</label>
        <div class="chip-row" id="meal-user-chips">
          <div class="chip ${userId === 'edouard' ? 'active' : ''}" data-user="edouard">Edouard</div>
          <div class="chip ${userId === 'elsa' ? 'active' : ''}" data-user="elsa">Elsa</div>
        </div>
      </div>
      <div class="field">
        <label>Type</label>
        <div class="chip-row" id="meal-kind-chips">
          ${['breakfast', 'lunch', 'dinner', 'snack'].map(k => `<div class="chip ${prefillKind === k ? 'active' : ''}" data-kind="${k}">${ { breakfast: 'Petit-déj', lunch: 'Déj', dinner: 'Dîner', snack: 'Snack' }[k] }</div>`).join('')}
        </div>
      </div>
      <div class="field">
        <label>Description du repas</label>
        <textarea id="meal-title" rows="2" placeholder="ex: Poulet rôti, riz, brocolis"></textarea>
      </div>
      <div class="field">
        <label>Photo de l'assiette (optionnel)</label>
        <input type="file" id="meal-photo" accept="image/*" capture="environment" />
        <div id="meal-photo-preview" class="muted" style="font-size:12px"></div>
      </div>
      <button type="button" class="btn ai block" id="ai-estimate">🤖 Estimer les calories avec l'IA</button>
      <div id="ai-feedback" class="ai-feedback" hidden></div>
      <div class="field" style="margin-top:14px">
        <label>Calories</label>
        <input type="number" id="meal-calories" placeholder="saisir ou estimer via IA" />
      </div>
      <div class="field">
        <label>Écart autorisé ?</label>
        <div class="chip-row" id="meal-cheat-chips">
          <div class="chip active" data-cheat="">Non</div>
          ${cheats.map(([k, v]) => `<div class="chip" data-cheat="${k}">${v.emoji} ${v.label}</div>`).join('')}
        </div>
      </div>
      <button class="btn primary block" id="save-meal">Enregistrer</button>
    `;
  }

  function weightForm(userId) {
    const u = DB.state.users[userId];
    return `
      <button class="sheet-close" data-close>×</button>
      <h2 class="sheet-title">Pesée · ${u.name}</h2>
      <div class="field">
        <label>Poids (kg)</label>
        <input type="number" step="0.1" id="weight-value" value="${u.weight}" />
      </div>
      <div class="field">
        <label>Photo (optionnel, pour la pesée)</label>
        <input type="file" id="weight-photo" accept="image/*" capture="environment" />
      </div>
      <button class="btn primary block" id="save-weight" data-user="${userId}">Enregistrer</button>
    `;
  }

  function photoForm(userId) {
    const u = DB.state.users[userId];
    return `
      <button class="sheet-close" data-close>×</button>
      <h2 class="sheet-title">Photo de progression · ${u.name}</h2>
      <div class="field">
        <label>Photo</label>
        <input type="file" id="progress-photo" accept="image/*" capture="user" />
      </div>
      <div class="field">
        <label>Note (optionnel)</label>
        <input type="text" id="progress-note" placeholder="ex: après 2 semaines" />
      </div>
      <button class="btn primary block" id="save-progress-photo" data-user="${userId}">Enregistrer</button>
    `;
  }

  function workoutForm() {
    const userId = DB.state.currentUser === 'couple' ? 'edouard' : DB.state.currentUser;
    return `
      <button class="sheet-close" data-close>×</button>
      <h2 class="sheet-title">Séance de sport</h2>
      <div class="field">
        <label>Pour qui ?</label>
        <div class="chip-row" id="wk-user-chips">
          <div class="chip ${userId === 'edouard' ? 'active' : ''}" data-user="edouard">Edouard</div>
          <div class="chip ${userId === 'elsa' ? 'active' : ''}" data-user="elsa">Elsa</div>
        </div>
      </div>
      <div class="field">
        <label>Type d'activité</label>
        <div class="chip-row" id="wk-type-chips">
          ${['Course', 'Vélo', 'Muscu', 'Marche', 'Natation', 'HIIT', 'Yoga', 'Autre'].map(t => `<div class="chip" data-type="${t}">${t}</div>`).join('')}
        </div>
        <input type="text" id="wk-type-custom" placeholder="Détail (optionnel)" />
      </div>
      <div class="row">
        <div class="field"><label>Durée (min)</label><input type="number" id="wk-duration" placeholder="45" /></div>
        <div class="field"><label>Calories</label><input type="number" id="wk-calories" placeholder="optionnel" /></div>
      </div>
      <button class="btn primary block" id="save-workout">Enregistrer</button>
    `;
  }

  function photoViewer(photoId) {
    return `
      <button class="sheet-close" data-close>×</button>
      <h2 class="sheet-title">Photo</h2>
      <div id="photo-viewer-img" style="min-height:300px;display:grid;place-items:center">Chargement…</div>
    `;
  }

  global.Views = {
    renderDashboard, renderMeals, renderWeight, renderWorkouts, renderSettings,
    renderCalendar,
    mealForm, weightForm, photoForm, workoutForm, photoViewer,
    dayDetailForm, plannedCheatForm,
    fmt, fmtDate, fmtDateTime, esc
  };
})(window);
