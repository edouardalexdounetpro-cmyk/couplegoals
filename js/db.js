/* CoupleGoals - storage layer (IndexedDB for photos, localStorage for everything else) */
(function (global) {
  const LS_KEY = 'couplegoals.v1';
  const DB_NAME = 'couplegoals';
  const DB_VERSION = 1;

  const DEFAULT_STATE = {
    currentUser: null, // 'edouard' | 'elsa' | 'couple'
    users: {
      edouard: {
        id: 'edouard', name: 'Edouard',
        sex: 'M', age: 30, weight: 90, height: 176,
        targetFatLossGramsPerWeek: 750,
        activityFactor: 1.4
      },
      elsa: {
        id: 'elsa', name: 'Elsa',
        sex: 'F', age: 30, weight: 64, height: 163.5,
        targetFatLossGramsPerWeek: 500,
        activityFactor: 1.35
      }
    },
    settings: {
      aiProvider: 'anthropic', // 'anthropic' | 'off'
      aiApiKey: '',
      helloFreshPerWeek: 6,
      notifications: true
    },
    meals: [],     // { id, userId, date(ISO), kind, title, calories, photoId, isCheat, cheatType, notes }
    weights: [],   // { id, userId, date, weight, photoId }
    photos: [],    // { id, userId, date, photoId, note } (progress photos)
    workouts: [],  // { id, userId, date, type, duration, calories, notes }
    plannedCheats: [] // { id, userId, date(YYYY-MM-DD), cheatType, note }
  };

  const CHEAT_LIMITS = {
    // per calendar month
    pizza: { period: 'month', limit: 1, label: 'Pizza', emoji: '🍕' },
    burger: { period: 'month', limit: 1, label: 'Burger-frites', emoji: '🍔' },
    viennoiserie: { period: 'month', limit: 2, label: 'Petit-déj brioché', emoji: '🥐' },
    // per week
    dessert: { period: 'week', limit: 1, label: 'Dessert sucré', emoji: '🍰' }
  };

  // --- localStorage state ---
  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return structuredClone(DEFAULT_STATE);
      const parsed = JSON.parse(raw);
      // shallow merge with defaults to tolerate migrations
      return {
        ...DEFAULT_STATE,
        ...parsed,
        users: { ...DEFAULT_STATE.users, ...(parsed.users || {}) },
        settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) },
        plannedCheats: parsed.plannedCheats || []
      };
    } catch (e) {
      console.warn('state load failed', e);
      return structuredClone(DEFAULT_STATE);
    }
  }

  let state = load();

  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); }
    catch (e) { console.warn('state save failed', e); }
  }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  // --- IndexedDB for photo blobs ---
  let dbPromise = null;
  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function savePhoto(blob) {
    const id = uid();
    const db = await openDB();
    await new Promise((res, rej) => {
      const tx = db.transaction('photos', 'readwrite');
      tx.objectStore('photos').put(blob, id);
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
    return id;
  }

  async function getPhoto(id) {
    if (!id) return null;
    const db = await openDB();
    return new Promise((res, rej) => {
      const tx = db.transaction('photos', 'readonly');
      const r = tx.objectStore('photos').get(id);
      r.onsuccess = () => res(r.result || null);
      r.onerror = () => rej(r.error);
    });
  }

  async function photoUrl(id) {
    const blob = await getPhoto(id);
    return blob ? URL.createObjectURL(blob) : null;
  }

  async function deletePhoto(id) {
    if (!id) return;
    const db = await openDB();
    await new Promise((res, rej) => {
      const tx = db.transaction('photos', 'readwrite');
      tx.objectStore('photos').delete(id);
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
  }

  // --- Domain helpers ---
  function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
  function startOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth(), 1); }
  function startOfWeek(d = new Date()) {
    const x = startOfDay(d);
    const day = (x.getDay() + 6) % 7; // Monday = 0
    x.setDate(x.getDate() - day);
    return x;
  }
  function sameDay(a, b) {
    const x = new Date(a), y = new Date(b);
    return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
  }
  function daysBetween(a, b) { return Math.floor((startOfDay(b) - startOfDay(a)) / 86400000); }

  // Mifflin-St Jeor BMR
  function bmr(user) {
    const base = 10 * user.weight + 6.25 * user.height - 5 * user.age;
    return user.sex === 'M' ? base + 5 : base - 161;
  }
  function tdee(user) { return Math.round(bmr(user) * (user.activityFactor || 1.4)); }
  // 1 g fat ≈ 7.7 kcal; deficit needed for fat-loss target
  function dailyDeficit(user) { return Math.round(user.targetFatLossGramsPerWeek * 7.7 / 7); }
  function dailyTarget(user) { return Math.max(1200, tdee(user) - dailyDeficit(user)); }

  // --- Queries ---
  function mealsFor(userId, from, to) {
    return state.meals.filter(m => m.userId === userId
      && new Date(m.date) >= from
      && new Date(m.date) < to);
  }
  function caloriesToday(userId) {
    const d = startOfDay(new Date());
    const next = new Date(d); next.setDate(d.getDate() + 1);
    return mealsFor(userId, d, next).reduce((s, m) => s + (m.calories || 0), 0);
  }
  function caloriesForDay(userId, day) {
    const d = startOfDay(day);
    const next = new Date(d); next.setDate(d.getDate() + 1);
    return mealsFor(userId, d, next).reduce((s, m) => s + (m.calories || 0), 0);
  }

  function cheatUsage(userId, type) {
    const def = CHEAT_LIMITS[type]; if (!def) return { used: 0, limit: 0 };
    const from = def.period === 'week' ? startOfWeek() : startOfMonth();
    const to = new Date(); to.setHours(23,59,59,999);
    const used = state.meals.filter(m => m.userId === userId && m.isCheat && m.cheatType === type
      && new Date(m.date) >= from && new Date(m.date) <= to).length;
    return { used, limit: def.limit, label: def.label, emoji: def.emoji, period: def.period };
  }

  function cheatSummary(userId) {
    return Object.keys(CHEAT_LIMITS).map(type => ({ type, ...cheatUsage(userId, type) }));
  }

  function latestWeight(userId) {
    const list = state.weights.filter(w => w.userId === userId).sort((a,b) => new Date(b.date) - new Date(a.date));
    return list[0] || null;
  }
  function startingWeight(userId) {
    const list = state.weights.filter(w => w.userId === userId).sort((a,b) => new Date(a.date) - new Date(b.date));
    return list[0] || null;
  }
  function nextWeighIn(userId) {
    const last = latestWeight(userId);
    if (!last) return { overdue: true, daysUntil: 0, lastDate: null };
    const d = daysBetween(last.date, new Date());
    return { overdue: d >= 5, daysUntil: Math.max(0, 5 - d), lastDate: last.date };
  }
  function nextPhoto(userId) {
    const list = state.photos.filter(p => p.userId === userId).sort((a,b) => new Date(b.date) - new Date(a.date));
    const last = list[0];
    if (!last) return { overdue: true, daysUntil: 0, lastDate: null };
    const d = daysBetween(last.date, new Date());
    return { overdue: d >= 5, daysUntil: Math.max(0, 5 - d), lastDate: last.date };
  }

  // --- Mutations ---
  function addMeal(meal) {
    const entry = { id: uid(), date: new Date().toISOString(), ...meal };
    state.meals.push(entry); save(); return entry;
  }
  function updateMeal(id, patch) {
    const m = state.meals.find(x => x.id === id); if (!m) return null;
    Object.assign(m, patch); save(); return m;
  }
  async function deleteMeal(id) {
    const i = state.meals.findIndex(x => x.id === id); if (i < 0) return;
    const m = state.meals[i];
    state.meals.splice(i, 1); save();
    if (m.photoId) await deletePhoto(m.photoId);
  }

  function addWeight(entry) {
    const e = { id: uid(), date: new Date().toISOString(), ...entry };
    state.weights.push(e); save(); return e;
  }
  function updateWeight(id, patch) {
    const w = state.weights.find(x => x.id === id); if (!w) return null;
    Object.assign(w, patch); save(); return w;
  }
  async function deleteWeight(id) {
    const i = state.weights.findIndex(x => x.id === id); if (i < 0) return;
    const w = state.weights[i]; state.weights.splice(i, 1); save();
    if (w.photoId) await deletePhoto(w.photoId);
  }

  function addPhoto(entry) {
    const e = { id: uid(), date: new Date().toISOString(), ...entry };
    state.photos.push(e); save(); return e;
  }
  async function deleteProgressPhoto(id) {
    const i = state.photos.findIndex(x => x.id === id); if (i < 0) return;
    const p = state.photos[i]; state.photos.splice(i, 1); save();
    if (p.photoId) await deletePhoto(p.photoId);
  }

  function addWorkout(w) {
    const e = { id: uid(), date: new Date().toISOString(), ...w };
    state.workouts.push(e); save(); return e;
  }
  function updateWorkout(id, patch) {
    const w = state.workouts.find(x => x.id === id); if (!w) return null;
    Object.assign(w, patch); save(); return w;
  }
  function deleteWorkout(id) {
    const i = state.workouts.findIndex(x => x.id === id); if (i < 0) return;
    state.workouts.splice(i, 1); save();
  }

  // --- Planned cheats (calendar planning, shared per device) ---
  function ymd(d) {
    const x = new Date(d);
    return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
  }
  function addPlannedCheat(entry) {
    const e = { id: uid(), ...entry, date: ymd(entry.date) };
    if (!state.plannedCheats) state.plannedCheats = [];
    state.plannedCheats.push(e); save(); return e;
  }
  function deletePlannedCheat(id) {
    if (!state.plannedCheats) return;
    const i = state.plannedCheats.findIndex(x => x.id === id); if (i < 0) return;
    state.plannedCheats.splice(i, 1); save();
  }
  function plannedCheatsForDay(day, userId) {
    const k = ymd(day);
    return (state.plannedCheats || []).filter(p => p.date === k && (!userId || userId === 'couple' || p.userId === userId));
  }
  function plannedCheatsInMonth(date, userId) {
    const m = new Date(date).getMonth(), y = new Date(date).getFullYear();
    return (state.plannedCheats || []).filter(p => {
      const d = new Date(p.date);
      return d.getMonth() === m && d.getFullYear() === y
        && (!userId || userId === 'couple' || p.userId === userId);
    });
  }

  // Day status: 'hit' | 'close' | 'over' | 'none'
  function dayStatus(userId, day) {
    const u = state.users[userId]; if (!u) return 'none';
    const kcal = caloriesForDay(userId, day);
    if (kcal === 0) return 'none';
    const target = dailyTarget(u);
    if (kcal <= target * 1.05) return 'hit';
    if (kcal <= target * 1.15) return 'close';
    return 'over';
  }
  function dayMeals(userId, day) {
    const d = startOfDay(day);
    const next = new Date(d); next.setDate(d.getDate() + 1);
    const list = userId === 'couple'
      ? state.meals.filter(m => new Date(m.date) >= d && new Date(m.date) < next)
      : mealsFor(userId, d, next);
    return list.sort((a, b) => new Date(a.date) - new Date(b.date));
  }
  function dayWorkouts(userId, day) {
    const d = startOfDay(day);
    const next = new Date(d); next.setDate(d.getDate() + 1);
    return state.workouts.filter(w =>
      new Date(w.date) >= d && new Date(w.date) < next
      && (userId === 'couple' || w.userId === userId));
  }

  function setUser(id) { state.currentUser = id; save(); }
  function setSetting(key, value) { state.settings[key] = value; save(); }
  function updateUserProfile(id, patch) {
    if (!state.users[id]) return;
    Object.assign(state.users[id], patch); save();
  }

  global.DB = {
    state, save, load: () => (state = load()),
    CHEAT_LIMITS,
    savePhoto, getPhoto, photoUrl, deletePhoto,
    addMeal, updateMeal, deleteMeal,
    addWeight, updateWeight, deleteWeight,
    addPhoto, deleteProgressPhoto,
    addWorkout, updateWorkout, deleteWorkout,
    setUser, setSetting, updateUserProfile,
    mealsFor, caloriesToday, caloriesForDay,
    cheatUsage, cheatSummary,
    latestWeight, startingWeight, nextWeighIn, nextPhoto,
    bmr, tdee, dailyDeficit, dailyTarget,
    startOfDay, startOfMonth, startOfWeek, sameDay, daysBetween,
    ymd, addPlannedCheat, deletePlannedCheat,
    plannedCheatsForDay, plannedCheatsInMonth,
    dayStatus, dayMeals, dayWorkouts
  };
})(window);
