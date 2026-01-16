# 📘 Procédure Étape par Étape : Kiosque Offline

## ⚡ Option rapide (recommandée)
```bash
npm run kiosk:build -- <eventId>
```
- Télécharge/actualise les médias offline.
- Lance `next build`.
- Exécute `scripts/generate-package.js` et indique le ZIP obtenu.
- Options : `--skip-offline-assets`, `--skip-next-build`, `--only-package`.

Les sections suivantes détaillent manuellement chaque étape si tu veux conserver un contrôle fin.

## 1. Préparer l'environnement de build
1. Vérifier Node.js ≥ 20 sur la machine de build.
2. Créer/mettre à jour `.env.local` avec :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`
   - `NEXT_PUBLIC_AWS_S3_BUCKET` (par défaut `leeveostockage`)
   - `AWS_REGION` si différent de `eu-west-3`
3. Installer les dépendances :
   ```bash
   npm install
   ```

## 2. Pré-télécharger l'événement ciblé
1. Identifier l'`eventId` (ex: `6c88be73-1157-422f-bd69-c436005cc807`).
2. Lancer la génération des médias offline :
   ```bash
   npm run build:offline-package -- <eventId>
   ```
3. Vérifier le dossier généré : `offline-packages/<eventId>` doit contenir :
   - `assets/event` (logo/fond)
   - `assets/songs` (MP4 par catégorie)
   - `assets/images` (covers)
   - `manifest.json`

## 3. Compiler l'application Next.js
1. Construire l'app :
   ```bash
   npx next build
   ```
   (Requis pour embarquer `.next` dans le package.)

## 4. Générer le package Electron autonome
1. Lancer le script :
   ```bash
   node scripts/generate-package.js <eventId>
   ```
2. Sortie attendue : `.packages/output/karaoke-<eventId>.zip`.
3. Contenu du ZIP :
   - `.next`, `public`, `server.js`, `electron/`
   - `offline-data/<eventId>` (manifest + médias)
   - `start.bat`, `start.sh`, `README.md`

## 5. Installer sur un kiosque
1. Copier le ZIP sur la machine kiosque (clé USB, réseau, etc.).
2. Extraire dans un dossier dédié (ex: `C:/Karaoke/<eventId>` ou `/Applications/Karaoke/<eventId>`).
3. Première exécution :
   - Windows : double-cliquer `start.bat`.
   - macOS/Linux :
     ```bash
     chmod +x start.sh
     ./start.sh
     ```
4. Le script installe automatiquement les dépendances (`npm install --omit=dev`). Une connexion internet ponctuelle est nécessaire uniquement à cette étape.

## 6. Vérifier le fonctionnement offline
1. Après lancement, le terminal doit afficher :
   - `[OfflineServer] Ready on http://localhost:3210`
   - `[OfflineShell]` indiquant l'ID d'événement détecté.
2. Dans la fenêtre Electron :
   - Vérifier que la page `/event/<eventId>` s'affiche.
   - Lire plusieurs chansons (les URLs proviennent de `/_offline/assets/...`).
3. Couper le Wi-Fi / Ethernet puis recharger la fenêtre : la lecture doit rester fonctionnelle.

## 7. Dépanner rapidement
| Problème | Cause probable | Résolution |
| --- | --- | --- |
| `Missing offline assets` lors du packaging | Étape 2 non exécutée | Relancer `npm run build:offline-package -- <eventId>` |
| Fenêtre blanche | Build Next manquant ou échec serveurs | Relancer `npx next build` puis `node scripts/generate-package.js` |
| Vidéo ne démarre pas | Fichier absent de `offline-data/<eventId>` | Vérifier `manifest.json` + refaire l'étape 2 |
| Event incorrect | vieux manifeste copié | Supprimer `offline-packages/<eventId>` et regénérer |
| Port déjà utilisé | 3210 occupé sur kiosque | Modifier `KARAOKE_OFFLINE_PORT` dans `start.bat` / `start.sh` |

## 8. Rappels importants
- Toute modification du contenu (nouvelles chansons, logo, etc.) nécessite de rejouer **Étapes 2 → 4** avant redistribution.
- Le kiosque peut fonctionner indéfiniment offline après la première installation.
- Le script `app/api/sync-assets` détecte automatiquement les médias locaux via `OFFLINE_MANIFEST_PATH`, aucun changement front n'est requis.
- Document d'accompagnement pour les opérateurs : [OFFLINE_KIOSK_TUTORIAL.md](OFFLINE_KIOSK_TUTORIAL.md).

Ce guide peut être remis tel quel aux équipes opérationnelles pour garantir un déploiement identique sur chaque poste kiosque.
