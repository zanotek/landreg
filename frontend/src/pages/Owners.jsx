import { useState, useEffect, useCallback } from 'react'
import { owners as ownersApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'
import { Plus, Search, Pencil, Loader2 } from 'lucide-react'

const EMPTY = { national_id: '', first_name: '', last_name: '', phone: '', email: '', address: '' }

export default function Owners() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setLoadError('')
    ownersApi.list({ search: search || undefined })
      .then((r) => setData(r.data.results || r.data))
      .catch(() => setLoadError('Failed to load owners. Please refresh the page.'))
      .finally(() => setLoading(false))
  }, [search])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setEditing(null); setForm(EMPTY); setError(''); setOpen(true) }
  const openEdit = (o) => { setEditing(o); setForm({ ...o }); setError(''); setOpen(true) }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      if (editing) await ownersApi.update(editing.id, form)
      else await ownersApi.create(form)
      setOpen(false); load()
    } catch (err) {
      const d = err.response?.data
      setError(typeof d === 'object' ? Object.values(d).flat().join(' ') : 'An error occurred.')
    } finally { setSaving(false) }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Land Owners</h1>
          <p className="text-muted-foreground mt-1">Manage registered land owners</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add Owner</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, ID, phone…" className="pl-9" value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>National ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Active Deeds</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
            )) : loadError ? (
              <TableRow><TableCell colSpan={7} className="text-center text-destructive py-10">{loadError}</TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">No owners found</TableCell></TableRow>
            ) : data.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono">{o.national_id}</TableCell>
                <TableCell className="font-medium">{o.full_name}</TableCell>
                <TableCell>{o.phone}</TableCell>
                <TableCell className="text-muted-foreground">{o.email || '—'}</TableCell>
                <TableCell>{o.deed_count}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{formatDate(o.created_at)}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(o)}><Pencil className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Owner' : 'Register New Owner'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="space-y-1.5">
              <Label>National ID *</Label>
              <Input required value={form.national_id} onChange={set('national_id')} placeholder="e.g. 19900101-001-001" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>First Name *</Label>
                <Input required value={form.first_name} onChange={set('first_name')} />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name *</Label>
                <Input required value={form.last_name} onChange={set('last_name')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Phone *</Label>
                <Input required value={form.phone} onChange={set('phone')} placeholder="+255 7xx xxx xxx" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={set('email')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Address *</Label>
              <Textarea required value={form.address} onChange={set('address')} placeholder="Residential address" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Save Changes' : 'Register Owner'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
