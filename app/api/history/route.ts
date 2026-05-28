import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET() {
  try {
    const history = await prisma.searchHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        query: true,
        createdAt: true,
        results: true,
      },
    })

    return NextResponse.json(history)
  } catch (error) {
    console.error('Erreur historique:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'historique.' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    await prisma.searchHistory.deleteMany({})
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur suppression historique:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'historique.' },
      { status: 500 }
    )
  }
}
