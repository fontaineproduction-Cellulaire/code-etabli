# L'Établi — Code & Normes

Application de recherche dans les codes du bâtiment québécois.

---

## GUIDE D'INSTALLATION COMPLET
### Aucun terminal requis — tout se fait dans le navigateur

---

## ÉTAPE 1 — Créer un compte GitHub

1. Aller sur **https://github.com**
2. Cliquer **"Sign up"** (bouton vert en haut à droite)
3. Entrer ton adresse courriel → mot de passe → nom d'utilisateur
4. Vérifier ton courriel (GitHub envoie un code)
5. Choisir le plan **Free** (gratuit)

---

## ÉTAPE 2 — Mettre le code sur GitHub

1. Une fois connecté sur GitHub, cliquer le bouton **"+"** en haut à droite
2. Cliquer **"New repository"**
3. Remplir :
   - **Repository name** : `letabli-codes`
   - **Description** : `Application de recherche codes du bâtiment`
   - Choisir **Private** (accès privé — recommandé)
   - Cocher **"Add a README file"**
4. Cliquer **"Create repository"**

### Uploader les fichiers

5. Dans ton nouveau repo, cliquer **"uploading an existing file"** (lien dans la page)
6. Décompresser le ZIP `letabli-codes.zip` sur ton ordinateur
7. **Sélectionner TOUS les fichiers** du dossier décompressé et les glisser dans la fenêtre GitHub
8. En bas de la page, cliquer **"Commit changes"**

> ⚠️ GitHub ne permet pas d'uploader des dossiers vides. Si tu as une erreur, ignore-la et continue.

---

## ÉTAPE 3 — Créer la base de données sur Railway

1. Aller sur **https://railway.app**
2. Cliquer **"Start a New Project"**
3. Se connecter avec GitHub (bouton **"Login with GitHub"**)
4. Cliquer **"Deploy PostgreSQL"**
5. Railway crée automatiquement une base de données PostgreSQL avec pgvector

### Récupérer les informations de connexion

6. Dans Railway, cliquer sur ton projet PostgreSQL
7. Aller dans l'onglet **"Variables"**
8. Tu verras **DATABASE_URL** — note cette valeur, tu en auras besoin à l'étape 5
9. Aussi noter **DATABASE_PUBLIC_URL** pour DIRECT_URL

### Activer pgvector

10. Dans Railway, aller dans l'onglet **"Query"** de ta base de données
11. Coller et exécuter cette commande :
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```
12. Puis coller et exécuter :
```sql
ALTER TABLE "Chunk" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);
```

---

## ÉTAPE 4 — Obtenir les clés API

### Clé Anthropic (Claude)
1. Aller sur **https://console.anthropic.com**
2. Se connecter (même courriel que ton compte Claude.ai)
3. Cliquer **"API Keys"** dans le menu gauche
4. Cliquer **"Create Key"**
5. Nommer la clé `letabli-codes`
6. **Copier la clé** — elle commence par `sk-ant-...`
   > ⚠️ Tu ne pourras plus la voir après — copie-la dans un fichier texte

### Clé OpenAI (pour les embeddings)
1. Aller sur **https://platform.openai.com**
2. Créer un compte ou se connecter
3. Cliquer sur ton profil en haut à droite → **"API keys"**
4. Cliquer **"Create new secret key"**
5. Nommer la clé `letabli-codes`
6. **Copier la clé** — elle commence par `sk-...`
   > Ajouter 5$ de crédit dans Billing → il faut une carte de crédit
   > L'indexation de tous vos PDF coûtera environ 2-3$

---

## ÉTAPE 5 — Déployer sur Vercel

1. Aller sur **https://vercel.com**
2. Cliquer **"Sign Up"** → **"Continue with GitHub"**
3. Autoriser Vercel à accéder à GitHub
4. Cliquer **"Add New Project"**
5. Tu vois la liste de tes repos GitHub — cliquer **"Import"** à côté de `letabli-codes`

### Configurer les variables d'environnement

6. Dans la page de configuration, ouvrir la section **"Environment Variables"**
7. Ajouter ces variables une par une :

| Nom | Valeur |
|-----|--------|
| `DATABASE_URL` | La valeur copiée depuis Railway (avec `?sslmode=require` à la fin) |
| `DIRECT_URL` | La valeur DATABASE_PUBLIC_URL de Railway |
| `OPENAI_API_KEY` | Ta clé OpenAI `sk-...` |
| `ANTHROPIC_API_KEY` | Ta clé Anthropic `sk-ant-...` |
| `ADMIN_MODE` | `false` |
| `NEXT_PUBLIC_ADMIN_MODE` | `false` |
| `NEXT_PUBLIC_APP_NAME` | `L'Établi — Code & Normes` |

8. Cliquer **"Deploy"**
9. Attendre 2-3 minutes — Vercel compile et déploie automatiquement

