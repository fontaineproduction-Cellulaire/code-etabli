import { NextRequest, NextResponse } from 'next/server'
import { performRAG } from '@/lib/rag'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, documentIds } = body

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'La question ne peut pas être vide.' },
        { status: 400 }
      )
    }

    if (query.trim().length < 5) {
      return NextResponse.json(
        { error: 'La question est trop courte.' },
        { status: 400 }
      )
    }

    const result = await performRAG(
      query.trim(),
      documentIds && documentIds.length > 0 ? documentIds : undefined
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erreur search:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la recherche.' },
      { status: 500 }
    )
  }
}
