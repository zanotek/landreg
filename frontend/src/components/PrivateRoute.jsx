import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}