### Initialiser la base de données

10. Une fois déployé, tu vois un bouton **"Visit"** — clique-le pour voir ton app
11. Si tu vois une erreur de base de données, aller dans Railway → **Query** et exécuter :
```sql
CREATE TABLE IF NOT EXISTS "Document" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "filename" TEXT UNIQUE NOT NULL,
  "description" TEXT,
  "uploadedAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Chunk" (
  "id" TEXT PRIMARY KEY,
  "documentId" TEXT NOT NULL REFERENCES "Document"("id") ON DELETE CASCADE,
  "content" TEXT NOT NULL,
  "page" INTEGER NOT NULL,
  "section" TEXT,
  "article" TEXT,
  "embedding" vector(1536),
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SearchHistory" (
  "id" TEXT PRIMARY KEY,
  "query" TEXT NOT NULL,
  "results" JSONB NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chunk_doc_idx ON "Chunk"("documentId");
```

---

## ÉTAPE 6 — Activer le mode admin pour ajouter des PDF

Le mode admin doit être activé **temporairement** pour uploader des PDF,
puis désactivé pour l'utilisation normale.

### Activer l'admin

1. Dans Vercel, aller dans ton projet → **"Settings"** → **"Environment Variables"**
2. Trouver `ADMIN_MODE` → cliquer l'icône crayon → changer à `true`
3. Trouver `NEXT_PUBLIC_ADMIN_MODE` → changer à `true`
4. Aller dans **"Deployments"** → cliquer les 3 points sur le dernier déploiement → **"Redeploy"**
5. Attendre 2 minutes → visiter ton app → tu vois le bouton **"Admin"** en haut à droite

### Uploader les PDF

6. Cliquer **"Admin"**
7. Uploader le CCQ 2020 :
   - Nom : `CCQ 2020 — Chapitre I Bâtiment`
   - Description : `Code de construction du Québec avec modifications québécoises`
   - Fichier : `CCQ_2020p1.pdf`
   - Cliquer **"Indexer le document"**
   - ⏳ **Attendre 20-30 minutes** (le CCQ fait 1659 pages — c'est normal)
8. Uploader le Guide RBQ 2026 :
   - Nom : `Guide accessibilité RBQ 2026`
   - Description : `Guide sur l'accessibilité des bâtiments — Régie du bâtiment du Québec`
   - Fichier : `guide-accessibilite-batiment_2026.pdf`
   - Cliquer **"Indexer le document"**
   - ⏳ Attendre 5-10 minutes

### Désactiver l'admin après

9. Retourner dans Vercel → Settings → Environment Variables
10. Remettre `ADMIN_MODE` à `false` et `NEXT_PUBLIC_ADMIN_MODE` à `false`
11. Redéployer

---

## ÉTAPE 7 — Partager avec l'équipe

1. Dans Vercel, ton app a une URL du style `letabli-codes.vercel.app`
2. Envoyer cette URL à toute l'équipe
3. Ils peuvent l'utiliser directement dans leur navigateur — aucune installation

### Créer un favori dans Chrome/Edge

1. Ouvrir l'URL dans Chrome
2. Cliquer les 3 points en haut à droite → **"Plus d'outils"** → **"Créer un raccourci"**
3. Cocher **"Ouvrir dans une fenêtre"** → **"Créer"**
4. L'app apparaît dans la barre des tâches comme une application native

---

## COÛTS

| Service | Coût |
|---------|------|
| GitHub | Gratuit |
| Vercel | Gratuit (usage interne) |
| Railway PostgreSQL | ~5$/mois |
| OpenAI (indexation 1 fois) | ~2-3$ |
| Anthropic (recherches) | ~0.01$ par recherche |

**Total : environ 5-6$/mois**

---

## PROBLÈMES FRÉQUENTS

**"Application error" sur Vercel**
→ Aller dans Vercel → ton projet → **"Deployments"** → cliquer le déploiement → **"Build Logs"** pour voir l'erreur

**"Source insuffisante" sur toutes les questions**
→ Les PDF ne sont pas encore indexés. Activer le mode admin et uploader les PDF.

**L'indexation s'arrête**
→ Vercel a un timeout de 5 minutes. Pour les gros PDF, contacter un développeur pour indexer localement.

**Erreur de base de données**
→ Vérifier que DATABASE_URL contient bien `?sslmode=require` à la fin.

---

## ARCHITECTURE

```
Navigateur → Vercel (Next.js) → Railway (PostgreSQL + pgvector)
                              → OpenAI API (embeddings)
                              → Anthropic API (Claude — réponses)
```

**Logique RAG :**
1. Question → embedding OpenAI
2. Recherche des passages similaires dans pgvector
3. Si similarité < 70% → "Source insuffisante — validation humaine requise"
4. Si OK → Claude génère une réponse basée uniquement sur les passages trouvés
5. Réponse + sources exactes (document, page, article)

