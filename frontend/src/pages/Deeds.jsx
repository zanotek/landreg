import { useState, useEffect, useCallback } from 'react'
import { deeds as deedsApi, parcels as parcelsApi, owners as ownersApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'
import { Plus, Search, Pencil, Loader2 } from 'lucide-react'

const STATUSES = [
  ['active', 'Active'], ['transferred', 'Transferred'],
  ['cancelled', 'Cancelled'], ['suspended', 'Suspended'],
]
const STATUS_BADGE = {
  active: 'success', transferred: 'info', cancelled: 'destructive', suspended: 'secondary',
}
const EMPTY = { deed_number: '', parcel: '', owner: '', registration_date: '', expiry_date: '', status: 'active', notes: '' }

export default function Deeds() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [allParcels, setAllParcels] = useState([])
  const [allOwners, setAllOwners] = useState([])

  const load = useCallback(() => {
    setLoading(true)
    deedsApi.list({ search: search || undefined, status: filterStatus !== 'all' ? filterStatus : undefined })
      .then((r) => setData(r.data.results || r.data))
      .finally(() => setLoading(false))
  }, [search, filterStatus])

  useEffect(() => { load() }, [load])

  const openCreate = async () => {
    setEditing(null); setForm(EMPTY); setError('')
    const [p, o] = await Promise.all([
      parcelsApi.list({ page_size: 200 }),
      ownersApi.list({ page_size: 200 }),
    ])
    setAllParcels(p.data.results || p.data)
    setAllOwners(o.data.results || o.data)
    setOpen(true)
  }

  const openEdit = async (d) => {
    setEditing(d)
    setForm({ ...d, parcel: d.parcel?.toString(), owner: d.owner?.toString() })
    setError('')
    const [p, o] = await Promise.all([
      parcelsApi.list({ page_size: 200 }),
      ownersApi.list({ page_size: 200 }),
    ])
    setAllParcels(p.data.results || p.data)
    setAllOwners(o.data.results || o.data)
    setOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const payload = { ...form, parcel: Number(form.parcel), owner: Number(form.owner), expiry_date: form.expiry_date || null }
      if (editing) await deedsApi.update(editing.id, payload)
      else await deedsApi.create(payload)
      setOpen(false); load()
    } catch (err) {
      const d = err.response?.data
      setError(typeof d === 'object' ? Object.values(d).flat().join(' ') : 'An error occurred.')
    } finally { setSaving(false) }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const setV = (k) => (v) => setForm({ ...form, [k]: v })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Title Deeds</h1>
          <p className="text-muted-foreground mt-1">Register and manage land title deeds</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Register Deed</Button>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search deed number, owner, parcel…" className="pl-9" value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Deed #</TableHead>
              <TableHead>Parcel</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>National ID</TableHead>
              <TableHead>Reg. Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Registered By</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
            )) : data.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-10">No deeds found</TableCell></TableRow>
            ) : data.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-mono font-medium">{d.deed_number}</TableCell>
                <TableCell className="font-mono text-sm">{d.parcel_number}</TableCell>
                <TableCell className="font-medium">{d.owner_name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{d.owner_national_id}</TableCell>
                <TableCell className="text-sm">{formatDate(d.registration_date)}</TableCell>
                <TableCell><Badge variant={STATUS_BADGE[d.status] || 'outline'}>{d.status_display}</Badge></TableCell>
                <TableCell className="text-muted-foreground text-sm">{d.registered_by_name || '—'}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Title Deed' : 'Register New Title Deed'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Deed Number *</Label>
                <Input required value={form.deed_number} onChange={set('deed_number')} placeholder="e.g. TD-2024-0001" />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={setV('status')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Parcel *</Label>
              <Select value={form.parcel} onValueChange={setV('parcel')}>
                <SelectTrigger><SelectValue placeholder="Select parcel" /></SelectTrigger>
                <SelectContent>
                  {allParcels.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.parcel_number} — {p.district_display}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Owner *</Label>
              <Select value={form.owner} onValueChange={setV('owner')}>
                <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
                <SelectContent>
                  {allOwners.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>{o.full_name} ({o.national_id})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Registration Date *</Label>
                <Input required type="date" value={form.registration_date} onChange={set('registration_date')} />
              </div>
              <div className="space-y-1.5">
                <Label>Expiry Date</Label>
                <Input type="date" value={form.expiry_date || ''} onChange={set('expiry_date')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={set('notes')} placeholder="Additional remarks…" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Save Changes' : 'Register Deed'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
