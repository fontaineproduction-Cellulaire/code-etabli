import Anthropic from '@anthropic-ai/sdk'
import { generateEmbedding, embeddingToSql } from './embeddings'
import prisma from './db'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SIMILARITY_THRESHOLD = 0.70
const TOP_K = 8
const SOURCE_INSUFFISANTE = 'Source insuffisante — validation humaine requise.'

const SYSTEM_PROMPT = `Tu es un assistant spécialisé en codes du bâtiment québécois pour la firme L'Établi Architecture & Design à Saint-Hyacinthe, QC.

RÈGLES ABSOLUES — tu dois les respecter sans exception :
1. Tu DOIS répondre UNIQUEMENT en te basant sur les extraits fournis entre les balises <extraits>.
2. Si les extraits ne contiennent pas suffisamment d'information pour répondre avec certitude, réponds EXACTEMENT et SEULEMENT : "${SOURCE_INSUFFISANTE}"
3. Ne génère JAMAIS d'information qui ne provient pas directement des extraits fournis.
4. Cite TOUJOURS le document, la page et l'article exact dans ta réponse.
5. Sois précis, concis et professionnel. Réponds en français québécois.
6. Format de réponse : réponse directe en 2-3 phrases maximum, puis les sources.`

export interface SearchSource {
  documentName: string
  documentId: string
  chunkId: string
  page: number
  section: string | null
  article: string | null
  excerpt: string
  similarity: number
}

export interface RAGResult {
  answer: string
  sources: SearchSource[]
  confidence: number
  isInsufficient: boolean
}

interface ChunkWithDocument {
  id: string
  content: string
  page: number
  section: string | null
  article: string | null
  documentId: string
  similarity: number
  documentName: string
}

export async function performRAG(
  query: string,
  documentIds?: string[]
): Promise<RAGResult> {
  if (!query || query.trim().length === 0) {
    throw new Error('La question ne peut pas être vide.')
  }

  // 1. Générer l'embedding de la question
  const queryEmbedding = await generateEmbedding(query)
  const embeddingStr = embeddingToSql(queryEmbedding)

  // 2. Chercher les chunks similaires avec pgvector
  let documentFilter = ''
  const params: (string | number)[] = [embeddingStr, TOP_K]

  if (documentIds && documentIds.length > 0) {
    const placeholders = documentIds.map((_, i) => `$${i + 3}`).join(', ')
    documentFilter = `AND c."documentId" IN (${placeholders})`
    params.push(...documentIds)
  }

  const rawResults = await prisma.$queryRawUnsafe<ChunkWithDocument[]>(
    `SELECT 
      c.id,
      c.content,
      c.page,
      c.section,
      c.article,
      c."documentId",
      d.name as "documentName",
      1 - (c.embedding <=> '${embeddingStr}'::vector) as similarity
    FROM "Chunk" c
    JOIN "Document" d ON c."documentId" = d.id
    WHERE c.embedding IS NOT NULL
    ${documentFilter}
    ORDER BY c.embedding <=> '${embeddingStr}'::vector
    LIMIT ${TOP_K}`
  )

  // 3. Vérifier le seuil de similarité
  if (!rawResults || rawResults.length === 0) {
    const result: RAGResult = {
      answer: SOURCE_INSUFFISANTE,
      sources: [],
      confidence: 0,
      isInsufficient: true,
    }
    await saveHistory(query, result)
    return result
  }

  const maxSimilarity = Math.max(...rawResults.map((r) => Number(r.similarity)))

  if (maxSimilarity < SIMILARITY_THRESHOLD) {
    const result: RAGResult = {
      answer: SOURCE_INSUFFISANTE,
      sources: [],
      confidence: 0,
      isInsufficient: true,
    }
    await saveHistory(query, result)
    return result
  }

  // 4. Construire le contexte pour Claude
  const sources: SearchSource[] = rawResults.map((r) => ({
    documentName: r.documentName,
    documentId: r.documentId,
    chunkId: r.id,
    page: r.page,
    section: r.section,
    article: r.article,
    excerpt: r.content,
    similarity: Number(r.similarity),
  }))

  const context = sources
    .map(
      (s, i) =>
        `<extrait id="${i + 1}" document="${s.documentName}" page="${s.page}"${s.article ? ` article="${s.article}"` : ''}${s.section ? ` section="${s.section}"` : ''}>
${s.excerpt}
</extrait>`
    )
    .join('\n\n')

  // 5. Générer la réponse avec Claude
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `<extraits>
${context}
</extraits>

Question : ${query}`,
      },
    ],
  })

  const answer =
    message.content[0].type === 'text'
      ? message.content[0].text
      : SOURCE_INSUFFISANTE

  // 6. Vérifier que la réponse n'est pas une hallucination
  const isInsufficient =
    answer.includes(SOURCE_INSUFFISANTE) ||
    answer.trim() === SOURCE_INSUFFISANTE

  const confidence = isInsufficient
    ? 0
    : Math.round(maxSimilarity * 100)

  const result: RAGResult = {
    answer,
    sources: isInsufficient ? [] : sources,
    confidence,
    isInsufficient,
  }

  // 7. Sauvegarder dans l'historique
  await saveHistory(query, result)

  return result
}

async function saveHistory(query: string, result: RAGResult): Promise<void> {
  try {
    await prisma.searchHistory.create({
      data: {
        query,
        results: result as object,
      },
    })
  } catch (error) {
    console.error('Erreur sauvegarde historique:', error)
  }
}
