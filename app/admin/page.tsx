'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Upload, Trash2, FileText, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Document {
  id: string
  name: string
  filename: string
  description: string | null
  uploadedAt: string
  _count: { chunks: number }
}

interface UploadStatus {
  type: 'idle' | 'loading' | 'success' | 'error'
  message?: string
  progress?: number
}

export default function AdminPage() {
  const isAdmin = process.env.NEXT_PUBLIC_ADMIN_MODE === 'true'

  const [documents, setDocuments] = useState<Document[]>([])
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ type: 'idle' })
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents')
      if (res.ok) setDocuments(await res.json())
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [])

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-xl border border-gray-200 shadow-sm max-w-md">
          <AlertCircle size={40} className="text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Accès refusé</h2>
          <p className="text-sm text-gray-500 mb-4">
            Le mode admin n'est pas activé. Démarrez l'application avec :
          </p>
          <code className="block bg-gray-100 px-3 py-2 rounded-lg text-sm font-mono text-gray-800 mb-4">
            ADMIN_MODE=true npm run dev
          </code>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 underline">
            Retour à la recherche
          </Link>
        </div>
      </div>
    )
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !name.trim()) return

    setUploadStatus({ type: 'loading', message: 'Envoi du fichier…', progress: 10 })

    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', name.trim())
    formData.append('description', description.trim())

    try {
      setUploadStatus({ type: 'loading', message: 'Extraction du texte…', progress: 30 })

      const res = await fetch('/api/ingest', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setUploadStatus({ type: 'error', message: data.error || 'Erreur lors de l\'indexation.' })
        return
      }

      setUploadStatus({
        type: 'success',
        message: `✓ ${data.chunksCreated} sections indexées sur ${data.totalChunks} extraites.`,
      })

      setName('')
      setDescription('')
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''

      await fetchDocuments()

      setTimeout(() => setUploadStatus({ type: 'idle' }), 5000)
    } catch (err) {
      setUploadStatus({ type: 'error', message: 'Erreur de connexion.' })
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer "${name}" et toutes ses sections indexées ?`)) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/documents?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchDocuments()
      } else {
        alert('Erreur lors de la suppression.')
      }
    } catch (e) {
      alert('Erreur de connexion.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo size="sm" />
            <div className="h-6 w-px bg-gray-200" />
            <h1 className="text-sm font-semibold text-gray-900">Panneau administrateur</h1>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={14} />
            Retour à la recherche
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Formulaire upload */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">
            Ajouter un document PDF
          </h2>

          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du document <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: CCQ 2020 — Chapitre I Bâtiment"
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optionnel)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Code de construction du Québec, modifié 2025"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fichier PDF <span className="text-red-500">*</span>
              </label>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors"
              >
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText size={20} className="text-gray-600" />
                    <span className="text-sm text-gray-700 font-medium">{file.name}</span>
                    <span className="text-xs text-gray-400">
                      ({(file.size / 1024 / 1024).toFixed(1)} Mo)
                    </span>
                  </div>
                ) : (
                  <div>
                    <Upload size={24} className="text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      Cliquez pour sélectionner un PDF
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Max 50 Mo</p>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </div>

            {uploadStatus.type !== 'idle' && (
              <div
                className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
                  uploadStatus.type === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : uploadStatus.type === 'error'
                    ? 'bg-red-50 border border-red-200 text-red-700'
                    : 'bg-blue-50 border border-blue-200 text-blue-700'
                }`}
              >
                {uploadStatus.type === 'loading' && (
                  <Loader2 size={16} className="animate-spin shrink-0" />
                )}
                {uploadStatus.type === 'success' && (
                  <CheckCircle size={16} className="shrink-0" />
                )}
                {uploadStatus.type === 'error' && (
                  <AlertCircle size={16} className="shrink-0" />
                )}
                {uploadStatus.message}
              </div>
            )}

            <button
              type="submit"
              disabled={!file || !name.trim() || uploadStatus.type === 'loading'}
              className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {uploadStatus.type === 'loading' ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Upload size={15} />
              )}
              {uploadStatus.type === 'loading' ? 'Indexation en cours…' : 'Indexer le document'}
            </button>
          </form>
        </div>

        {/* Liste des documents */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">
            Documents indexés ({documents.length})
          </h2>

          {documents.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FileText size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucun document indexé</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <FileText size={18} className="text-gray-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {doc.name}
                      </p>
                      {doc.description && (
                        <p className="text-xs text-gray-500 truncate">{doc.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-400">
                          {doc._count.chunks} sections indexées
                        </span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-400">
                          Ajouté{' '}
                          {formatDistanceToNow(new Date(doc.uploadedAt), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.id, doc.name)}
                    disabled={deletingId === doc.id}
                    className="ml-3 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 shrink-0"
                    title="Supprimer ce document"
                  >
                    {deletingId === doc.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
