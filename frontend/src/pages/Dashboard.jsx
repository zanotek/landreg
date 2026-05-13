import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { stats, applications } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/utils'
import {
  Map, FileText, ClipboardList, Users, TrendingUp, Clock, CheckCircle2, XCircle,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const STATUS_BADGE = {
  pending: { label: 'Pending', variant: 'warning' },
  under_review: { label: 'Under Review', variant: 'info' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'secondary' },
}

function StatCard({ title, value, icon: Icon, desc, color = 'bg-primary/10 text-primary' }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value ?? <Skeleton className="h-8 w-16" />}</p>
            {desc && <p className="text-xs text-muted-foreground mt-1">{desc}</p>}
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [recentApps, setRecentApps] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      stats.get(),
      applications.list({ page_size: 6 }),
    ]).then(([statsRes, appsRes]) => {
      setData(statsRes.data)
      setRecentApps(appsRes.data.results || appsRes.data)
    }).finally(() => setLoading(false))
  }, [])

  const chartData = data ? [
    { name: 'Pending', value: data.pending_applications, fill: '#f59e0b' },
    { name: 'Under Review', value: data.under_review_applications, fill: '#3b82f6' },
    { name: 'Approved', value: data.approved_applications, fill: '#10b981' },
  ] : []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of land registration activities</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Parcels" value={data?.total_parcels} icon={Map} desc={`${data?.registered_parcels ?? '—'} registered`} />
        <StatCard title="Active Deeds" value={data?.active_deeds} icon={FileText} color="bg-blue-100 text-blue-600" />
        <StatCard title="Registered Owners" value={data?.total_owners} icon={Users} color="bg-purple-100 text-purple-600" />
        <StatCard title="Pending Applications" value={data?.pending_applications} icon={ClipboardList} color="bg-yellow-100 text-yellow-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Applications chart */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Application Status</CardTitle>
            <CardDescription>Current application pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} barSize={32}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent applications */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base">Recent Applications</CardTitle>
              <CardDescription>Latest submitted applications</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/applications">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Application #</TableHead>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : recentApps.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No applications yet
                    </TableCell>
                  </TableRow>
                ) : (
                  recentApps.map((app) => {
                    const badge = STATUS_BADGE[app.status] || { label: app.status, variant: 'outline' }
                    return (
                      <TableRow key={app.id}>
                        <TableCell className="font-mono text-xs">{app.application_number}</TableCell>
                        <TableCell className="font-medium">{app.applicant_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{app.application_type_display}</TableCell>
                        <TableCell><Badge variant={badge.variant}>{badge.label}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(app.submitted_at)}</TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
