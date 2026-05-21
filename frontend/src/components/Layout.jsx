import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard, ClipboardList, LogOut, Building2, Users, MapPin, FileText, ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/applications', label: 'Applications', icon: ClipboardList },
  { to: '/owners', label: 'Owners', icon: Users, hideForRoles: ['data_entry'] },
  { to: '/parcels', label: 'Parcels', icon: MapPin },
  { to: '/deeds', label: 'Title Deeds', icon: FileText, hideForRoles: ['data_entry'] },
  { to: '/admin', label: 'Admin Panel', icon: ShieldCheck, allowedRoles: ['admin'] },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r bg-card shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">LandReg</p>
            <p className="text-xs text-muted-foreground mt-0.5">Zanzibar</p>
          </div>
        </div>
        <Separator />

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.filter(({ hideForRoles, allowedRoles }) =>
            !hideForRoles?.includes(user?.profile?.role) &&
            (!allowedRoles || allowedRoles.includes(user?.profile?.role))
          ).map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to))
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        <Separator />
        {/* User section */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
              {user?.first_name?.[0] || user?.username?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user?.full_name || user?.username}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.profile?.role}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">{children}</div>
      </main>

    </div>
  )
}
