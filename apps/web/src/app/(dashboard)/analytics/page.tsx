'use client'

import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { aoApi, orgApi } from '@/lib/api'
import { formatGNF } from '@/lib/utils'

const COLORS_PIE = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#14b8a6', '#f43f5e']

const COULEURS_SCORE = {
  GO: '#22c55e',
  MAYBE: '#f59e0b',
  NO_GO: '#ef4444',
}

export default function AnalyticsPage() {
  const { data: stats } = useQuery({
    queryKey: ['ao-stats'],
    queryFn: () => aoApi.get('/stats').then(r => r.data),
  })

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => orgApi.get('/dashboard').then(r => r.data),
  })

  const pipelineData = dashboard?.pipeline?.map((p: any) => ({
    name: p.statut.replace('_', ' '),
    count: p._count,
  })) ?? []

  const scoreDistribution = [
    { name: 'GO (≥65)', value: stats?.goCount ?? 12, color: '#22c55e' },
    { name: 'MAYBE (50-64)', value: stats?.maybeCount ?? 8, color: '#f59e0b' },
    { name: 'NO GO (<50)', value: stats?.noGoCount ?? 5, color: '#ef4444' },
  ]

  const tendanceMensuelle = [
    { mois: 'Jan', aos: 8, dossiers: 3, gagnes: 1 },
    { mois: 'Fév', aos: 12, dossiers: 5, gagnes: 2 },
    { mois: 'Mar', aos: 10, dossiers: 6, gagnes: 2 },
    { mois: 'Avr', aos: 18, dossiers: 9, gagnes: 3 },
    { mois: 'Mai', aos: 22, dossiers: 11, gagnes: 4 },
    { mois: 'Juin', aos: 16, dossiers: 8, gagnes: 3 },
  ]

  const secteurData = [
    { secteur: 'Télécoms', valeur: 4200000000 },
    { secteur: 'Énergie', valeur: 2800000000 },
    { secteur: 'Éducation', valeur: 1900000000 },
    { secteur: 'Santé', valeur: 1500000000 },
    { secteur: 'Finance', valeur: 1200000000 },
    { secteur: 'Agriculture', valeur: 900000000 },
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
          { label: 'Valeur pipeline total', value: formatGNF(stats?.valeurTotale ?? 12500000000), sub: 'Montants estimés', color: 'text-orange-600' },
          { label: 'Score moyen', value: `${stats?.scoreMoyen ?? 67}%`, sub: 'Sur AOs scorés', color: 'text-blue-600' },
          { label: 'Taux de succès', value: `${stats?.tauxSucces ?? 38}%`, sub: 'AOs remportés', color: 'text-green-600' },
          { label: 'Dossiers IA générés', value: stats?.dossiersGeneres ?? 47, sub: 'Ce trimestre', color: 'text-purple-600' },
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
          <h2 className="text-base font-semibold text-gray-900 mb-4">Tendance mensuelle</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={tendanceMensuelle}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
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
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
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
            <BarChart data={pipelineData.length ? pipelineData : [
              { name: 'VEILLE', count: 14 },
              { name: 'ANALYSE', count: 8 },
              { name: 'QUALIFICATION', count: 6 },
              { name: 'REDACTION', count: 5 },
              { name: 'SOUMIS', count: 9 },
              { name: 'GAGNE', count: 3 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
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
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={secteurData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tickFormatter={v => `${(v / 1_000_000_000).toFixed(1)} Mrd`} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="secteur" tick={{ fontSize: 12 }} width={80} />
              <Tooltip formatter={(v: number) => formatGNF(v)} />
              <Bar dataKey="valeur" name="Valeur estimée" fill="#f97316" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table sources AOs */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Performance par source de veille</h2>
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
            {[
              { source: 'TELEMO', detectes: 28, soumis: 12, gagnes: 5, taux: 42 },
              { source: 'ARMP', detectes: 19, soumis: 8, gagnes: 3, taux: 38 },
              { source: 'Banque Mondiale', detectes: 14, soumis: 6, gagnes: 2, taux: 33 },
              { source: 'JAO Guinée', detectes: 11, soumis: 4, gagnes: 2, taux: 50 },
              { source: 'BAD', detectes: 8, soumis: 3, gagnes: 1, taux: 33 },
            ].map(row => (
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
      </div>
    </div>
  )
}
