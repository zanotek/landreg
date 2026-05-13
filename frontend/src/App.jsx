import { Routes, Route, Navigate } from 'react-router-dom'
import PrivateRoute from '@/components/PrivateRoute'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Parcels from '@/pages/Parcels'
import Deeds from '@/pages/Deeds'
import Applications from '@/pages/Applications'
import Owners from '@/pages/Owners'

function ProtectedLayout({ children }) {
  return (
    <PrivateRoute>
      <Layout>{children}</Layout>
    </PrivateRoute>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
      <Route path="/parcels" element={<ProtectedLayout><Parcels /></ProtectedLayout>} />
      <Route path="/deeds" element={<ProtectedLayout><Deeds /></ProtectedLayout>} />
      <Route path="/applications" element={<ProtectedLayout><Applications /></ProtectedLayout>} />
      <Route path="/owners" element={<ProtectedLayout><Owners /></ProtectedLayout>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
