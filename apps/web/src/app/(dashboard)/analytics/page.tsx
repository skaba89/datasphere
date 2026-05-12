'use client'

import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { aoApi } from '@/lib/api'
import { formatGNF } from '@/lib/utils'

const COLORS_PIE = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#14b8a6', '#f43f5e', '#eab308', '#06b6d4']

export default function AnalyticsPage() {
  const { data: stats } = useQuery({
    queryKey: ['ao-stats'],
    queryFn: () => aoApi.stats().then(r => r.data),
  })

  const { data: tendance = [] } = useQuery({
    queryKey: ['ao-tendance'],
    queryFn: () => aoApi.tendance().then(r => r.data),
  })

  const { data: secteurs = [] } = useQuery({
    queryKey: ['ao-secteurs'],
    queryFn: () => aoApi.parSecteur().then(r => r.data),
  })

  const { data: sourcesData = [] } = useQuery({
    queryKey: ['ao-sources'],
    queryFn: () => aoApi.parSource().then(r => r.data),
  })

  const STATUS_LABELS: Record<string, string> = {
    NOUVEAU: 'Nouveau', QUALIFIE: 'Qualifié', EN_COURS: 'En cours',
    SOUMIS: 'Soumis', REMPORTE: 'Remporté', PERDU: 'Perdu', ARCHIVE: 'Archivé',
  }
  const pipelineData = stats?.parStatus
    ? Object.entries(stats.parStatus).map(([k, v]) => ({ name: STATUS_LABELS[k] ?? k, count: v }))
    : []

  const scoreDistribution = [
    { name: 'GO (≥65)', value: stats?.goCount ?? 0, color: '#22c55e' },
    { name: 'MAYBE (50-64)', value: stats?.maybeCount ?? 0, color: '#f59e0b' },
    { name: 'NO GO (<50)', value: stats?.noGoCount ?? 0, color: '#ef4444' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytiques & Rapports</h1>
        <p className="text-gray-500 mt-1">Performance de votre pipeline d&apos;appels d&apos;offres</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Valeur pipeline total', value: formatGNF(Number(stats?.valeurTotale ?? 0)), sub: 'Montants estimés', color: 'text-orange-600' },
          { label: 'Score moyen', value: stats?.scoreMoyen != null ? `${stats.scoreMoyen}/100` : '—', sub: 'Sur AOs scorés', color: 'text-blue-600' },
          { label: 'Taux de succès', value: `${stats?.tauxSucces ?? 0}%`, sub: 'AOs soumis remportés', color: 'text-green-600' },
          { label: 'Dossiers IA générés', value: stats?.dossiersGeneres ?? 0, sub: 'Avec contenu généré', color: 'text-purple-600' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">{kpi.label}</p>
            <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
            <p className="text-xs text-gray-400 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendance mensuelle */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Tendance mensuelle (6 mois)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={tendance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="aos" name="AOs détectés" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="dossiers" name="Dossiers créés" stroke="#f97316" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="gagnes" name="Marchés gagnés" stroke="#22c55e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition scoring */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Répartition des scores IA</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={scoreDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
                label={({ name, percent }) => percent > 0 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''}
                labelLine={false}
              >
                {scoreDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Pipeline par statut */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Pipeline par statut</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={pipelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name="AOs" radius={[4, 4, 0, 0]}>
                {COLORS_PIE.map((c, i) => <Cell key={i} fill={c} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Valeur par secteur */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Valeur des marchés par secteur</h2>
          {secteurs.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={secteurs} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tickFormatter={v => `${(v / 1_000_000_000).toFixed(1)} Mrd`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="secteur" tick={{ fontSize: 12 }} width={90} />
                <Tooltip formatter={(v: number) => formatGNF(v)} />
                <Bar dataKey="valeur" name="Valeur estimée" fill="#f97316" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              Aucune donnée secteur disponible
            </div>
          )}
        </div>
      </div>

      {/* Table sources AOs */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Performance par source de veille</h2>
        {sourcesData.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Aucune donnée source disponible</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 font-medium text-gray-500">Source</th>
                <th className="text-right py-2 font-medium text-gray-500">AOs détectés</th>
                <th className="text-right py-2 font-medium text-gray-500">Soumis</th>
                <th className="text-right py-2 font-medium text-gray-500">Gagnés</th>
                <th className="text-right py-2 font-medium text-gray-500">Taux succès</th>
              </tr>
            </thead>
            <tbody>
              {sourcesData.map((row: any) => (
                <tr key={row.source} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 font-medium text-gray-900">{row.source}</td>
                  <td className="py-3 text-right text-gray-600">{row.detectes}</td>
                  <td className="py-3 text-right text-gray-600">{row.soumis}</td>
                  <td className="py-3 text-right text-green-600 font-medium">{row.gagnes}</td>
                  <td className="py-3 text-right">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      row.taux >= 45 ? 'bg-green-100 text-green-700' :
                      row.taux >= 35 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {row.taux}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
