'use client'

import { useState } from 'react'
import { Copy, Check, AlertTriangle, RefreshCw, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import type { RAGResult } from '@/lib/rag'

interface ResultCardProps {
  result: RAGResult
  query: string
  onCounterVerify: (excludeDocIds: string[]) => void
  loading: boolean
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  if (confidence === 0) return null

  const color =
    confidence >= 85
      ? 'bg-green-100 text-green-800 border-green-200'
      : confidence >= 70
      ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
      : 'bg-red-100 text-red-800 border-red-200'

  const label =
    confidence >= 85 ? 'Confiance élevée' : confidence >= 70 ? 'Confiance moyenne' : 'Confiance faible'

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {label} — {confidence}%
    </span>
  )
}

function SourceItem({ source, index }: { source: RAGResult['sources'][0]; index: number }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <FileText size={13} className="text-gray-400 shrink-0" />
          <span className="text-xs font-medium text-gray-700">{source.documentName}</span>
          <span className="text-xs text-gray-400">— p.{source.page}</span>
          {source.article && (
            <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
              Art. {source.article}
            </span>
          )}
          {source.section && (
            <span className="text-xs text-gray-400 hidden sm:inline truncate max-w-[200px]">
              {source.section}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{Math.round(source.similarity * 100)}%</span>
          {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-3 py-2.5 bg-white">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Extrait exact
          </p>
          <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap leading-relaxed bg-gray-50 p-2.5 rounded-md border border-gray-100 max-h-48 overflow-y-auto">
            {source.excerpt}
          </pre>
        </div>
      )}
    </div>
  )
}

export function ResultCard({ result, query, onCounterVerify, loading }: ResultCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const usedDocIds = [...new Set(result.sources.map((s) => s.documentId))]
    const text = formatForCopy(query, result)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCounterVerify = () => {
    const usedDocIds = [...new Set(result.sources.map((s) => s.documentId))]
    onCounterVerify(usedDocIds)
  }

  if (result.isInsufficient) {
    return (
      <div className="p-4 rounded-xl border border-orange-200 bg-orange-50">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-orange-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-orange-900">Source insuffisante</p>
            <p className="text-sm text-orange-700 mt-1">
              Aucun passage suffisamment pertinent n'a été trouvé dans les documents indexés pour répondre à cette question.
              Une validation humaine est requise.
            </p>
            <p className="text-xs text-orange-500 mt-2 font-mono">
              Seuil de similarité minimum non atteint (0.70)
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Réponse principale */}
      <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Réponse</span>
            <ConfidenceBadge confidence={result.confidence} />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
              {copied ? 'Copié' : 'Copier'}
            </button>
            {result.sources.length > 0 && (
              <button
                onClick={handleCounterVerify}
                disabled={loading}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40"
                title="Rechercher dans les autres documents pour contre-vérifier"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                Contre-vérifier
              </button>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">{result.answer}</p>
      </div>

      {/* Sources */}
      {result.sources.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Sources ({result.sources.length})
          </p>
          {result.sources.map((source, i) => (
            <SourceItem key={source.chunkId} source={source} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}

function formatForCopy(query: string, result: RAGResult): string {
  const lines = [
    `QUESTION : ${query}`,
    '',
    `RÉPONSE (confiance : ${result.confidence}%) :`,
    result.answer,
    '',
  ]

  if (result.sources.length > 0) {
    lines.push('SOURCES :')
    result.sources.forEach((s, i) => {
      lines.push(`${i + 1}. ${s.documentName} — p.${s.page}${s.article ? ` — Art. ${s.article}` : ''}`)
      lines.push(`   "${s.excerpt.slice(0, 200)}…"`)
    })
  }

  return lines.join('\n')
}
