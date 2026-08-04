# Site du cabinet — Elsa Quintin, infirmière libérale à Toulouse

Landing page pour le cabinet d'infirmières libérales situé au
**3 rue René Leduc, 31500 Toulouse** (quartier des Chalets).

Site **en un seul fichier** (`index.html`), sans serveur ni dépendance à installer :
tout le style et le code sont intégrés. Il suffit d'ouvrir le fichier dans un
navigateur ou de le déposer chez un hébergeur.

## Conformité déontologique (Ordre national des infirmiers)

Le contenu a été rédigé pour respecter le code de déontologie des infirmiers
(art. R.4312-76 s.) et la charte de l'ONI sur les sites internet :

- **Ton sobre et factuel**, sans publicité ni démarchage
- **Pas** de comparaison avec d'autres cabinets, ni de superlatifs, ni de
  témoignages de patients
- **Pas** de titre non reconnu (le mot « spécialiste » a été évité ; le DU
  dialyse est présenté comme une formation complémentaire)
- Informations autorisées présentes : identité, D.E., formations, conditions
  d'exercice, secteur géographique, actes présentés factuellement, associée
- Mentions obligatoires ajoutées : **tarifs / conventionnement**, moyens de
  paiement, **égalité d'accès aux soins**, **mentions légales**, **RGPD**,
  rappel des urgences (15)

> ⚠️ Ce travail vise la conformité mais ne remplace pas une validation par le
> Conseil départemental de l'Ordre (31), qui peut être sollicité pour avis.

## ⚙️ À compléter avant mise en ligne

Tout est en haut de la balise `<script>` dans `index.html`, ou signalé par
`[à compléter]` dans le texte :

### 1. Recevoir les demandes du formulaire dans Gmail

Le formulaire utilise **[Web3Forms](https://web3forms.com)** (gratuit, sans serveur) :

1. Aller sur https://web3forms.com
2. Saisir l'adresse **Gmail du cabinet** → une clé (« Access Key ») arrive par mail
3. La coller dans `index.html` : `const WEB3FORMS_KEY = "votre-cle";`

Les demandes arrivent alors **directement dans la boîte Gmail**. Sans clé, le
formulaire ouvre l'application e-mail du visiteur (secours automatique).

### 2. Adresse e-mail du cabinet

`const CABINET_EMAIL = "adresse-du-cabinet@gmail.com";`

### 3. Informations `[à compléter]` dans le texte

- N° RPPS d'Elsa et de Carole + n° d'inscription à l'Ordre (31)
- Horaires de permanence téléphonique
- Accessibilité du cabinet (accès PMR, etc.)
- Coordonnées de l'hébergeur (mentions légales)

### 4. (Optionnel) Ajuster la carte

`const CABINET_COORDS = [43.6108, 1.4566];` et `const RAYON_METRES = 1500;`

## Voir le site en local

```bash
cd cabinet-elsa
python3 -m http.server 8000   # puis http://localhost:8000
```

## Mettre en ligne

Un seul fichier `index.html` à déposer : **Netlify**, **Vercel**, **GitHub Pages**,
ou tout hébergement classique. Un nom de domaine (ex. `cabinet-quintin-toulouse.fr`)
pourra y être associé.

## À faire ensuite (idées)

- Vraies photos du cabinet
- Numéro de téléphone direct + horaires précis
- Validation du contenu par le Conseil de l'Ordre (31)
