-- Script de setup complet pour Railway
-- Coller et exécuter dans Railway > Query

-- 1. Activer pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Créer les tables
CREATE TABLE IF NOT EXISTS "Document" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "filename" TEXT UNIQUE NOT NULL,
  "description" TEXT,
  "uploadedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Chunk" (
  "id" TEXT PRIMARY KEY,
  "documentId" TEXT NOT NULL REFERENCES "Document"("id") ON DELETE CASCADE,
  "content" TEXT NOT NULL,
  "page" INTEGER NOT NULL,
  "section" TEXT,
  "article" TEXT,
  "embedding" vector(1536),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SearchHistory" (
  "id" TEXT PRIMARY KEY,
  "query" TEXT NOT NULL,
  "results" JSONB NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Créer les index
CREATE INDEX IF NOT EXISTS chunk_doc_idx ON "Chunk"("documentId");
CREATE INDEX IF NOT EXISTS chunk_embedding_idx ON "Chunk"
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 4. Vérification
SELECT 'Setup terminé avec succès!' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
