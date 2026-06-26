import { useState, useEffect, useCallback } from 'react'
import { deeds as deedsApi } from '@/lib/api'
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
import { Search, Printer, Loader2 } from 'lucide-react'

const STATUSES = [
  ['active', 'Active'], ['transferred', 'Transferred'],
  ['cancelled', 'Cancelled'], ['suspended', 'Suspended'],
]
const OWNERSHIP_TYPES = [
  ['sole', 'Sole Ownership'], ['joint', 'Joint Ownership'], ['company', 'Company'],
]
const STATUS_BADGE = {
  active: 'success', transferred: 'info', cancelled: 'destructive', suspended: 'secondary',
}
const EMPTY_FORM = {
  deed_number: '', certificate_number: '', ownership_type: '',
  registration_date: '', first_registration_date: '', issued_date: '',
  received_from: '', received_date: '', received_by: '', expiry_date: '',
  status: 'active', notes: '',
}

export default function Deeds() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [loadError, setLoadError] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [printMode, setPrintMode] = useState(null) // 'register' | deed object | null

  useEffect(() => {
    if (!printMode) return
    window.print()
    const handler = () => setPrintMode(null)
    window.addEventListener('afterprint', handler, { once: true })
    return () => window.removeEventListener('afterprint', handler)
  }, [printMode])

  const load = useCallback(() => {
    setLoading(true)
    setLoadError('')
    deedsApi.list({ search: search || undefined, status: filterStatus !== 'all' ? filterStatus : undefined })
      .then((r) => setData(r.data.results || r.data))
      .catch(() => setLoadError('Failed to load deeds. Please refresh the page.'))
      .finally(() => setLoading(false))
  }, [search, filterStatus])

  useEffect(() => { load() }, [load])

  const openEdit = (d) => {
    setEditing(d)
    setForm({
      deed_number: d.deed_number,
      certificate_number: d.certificate_number || '',
      ownership_type: d.ownership_type || '',
      registration_date: d.registration_date || '',
      first_registration_date: d.first_registration_date || '',
      issued_date: d.issued_date || '',
      received_from: d.received_from || '',
      received_date: d.received_date || '',
      received_by: d.received_by || '',
      expiry_date: d.expiry_date || '',
      status: d.status,
      notes: d.notes || '',
    })
    setFormError('')
    setOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setFormError('')
    try {
      const nullDate = (v) => v || null
      await deedsApi.update(editing.id, {
        ...form,
        first_registration_date: nullDate(form.first_registration_date),
        issued_date: nullDate(form.issued_date),
        received_date: nullDate(form.received_date),
        expiry_date: nullDate(form.expiry_date),
      })
      setOpen(false); load()
    } catch (err) {
      const d = err.response?.data
      setFormError(typeof d === 'object' ? Object.values(d).flat().join(' ') : 'An error occurred.')
    } finally { setSaving(false) }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const setV = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  const printDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      {/* Print page setup */}
      <style>{`@media print { @page { size: landscape; margin: 1.2cm; } }`}</style>

      {/* ── Screen header ── */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Register</h1>
          <p className="text-muted-foreground mt-1">Land title deeds — generated automatically on application approval</p>
        </div>
        <Button variant="outline" onClick={() => setPrintMode('register')}>
          <Printer className="mr-2 h-4 w-4" /> Print Register
        </Button>
      </div>

      {/* ── Search / filter (screen only) ── */}
      <Card className="print:hidden">
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

      {/* ── Screen table ── */}
      <Card className="print:hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>CRO</TableHead>
              <TableHead>Parcel</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Identification</TableHead>
              <TableHead>Reg. Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Registered By</TableHead>
              <TableHead className="text-right">Print</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
            )) : loadError ? (
              <TableRow><TableCell colSpan={8} className="text-center text-destructive py-10">{loadError}</TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-10">No deeds found</TableCell></TableRow>
            ) : data.map((d) => (
              <TableRow key={d.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(d)}>
                <TableCell className="font-mono font-medium">{d.deed_number}</TableCell>
                <TableCell className="font-mono text-sm">{d.parcel_number}</TableCell>
                <TableCell className="font-medium">{d.owner_name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{d.owner_national_id}</TableCell>
                <TableCell className="text-sm">{formatDate(d.registration_date)}</TableCell>
                <TableCell><Badge variant={STATUS_BADGE[d.status] || 'outline'}>{d.status_display}</Badge></TableCell>
                <TableCell className="text-muted-foreground text-sm">{d.registered_by_name || '—'}</TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" title="Print" onClick={() => setPrintMode(d)}><Printer className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* ── Print-only layout ── */}
      <div className="hidden print:block text-black text-[10pt]">

        {/* ── Individual deed certificate ── */}
        {printMode && printMode !== 'register' ? (
          <div className="max-w-[700px] mx-auto">
            {/* Header */}
            <div className="text-center border-b-2 border-black pb-3 mb-5">
              <p className="text-[8pt] font-medium tracking-widest uppercase">The Revolutionary Government of Zanzibar</p>
              <p className="text-[8pt] tracking-wide uppercase">Ministry of Lands, Housing and Urban Development</p>
              <h1 className="text-[18pt] font-bold uppercase tracking-wide mt-1">Certificate of Title</h1>
              <p className="text-[8pt] text-gray-600 mt-1">Land Title Registration System</p>
            </div>

            {/* CRO + Certificate row */}
            <div className="flex justify-between mb-4 text-[9pt]">
              <div><span className="font-bold">CRO No.:</span> <span className="font-mono">{printMode.deed_number}</span></div>
              {printMode.certificate_number && (
                <div><span className="font-bold">Certificate No.:</span> <span className="font-mono">{printMode.certificate_number}</span></div>
              )}
              <div><span className="font-bold">Status:</span> {printMode.status_display}</div>
            </div>

            {/* Sections */}
            {[
              {
                title: 'Property Details',
                rows: [
                  ['Parcel Number', printMode.parcel_number],
                ],
              },
              {
                title: 'Ownership Details',
                rows: [
                  ['Full Name', printMode.owner_name],
                  ['Identification No.', printMode.owner_national_id],
                  ['Ownership Type', printMode.ownership_type_display || '—'],
                ],
              },
              {
                title: 'Registration Details',
                rows: [
                  ['Registration Date', formatDate(printMode.registration_date)],
                  ['First Registration Date', formatDate(printMode.first_registration_date) || '—'],
                  ['Issued Date', formatDate(printMode.issued_date) || '—'],
                  ['Expiry Date', formatDate(printMode.expiry_date) || '—'],
                ],
              },
              {
                title: 'Receipt Information',
                rows: [
                  ['Received From', printMode.received_from || '—'],
                  ['Received Date', formatDate(printMode.received_date) || '—'],
                  ['Received By', printMode.received_by || '—'],
                ],
              },
            ].map(({ title, rows }) => (
              <div key={title} className="mb-4">
                <h2 className="text-[9pt] font-bold uppercase tracking-wide border-b border-black mb-1 pb-0.5">{title}</h2>
                <table className="w-full text-[9pt]">
                  <tbody>
                    {rows.map(([label, value]) => (
                      <tr key={label}>
                        <td className="py-0.5 pr-4 text-gray-600 w-48">{label}</td>
                        <td className="py-0.5 font-medium">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            {/* Notes */}
            {printMode.notes && (
              <div className="mb-4">
                <h2 className="text-[9pt] font-bold uppercase tracking-wide border-b border-black mb-1 pb-0.5">Notes</h2>
                <p className="text-[9pt] mt-1">{printMode.notes}</p>
              </div>
            )}

            {/* Signature block */}
            <div className="mt-10 grid grid-cols-2 gap-12 text-[9pt]">
              <div>
                <div className="border-t border-black pt-1">
                  <p className="font-medium">Registered By</p>
                  <p className="text-gray-600">{printMode.registered_by_name || '—'}</p>
                </div>
              </div>
              <div>
                <div className="border-t border-black pt-1">
                  <p className="font-medium">Authorised Signatory</p>
                  <p className="text-gray-600">Registrar of Lands</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-[7pt] text-gray-400 border-t border-gray-300 pt-2">
              LandReg — Zanzibar Land Title Registration System · Printed on {printDate}
            </div>
          </div>

        ) : (
          /* ── Full register table ── */
          <>
            <div className="text-center mb-4 border-b-2 border-black pb-3">
              <p className="text-[8pt] font-medium tracking-widest uppercase">The Revolutionary Government of Zanzibar</p>
              <p className="text-[8pt] tracking-wide uppercase">Ministry of Lands, Housing and Urban Development</p>
              <h1 className="text-[16pt] font-bold uppercase tracking-wide mt-1">Land Title Register</h1>
              <div className="flex justify-between text-[8pt] mt-2 text-gray-600">
                <span>Date Printed: {printDate}</span>
                <span>Total Records: {data.length}</span>
                {filterStatus !== 'all' && <span>Filter: {STATUSES.find(([v]) => v === filterStatus)?.[1]}</span>}
              </div>
            </div>

            <table className="w-full border-collapse text-[8pt]">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 px-1 py-1 text-left font-bold">#</th>
                  <th className="border border-gray-400 px-1 py-1 text-left font-bold">CRO</th>
                  <th className="border border-gray-400 px-1 py-1 text-left font-bold">Cert. No.</th>
                  <th className="border border-gray-400 px-1 py-1 text-left font-bold">Parcel</th>
                  <th className="border border-gray-400 px-1 py-1 text-left font-bold">Owner</th>
                  <th className="border border-gray-400 px-1 py-1 text-left font-bold">Identification</th>
                  <th className="border border-gray-400 px-1 py-1 text-left font-bold">Ownership</th>
                  <th className="border border-gray-400 px-1 py-1 text-left font-bold">Reg. Date</th>
                  <th className="border border-gray-400 px-1 py-1 text-left font-bold">1st Reg.</th>
                  <th className="border border-gray-400 px-1 py-1 text-left font-bold">Issued</th>
                  <th className="border border-gray-400 px-1 py-1 text-left font-bold">Expiry</th>
                  <th className="border border-gray-400 px-1 py-1 text-left font-bold">Rcvd. From</th>
                  <th className="border border-gray-400 px-1 py-1 text-left font-bold">Rcvd. Date</th>
                  <th className="border border-gray-400 px-1 py-1 text-left font-bold">Status</th>
                  <th className="border border-gray-400 px-1 py-1 text-left font-bold">Reg. By</th>
                  <th className="border border-gray-400 px-1 py-1 text-left font-bold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={16} className="border border-gray-400 px-2 py-3 text-center text-gray-500">No records</td></tr>
                ) : data.map((d, i) => (
                  <tr key={d.id} className={i % 2 === 0 ? '' : 'bg-gray-50'}>
                    <td className="border border-gray-300 px-1 py-0.5 text-gray-500">{i + 1}</td>
                    <td className="border border-gray-300 px-1 py-0.5 font-medium">{d.deed_number}</td>
                    <td className="border border-gray-300 px-1 py-0.5">{d.certificate_number || '—'}</td>
                    <td className="border border-gray-300 px-1 py-0.5">{d.parcel_number}</td>
                    <td className="border border-gray-300 px-1 py-0.5 font-medium">{d.owner_name}</td>
                    <td className="border border-gray-300 px-1 py-0.5">{d.owner_national_id}</td>
                    <td className="border border-gray-300 px-1 py-0.5">{d.ownership_type_display || '—'}</td>
                    <td className="border border-gray-300 px-1 py-0.5">{formatDate(d.registration_date)}</td>
                    <td className="border border-gray-300 px-1 py-0.5">{formatDate(d.first_registration_date) || '—'}</td>
                    <td className="border border-gray-300 px-1 py-0.5">{formatDate(d.issued_date) || '—'}</td>
                    <td className="border border-gray-300 px-1 py-0.5">{formatDate(d.expiry_date) || '—'}</td>
                    <td className="border border-gray-300 px-1 py-0.5">{d.received_from || '—'}</td>
                    <td className="border border-gray-300 px-1 py-0.5">{formatDate(d.received_date) || '—'}</td>
                    <td className="border border-gray-300 px-1 py-0.5">{d.status_display}</td>
                    <td className="border border-gray-300 px-1 py-0.5">{d.registered_by_name || '—'}</td>
                    <td className="border border-gray-300 px-1 py-0.5">{d.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-6 flex justify-between text-[8pt] text-gray-500 border-t border-gray-300 pt-2">
              <span>LandReg — Zanzibar Land Title Registration System</span>
              <span>Printed on {printDate} · {data.length} record{data.length !== 1 ? 's' : ''}</span>
            </div>
          </>
        )}
      </div>

      {/* ── Edit dialog ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg lg:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Title Deed — {editing?.deed_number}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Deed Number</Label>
                <Input value={form.deed_number} onChange={set('deed_number')} disabled />
              </div>
              <div className="space-y-1.5">
                <Label>Certificate Number</Label>
                <Input value={form.certificate_number} onChange={set('certificate_number')} placeholder="e.g. CERT-001" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Ownership Type</Label>
                <Select value={form.ownership_type || ''} onValueChange={setV('ownership_type')}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{OWNERSHIP_TYPES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={setV('status')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Registration Date *</Label>
                <Input required type="date" value={form.registration_date} onChange={set('registration_date')} />
              </div>
              <div className="space-y-1.5">
                <Label>First Registration Date</Label>
                <Input type="date" value={form.first_registration_date} onChange={set('first_registration_date')} />
              </div>
              <div className="space-y-1.5">
                <Label>Issued Date</Label>
                <Input type="date" value={form.issued_date} onChange={set('issued_date')} />
              </div>
              <div className="space-y-1.5">
                <Label>Expiry Date</Label>
                <Input type="date" value={form.expiry_date} onChange={set('expiry_date')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Received From</Label>
                <Input value={form.received_from} onChange={set('received_from')} placeholder="Person or entity" />
              </div>
              <div className="space-y-1.5">
                <Label>Received Date</Label>
                <Input type="date" value={form.received_date} onChange={set('received_date')} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Received By</Label>
                <Input value={form.received_by} onChange={set('received_by')} placeholder="Officer / recipient name" />
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
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
