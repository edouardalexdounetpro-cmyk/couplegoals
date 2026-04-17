/* CoupleGoals - AI calorie estimation
 * Uses Anthropic's API with user-provided key (stored in localStorage).
 * Called from the browser, so the key stays on-device. Purely optional.
 */
(function (global) {
  async function blobToBase64(blob) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result.toString().split(',')[1]);
      r.onerror = () => rej(r.error);
      r.readAsDataURL(blob);
    });
  }

  async function estimateFromText(description, context = {}) {
    const key = DB.state.settings.aiApiKey;
    if (!key) throw new Error('Clé API Anthropic manquante. Ajoutez-la dans Paramètres.');
    const body = {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: systemPrompt(context),
      messages: [{ role: 'user', content: [{ type: 'text', text: `Repas: ${description}\nRéponds en JSON strict.` }] }]
    };
    return callAnthropic(key, body);
  }

  async function estimateFromPhoto(blob, description = '', context = {}) {
    const key = DB.state.settings.aiApiKey;
    if (!key) throw new Error('Clé API Anthropic manquante. Ajoutez-la dans Paramètres.');
    const b64 = await blobToBase64(blob);
    const body = {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: systemPrompt(context),
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: blob.type || 'image/jpeg', data: b64 } },
          { type: 'text', text: `Analyse cette assiette. Contexte utilisateur: ${description || 'aucun'}. Réponds en JSON strict.` }
        ]
      }]
    };
    return callAnthropic(key, body);
  }

  function systemPrompt(ctx) {
    return `Tu es un nutritionniste. Estime les calories d'un repas.
Réponds UNIQUEMENT avec un objet JSON {"calories": <int>, "items": [{"name": string, "qty": string, "kcal": int}], "confidence": "low"|"medium"|"high", "notes": string}.
Pas de markdown. Calories totales arrondies à 10 kcal.`;
  }

  async function callAnthropic(key, body) {
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
      throw new Error(`API (${resp.status}): ${t.slice(0, 200)}`);
    }
    const data = await resp.json();
    const text = (data.content || []).map(b => b.text || '').join('').trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Réponse IA invalide');
    try { return JSON.parse(match[0]); }
    catch { throw new Error('JSON IA invalide'); }
  }

  global.AI = { estimateFromText, estimateFromPhoto };
})(window);
