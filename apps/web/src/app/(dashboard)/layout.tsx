'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Brain, LayoutDashboard, FileSearch, Users, FileText,
  Lightbulb, Settings, LogOut, Bell, ChevronDown, User
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { authApi } from '@/lib/api'
import { toast } from 'sonner'
import { clsx } from 'clsx'

const navigation = [
  { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Appels d\'offres', href: '/appels-offres', icon: FileSearch },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Dossiers', href: '/dossiers', icon: FileText },
  { name: 'Solutions', href: '/solutions', icon: Lightbulb },
  { name: 'Paramètres', href: '/parametres', icon: Settings },
]

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

  if (!isAuthenticated || !user) return null

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
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
            {navigation.find((n) => pathname.startsWith(n.href))?.name || 'GuineaTender AI'}
          </div>
          <div className="flex items-center gap-3">
            <button className="relative text-gray-500 hover:text-gray-700">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
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
