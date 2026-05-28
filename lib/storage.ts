/**
 * Stockage des PDF : local en dev, Vercel Blob en production
 * En mode Railway/Vercel, les PDFs sont stockés dans /tmp (temporaire)
 * Pour une solution permanente, activer Vercel Blob (optionnel)
 */
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function savePdfFile(buffer: Buffer, filename: string): Promise<string> {
  // En production Vercel, on utilise /tmp
  const uploadDir = process.env.NODE_ENV === 'production'
    ? '/tmp/documents'
    : path.join(process.cwd(), 'public', 'documents')

  await mkdir(uploadDir, { recursive: true })
  const filePath = path.join(uploadDir, filename)
  await writeFile(filePath, buffer)
  return filePath
}

export async function deletePdfFile(filename: string): Promise<void> {
  const { unlink } = await import('fs/promises')
  const uploadDir = process.env.NODE_ENV === 'production'
    ? '/tmp/documents'
    : path.join(process.cwd(), 'public', 'documents')

  const filePath = path.join(uploadDir, filename)
  try {
    await unlink(filePath)
  } catch {
    console.warn(`Fichier introuvable: ${filePath}`)
  }
}
