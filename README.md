# CoupleGoals

Progressive Web App de suivi nutritionnel, poids et sport pour un couple (Edouard & Elsa).

**100% indépendant du reste du dépôt** : aucune dépendance partagée avec Inqeo. C'est une app HTML/JS/CSS pure qui tourne entièrement côté navigateur. Peut être déplacée dans un autre repo sans modification.

## Fonctionnalités

- **Profils** : Edouard (90 kg, 176 cm, -750 g gras/sem) · Elsa (64 kg, 163,5 cm, -500 g gras/sem) · vue couple
- **Objectifs caloriques** calculés automatiquement (Mifflin-St Jeor + déficit pour fonte)
- **Suivi repas** : calories, photo d'assiette, type (petit-déj / déj / dîner / snack)
- **Écarts autorisés** avec compteurs : 1 pizza/mois, 1 burger-frites/mois, 1 dessert/semaine, 2 viennoiseries/mois
- **Pesée** tous les 5 jours + rappel
- **Photo de progression** tous les 5 jours + rappel
- **Séances de sport** (type, durée, calories)
- **Estimation IA** des calories à partir d'une photo ou description (Anthropic API, clé stockée localement)
- **Notifications** : pesée/photo en retard, écart au-delà de la limite, écarts du mois non utilisés
- **Hello Fresh** : paramètre configurable (par défaut 6 / semaine)
- **Installable** : manifest + service worker (fonctionne hors ligne après 1ère ouverture)
- **Export JSON** des données

## Lancer localement

Pas de build. Un simple serveur static suffit :

```bash
cd couplegoals
python3 -m http.server 8080
# puis ouvrir http://localhost:8080 dans Chrome/Safari
```

Pour l'installer sur ton téléphone :
1. Ouvrir l'URL (HTTPS requis — sers via ngrok/Vercel/Netlify, ou héberge sur GitHub Pages)
2. Menu du navigateur → « Ajouter à l'écran d'accueil »

## Configuration IA (optionnel)

1. Ouvrir l'app → ⚙ Paramètres → « Clé API Anthropic »
2. Coller une clé `sk-ant-...` (créée sur console.anthropic.com)
3. La clé reste en localStorage sur l'appareil, les appels partent directement depuis le navigateur

## Données

- **localStorage** : profils, repas, pesées, séances, réglages (clé : `couplegoals.v1`)
- **IndexedDB** : photos (base `couplegoals`, store `photos`)
- Tout est local — rien n'est envoyé à un serveur sauf les appels IA optionnels

## Structure

```
couplegoals/
├── index.html
├── manifest.webmanifest
├── sw.js                  # service worker (offline)
├── css/styles.css
├── js/
│   ├── app.js             # contrôleur principal
│   ├── db.js              # stockage (localStorage + IndexedDB)
│   ├── views.js           # rendu HTML des écrans
│   ├── ai.js              # appels Anthropic (vision)
│   └── notifications.js   # rappels + quotas
└── icons/                 # icônes PWA
```
