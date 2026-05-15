'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notifApi } from '@/lib/api'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'
import {
  Bell, AlertTriangle, Clock, CheckCircle2, Check, CheckCheck,
  XCircle, Shield, Send, FileText, RefreshCw, Inbox,
  FolderOpen, ChevronRight,
} from 'lucide-react'
import { useState } from 'react'

/* ── Notification type config ─────────────────────────────────────────────── */

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string; label?: string }> = {
  DEADLINE_URGENTE:       { icon: AlertTriangle, color: 'text-red-600',   bg: 'bg-red-50',    label: 'Urgent' },
  DEADLINE_7J:            { icon: Clock,         color: 'text-orange-600', bg: 'bg-orange-50', label: '7 jours' },
  SCORING_GO:             { icon: CheckCircle2,  color: 'text-green-600',  bg: 'bg-green-50',  label: 'Scoring' },
  NOUVEAU_AO:             { icon: Bell,          color: 'text-blue-600',   bg: 'bg-blue-50',   label: 'Nouvel AO' },
  DOSSIER_EN_VALIDATION:  { icon: Shield,        color: 'text-orange-600', bg: 'bg-orange-50', label: 'Validation' },
  DOSSIER_VALIDE:         { icon: CheckCircle2,  color: 'text-green-600',  bg: 'bg-green-50',  label: 'Validé' },
  DOSSIER_REJETE:         { icon: XCircle,       color: 'text-red-600',    bg: 'bg-red-50',    label: 'Rejeté' },
  DOSSIER_SOUMIS:         { icon: Send,          color: 'text-purple-600', bg: 'bg-purple-50', label: 'Soumis' },
  DOSSIER_BROUILLON:      { icon: FileText,      color: 'text-gray-600',   bg: 'bg-gray-50',   label: 'Brouillon' },
}

const DEFAULT_CONFIG = { icon: Bell, color: 'text-gray-500', bg: 'bg-gray-50', label: 'Notification' }

