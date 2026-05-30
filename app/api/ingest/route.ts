import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { extractPdfChunks } from '@/lib/pdfParser'
import { generateEmbedding } from '@/lib/embeddings'

export const maxDuration = 300
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
      if (process.env.ADMIN_MODE !== 'true') {
              return NextResponse.json(
                  { error: 'Accès refusé. Mode admin requis.' },
                  { status: 403 }
                      )
      }

  try {
          const formData = await request.formData()
          const file = formData.get('file') as File | null
          const name = formData.get('name') as string | null
          const description = formData.get('description') as string | null

        if (!file || !name) {
                  return NextResponse.json({ error: 'Fichier et nom requis.' }, { status: 400 })
        }

        if (!file.name.endsWith('.pdf')) {
                  return NextResponse.json({ error: 'Seuls les fichiers PDF sont acceptés.' }, { status: 400 })
        }

        const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
          const bytes = await file.arrayBuffer()
          const buffer = Buffer.from(bytes)

        // Tentative de sauvegarde optionnelle (ne bloque pas l'indexation si elle échoue)
        let savedFilename = filename
          try {
                    if (process.env.BLOB_READ_WRITE_TOKEN) {
                                const { put } = await import('@vercel/blob')
                                const blob = await put(`documents/${filename}`, buffer, {
                                              access: 'public',
                                              contentType: 'application/pdf',
                                })
                                savedFilename = blob.url
                    }
          } catch (storageErr) {
                    console.warn('Stockage optionnel échoué (ignoré):', storageErr)
          }

        const document = await prisma.document.create({
                  data: { name, filename: savedFilename, description: description || null },
        })

        const chunks = await extractPdfChunks(buffer)

        if (chunks.length === 0) {
                  await prisma.document.delete({ where: { id: document.id } })
                  return NextResponse.json(
                      { error: "Impossible d'extraire du texte de ce PDF." },
                      { status: 400 }
                            )
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
                                                            console.error(`Erreur chunk page ${chunk.page}:`, err)
                                            }
                              })
                            )
        }

        return NextResponse.json({
                  success: true,
                  documentId: document.id,
                  documentName: name,
                  chunksCreated,
                  totalChunks: chunks.length,
        })
  } catch (error) {
          console.error('Erreur ingest:', error)
          return NextResponse.json(
              { error: "Erreur lors de l'indexation du document." },
              { status: 500 }
                  )
  }
}
