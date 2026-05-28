'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, Loader2 } from 'lucide-react'

interface SearchBarProps {
  onSearch: (query: string) => void
  loading: boolean
}

export function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [query])

  const handleSubmit = () => {
    if (!query.trim() || loading) return
    onSearch(query.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="w-full">
      <div className="flex gap-3 items-end p-3 border border-gray-200 rounded-xl bg-white shadow-sm focus-within:border-gray-400 focus-within:shadow-md transition-all">
        <textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ex: Quelle est la hauteur minimale d'un garde-corps pour un escalier résidentiel?"
          rows={2}
          disabled={loading}
          className="flex-1 resize-none border-none outline-none text-sm text-gray-900 placeholder-gray-400 bg-transparent leading-relaxed min-h-[48px]"
        />
        <button
          onClick={handleSubmit}
          disabled={!query.trim() || loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Search size={16} />
          )}
          {loading ? 'Recherche…' : 'Rechercher'}
        </button>
      </div>
      <p className="mt-1.5 text-xs text-gray-400 pl-1">
        Entrée pour rechercher · Shift+Entrée pour nouvelle ligne
      </p>
    </div>
  )
}
