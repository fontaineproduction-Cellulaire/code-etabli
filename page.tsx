'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { SearchBar } from '@/components/SearchBar'
import { DocumentFilter } from '@/components/DocumentFilter'
import { ResultCard } from '@/components/ResultCard'
import { HistoryPanel } from '@/components/HistoryPanel'
import type { RAGResult } from '@/lib/rag'

interface Document {
  id: string
  name: string
  _count: { chunks: number }
}

interface HistoryItem {
  id: string
  query: string
  createdAt: string
}

export default function HomePage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [result, setResult] = useState<RAGResult | null>(null)
  const [currentQuery, setCurrentQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isAdmin = process.env.NEXT_PUBLIC_ADMIN_MODE === 'true'

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch('/api/documents')
      if (res.ok) {
        const data = await res.json()
        setDocuments(data)
      }
    } catch (e) {
      console.error('Erreur chargement documents:', e)
    }
  }, [])

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/history')
      if (res.ok) {
        const data = await res.json()
        setHistory(data)
      }
    } catch (e) {
      console.error('Erreur chargement historique:', e)
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
    fetchHistory()
  }, [fetchDocuments, fetchHistory])

  const handleSearch = async (query: string, excludeDocIds?: string[]) => {
    setLoading(true)
    setError(null)
    setCurrentQuery(query)

    // Si on contre-vérifie, on exclut les docs déjà utilisés
    let docIds = selectedDocIds
    if (excludeDocIds && excludeDocIds.length > 0) {
      const allIds = documents.map((d) => d.id)
      docIds = allIds.filter((id) => !excludeDocIds.includes(id))
      if (docIds.length === 0) {
        setError('Aucun autre document disponible pour la contre-vérification.')
        setLoading(false)
        return
      }
    }

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          documentIds: docIds.length > 0 ? docIds : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Erreur lors de la recherche.')
        return
      }

      const data: RAGResult = await res.json()
      setResult(data)
      await fetchHistory()
    } catch (e) {
      setError('Erreur de connexion. Vérifiez que le serveur est en cours d\'exécution.')
    } finally {
      setLoading(false)
    }
  }

  const handleClearHistory = async () => {
    try {
      await fetch('/api/history', { method: 'DELETE' })
      setHistory([])
    } catch (e) {
      console.error('Erreur suppression historique:', e)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Logo size="md" />
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <h1 className="text-base font-semibold text-gray-900 leading-tight">
                Code &amp; Normes
              </h1>
              <p className="text-xs text-gray-500">
                Recherche dans les codes du bâtiment québécois
              </p>
            </div>
          </div>
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Settings size={14} />
              Admin
            </Link>
          )}
        </div>
      </header>

      {/* Main layout */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Colonne gauche */}
          <aside className="w-64 shrink-0 space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <DocumentFilter
                documents={documents}
                selectedIds={selectedDocIds}
                onChange={setSelectedDocIds}
              />
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <HistoryPanel
                items={history}
                onSelect={(q) => handleSearch(q)}
                onClear={handleClearHistory}
              />
            </div>

            {!isAdmin && (
              <p className="text-xs text-gray-400 text-center px-2">
                Pour ajouter des documents :{' '}
                <span className="font-mono text-gray-500">ADMIN_MODE=true</span>
              </p>
            )}
          </aside>

          {/* Colonne principale */}
          <main className="flex-1 min-w-0 space-y-5">
            <SearchBar onSearch={handleSearch} loading={loading} />

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {!result && !loading && !error && (
              <div className="text-center py-16">
                <p className="text-gray-400 text-sm">
                  Posez une question sur les codes du bâtiment québécois.
                </p>
                <p className="text-gray-300 text-xs mt-1">
                  CCQ 2020 · Guide accessibilité RBQ 2026 · CNB 2020 · Règlements municipaux
                </p>
              </div>
            )}

            {result && (
              <ResultCard
                result={result}
                query={currentQuery}
                onCounterVerify={(excludeIds) => handleSearch(currentQuery, excludeIds)}
                loading={loading}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
