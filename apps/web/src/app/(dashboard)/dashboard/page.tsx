'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orgApi, aoApi, dossiersApi, contactsApi, scrapingApi } from '@/lib/api'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  FileSearch, TrendingUp, FileText, CheckCircle2, Clock,
  AlertTriangle, ArrowRight, Activity, Zap, Shield,
  Flame, Target, BarChart3, Plus, RefreshCw, Eye,
  ChevronRight, Users, Trophy, Percent, FolderOpen,
  CalendarClock, ListOrdered,
} from 'lucide-react'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatDistanceToNow, isAfter, isBefore, addDays } from 'date-fns'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

// ── Status configurations ────────────────────────────────────────────────────

const AO_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  NOUVEAU:   { label: 'Nouveau',   color: 'text-blue-800',   bg: 'bg-blue-100' },
  QUALIFIE:  { label: 'Qualifié',  color: 'text-purple-800', bg: 'bg-purple-100' },
  EN_COURS:  { label: 'En cours',  color: 'text-yellow-800', bg: 'bg-yellow-100' },
  SOUMIS:    { label: 'Soumis',    color: 'text-orange-800', bg: 'bg-orange-100' },
  REMPORTE:  { label: 'Remporté',  color: 'text-green-800',  bg: 'bg-green-100' },
  PERDU:     { label: 'Perdu',     color: 'text-red-800',    bg: 'bg-red-100' },
}

const DOSSIER_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; barColor: string }> = {
  BROUILLON:     { label: 'Brouillon',       color: 'text-gray-700',    bg: 'bg-gray-100',    barColor: 'bg-gray-400' },
  EN_COURS:      { label: 'En cours',        color: 'text-blue-700',    bg: 'bg-blue-100',    barColor: 'bg-blue-500' },
  REVUE:         { label: 'En revue',        color: 'text-purple-700',  bg: 'bg-purple-100',  barColor: 'bg-purple-500' },
  EN_VALIDATION: { label: 'En validation',   color: 'text-yellow-700',  bg: 'bg-yellow-100',  barColor: 'bg-yellow-500' },
  VALIDE:        { label: 'Validé',          color: 'text-green-700',   bg: 'bg-green-100',   barColor: 'bg-green-500' },
  REJETE:        { label: 'Rejeté',          color: 'text-red-700',     bg: 'bg-red-100',     barColor: 'bg-red-500' },
  SOUMIS:        { label: 'Soumis',          color: 'text-orange-700',  bg: 'bg-orange-100',  barColor: 'bg-orange-500' },
  ARCHIVE:       { label: 'Archivé',         color: 'text-gray-500',    bg: 'bg-gray-50',     barColor: 'bg-gray-300' },
}

const ACTIVITE_ICONS: Record<string, { icon: any; color: string }> = {
  ao_nouveau: { icon: Zap, color: 'text-blue-500' },
  ao_status: { icon: Activity, color: 'text-orange-500' },
  dossier_update: { icon: Shield, color: 'text-purple-500' },
}

// ── Pipeline stage order ─────────────────────────────────────────────────────

const PIPELINE_ORDER = ['BROUILLON', 'EN_COURS', 'REVUE', 'EN_VALIDATION', 'VALIDE', 'SOUMIS', 'REJETE', 'ARCHIVE'] as const

