'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contactsApi, entitesApi } from '@/lib/api'
import { Search, UserPlus, Flame, Thermometer, Snowflake, Phone, Mail, X, Tag, Building2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

function ProximiteIcon({ score }: { score: number }) {
  if (score >= 70) return <Flame className="w-4 h-4 text-red-500" />
  if (score >= 30) return <Thermometer className="w-4 h-4 text-orange-400" />
  return <Snowflake className="w-4 h-4 text-blue-400" />
}

function NouveauContactModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    prenom: '', nom: '', titre: '', poste: '',
    email: '', telephone: '', notes: '', entiteId: '',
  })
  const [entiteSearch, setEntiteSearch] = useState('')
  const [showNewEntite, setShowNewEntite] = useState(false)
  const [newEntite, setNewEntite] = useState({ nom: '', type: 'Ministère' })

  const { data: entites } = useQuery({
    queryKey: ['entites', entiteSearch],
    queryFn: () => entitesApi.list(entiteSearch || undefined).then(r => r.data),
  })

  const createEntiteMutation = useMutation({
    mutationFn: () => entitesApi.create(newEntite).then(r => r.data),
    onSuccess: (e: any) => {
      setForm(f => ({ ...f, entiteId: e.id }))
      setEntiteSearch(e.nom)
      setShowNewEntite(false)
      qc.invalidateQueries({ queryKey: ['entites'] })
    },
  })

  const mutation = useMutation({
    mutationFn: () => contactsApi.create({
      ...form,
      email: form.email ? [form.email] : [],
      telephone: form.telephone ? [form.telephone] : [],
      entiteId: form.entiteId || undefined,
    }),
    onSuccess: () => {
      toast.success('Contact créé avec succès')
      qc.invalidateQueries({ queryKey: ['contacts'] })
      qc.invalidateQueries({ queryKey: ['contacts-stats'] })
      onClose()
    },
    onError: () => toast.error('Erreur lors de la création du contact'),
  })

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900">Nouveau contact institutionnel</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Prénom *</label>
              <input
                value={form.prenom}
                onChange={(e) => set('prenom', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="Mamadou"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Nom *</label>
              <input
                value={form.nom}
                onChange={(e) => set('nom', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="Diallo"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Titre / Civilité</label>
              <select
                value={form.titre}
                onChange={(e) => set('titre', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="">—</option>
                <option>M.</option>
                <option>Mme</option>
                <option>Dr</option>
                <option>Pr</option>
                <option>DG</option>
                <option>Ministre</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Poste</label>
              <input
                value={form.poste}
                onChange={(e) => set('poste', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="Directeur Général"
              />
            </div>
          </div>

          {/* Entité institutionnelle */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Organisation / Entité
            </label>
            {!showNewEntite ? (
              <div className="relative">
                <input
                  value={entiteSearch}
                  onChange={e => { setEntiteSearch(e.target.value); setForm(f => ({ ...f, entiteId: '' })) }}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="Ministère, agence, entreprise publique..."
                />
                {entiteSearch && !form.entiteId && entites && entites.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {entites.map((e: any) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => { setForm(f => ({ ...f, entiteId: e.id })); setEntiteSearch(e.nom) }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        <span className="font-medium">{e.nom}</span>
                        <span className="text-gray-400 ml-2 text-xs">{e.type}</span>
                      </button>
                    ))}
                  </div>
                )}
                {entiteSearch && !form.entiteId && (
                  <button
                    type="button"
                    onClick={() => setShowNewEntite(true)}
                    className="mt-1 text-xs text-primary-600 hover:underline"
                  >
                    + Créer &quot;{entiteSearch}&quot; comme nouvelle entité
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2 p-3 bg-gray-50 rounded-lg border">
                <p className="text-xs font-medium text-gray-600">Nouvelle entité</p>
                <input
                  value={newEntite.nom}
                  onChange={e => setNewEntite(f => ({ ...f, nom: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="Nom de l'entité"
                  defaultValue={entiteSearch}
                />
                <select
                  value={newEntite.type}
                  onChange={e => setNewEntite(f => ({ ...f, type: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                >
                  {['Ministère','Agence','Banque','Entreprise publique','ONG','Organisation internationale','Mairie','Université','Autre'].map(t => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => createEntiteMutation.mutate()}
                    disabled={!newEntite.nom || createEntiteMutation.isPending}
                    className="text-xs bg-primary-500 text-white px-3 py-1.5 rounded-lg hover:bg-primary-600 disabled:opacity-50"
                  >
                    {createEntiteMutation.isPending ? '...' : 'Créer'}
                  </button>
                  <button type="button" onClick={() => setShowNewEntite(false)} className="text-xs text-gray-500 hover:text-gray-700">
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="contact@ministere.gov.gn"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Téléphone</label>
              <input
                value={form.telephone}
                onChange={(e) => set('telephone', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="+224 6XX XXX XXX"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
              placeholder="Contexte, historique de la relation..."
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border rounded-lg"
          >
            Annuler
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!form.prenom || !form.nom || mutation.isPending}
            className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 font-medium"
          >
            {mutation.isPending ? 'Création...' : 'Créer le contact'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ContactsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)

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
      {showModal && <NouveauContactModal onClose={() => setShowModal(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM Contacts</h1>
          <p className="text-sm text-gray-500 mt-0.5">{stats?.total ?? 0} contacts institutionnels</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600"
        >
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
        ) : data?.data?.length === 0 ? (
          <div className="text-center py-16">
            <UserPlus className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Aucun contact trouvé</p>
            <p className="text-sm text-gray-400 mt-1">
              Lancez une veille pour extraire automatiquement des contacts, ou ajoutez-en un manuellement
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 text-sm text-primary-600 hover:underline"
            >
              Ajouter un contact →
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {data?.data?.map((contact: any) => (
              <Link
                key={contact.id}
                href={`/contacts/${contact.id}`}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 font-semibold text-primary-700">
                  {contact.prenom?.[0]}{contact.nom?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{contact.prenom} {contact.nom}</span>
                    <ProximiteIcon score={contact.scoreProximite} />
                  </div>
                  <div className="text-sm text-gray-500">
                    {[contact.titre, contact.poste].filter(Boolean).join(' — ')}
                  </div>
                  {contact.entite && (
                    <div className="text-xs text-gray-400 mt-0.5">{contact.entite.nom}</div>
                  )}
                  {contact.tags?.includes('veille-auto') && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-1.5 py-0.5 rounded mt-1">
                      <Tag className="w-2.5 h-2.5" />
                      veille-auto
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {contact.email?.[0] && (
                    <span className="text-gray-400 hover:text-primary-600" onClick={(e) => e.preventDefault()}>
                      <a href={`mailto:${contact.email[0]}`}><Mail className="w-4 h-4" /></a>
                    </span>
                  )}
                  {contact.telephone?.[0] && (
                    <span className="text-gray-400 hover:text-green-600" onClick={(e) => e.preventDefault()}>
                      <a href={`tel:${contact.telephone[0]}`}><Phone className="w-4 h-4" /></a>
                    </span>
                  )}
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {contact._count?.interactions ?? 0} interact.
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {data?.meta?.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <span className="text-sm text-gray-600">Page {data.meta.page} / {data.meta.totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-white"
              >Précédent</button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.meta.totalPages}
                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-white"
              >Suivant</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
