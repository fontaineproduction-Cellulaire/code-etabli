'use client'

import { FileText, AlertCircle } from 'lucide-react'

interface Document {
  id: string
  name: string
  _count: { chunks: number }
}

interface DocumentFilterProps {
  documents: Document[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function DocumentFilter({ documents, selectedIds, onChange }: DocumentFilterProps) {
  const allSelected = selectedIds.length === 0

  const toggleAll = () => onChange([])

  const toggleDoc = (id: string) => {
    if (selectedIds.includes(id)) {
      const next = selectedIds.filter((d) => d !== id)
      onChange(next)
    } else {
      onChange([...selectedIds, id])
    }
  }

  if (documents.length === 0) {
    return (
      <div className="p-4 rounded-lg border border-orange-100 bg-orange-50">
        <div className="flex items-start gap-2">
          <AlertCircle size={16} className="text-orange-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-orange-800">Aucun document indexé</p>
            <p className="text-xs text-orange-600 mt-0.5">
              Un administrateur doit d'abord ajouter des PDF via le panneau admin.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        Filtrer par document
      </p>

      <label className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer group">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400 cursor-pointer"
        />
        <span className="text-sm text-gray-700 flex-1">Tous les documents</span>
        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
          {documents.reduce((acc, d) => acc + d._count.chunks, 0)}
        </span>
      </label>

      <div className="border-t border-gray-100 pt-1.5 space-y-0.5">
        {documents.map((doc) => (
          <label
            key={doc.id}
            className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(doc.id)}
              onChange={() => toggleDoc(doc.id)}
              className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400 cursor-pointer"
            />
            <FileText size={14} className="text-gray-400 shrink-0" />
            <span className="text-sm text-gray-700 flex-1 leading-tight">{doc.name}</span>
            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full shrink-0">
              {doc._count.chunks}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
