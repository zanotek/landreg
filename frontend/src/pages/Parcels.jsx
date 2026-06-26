import { useState, useEffect, useCallback } from 'react'
import { parcels as parcelApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatArea } from '@/lib/utils'
import { Plus, Search, Pencil, Loader2 } from 'lucide-react'

const DISTRICTS = [
  ['mjini', 'Mjini (Urban West)'], ['magharibi', 'Magharibi (West)'],
  ['kaskazini_a', 'Kaskazini A'], ['kaskazini_b', 'Kaskazini B'],
  ['kati', 'Kati (Central)'], ['kusini', 'Kusini (South)'],
  ['chake_chake', 'Chake Chake'], ['mkoani', 'Mkoani'],
  ['wete', 'Wete'], ['micheweni', 'Micheweni'],
]
const REGIONS = [
  ['mjini_magharibi', 'Mjini Magharibi'],
  ['kaskazini_unguja', 'Kaskazini Unguja'],
  ['kusini_unguja', 'Kusini Unguja'],
  ['kaskazini_pemba', 'Kaskazini Pemba'],
  ['kusini_pemba', 'Kusini Pemba'],
]
const LAND_USE = [
  ['residential', 'Residential'], ['commercial', 'Commercial'],
  ['agricultural', 'Agricultural'], ['industrial', 'Industrial'],
  ['institutional', 'Institutional'], ['mixed', 'Mixed Use'],
]
const STATUSES = [
  ['available', 'Available'], ['registered', 'Registered'],
  ['pending', 'Pending'], ['disputed', 'Disputed'], ['suspended', 'Suspended'],
]

const STATUS_BADGE = {
  available: 'success', registered: 'default',
  pending: 'warning', disputed: 'destructive', suspended: 'secondary',
}

const EMPTY = {
  parcel_number: '', zupin: '', house_number: '',
  district: '', region: '', shehia: '',
  area_sqm: '', land_use: '', location_description: '', status: 'available',
}

export default function Parcels() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterDistrict, setFilterDistrict] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    parcelApi.list({
      search: search || undefined,
      district: filterDistrict !== 'all' ? filterDistrict : undefined,
      status: filterStatus !== 'all' ? filterStatus : undefined,
    })
      .then((r) => setData(r.data.results || r.data))
      .finally(() => setLoading(false))
  }, [search, filterDistrict, filterStatus])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setEditing(null); setForm(EMPTY); setError(''); setOpen(true) }
  const openEdit = (p) => { setEditing(p); setForm({ ...p }); setError(''); setOpen(true) }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editing) await parcelApi.update(editing.id, form)
      else await parcelApi.create(form)
      setOpen(false)
      load()
    } catch (err) {
      const d = err.response?.data
      setError(typeof d === 'object' ? Object.values(d).flat().join(' ') : 'An error occurred.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Land Parcels</h1>
          <p className="text-muted-foreground mt-1">Manage registered land parcels</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add Parcel</Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search parcel number, location…" className="pl-9" value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filterDistrict} onValueChange={setFilterDistrict}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All districts" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All districts</SelectItem>
              {DISTRICTS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Parcel #</TableHead>
              <TableHead>District</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>Land Use</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 7 }).map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                ))}
              </TableRow>
            )) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  No parcels found
                </TableCell>
              </TableRow>
            ) : data.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono font-medium">{p.parcel_number}</TableCell>
                <TableCell>{p.district_display}</TableCell>
                <TableCell>{formatArea(p.area_sqm)}</TableCell>
                <TableCell className="text-muted-foreground">{p.land_use_display}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE[p.status] || 'outline'}>{p.status_display}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{formatDate(p.created_at)}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Parcel' : 'Register New Parcel'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Parcel Number *</Label>
                <Input required value={form.parcel_number}
                  onChange={(e) => setForm({ ...form, parcel_number: e.target.value })}
                  placeholder="e.g. ZNZ-MJN-001" />
              </div>
              <div className="space-y-1.5">
                <Label>ZUPIN</Label>
                <Input value={form.zupin}
                  onChange={(e) => setForm({ ...form, zupin: e.target.value })}
                  placeholder="Zanzibar Unique Parcel ID" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>House No.</Label>
                <Input value={form.house_number}
                  onChange={(e) => setForm({ ...form, house_number: e.target.value })}
                  placeholder="Optional" />
              </div>
              <div className="space-y-1.5">
                <Label>Area (m²) *</Label>
                <Input required type="number" min="1" step="0.01" value={form.area_sqm}
                  onChange={(e) => setForm({ ...form, area_sqm: e.target.value })}
                  placeholder="e.g. 500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Region</Label>
                <Select value={form.region || ''} onValueChange={(v) => setForm({ ...form, region: v })}>
                  <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                  <SelectContent>
                    {REGIONS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Shehia</Label>
                <Input value={form.shehia}
                  onChange={(e) => setForm({ ...form, shehia: e.target.value })}
                  placeholder="e.g. Mwanakwerekwe" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>District *</Label>
                <Select value={form.district} onValueChange={(v) => setForm({ ...form, district: v })}>
                  <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                  <SelectContent>
                    {DISTRICTS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Land Use *</Label>
                <Select value={form.land_use} onValueChange={(v) => setForm({ ...form, land_use: v })}>
                  <SelectTrigger><SelectValue placeholder="Select use" /></SelectTrigger>
                  <SelectContent>
                    {LAND_USE.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Location Description *</Label>
              <Textarea required value={form.location_description}
                onChange={(e) => setForm({ ...form, location_description: e.target.value })}
                placeholder="Physical address / plot boundary description" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Save Changes' : 'Register Parcel'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
