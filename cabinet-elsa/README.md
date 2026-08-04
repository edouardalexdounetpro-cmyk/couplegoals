# Site du cabinet — Elsa Quintin, infirmière libérale à Toulouse

Landing page moderne pour le cabinet d'infirmières libérales situé au
**3 rue René Leduc, 31500 Toulouse** (quartier des Chalets).

Site 100 % statique (HTML / CSS / JS), sans serveur à gérer.

## Contenu

- `index.html` — la page (hero, soins, présentation d'Elsa & Carole, carte, contact)
- `css/styles.css` — le design
- `js/main.js` — la carte (Leaflet) et le formulaire de contact

## ⚙️ À configurer (2 minutes)

Tout se passe en haut de **`js/main.js`** :

### 1. Recevoir les demandes du formulaire dans Gmail

Le formulaire utilise **[Web3Forms](https://web3forms.com)** (gratuit, sans serveur) :

1. Aller sur https://web3forms.com
2. Saisir l'adresse **Gmail du cabinet** → une clé (« Access Key ») est envoyée par mail
3. Coller cette clé dans `js/main.js` :
   ```js
   const WEB3FORMS_KEY = "votre-access-key-ici";
   ```

Chaque demande envoyée depuis le site arrive alors **directement dans la boîte Gmail**.

> Tant que la clé n'est pas renseignée, le formulaire ouvre automatiquement
> l'application e-mail du visiteur avec le message pré-rempli (solution de secours).

### 2. Adresse e-mail affichée

```js
const CABINET_EMAIL = "adresse-du-cabinet@gmail.com";
```

Utilisée pour le lien e-mail affiché sur la page et le secours « mailto ».

### 3. (Optionnel) Ajuster la carte

```js
const CABINET_COORDS = [43.6108, 1.4566]; // position du cabinet
const RAYON_METRES   = 1150;              // rayon d'intervention affiché
```

Les coordonnées correspondent à la rue René Leduc ; on peut les affiner au besoin.

## Voir le site en local

```bash
cd cabinet-elsa
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

## Mettre en ligne

N'importe quel hébergement de site statique convient. Le plus simple :

- **Netlify** ou **Vercel** : glisser-déposer le dossier `cabinet-elsa/`, ou connecter le dépôt
- **GitHub Pages** : activer Pages sur la branche, dossier `cabinet-elsa/`

## À faire ensuite (idées d'évolutions)

- Vraies photos du cabinet / des infirmières
- Numéro de téléphone direct + horaires précis
- Nom de domaine personnalisé (ex. `cabinet-quintin-toulouse.fr`)
- Mentions légales / politique de confidentialité (RGPD)
