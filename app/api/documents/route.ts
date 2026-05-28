import { NextRequest, NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import path from 'path'
import prisma from '@/lib/db'

export async function GET() {
  try {
    const documents = await prisma.document.findMany({
      include: {
        _count: {
          select: { chunks: true },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error('Erreur liste documents:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des documents.' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  if (process.env.ADMIN_MODE !== 'true') {
    return NextResponse.json(
      { error: 'Accès refusé. Mode admin requis.' },
      { status: 403 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID du document requis.' },
        { status: 400 }
      )
    }

    const document = await prisma.document.findUnique({ where: { id } })

    if (!document) {
      return NextResponse.json(
        { error: 'Document introuvable.' },
        { status: 404 }
      )
    }

    // Supprimer le fichier PDF
    const filePath = path.join(process.cwd(), 'public', 'documents', document.filename)
    try {
      await unlink(filePath)
    } catch {
      console.warn(`Fichier PDF introuvable: ${filePath}`)
    }

    // Supprimer de la DB (cascade supprime les chunks)
    await prisma.document.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur suppression document:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression.' },
      { status: 500 }
    )
  }
}
