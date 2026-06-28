import { Routes, Route, Navigate } from 'react-router-dom'
import { Component } from 'react'
import PrivateRoute from '@/components/PrivateRoute'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Applications from '@/pages/Applications'
import Owners from '@/pages/Owners'
import Parcels from '@/pages/Parcels'
import Deeds from '@/pages/Deeds'
import TransactionHistory from '@/pages/TransactionHistory'
import Admin from '@/pages/Admin'

class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen items-center justify-center p-8 text-center">
          <div>
            <p className="text-lg font-semibold text-destructive mb-2">Something went wrong</p>
            <p className="text-sm text-muted-foreground mb-4">{this.state.error.message}</p>
            <button className="text-sm underline" onClick={() => this.setState({ error: null })}>Try again</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function ProtectedLayout({ children }) {
  return (
    <PrivateRoute>
      <Layout>
        <ErrorBoundary>{children}</ErrorBoundary>
      </Layout>
    </PrivateRoute>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
      <Route path="/applications" element={<ProtectedLayout><Applications /></ProtectedLayout>} />
      <Route path="/owners" element={<ProtectedLayout><Owners /></ProtectedLayout>} />
      <Route path="/parcels" element={<ProtectedLayout><Parcels /></ProtectedLayout>} />
      <Route path="/deeds" element={<ProtectedLayout><Deeds /></ProtectedLayout>} />
      <Route path="/transactions" element={<ProtectedLayout><TransactionHistory /></ProtectedLayout>} />
      <Route path="/admin" element={<ProtectedLayout><Admin /></ProtectedLayout>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
