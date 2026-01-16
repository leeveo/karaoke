# 🎤 Tutoriel Kiosque 100% Offline

## 1. Pré-requis
- Node.js 20+ installé sur la machine de build
- Accès aux variables d'environnement suivantes dans `.env.local` :
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`
  - `NEXT_PUBLIC_AWS_S3_BUCKET` (par défaut `leeveostockage`)
- Base de données Supabase renseignée (événement + catégories + chansons)

## 2. Générer les assets offline d'un événement
```bash
npm run build:offline-package -- <eventId>
```
Résultat : `offline-packages/<eventId>` contenant `manifest.json` + MP4/images.

## 3. Produire le package Electron autonome
```bash
npx next build
node scripts/generate-package.js <eventId>
```
- Vérifie que `offline-packages/<eventId>` existe
- Copie `.next`, `public`, `electron`, `server.js`
- Emballe `offline-data/<eventId>` avec tous les médias
- Ajoute `start.bat` et `start.sh`
- Crée `karaoke-<eventId>.zip` dans `.packages/output`

## 4. Déployer sur le kiosque
1. Copier le ZIP sur la machine (USB ou téléchargement)
2. Extraire le dossier (ex: `C:/Karaoke/<eventId>`)
3. Windows : double-cliquer `start.bat`
   Mac/Linux : `chmod +x start.sh && ./start.sh`
4. Première exécution : `npm install --omit=dev` (connexion requise une seule fois)
5. Une fenêtre Electron s'ouvre sur `event/<eventId>` en mode offline

## 5. Architecture côté kiosque
- `server.js` lance Next.js + Express et expose `/_offline/assets`
- `electron/main.js` démarre le serveur puis charge la fenêtre navigateur
- `app/api/sync-assets` lit `manifest.json` local si `OFFLINE_MANIFEST_PATH` est défini
- Le front continue de faire `POST /api/sync-assets` mais reçoit des URLs locales

## 6. Recette rapide
1. Lancer `start.bat`
2. Vérifier le terminal : `[OfflineServer] Ready on http://localhost:3210`
3. Dans la fenêtre, ouvrir quelques chansons → la lecture doit fonctionner sans réseau
4. Couper le Wi-Fi et recharger la page → toujours fonctionnel

## 7. Troubleshooting
| Problème | Solution |
| --- | --- |
| `Missing offline assets` | Revoir l'étape 2 (`npm run build:offline-package -- <eventId>`) |
| Fenêtre blanche | Vérifier les logs du terminal + présence de `.next` et `offline-data` |
| Vidéos ne chargent pas | Confirmer que `/_offline/assets/...` renvoie bien les fichiers (ouvrir via navigateur) |
| Event incorrect | Regénérer `offline-packages/<eventId>` et le package Electron (manifest outdated) |

## 8. Commandes clés
```bash
npm run build:offline-package -- <eventId>
node scripts/generate-package.js <eventId>
```

### ⚡ Automatisation complète
Une seule commande condense les étapes 2 + 3 :
```bash
npm run kiosk:build -- <eventId>
```
Flags disponibles :
- `--skip-offline-assets` : saute `build:offline-package` si le dossier existe déjà.
- `--skip-next-build` : réutilise le dernier `.next` (utile pour debug rapide).
- `--only-package` : combinaison des deux flags ci-dessus.

Copiez ensuite `.packages/output/karaoke-<eventId>.zip` vers vos kiosques. Aucun téléchargement supplémentaire n'est requis pendant l'événement.
