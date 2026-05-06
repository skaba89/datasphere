'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { contactsApi } from '@/lib/api'
import { Search, UserPlus, Flame, Thermometer, Snowflake, Phone, Mail } from 'lucide-react'
import { clsx } from 'clsx'

function ProximiteIcon({ score }: { score: number }) {
  if (score >= 70) return <Flame className="w-4 h-4 text-red-500" aria-label="Chaud" />
  if (score >= 30) return <Thermometer className="w-4 h-4 text-orange-400" aria-label="Tiède" />
  return <Snowflake className="w-4 h-4 text-blue-400" aria-label="Froid" />
}

export default function ContactsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data: stats } = useQuery({
    queryKey: ['contacts-stats'],
    queryFn: () => contactsApi.stats().then((r) => r.data),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', { search, page }],
    queryFn: () => contactsApi.list({ search, page, limit: 20 }).then((r) => r.data),
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM Contacts</h1>
          <p className="text-sm text-gray-500 mt-0.5">{stats?.total ?? 0} contacts institutionnels</p>
        </div>
        <button className="inline-flex items-center gap-2 bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600">
          <UserPlus className="w-4 h-4" />
          Nouveau contact
        </button>
      </div>

      {/* Stats relation */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Chauds', valeur: stats?.chauds ?? 0, icon: Flame, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Tièdes', valeur: stats?.tiedes ?? 0, icon: Thermometer, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Froids', valeur: stats?.froids ?? 0, icon: Snowflake, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white border rounded-xl p-4">
            <div className={`inline-flex w-8 h-8 ${s.bg} rounded-lg items-center justify-center mb-2`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{s.valeur}</div>
            <div className="text-sm text-gray-600">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recherche */}
      <div className="bg-white border rounded-xl p-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Rechercher par nom, poste, entité..."
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>
      </div>

      {/* Liste contacts */}
      <div className="bg-white border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500 text-sm">Chargement...</div>
        ) : (
          <div className="divide-y">
            {data?.data?.map((contact: any) => (
              <div key={contact.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 font-semibold text-primary-700">
                  {contact.prenom[0]}{contact.nom[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{contact.prenom} {contact.nom}</span>
                    <ProximiteIcon score={contact.scoreProximite} />
                  </div>
                  <div className="text-sm text-gray-500">{contact.titre} {contact.poste && `— ${contact.poste}`}</div>
                  {contact.entite && (
                    <div className="text-xs text-gray-400 mt-0.5">{contact.entite.nom}</div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {contact.email?.[0] && (
                    <a href={`mailto:${contact.email[0]}`} className="text-gray-400 hover:text-primary-600">
                      <Mail className="w-4 h-4" />
                    </a>
                  )}
                  {contact.telephone?.[0] && (
                    <a href={`tel:${contact.telephone[0]}`} className="text-gray-400 hover:text-green-600">
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {contact._count?.interactions ?? 0} interact.
                  </span>
                </div>
              </div>
            ))}
            {data?.data?.length === 0 && (
              <div className="text-center py-12 text-gray-500 text-sm">Aucun contact trouvé</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
