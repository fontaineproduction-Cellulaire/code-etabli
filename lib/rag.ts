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

const PERPLEXITY_SYSTEM_PROMPT = `Tu es un assistant expert en codes du bâtiment et normes de construction, spécialisé pour le Québec et le Canada.
Contexte : Tu travailles pour L'Établi Architecture & Design à Saint-Hyacinthe, QC.
Réponds en français québécois, de façon précise et professionnelle.
Base-toi sur le Code national du bâtiment (CNB), le Code de construction du Québec (CCQ), les normes de la Régie du bâtiment du Québec (RBQ), et les standards CSA/ULC pertinents.
Indique toujours la source normative (ex: CCQ 2020 art. 3.3.1.2, CNB 2020, RBQ, etc.).
Si tu n'es pas certain, dis-le clairement.`

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
    perplexityUsed?: boolean
    perplexityCitations?: string[]
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

// Appel à l'API Perplexity pour recherche web avec contexte normatif
async function queryPerplexity(query: string): Promise<{ answer: string; citations: string[] }> {
    const apiKey = process.env.PERPLEXITY_API_KEY
    if (!apiKey) {
          throw new Error('PERPLEXITY_API_KEY non configurée')
    }

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
        },
        body: JSON.stringify({
                model: 'sonar',
                messages: [
                  { role: 'system', content: PERPLEXITY_SYSTEM_PROMPT },
                  { role: 'user', content: query },
                        ],
                max_tokens: 1024,
                temperature: 0.2,
                search_domain_filter: [
                          'ccq.com',
                          'rbq.gouv.qc.ca',
                          'nrc-cnrc.gc.ca',
                          'irc.nrc-cnrc.gc.ca',
                          'publicationsduquebec.gouv.qc.ca',
                          'legisquebec.gouv.qc.ca',
                          'nrcan.gc.ca',
                          'csagroup.org',
                        ],
                return_citations: true,
                search_recency_filter: 'year',
        }),
  })

  if (!response.ok) {
        const err = await response.text()
        throw new Error(`Perplexity API error: ${response.status} — ${err}`)
  }

  const data = await response.json()
    const answer = data.choices?.[0]?.message?.content ?? ''
    const citations: string[] = data.citations ?? []

        return { answer, citations }
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
  const hasGoodResults =
        rawResults &&
        rawResults.length > 0 &&
        Math.max(...rawResults.map((r) => Number(r.similarity))) >= SIMILARITY_THRESHOLD

  if (!hasGoodResults) {
        // Pas de bonne source locale → essayer Perplexity si disponible
      if (process.env.PERPLEXITY_API_KEY) {
              try {
                        const { answer, citations } = await queryPerplexity(query)
                        const result: RAGResult = {
                                    answer,
                                    sources: [],
                                    confidence: 75,
                                    isInsufficient: false,
                                    perplexityUsed: true,
                                    perplexityCitations: citations,
                        }
                        await saveHistory(query, result)
                        return result
              } catch (perplexityErr) {
                        console.error('Perplexity fallback failed:', perplexityErr)
              }
      }

      // Ni source locale ni Perplexity → source insuffisante
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
        excerpt: r.content.slice(0, 500),
        similarity: Math.round(Number(r.similarity) * 100),
  }))

  const context = rawResults
      .map(
              (r) =>
                        `[${r.documentName} — p.${r.page}${r.article ? ` — Art. ${r.article}` : ''}]\n${r.content}`
            )
      .join('\n\n---\n\n')

  // 5. Générer la réponse avec Claude
  const userMessage = `<extraits>\n${context}\n</extraits>\n\nQuestion : ${query}`

  const response = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
  })

  const answer =
        response.content[0].type === 'text' ? response.content[0].text : SOURCE_INSUFFISANTE

  const isInsufficient = answer.includes(SOURCE_INSUFFISANTE)

  const maxSimilarity = Math.max(...rawResults.map((r) => Number(r.similarity)))
    const confidence = isInsufficient ? 0 : Math.round(maxSimilarity * 100)

  const finalResult: RAGResult = {
        answer,
        sources: isInsufficient ? [] : sources,
        confidence,
        isInsufficient,
        perplexityUsed: false,
  }

  await saveHistory(query, finalResult)
    return finalResult
}

async function saveHistory(query: string, result: RAGResult): Promise<void> {
    try {
          await prisma.searchHistory.create({
                  data: {
                            query,
                            results: result as object,
                  },
          })
    } catch (err) {
          console.error('Erreur sauvegarde historique:', err)
    }
}