type FilterValue = 'tout' | 'non-lue' | 'lue'

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function getLink(alerte: any): string | null {
  if (alerte.dossier?.id) return `/dossiers/${alerte.dossier.id}`
  if (alerte.ao?.id) return `/appels-offres/${alerte.ao.id}`
  return null
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function NotificationsPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<FilterValue>('non-lue')

  /* ── Queries ──────────────────────────────────────────────────────────── */

  const { data: alertes = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: () => {
      const lueParam = filter === 'non-lue' ? false : filter === 'lue' ? true : undefined
      return notifApi.list(lueParam).then(r => r.data)
    },
    refetchInterval: 30_000,
    retry: 2,
  })

  /* Separate query for unread count (shown regardless of filter) */
  const { data: countData } = useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: () => notifApi.count().then(r => r.data),
    refetchInterval: 30_000,
  })

  const nonLuesCount = (countData as any)?.nonLues ?? (alertes as any[]).filter(a => !a.lue).length

  /* ── Mutations ────────────────────────────────────────────────────────── */

  const lireMutation = useMutation({
    mutationFn: (id: string) => notifApi.marquerLue(id).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Impossible de marquer la notification comme lue')
    },
  })

  const lireToutMutation = useMutation({
    mutationFn: () => notifApi.marquerToutLu().then(r => r.data),
    onSuccess: () => {
      toast.success('Toutes les notifications marquées comme lues')
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Impossible de marquer toutes les notifications comme lues')
    },
  })

  /* ── Handlers ─────────────────────────────────────────────────────────── */

  function handleNotificationClick(alerte: any) {
    if (!alerte.lue) lireMutation.mutate(alerte.id)
  }

  /* ── Render ───────────────────────────────────────────────────────────── */

  const filterTabs: { value: FilterValue; label: string }[] = [
    { value: 'non-lue', label: 'Non lues' },
    { value: 'lue', label: 'Lues' },
    { value: 'tout', label: 'Toutes' },
  ]

  return (
    <div className="space-y-5 max-w-2xl">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 text-sm mt-1">
            {nonLuesCount > 0
              ? `${nonLuesCount} notification${nonLuesCount > 1 ? 's' : ''} non lue${nonLuesCount > 1 ? 's' : ''}`
              : 'Toutes les notifications sont lues'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {nonLuesCount > 0 && (
            <button
              onClick={() => lireToutMutation.mutate()}
              disabled={lireToutMutation.isPending}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              {lireToutMutation.isPending ? 'En cours…' : 'Tout marquer lu'}
            </button>
          )}
        </div>
      </div>

      {/* ── Filter tabs ────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {filterTabs.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
              filter === value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
            {value === 'non-lue' && nonLuesCount > 0 && (
              <span className="bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {nonLuesCount > 9 ? '9+' : nonLuesCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Error state ────────────────────────────────────────────────── */}
      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Impossible de charger les notifications</p>
            <p className="text-xs text-red-600 mt-1">
              {(error as any)?.response?.data?.message ?? (error as any)?.message ?? 'Erreur inconnue'}
            </p>
            <button
              onClick={() => refetch()}
              className="mt-3 flex items-center gap-1.5 text-xs font-medium text-red-700 hover:text-red-900 bg-red-100 hover:bg-red-200 rounded-lg px-3 py-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Réessayer
            </button>
          </div>
        </div>
      )}

      {/* ── Alerts list ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && (alertes as any[]).length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Inbox className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium text-gray-500">
              {filter === 'non-lue'
                ? 'Aucune notification non lue'
                : filter === 'lue'
                ? 'Aucune notification lue'
                : 'Aucune notification'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {filter === 'non-lue'
                ? 'Vous êtes à jour ! Les nouvelles alertes apparaîtront ici.'
                : filter === 'lue'
                ? 'Les notifications lues apparaîtront ici.'
                : 'Les alertes de deadlines, scoring et dossiers apparaîtront ici.'}
            </p>
            {filter !== 'tout' && (
              <button
                onClick={() => setFilter('tout')}
                className="mt-4 text-sm text-orange-600 hover:underline font-medium"
              >
                Voir toutes les notifications →
              </button>
            )}
          </div>
        )}

        {/* Notification items */}
        {!isLoading && !isError && (alertes as any[]).length > 0 && (
          <div className="divide-y divide-gray-50">
            {(alertes as any[]).map((alerte) => {
              const cfg = TYPE_CONFIG[alerte.type] ?? DEFAULT_CONFIG
              const Icon = cfg.icon
              const href = getLink(alerte)

              const content = (
                <div
                  className={`flex items-start gap-4 p-4 transition-colors group ${
                    alerte.lue
                      ? 'bg-white'
                      : 'bg-orange-50/30 hover:bg-orange-50/50'
                  } ${href ? 'cursor-pointer' : ''}`}
                  onClick={() => handleNotificationClick(alerte)}
                >
                  {/* Type icon */}
                  <div className={`w-9 h-9 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-medium ${alerte.lue ? 'text-gray-600' : 'text-gray-900'}`}>
                        {alerte.titre}
                      </p>
                      {cfg.label && (
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs mt-0.5 line-clamp-2 ${alerte.lue ? 'text-gray-400' : 'text-gray-500'}`}>
                      {alerte.message}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(alerte.createdAt), { addSuffix: true, locale: fr })}
                      </span>
                      {/* Links to AO / Dossier */}
                      {alerte.dossier?.id && (
                        <Link
                          href={`/dossiers/${alerte.dossier.id}`}
                          onClick={(e) => { e.stopPropagation(); if (!alerte.lue) lireMutation.mutate(alerte.id) }}
                          className="text-xs text-orange-600 hover:underline flex items-center gap-0.5"
                        >
                          <FolderOpen className="w-3 h-3" />
                          Voir le dossier <ChevronRight className="w-3 h-3" />
                        </Link>
                      )}
                      {alerte.ao?.id && !alerte.dossier?.id && (
                        <Link
                          href={`/appels-offres/${alerte.ao.id}`}
                          onClick={(e) => { e.stopPropagation(); if (!alerte.lue) lireMutation.mutate(alerte.id) }}
                          className="text-xs text-orange-600 hover:underline flex items-center gap-0.5"
                        >
                          Voir l&apos;AO <ChevronRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Actions / indicators */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!alerte.lue && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          lireMutation.mutate(alerte.id)
                        }}
                        disabled={lireMutation.isPending}
                        title="Marquer comme lu"
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    {!alerte.lue && (
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                    )}
                  </div>
                </div>
              )

              /* If the notification links somewhere, wrap in Link for the main row click */
              if (href) {
                return (
                  <Link key={alerte.id} href={href} className="block" onClick={() => { if (!alerte.lue) lireMutation.mutate(alerte.id) }}>
                    {content}
                  </Link>
                )
              }

              return <div key={alerte.id}>{content}</div>
            })}
          </div>
        )}
      </div>

      {/* ── Footer hint ────────────────────────────────────────────────── */}
      {!isLoading && !isError && (alertes as any[]).length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          Cliquez sur une notification pour ouvrir la ressource associée · Actualisation automatique toutes les 30s
        </p>
      )}
    </div>
  )
}
