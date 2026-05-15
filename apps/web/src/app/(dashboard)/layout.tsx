'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  Brain, LayoutDashboard, FileSearch, Users, FileText,
  Lightbulb, Settings, LogOut, Bell, User, BarChart3,
  AlertTriangle, Clock, Shield, X, Radio, Kanban, Search,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { authApi, aoApi, dossiersApi, notifApi } from '@/lib/api'
import { toast } from 'sonner'
import { clsx } from 'clsx'
import { CommandPalette } from '@/components/CommandPalette'

const navigation = [
  { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Veille', href: '/veille', icon: Radio },
  { name: 'Appels d\'offres', href: '/appels-offres', icon: FileSearch },
  { name: 'Pipeline', href: '/pipeline', icon: Kanban },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Dossiers', href: '/dossiers', icon: FileText },
  { name: 'Solutions', href: '/solutions', icon: Lightbulb },
  { name: 'Analytiques', href: '/analytics', icon: BarChart3 },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Paramètres', href: '/parametres', icon: Settings },
]

function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data: notifCount } = useQuery({
    queryKey: ['notif-count'],
    queryFn: () => notifApi.count().then(r => r.data.count),
    refetchInterval: 30_000,
    initialData: 0,
  })

  const { data: aoData } = useQuery({
    queryKey: ['ao-notifs'],
    queryFn: () => aoApi.list({ limit: 50 }).then(r => r.data),
    refetchInterval: 60_000,
  })

  const { data: dossierData } = useQuery({
    queryKey: ['dossier-notifs'],
    queryFn: () => dossiersApi.list({ limit: 50 }).then(r => r.data),
    refetchInterval: 60_000,
  })

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const now = Date.now()
  const urgentAOs = (aoData?.data ?? []).filter((ao: any) => {
    const jours = Math.floor((new Date(ao.dateLimite).getTime() - now) / 86400000)
    return jours >= 0 && jours <= 7 && !['SOUMIS', 'REMPORTE', 'PERDU', 'ARCHIVE'].includes(ao.status)
  })
  const dossiersEnValidation = (dossierData?.data ?? []).filter((d: any) => d.status === 'EN_VALIDATION')
  const dossiersRejetes = (dossierData?.data ?? []).filter((d: any) => d.status === 'REJETE')

  const alertes = [
    ...urgentAOs.map((ao: any) => ({
      id: `ao-${ao.id}`,
      type: 'deadline' as const,
      message: ao.titre,
      sous: `${Math.floor((new Date(ao.dateLimite).getTime() - now) / 86400000)}j restants`,
      href: `/appels-offres/${ao.id}`,
      icon: AlertTriangle,
      color: 'text-red-500',
    })),
    ...dossiersEnValidation.map((d: any) => ({
      id: `dossier-val-${d.id}`,
      type: 'validation' as const,
      message: d.titre,
      sous: 'En attente de validation',
      href: `/dossiers/${d.id}`,
      icon: Shield,
      color: 'text-orange-500',
    })),
    ...dossiersRejetes.map((d: any) => ({
      id: `dossier-rej-${d.id}`,
      type: 'rejet' as const,
      message: d.titre,
      sous: 'Rejeté — corrections requises',
      href: `/dossiers/${d.id}`,
      icon: Clock,
      color: 'text-red-600',
    })),
  ]

  const totalCount = Math.max(alertes.length, notifCount as number)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative text-gray-500 hover:text-gray-700 p-1"
      >
        <Bell className="w-5 h-5" />
        {totalCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {totalCount > 9 ? '9+' : totalCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-80 bg-white rounded-xl border shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="text-sm font-semibold text-gray-900">Alertes</span>
            <div className="flex items-center gap-2">
              <Link href="/notifications" onClick={() => setOpen(false)} className="text-xs text-orange-600 hover:underline">
                Voir tout
              </Link>
              <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
          </div>
          {alertes.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Aucune alerte active
            </div>
          ) : (
            <div className="divide-y max-h-96 overflow-y-auto">
              {alertes.map((a) => (
                <Link
                  key={a.id}
                  href={a.href}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <a.icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${a.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{a.message}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{a.sous}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isAuthenticated) router.push('/login')
  }, [isAuthenticated, router])

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token') || ''
      await authApi.logout(refreshToken)
    } catch {}
    logout()
    router.push('/login')
    toast.success('Déconnexion réussie')
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <CommandPalette />
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-white border-r flex flex-col">
        {/* Logo */}
        <div className="p-5 border-b">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm text-gray-900">GuineaTender AI</div>
              <div className="text-xs text-gray-500">{user.organisation?.nom}</div>
            </div>
          </Link>
        </div>

        {/* Plan badge */}
        <div className="px-4 py-2 border-b bg-orange-50">
          <span className="text-xs font-medium text-orange-700 uppercase tracking-wider">
            Plan {user.organisation?.plan}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        <div className="p-3 border-t">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-primary-700" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-gray-900 truncate">
                {user.prenom} {user.nom}
              </div>
              <div className="text-xs text-gray-500 truncate">{user.role}</div>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-500 transition-colors"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-gray-500">
            {[...navigation].reverse().find((n) => pathname.startsWith(n.href))?.name || 'GuineaTender AI'}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
              className="hidden sm:flex items-center gap-2 text-xs text-gray-400 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              Rechercher...
              <kbd className="ml-1 border border-gray-200 rounded px-1 text-[10px]">⌘K</kbd>
            </button>
            <NotificationsBell />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
