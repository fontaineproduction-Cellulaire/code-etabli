/**
 * Stockage des PDF via Vercel Blob en production, local en dev
 */
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function savePdfFile(buffer: Buffer, filename: string): Promise<string> {
    // En production Vercel, on utilise Vercel Blob
  if (process.env.NODE_ENV === 'production' && process.env.BLOB_READ_WRITE_TOKEN) {
        const { put } = await import('@vercel/blob')
        const blob = await put(`documents/${filename}`, buffer, {
                access: 'public',
                contentType: 'application/pdf',
        })
        return blob.url
  }

  // En dev, on utilise le système de fichiers local
  const uploadDir = path.join(process.cwd(), 'public', 'documents')
    await mkdir(uploadDir, { recursive: true })
    const filePath = path.join(uploadDir, filename)
    await writeFile(filePath, buffer)
    return filePath
}

export async function deletePdfFile(filename: string): Promise<void> {
    if (process.env.NODE_ENV === 'production' && process.env.BLOB_READ_WRITE_TOKEN) {
          try {
                  const { del } = await import('@vercel/blob')
                  // filename peut être une URL complète ou juste un nom de fichier
            const url = filename.startsWith('http')
                    ? filename
                      : `https://blob.vercel-storage.com/documents/${filename}`
                  await del(url)
          } catch {
                  console.warn(`Impossible de supprimer le blob: ${filename}`)
          }
          return
    }

  const { unlink } = await import('fs/promises')
    const uploadDir = path.join(process.cwd(), 'public', 'documents')
    const filePath = path.join(uploadDir, filename)
    try {
          await unlink(filePath)
    } catch {
          console.warn(`Fichier introuvable: ${filePath}`)
    }
}
