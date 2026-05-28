-- Migration: Ajout colonne embedding vector sur Chunk
-- À exécuter après prisma migrate dev

ALTER TABLE "Chunk" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);

CREATE INDEX IF NOT EXISTS chunk_embedding_idx ON "Chunk" 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
