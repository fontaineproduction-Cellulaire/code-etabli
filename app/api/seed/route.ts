import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { extractPdfChunks } from '@/lib/pdfParser'
import { generateEmbedding } from '@/lib/embeddings'

export const maxDuration = 300
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Liste des PDFs pré-définis à indexer automatiquement
// Mettre ici les URLs publiques des PDFs (GitHub raw, etc.)
// Ces documents sont stables et changent max 1x/an
const PREDEFINED_DOCUMENTS = [
    {
          name: 'CCQ 2020 — Chapitre I Bâtiment (Partie 1)',
          description: 'Code de construction du Québec 2020 — pages 1-200',
          url: process.env.CCQ_PDF_URL_PART1 || '',
        },
    {
          name: 'CCQ 2020 — Chapitre I Bâtiment (Partie 2)',
          description: 'Code de construction du Québec 2020 — pages 201-400',
          url: process.env.CCQ_PDF_URL_PART2 || '',
        },
    {
          name: 'CCQ 2020 — Chapitre I Bâtiment (Partie 3)',
          description: 'Code de construction du Québec 2020 — pages 401+',
          url: process.env.CCQ_PDF_URL_PART3 || '',
        },
  ]

export async function POST(request: NextRequest) {
    if (process.env.ADMIN_MODE !== 'true') {
          return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
        }

    const results: { name: string; status: string; chunks?: number; error?: string }[] = []

    for (const doc of PREDEFINED_DOCUMENTS) {
          if (!doc.url) {
                  results.push({ name: doc.name, status: 'skipped', error: 'URL non configurée' })
                  continue
                }

          try {
                  // Vérifier si déjà indexé
                  const existing = await prisma.document.findFirst({
                            where: { name: doc.name },
                          })
                  if (existing) {
                            results.push({ name: doc.name, status: 'already_indexed', chunks: existing._count?.chunks })
                            continue
                          }

                  // Télécharger le PDF depuis l'URL
      const response = await fetch(doc.url, { signal: AbortSignal.timeout(60000) })
      if (!response.ok) {
        results.push({ name: doc.name, status: 'error', error: `HTTP ${response.status}` })
        continue
      }

      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const filename = `seed_${Date.now()}_${doc.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`

      // Créer le document en base
      const document = await prisma.document.create({
        data: { name: doc.name, filename, description: doc.description },
      })

      // Extraire et indexer les chunks
      const chunks = await extractPdfChunks(buffer)
      if (chunks.length === 0) {
        await prisma.document.delete({ where: { id: document.id } })
        results.push({ name: doc.name, status: 'error', error: 'Aucun texte extrait' })
        continue
      }

      let chunksCreated = 0
      const BATCH_SIZE = 5
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE)
        await Promise.all(
          batch.map(async (chunk) => {
            try {
              const embedding = await generateEmbedding(chunk.content)
              const embeddingStr = `[${embedding.join(',')}]`
              const createdChunk = await prisma.chunk.create({
                data: {
                  documentId: document.id,
                  content: chunk.content,
                  page: chunk.page,
                  section: chunk.section,
                  article: chunk.article,
                },
              })
              await prisma.$executeRawUnsafe(
                `UPDATE "Chunk" SET embedding = '${embeddingStr}'::vector WHERE id = '${createdChunk.id}'`
              )
              chunksCreated++
            } catch (err) {
              console.error(`Erreur chunk:`, err)
            }
          })
        )
      }

      results.push({ name: doc.name, status: 'success', chunks: chunksCreated })
    } catch (err: unknown) {
      results.push({
        name: doc.name,
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return NextResponse.json({ results })
}

export async function GET() {
  return NextResponse.json({
    message: 'Utilisez POST pour lancer l\'indexation des documents pré-définis.',
                documents: PREDEFINED_DOCUMENTS.map((d) => ({ name: d.name, configured: !!d.url })),
              })
}
