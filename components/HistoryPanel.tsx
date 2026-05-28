'use client'

import { useState } from 'react'
import { History, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface HistoryItem {
  id: string
  query: string
  createdAt: string
}

interface HistoryPanelProps {
  items: HistoryItem[]
  onSelect: (query: string) => void
  onClear: () => void
}

export function HistoryPanel({ items, onSelect, onClear }: HistoryPanelProps) {
  const [collapsed, setCollapsed] = useState(false)

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="flex items-center gap-2 p-2 text-gray-500 hover:text-gray-900 text-xs"
        title="Afficher l'historique"
      >
        <ChevronRight size={14} />
        <History size={14} />
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <History size={13} className="text-gray-400" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Historique
          </p>
        </div>
        <div className="flex items-center gap-1">
          {items.length > 0 && (
            <button
              onClick={onClear}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              title="Effacer l'historique"
            >
              <Trash2 size={13} />
            </button>
          )}
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <ChevronLeft size={13} />
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-gray-400 italic px-1">Aucune recherche récente</p>
      ) : (
        <div className="space-y-0.5 max-h-64 overflow-y-auto">
          {items.slice(0, 20).map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item.query)}
              className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-gray-50 group transition-colors"
            >
              <p className="text-xs text-gray-700 truncate group-hover:text-gray-900">
                {item.query}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatDistanceToNow(new Date(item.createdAt), {
                  addSuffix: true,
                  locale: fr,
                })}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