// ── Main component ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const qc = useQueryClient()

  // ── Data fetching ──────────────────────────────────────────────────────────

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => orgApi.dashboard().then((r) => r.data),
  })

  const { data: aoStats } = useQuery({
    queryKey: ['ao-stats'],
    queryFn: () => aoApi.stats().then((r) => r.data),
  })

  const { data: activite = [] } = useQuery({
    queryKey: ['ao-activite'],
    queryFn: () => aoApi.activite().then((r) => r.data),
    refetchInterval: 30_000,
  })

  const { data: contactsStats } = useQuery({
    queryKey: ['contacts-stats'],
    queryFn: () => contactsApi.stats().then((r) => r.data),
  })

  const { data: dossiersData } = useQuery({
    queryKey: ['dossiers-list'],
    queryFn: () => dossiersApi.list({ limit: 100 }).then((r) => r.data),
  })

  // Recent AOs (last 5 added)
  const { data: recentAOs } = useQuery({
    queryKey: ['ao-recent'],
    queryFn: () => aoApi.list({ limit: 5, sort: 'createdAt', order: 'desc' }).then((r) => r.data),
  })

  // AOs with deadline in next 7 days
  const { data: urgentAOs } = useQuery({
    queryKey: ['ao-urgent'],
    queryFn: () => {
      const now = new Date()
      const in7Days = addDays(now, 7)
      return aoApi
        .list({
          limit: 10,
          dateLimiteMin: now.toISOString(),
          dateLimiteMax: in7Days.toISOString(),
          status: ['NOUVEAU', 'QUALIFIE', 'EN_COURS'],
        })
        .then((r) => r.data)
    },
  })

  // ── Scrape mutation ────────────────────────────────────────────────────────

  const scrapeMutation = useMutation({
    mutationFn: () => scrapingApi.lancer(),
    onSuccess: () => {
      toast.success('Veille lancée avec succès !')
      qc.invalidateQueries({ queryKey: ['ao-stats'] })
      qc.invalidateQueries({ queryKey: ['ao-recent'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: () => toast.error('Erreur lors du lancement de la veille'),
  })

  // ── Derived KPI values ─────────────────────────────────────────────────────

  const aoActifs =
    (dashboard?.appelsOffres?.NOUVEAU ?? 0) +
    (dashboard?.appelsOffres?.QUALIFIE ?? 0) +
    (dashboard?.appelsOffres?.EN_COURS ?? 0)

  const dossiersEnCours =
    (dashboard?.dossiers?.EN_COURS ?? 0) +
    (dashboard?.dossiers?.EN_VALIDATION ?? 0)

  const contactsChauds = contactsStats?.chauds ?? 0

  const remportes = dashboard?.appelsOffres?.REMPORTE ?? 0
  const perdus = dashboard?.appelsOffres?.PERDU ?? 0
  const tauxReussite = remportes + perdus > 0
    ? Math.round((remportes / (remportes + perdus)) * 100)
    : 0

  // ── KPI cards ──────────────────────────────────────────────────────────────

  const kpiCards = [
    {
      titre: 'AOs actifs',
      valeur: aoActifs,
      sous: `${dashboard?.appelsOffres?.NOUVEAU ?? 0} nouveaux · ${dashboard?.appelsOffres?.QUALIFIE ?? 0} qualifiés`,
      icon: FileSearch,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      accent: 'border-l-blue-500',
    },
    {
      titre: 'Dossiers en cours',
      valeur: dossiersEnCours,
      sous: `${dashboard?.dossiers?.EN_COURS ?? 0} en rédaction · ${dashboard?.dossiers?.EN_VALIDATION ?? 0} en validation`,
      icon: FolderOpen,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      accent: 'border-l-purple-500',
    },
    {
      titre: 'Contacts chauds',
      valeur: contactsChauds,
      sous: 'Score proximité ≥ 70',
      icon: Flame,
      color: 'text-red-600',
      bg: 'bg-red-50',
      accent: 'border-l-red-500',
    },
    {
      titre: 'Taux de réussite',
      valeur: `${tauxReussite}%`,
      sous: `${remportes} remportés · ${perdus} perdus`,
      icon: Trophy,
      color: 'text-green-600',
      bg: 'bg-green-50',
      accent: 'border-l-green-500',
    },
  ]

  // ── Chart data ─────────────────────────────────────────────────────────────

  const chartData = Object.entries(AO_STATUS_CONFIG).map(([key, val]) => ({
    name: val.label,
    count: aoStats?.parStatus?.[key] ?? 0,
  }))

  // ── Dossier pipeline data ──────────────────────────────────────────────────

  const dossiersByStatus: Record<string, number> = {}
  if (dossiersData?.data) {
    for (const d of dossiersData.data as any[]) {
      dossiersByStatus[d.status] = (dossiersByStatus[d.status] ?? 0) + 1
    }
  }
  // Also fallback to dashboard aggregated data
  if (dashboard?.dossiers) {
    for (const [k, v] of Object.entries(dashboard.dossiers)) {
      if (!dossiersByStatus[k]) dossiersByStatus[k] = v as number
    }
  }
  const totalDossiers = Object.values(dossiersByStatus).reduce((a, b) => a + b, 0) || 1

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500 text-sm mt-1">
          Vue synthétique de vos opportunités — {format(new Date(), 'EEEE dd MMMM yyyy', { locale: fr })}
        </p>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <div
            key={card.titre}
            className={`bg-white rounded-xl border border-l-4 ${card.accent} p-5 hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{card.titre}</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{card.valeur}</div>
            <div className="text-xs text-gray-500 mt-1.5 leading-relaxed">{card.sous}</div>
          </div>
        ))}
      </div>

      {/* ── Middle row: Chart + Dossier Pipeline ────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Pipeline par statut AO */}
        <div className="lg:col-span-2 bg-white rounded-xl border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Pipeline par statut</h2>
            <Link href="/appels-offres" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              Voir tous <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Score distribution */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Scores IA</h2>
          <div className="space-y-3">
            {[
              { label: 'GO (≥65)', count: aoStats?.goCount ?? 0, color: 'bg-green-500', text: 'text-green-700' },
              { label: 'MAYBE (50-64)', count: aoStats?.maybeCount ?? 0, color: 'bg-yellow-400', text: 'text-yellow-700' },
              { label: 'NO GO (<50)', count: aoStats?.noGoCount ?? 0, color: 'bg-red-400', text: 'text-red-700' },
            ].map((item) => {
              const total = (aoStats?.goCount ?? 0) + (aoStats?.maybeCount ?? 0) + (aoStats?.noGoCount ?? 0)
              const pct = total > 0 ? Math.round((item.count / total) * 100) : 0
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={`font-medium ${item.text}`}>{item.label}</span>
                    <span className="text-gray-500">{item.count} AOs ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`h-2 rounded-full ${item.color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">Score moyen</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">
              {aoStats?.scoreMoyen ?? '—'}<span className="text-sm text-gray-400 font-normal">/100</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Dossiers Pipeline Visual ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-500" />
            <h2 className="font-semibold text-gray-900">Pipeline Dossiers</h2>
          </div>
          <Link href="/dossiers" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
            Voir tous <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="flex items-end gap-0 overflow-x-auto pb-2">
          {PIPELINE_ORDER.map((status, idx) => {
            const cfg = DOSSIER_STATUS_CONFIG[status]
            const count = dossiersByStatus[status] ?? 0
            const pct = totalDossiers > 0 ? Math.round((count / totalDossiers) * 100) : 0
            const isActive = count > 0
            return (
              <div key={status} className="flex-1 min-w-[90px] flex flex-col items-center">
                {/* Count badge */}
                <div className={`text-lg font-bold mb-1 ${isActive ? 'text-gray-900' : 'text-gray-300'}`}>
                  {count}
                </div>
                {/* Bar */}
                <div className="w-full px-1">
                  <div className="w-full bg-gray-100 rounded-t-md" style={{ height: '120px' }}>
                    <div
                      className={`w-full rounded-t-md transition-all duration-700 ${cfg.barColor} ${isActive ? 'opacity-100' : 'opacity-30'}`}
                      style={{ height: `${Math.max(pct, 4)}%`, marginTop: `${100 - Math.max(pct, 4)}%` }}
                    />
                  </div>
                </div>
                {/* Label */}
                <div className={`mt-2 text-center`}>
                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>
                {/* Connector arrow */}
                {idx < PIPELINE_ORDER.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-gray-300 absolute" style={{ display: 'none' }} />
                )}
              </div>
            )
          })}
        </div>
        {/* Summary row */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-6 text-xs text-gray-500">
          <span>Total: <strong className="text-gray-900">{totalDossiers}</strong> dossiers</span>
          <span>En traitement: <strong className="text-purple-600">{dossiersEnCours}</strong></span>
          <span>Soumis: <strong className="text-orange-600">{dossiersByStatus.SOUMIS ?? 0}</strong></span>
          <span>Validés: <strong className="text-green-600">{dossiersByStatus.VALIDE ?? 0}</strong></span>
        </div>
      </div>

      {/* ── Bottom row: Urgent Deadlines + Recent Activity ─────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Urgent Deadlines (7 days) */}
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-red-500" />
              <h2 className="font-semibold text-gray-900">Échéances &lt; 7 jours</h2>
            </div>
            <Link href="/appels-offres" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              Voir tous <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {(!urgentAOs?.data || urgentAOs.data.length === 0) && (
              <div className="text-center py-8">
                <CheckCircle2 className="w-8 h-8 text-green-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Aucune échéance urgente</p>
                <p className="text-xs text-gray-300 mt-1">Toutes les deadlines sont à plus de 7 jours</p>
              </div>
            )}
            {urgentAOs?.data?.map((ao: any) => {
              const joursRestants = Math.floor(
                (new Date(ao.dateLimite).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
              )
              const urgent = joursRestants <= 3
              const veryUrgent = joursRestants <= 1

              return (
                <Link
                  key={ao.id}
                  href={`/appels-offres/${ao.id}`}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    veryUrgent ? 'bg-red-100' : urgent ? 'bg-orange-100' : 'bg-yellow-50'
                  }`}>
                    {veryUrgent ? (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    ) : urgent ? (
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-yellow-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-primary-600 transition-colors">
                      {ao.titre}
                    </p>
                    <p className="text-xs text-gray-500">{ao.entiteAdj}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      veryUrgent ? 'bg-red-100 text-red-700' :
                      urgent ? 'bg-orange-100 text-orange-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {joursRestants <= 0 ? 'Aujourd\'hui!' : `${joursRestants}j`}
                    </div>
                    {ao.score != null && (
                      <div className={`text-xs px-1.5 py-0.5 rounded font-medium mt-0.5 ${
                        ao.score >= 65 ? 'bg-green-100 text-green-700' :
                        ao.score >= 50 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {ao.score}/100
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Recent AOs + Activity combined */}
        <div className="space-y-6">
          {/* Recent AOs (last 5 added) */}
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-blue-500" />
                <h2 className="font-semibold text-gray-900">AOs récents</h2>
              </div>
              <Link href="/appels-offres" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                Voir tous <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {(!recentAOs?.data || recentAOs.data.length === 0) && (
                <p className="text-sm text-gray-400 text-center py-4">Aucun AO récent</p>
              )}
              {recentAOs?.data?.map((ao: any) => (
                <Link
                  key={ao.id}
                  href={`/appels-offres/${ao.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-primary-600 transition-colors">
                      {ao.titre}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <span>{formatDistanceToNow(new Date(ao.createdAt), { addSuffix: true, locale: fr })}</span>
                      {ao.score != null && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span className={`font-medium ${
                            ao.score >= 65 ? 'text-green-600' :
                            ao.score >= 50 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            Score {ao.score}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    AO_STATUS_CONFIG[ao.status]?.bg ?? 'bg-gray-100'
                  } ${AO_STATUS_CONFIG[ao.status]?.color ?? 'text-gray-600'}`}>
                    {AO_STATUS_CONFIG[ao.status]?.label ?? ao.status}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Activity feed */}
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Activité récente</h2>
              <Link href="/analytics" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                Analytiques <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {activite.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Aucune activité récente</p>
              )}
              {activite.map((evt: any) => {
                const cfg = ACTIVITE_ICONS[evt.type] ?? { icon: Activity, color: 'text-gray-400' }
                return (
                  <Link
                    key={evt.id}
                    href={evt.href}
                    className="flex items-start gap-3 hover:bg-gray-50 rounded-lg px-2 py-1.5 transition-colors"
                  >
                    <div className={`w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                      <cfg.icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{evt.titre}</p>
                      <p className="text-xs text-gray-500">{evt.detail}</p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {formatDistanceToNow(new Date(evt.date), { addSuffix: true, locale: fr })}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Actions ────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-5 h-5" />
          <h2 className="font-semibold">Actions rapides</h2>
        </div>
        <p className="text-sm text-orange-100 mb-5">Accédez rapidement aux fonctionnalités clés</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dossiers?new=1"
            className="inline-flex items-center gap-2 bg-white text-orange-600 font-medium text-sm px-5 py-2.5 rounded-lg hover:bg-orange-50 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nouveau dossier
          </Link>
          <button
            onClick={() => scrapeMutation.mutate()}
            disabled={scrapeMutation.isPending}
            className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${scrapeMutation.isPending ? 'animate-spin' : ''}`} />
            {scrapeMutation.isPending ? 'Veille en cours...' : 'Lancer la veille'}
          </button>
          <Link
            href="/pipeline"
            className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
            Voir le pipeline
          </Link>
        </div>
      </div>
    </div>
  )
}
