'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { aoApi } from '@/lib/api'
import { formatGNF, joursRestants, scoreColor } from '@/lib/utils'
import { toast } from 'sonner'
import { Calendar, TrendingUp, AlertTriangle, GripVertical } from 'lucide-react'

const COLONNES = [
  { value: 'QUALIFIE',  label: 'Qualifiés',   color: 'border-purple-400', bg: 'bg-purple-50',  dot: 'bg-purple-400' },
  { value: 'EN_COURS',  label: 'En cours',    color: 'border-yellow-400', bg: 'bg-yellow-50',  dot: 'bg-yellow-400' },
  { value: 'SOUMIS',    label: 'Soumis',      color: 'border-orange-400', bg: 'bg-orange-50',  dot: 'bg-orange-400' },
  { value: 'REMPORTE',  label: 'Remportés',   color: 'border-green-400',  bg: 'bg-green-50',   dot: 'bg-green-400' },
  { value: 'PERDU',     label: 'Perdus',      color: 'border-red-400',    bg: 'bg-red-50',     dot: 'bg-red-400' },
]

function KanbanCard({ ao, onStatusChange }: { ao: any; onStatusChange: (id: string, status: string) => void }) {
  const router = useRouter()
  const jours = ao.dateLimite ? joursRestants(ao.dateLimite) : null

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
      onClick={() => router.push(`/appels-offres/${ao.id}`)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">{ao.titre}</p>
        <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {ao.entiteAdj && (
        <p className="text-xs text-gray-500 mb-2 truncate">{ao.entiteAdj}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {ao.score != null && (
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${scoreColor(ao.score)}`}>
            <TrendingUp className="w-3 h-3 inline mr-0.5" />
            {ao.score}%
          </span>
        )}
        {jours !== null && (
          <span className={`text-xs flex items-center gap-0.5 ${jours <= 7 ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
            {jours <= 7 && <AlertTriangle className="w-3 h-3" />}
            <Calendar className="w-3 h-3" />
            {jours > 0 ? `${jours}j` : `Expiré`}
          </span>
        )}
        {ao.budgetEstimeGNF && (
          <span className="text-xs text-gray-400 ml-auto">{formatGNF(Number(ao.budgetEstimeGNF))}</span>
        )}
      </div>

      {/* Quick status change */}
      <div
        className="mt-2 pt-2 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={e => e.stopPropagation()}
      >
        <select
          className="w-full text-xs border border-gray-200 rounded px-1.5 py-1 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-orange-400"
          defaultValue={ao.status}
          onChange={e => onStatusChange(ao.id, e.target.value)}
        >
          {COLONNES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
          <option value="NOUVEAU">Nouveau</option>
        </select>
      </div>
    </div>
  )
}

function KanbanColumn({
  colonne,
  items,
  onStatusChange,
}: {
  colonne: typeof COLONNES[0]
  items: any[]
  onStatusChange: (id: string, status: string) => void
}) {
  const totalBudget = items.reduce((sum, ao) => sum + Number(ao.budgetEstimeGNF ?? 0), 0)

  return (
    <div className={`flex flex-col min-h-[500px] rounded-xl border-t-4 ${colonne.color} ${colonne.bg} p-3`}>
      {/* Column header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${colonne.dot}`} />
          <span className="text-sm font-semibold text-gray-800">{colonne.label}</span>
          <span className="text-xs bg-white text-gray-600 px-1.5 py-0.5 rounded-full font-medium border border-gray-200">
            {items.length}
          </span>
        </div>
        {totalBudget > 0 && (
          <span className="text-xs text-gray-500 font-medium">{formatGNF(totalBudget)}</span>
        )}
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 flex-1">
        {items.length === 0 ? (
          <div className="flex-1 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
            <p className="text-xs text-gray-400">Aucun AO</p>
          </div>
        ) : (
          items.map(ao => (
            <KanbanCard key={ao.id} ao={ao} onStatusChange={onStatusChange} />
          ))
        )}
      </div>
    </div>
  )
}

export default function PipelinePage() {
  const qc = useQueryClient()

  const { data: pipeline = [], isLoading } = useQuery({
    queryKey: ['pipeline'],
    queryFn: () => aoApi.pipeline().then(r => r.data),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      aoApi.updateStatus(id, status).then(r => r.data),
    onSuccess: () => {
      toast.success('Statut mis à jour')
      qc.invalidateQueries({ queryKey: ['pipeline'] })
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  })

  const totalAOs = pipeline.reduce((sum: number, col: any) => sum + col.count, 0)
  const totalBudget = pipeline.reduce(
    (sum: number, col: any) =>
      sum + col.items.reduce((s: number, ao: any) => s + Number(ao.budgetEstimeGNF ?? 0), 0),
    0,
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  const colMap = Object.fromEntries(pipeline.map((col: any) => [col.status, col.items ?? []]))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline Kanban</h1>
          <p className="text-gray-500 mt-1">Visualisez et gérez votre pipeline d&apos;opportunités</p>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <p className="text-xs text-gray-400">Total AOs</p>
            <p className="text-xl font-bold text-gray-900">{totalAOs}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Valeur pipeline</p>
            <p className="text-xl font-bold text-orange-600">{formatGNF(totalBudget)}</p>
          </div>
        </div>
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 pb-4 overflow-x-auto">
        {COLONNES.map(col => (
          <KanbanColumn
            key={col.value}
            colonne={col}
            items={colMap[col.value] ?? []}
            onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
          />
        ))}
      </div>
    </div>
  )
}
