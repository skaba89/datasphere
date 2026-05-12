'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { aoApi, contactsApi, dossiersApi } from '@/lib/api'
import {
  Search, LayoutDashboard, FileSearch, Users, FileText,
  Lightbulb, BarChart3, Settings, Radio, Kanban,
  ArrowRight, TrendingUp, User, Zap, X,
} from 'lucide-react'

const NAV_ITEMS = [
  { id: 'nav-dashboard', label: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard, group: 'Navigation' },
  { id: 'nav-veille', label: 'Veille', href: '/veille', icon: Radio, group: 'Navigation' },
  { id: 'nav-aos', label: 'Appels d\'offres', href: '/appels-offres', icon: FileSearch, group: 'Navigation' },
  { id: 'nav-pipeline', label: 'Pipeline Kanban', href: '/pipeline', icon: Kanban, group: 'Navigation' },
  { id: 'nav-contacts', label: 'Contacts', href: '/contacts', icon: Users, group: 'Navigation' },
  { id: 'nav-dossiers', label: 'Dossiers', href: '/dossiers', icon: FileText, group: 'Navigation' },
  { id: 'nav-solutions', label: 'Bibliothèque Solutions', href: '/solutions', icon: Lightbulb, group: 'Navigation' },
  { id: 'nav-analytics', label: 'Analytiques', href: '/analytics', icon: BarChart3, group: 'Navigation' },
  { id: 'nav-settings', label: 'Paramètres', href: '/parametres', icon: Settings, group: 'Navigation' },
  { id: 'action-new-ao', label: 'Nouveaux AOs', href: '/appels-offres?status=NOUVEAU', icon: Zap, group: 'Raccourcis' },
  { id: 'action-pipeline', label: 'Vue Pipeline', href: '/pipeline', icon: Kanban, group: 'Raccourcis' },
]

interface CommandItem {
  id: string
  label: string
  sub?: string
  href: string
  icon: any
  group: string
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const { data: aoData } = useQuery({
    queryKey: ['cmd-aos', query],
    queryFn: () => aoApi.list({ search: query, limit: 5 }).then(r => r.data),
    enabled: open && query.length >= 2,
  })

  const { data: contactData } = useQuery({
    queryKey: ['cmd-contacts', query],
    queryFn: () => contactsApi.list({ search: query, limit: 3 }).then(r => r.data),
    enabled: open && query.length >= 2,
  })

  const toggle = useCallback(() => {
    setOpen(v => {
      if (!v) { setQuery(''); setSelected(0) }
      return !v
    })
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggle()
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [toggle])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const navFiltered = query.length === 0
    ? NAV_ITEMS
    : NAV_ITEMS.filter(n => n.label.toLowerCase().includes(query.toLowerCase()))

  const aoItems: CommandItem[] = (aoData?.data ?? []).map((ao: any) => ({
    id: `ao-${ao.id}`,
    label: ao.titre,
    sub: ao.entiteAdj ?? ao.source,
    href: `/appels-offres/${ao.id}`,
    icon: FileSearch,
    group: 'Appels d\'offres',
  }))

  const contactItems: CommandItem[] = (contactData?.data ?? []).map((c: any) => ({
    id: `contact-${c.id}`,
    label: `${c.prenom} ${c.nom}`,
    sub: c.entite?.nom ?? c.poste,
    href: `/contacts/${c.id}`,
    icon: User,
    group: 'Contacts',
  }))

  const allItems: CommandItem[] = [...navFiltered, ...aoItems, ...contactItems]

  const groups = allItems.reduce<Record<string, CommandItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = []
    acc[item.group].push(item)
    return acc
  }, {})

  const flatItems = Object.values(groups).flat()

  const navigate = (href: string) => {
    router.push(href)
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected(s => Math.min(s + 1, flatItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected(s => Math.max(s - 1, 0))
    } else if (e.key === 'Enter') {
      if (flatItems[selected]) navigate(flatItems[selected].href)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher pages, AOs, contacts..."
            className="flex-1 text-sm text-gray-900 outline-none placeholder-gray-400"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline text-xs text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto py-2">
          {flatItems.length === 0 && query.length >= 2 && (
            <p className="text-sm text-gray-400 text-center py-8">Aucun résultat pour &ldquo;{query}&rdquo;</p>
          )}
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <p className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">{group}</p>
              {items.map((item) => {
                const globalIdx = flatItems.indexOf(item)
                const isSelected = globalIdx === selected
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.href)}
                    onMouseEnter={() => setSelected(globalIdx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isSelected ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-orange-100' : 'bg-gray-100'}`}>
                      <item.icon className={`w-3.5 h-3.5 ${isSelected ? 'text-orange-600' : 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isSelected ? 'text-orange-900' : 'text-gray-900'}`}>{item.label}</p>
                      {item.sub && <p className="text-xs text-gray-500 truncate">{item.sub}</p>}
                    </div>
                    <ArrowRight className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-orange-400' : 'text-gray-300'}`} />
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-gray-100 flex items-center gap-3 text-xs text-gray-400">
          <span><kbd className="border border-gray-200 rounded px-1">↑↓</kbd> naviguer</span>
          <span><kbd className="border border-gray-200 rounded px-1">↵</kbd> ouvrir</span>
          <span><kbd className="border border-gray-200 rounded px-1 py-0.5">⌘K</kbd> fermer</span>
        </div>
      </div>
    </div>
  )
}
