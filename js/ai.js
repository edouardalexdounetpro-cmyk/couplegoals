/* CoupleGoals - AI helpers: calorie estimation, workout estimation, recipe generation
 * Uses Anthropic's API with user-provided key (stored in localStorage).
 * Called from the browser, so the key stays on-device. Purely optional.
 */
(function (global) {
  const MODEL = 'claude-haiku-4-5-20251001';

  async function blobToBase64(blob) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result.toString().split(',')[1]);
      r.onerror = () => rej(r.error);
      r.readAsDataURL(blob);
    });
  }

  // ---- Meal calorie estimation ----
  async function estimateFromText(description) {
    const body = {
      model: MODEL,
      max_tokens: 400,
      system: mealSystemPrompt(),
      messages: [{ role: 'user', content: [{ type: 'text', text: `Repas: ${description}\nRéponds en JSON strict.` }] }]
    };
    return call(body);
  }

  async function estimateFromPhoto(blob, description = '') {
    const b64 = await blobToBase64(blob);
    const body = {
      model: MODEL,
      max_tokens: 500,
      system: mealSystemPrompt(),
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: blob.type || 'image/jpeg', data: b64 } },
          { type: 'text', text: `Analyse cette assiette. Contexte utilisateur: ${description || 'aucun'}. Réponds en JSON strict.` }
        ]
      }]
    };
    return call(body);
  }

  function mealSystemPrompt() {
    return `Tu es un nutritionniste. Estime les calories d'un repas.
Réponds UNIQUEMENT avec un objet JSON {"calories": <int>, "items": [{"name": string, "qty": string, "kcal": int}], "confidence": "low"|"medium"|"high", "notes": string}.
Pas de markdown. Calories totales arrondies à 10 kcal.`;
  }

  // ---- Workout estimation ----
  async function estimateWorkout(description, user) {
    const sys = `Tu es coach sportif. L'utilisateur décrit une séance de sport en langage naturel.
Profil: ${user.name}, ${user.sex === 'M' ? 'homme' : 'femme'}, ${user.weight} kg, ${user.height} cm, ${user.age} ans.
Déduis: type d'activité, durée en minutes, calories brûlées estimées.
Réponds UNIQUEMENT avec un objet JSON {"type": string, "duration": <int minutes>, "calories": <int>, "notes": string}.
Pas de markdown. Calories arrondies à 10.`;
    const body = {
      model: MODEL,
      max_tokens: 300,
      system: sys,
      messages: [{ role: 'user', content: [{ type: 'text', text: `Séance: ${description}` }] }]
    };
    return call(body);
  }

  // ---- Recipe generation ----
  async function generateRecipe({ user, remainingKcal, mealKind, userHint }) {
    const forbidden = 'boissons caloriques (sodas, jus industriels), sucres transformés (bonbons, confiseries), pâtisseries industrielles';
    const sys = `Tu es chef diététicien spécialisé dans la perte de graisse. Propose UNE recette simple et savoureuse respectant ces règles strictes :
- Aliments interdits : ${forbidden}
- Aliments à privilégier : protéines maigres (poulet, dinde, poisson, œuf, tofu), légumes, céréales complètes, bonnes graisses
- Objectif calorique cible pour ce repas : environ ${remainingKcal} kcal (tolérance ±15 %)
- Type de repas : ${mealKind}
- Profil : ${user.name}, objectif perte de graisse

Réponds UNIQUEMENT avec un objet JSON :
{"title": string, "summary": string, "calories": <int>, "macros": {"protein_g": int, "carbs_g": int, "fat_g": int}, "ingredients": [{"name": string, "qty": string}], "steps": [string], "prep_min": int, "cook_min": int}
Pas de markdown, pas de texte hors JSON.`;
    const userMsg = userHint
      ? `Envie de : ${userHint}. Propose-moi une recette adaptée.`
      : `Propose-moi une recette.`;
    const body = {
      model: MODEL,
      max_tokens: 1200,
      system: sys,
      messages: [{ role: 'user', content: [{ type: 'text', text: userMsg }] }]
    };
    return call(body);
  }

  // ---- Core API call ----
  async function call(body) {
    const key = DB.state.settings.aiApiKey;
    if (!key) throw new Error('Clé API Anthropic manquante. Ajoutez-la dans ⚙ Paramètres.');
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(body)
    });
    if (!resp.ok) {
      const t = await resp.text();
      let msg = t;
      try {
        const j = JSON.parse(t);
        if (j.error?.message) msg = j.error.message;
      } catch {}
      throw new Error(`API ${resp.status} · ${msg.slice(0, 300)}`);
    }
    const data = await resp.json();
    const text = (data.content || []).map(b => b.text || '').join('').trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Réponse IA invalide (pas de JSON)');
    try { return JSON.parse(match[0]); }
    catch (e) { throw new Error('JSON IA invalide : ' + e.message); }
  }

  global.AI = { estimateFromText, estimateFromPhoto, estimateWorkout, generateRecipe };
})(window);
