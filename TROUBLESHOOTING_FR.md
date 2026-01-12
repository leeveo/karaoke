# 🔧 TROUBLESHOOTING - Si le start.bat ne fonctionne pas

## ⚠️ Problème: La fenêtre s'ouvre et se ferme immédiatement

C'est généralement dû à une erreur lors du démarrage. Voici comment la diagnostiquer:

### Solution 1: Ouvrir le terminal manuellement

1. **Appuie sur Windows + R**
2. **Tape: `cmd`**
3. **Appuie sur Entrée**
4. **Navigue vers ton dossier Karaoke:**
   ```
   cd C:\Users\TonNom\Downloads\KaraokeApp-xxx\karaoke-app
   ```
5. **Lance manuellement:**
   ```
   npm install
   npm start
   ```

Cela affichera les erreurs en détail, ce qui t'aidera à comprendre le problème.

---

## 🐛 Erreurs courantes et solutions

### "npm: The term 'npm' is not recognized"
**Cause:** Node.js n'est pas installé
**Solution:** 
- Installe Node.js depuis https://nodejs.org/
- Choisis la version LTS (stable)
- Redémarre Windows après installation

### "Cannot find module 'next'"
**Cause:** npm install n'a pas bien fonctionné
**Solution:**
```
rm -r node_modules
npm install
```

### "Port 3000 is already in use"
**Cause:** Un autre processus utilise le port 3000
**Solutions:**
- Ferme les autres apps Karaoke
- Utilise un autre port (modifie server.js ligne où il y a 3000)
- Ou redémarre ton ordinateur

### "Cannot start application"
**Cause:** Erreur dans la configuration
**Solution:**
```
del package-lock.json
npm install
npm start
```

---

## ✅ Vérifications avant de lancer

1. **Node.js est installé:**
   ```
   node --version
   npm --version
   ```
   Devrait afficher les numéros de version

2. **Tu es dans le bon dossier:**
   ```
   dir
   ```
   Devrait montrer: `.next`, `public`, `server.js`, `start.bat`, etc.

3. **Aucun autre Karaoke en cours d'exécution:**
   - Ferme toutes les fenêtres de terminal Karaoke
   - Ferme les onglets du navigateur

---

## 🚀 Si rien ne fonctionne

**Essaie cette approche complète:**

1. **Ouvre un terminal (Cmd)**
2. **Va dans ton dossier Karaoke**
3. **Exécute ces commandes une par une:**
   ```
   del /s /q node_modules
   del package-lock.json
   npm install
   npm start
   ```

4. **Attends bien que tout se termine**
5. **Le navigateur devrait s'ouvrir automatiquement**

---

## 📞 Si tu es encore bloqué

Partage:
1. **Les messages d'erreur** (copie/colle depuis le terminal)
2. **Le résultat de:** `node --version` et `npm --version`
3. **Ce que tu vois exactement** quand tu cliques sur start.bat

Cela m'aidera à diagnostiquer le problème! 🔍
