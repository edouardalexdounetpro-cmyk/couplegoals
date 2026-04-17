/* CoupleGoals - local notifications + reminder scheduling
 * Uses Notification API + setInterval while app is open.
 * Ping on app start for 5-day weigh-in/photo checks + cheat allowance nudges.
 */
(function (global) {
  async function ensurePermission() {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    return await Notification.requestPermission();
  }

  function notify(title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return false;
    try {
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.ready.then(reg => reg.showNotification(title, { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' }));
      } else {
        new Notification(title, { body, icon: 'icons/icon-192.png' });
      }
      return true;
    } catch { return false; }
  }

  function checkReminders() {
    if (!DB.state.settings.notifications) return;
    const userId = DB.state.currentUser;
    if (!userId || userId === 'couple') return;
    const user = DB.state.users[userId]; if (!user) return;

    const seenKey = 'cg.lastReminder.' + userId;
    const lastSeen = parseInt(localStorage.getItem(seenKey) || '0', 10);
    // Throttle to one check per 6h
    if (Date.now() - lastSeen < 6 * 3600 * 1000) return;

    const w = DB.nextWeighIn(userId);
    if (w.overdue) notify(`Pesée prévue, ${user.name}`, 'Il est temps de te peser (tous les 5 jours).');
    const p = DB.nextPhoto(userId);
    if (p.overdue) notify(`Photo de suivi, ${user.name}`, 'Pense à prendre ta photo de progression.');

    // End-of-month reminder if unused cheats
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    if (today.getDate() >= lastDay - 2) {
      const summary = DB.cheatSummary(userId).filter(c => c.period === 'month' && c.used === 0);
      if (summary.length) notify('Écarts du mois', `Il te reste ${summary.map(s => s.label).join(', ')} ce mois-ci.`);
    }

    localStorage.setItem(seenKey, Date.now().toString());
  }

  function onCheatLogged(userId, type) {
    const usage = DB.cheatUsage(userId, type);
    if (usage.used > usage.limit) {
      notify('Écart au-delà de la limite', `${usage.used}/${usage.limit} ${usage.label} ${usage.period === 'week' ? 'cette semaine' : 'ce mois'}.`);
    } else if (usage.used === usage.limit) {
      notify('Quota atteint', `${usage.label} : ${usage.used}/${usage.limit}. Plus d'écart de ce type ${usage.period === 'week' ? 'cette semaine' : 'ce mois'}.`);
    }
  }

  global.Notifications = { ensurePermission, notify, checkReminders, onCheatLogged };
})(window);
