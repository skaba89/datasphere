'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notifApi } from '@/lib/api'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'
import { Bell, AlertTriangle, Clock, CheckCircle2, Check, CheckCheck } from 'lucide-react'
import { useState } from 'react'

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  DEADLINE_URGENTE: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  DEADLINE_7J: { icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
  SCORING_GO: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
  NOUVEAU_AO: { icon: Bell, color: 'text-blue-600', bg: 'bg-blue-50' },
}

export default function NotificationsPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<'tout' | 'non-lue'>('non-lue')

  const { data: alertes = [], isLoading } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: () => notifApi.list(filter === 'non-lue' ? false : undefined).then(r => r.data),
    refetchInterval: 30_000,
  })

  const lireMutation = useMutation({
    mutationFn: (id: string) => notifApi.marquerLue(id).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const lireToutMutation = useMutation({
    mutationFn: () => notifApi.marquerToutLu().then(r => r.data),
    onSuccess: () => {
      toast.success('Toutes les alertes marquées comme lues')
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const nonLues = (alertes as any[]).filter(a => !a.lue).length

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 text-sm mt-1">
            {nonLues > 0 ? `${nonLues} alertes non lues` : 'Toutes les alertes sont lues'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {nonLues > 0 && (
            <button
              onClick={() => lireToutMutation.mutate()}
              disabled={lireToutMutation.isPending}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
            >
              <CheckCheck className="w-4 h-4" />
              Tout marquer lu
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {([['non-lue', 'Non lues'], ['tout', 'Toutes']] as const).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === val ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Alerts list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full" />
          </div>
        )}

        {!isLoading && alertes.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {filter === 'non-lue' ? 'Aucune alerte non lue' : 'Aucune notification'}
            </p>
          </div>
        )}

        <div className="divide-y divide-gray-50">
          {(alertes as any[]).map((alerte) => {
            const cfg = TYPE_CONFIG[alerte.type] ?? { icon: Bell, color: 'text-gray-500', bg: 'bg-gray-50' }
            const Icon = cfg.icon
            return (
              <div
                key={alerte.id}
                className={`flex items-start gap-4 p-4 transition-colors ${alerte.lue ? 'bg-white' : 'bg-orange-50/30'}`}
              >
                <div className={`w-9 h-9 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${alerte.lue ? 'text-gray-700' : 'text-gray-900'}`}>
                    {alerte.titre}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{alerte.message}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(alerte.createdAt), { addSuffix: true, locale: fr })}
                    </span>
                    {alerte.ao && (
                      <Link
                        href={`/appels-offres/${alerte.ao.id}`}
                        className="text-xs text-orange-600 hover:underline"
                      >
                        Voir l&apos;AO →
                      </Link>
                    )}
                  </div>
                </div>
                {!alerte.lue && (
                  <button
                    onClick={() => lireMutation.mutate(alerte.id)}
                    disabled={lireMutation.isPending}
                    title="Marquer comme lu"
                    className="flex-shrink-0 p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                {!alerte.lue && <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0 mt-1.5" />}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
