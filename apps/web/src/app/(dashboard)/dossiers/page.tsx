'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dossiersApi } from '@/lib/api'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  FileText, Plus, Sparkles, Send, Clock, CheckCircle2,
  Eye, Download, Users
} from 'lucide-react'
import { toast } from 'sonner'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  BROUILLON: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700' },
  EN_COURS: { label: 'En cours', color: 'bg-yellow-100 text-yellow-700' },
  REVUE: { label: 'En revue', color: 'bg-blue-100 text-blue-700' },
  SOUMIS: { label: 'Soumis', color: 'bg-green-100 text-green-700' },
  ARCHIVE: { label: 'Archivé', color: 'bg-gray-100 text-gray-500' },
}

export default function DossiersPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['dossiers', page],
    queryFn: () => dossiersApi.list({ page, limit: 15 }).then((r) => r.data),
  })

  const genererMutation = useMutation({
    mutationFn: (id: string) => dossiersApi.genererIA(id),
    onSuccess: () => {
      toast.success('Dossier généré avec succès par l\'IA !')
      qc.invalidateQueries({ queryKey: ['dossiers'] })
    },
    onError: () => toast.error('Erreur lors de la génération IA'),
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dossiers de Réponse</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.meta?.total ?? 0} dossiers</p>
        </div>
        <button className="inline-flex items-center gap-2 bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600">
          <Plus className="w-4 h-4" />
          Créer un dossier
        </button>
      </div>

      {/* Liste */}
      <div className="bg-white border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500 text-sm">Chargement...</div>
        ) : data?.data?.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Aucun dossier créé</p>
            <p className="text-sm text-gray-400 mt-1">
              Commencez par qualifier un AO et créez votre premier dossier
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Titre</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Appel d'offres</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Statut</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Mis à jour</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.data?.map((dossier: any) => {
                const statusConf = STATUS_CONFIG[dossier.status] || STATUS_CONFIG.BROUILLON
                return (
                  <tr key={dossier.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm text-gray-900 line-clamp-1">{dossier.titre}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {dossier.generatedByAI && (
                          <span className="text-xs text-purple-600 flex items-center gap-0.5">
                            <Sparkles className="w-3 h-3" />
                            IA
                          </span>
                        )}
                        <span className="text-xs text-gray-400">v{dossier.version}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-700 line-clamp-1">{dossier.ao?.titre}</div>
                      <div className="text-xs text-gray-400">{dossier.ao?.entiteAdj}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusConf.color}`}>
                        {statusConf.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {format(new Date(dossier.updatedAt), 'dd/MM/yyyy', { locale: fr })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 text-gray-400 hover:text-gray-700 rounded">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => genererMutation.mutate(dossier.id)}
                          disabled={genererMutation.isPending}
                          className="p-1.5 text-purple-400 hover:text-purple-700 rounded"
                          title="Générer avec IA"
                        >
                          <Sparkles className="w-4 h-4" />
                        </button>
                        {dossier.exportPdfUrl && (
                          <button className="p-1.5 text-green-400 hover:text-green-700 rounded">
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
