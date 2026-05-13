import { useState, useEffect, useCallback } from 'react'
import { applications as appsApi, parcels as parcelsApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth.jsx'
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
import { Separator } from '@/components/ui/separator'
import { formatDate } from '@/lib/utils'
import { Plus, Search, Eye, Loader2, CheckCircle2, RotateCcw } from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────

const APP_TYPES = [
  ['new_registration', 'New Registration'],
  ['transfer', 'Transfer of Ownership'],
  ['subdivision', 'Subdivision & Amalgamation'],
  ['mortgage', 'Mortgage & Charge'],
  ['correction', 'Correction & Amendment'],
]
const OWNERSHIP_TYPES = [
  ['sole', 'Sole Ownership'],
  ['joint', 'Joint Ownership'],
  ['company', 'Company'],
]
const INSTRUMENT_TYPES = [
  ['first_registration', 'First Registration'],
  ['transfer', 'Transfer'],
  ['charge', 'Charge / Mortgage'],
  ['discharge', 'Discharge'],
  ['subdivision', 'Subdivision'],
  ['amalgamation', 'Amalgamation'],
  ['correction', 'Correction'],
]
const STATUSES = [
  ['step1', 'Step 1 – Data Entry'],
  ['step2', 'Step 2 – Under Review'],
  ['step3', 'Step 3 – Pending Approval'],
  ['returned', 'Returned for Correction'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
  ['cancelled', 'Cancelled'],
]
const STATUS_BADGE = {
  step1: 'warning', step2: 'info', step3: 'secondary',
  returned: 'destructive', approved: 'success',
  rejected: 'destructive', cancelled: 'secondary',
}
const STATUS_LABEL = Object.fromEntries(STATUSES)

const EMPTY_STEP1 = {
  application_type: 'new_registration',
  parcel: '',
  parcel_number_requested: '',
  ward: '',
  village_or_block: '',
  encumbrances: '',
  description: '',
  applicant_name: '',
  applicant_national_id: '',
  applicant_phone: '',
  applicant_email: '',
  applicant_address: '',
  ownership_type: 'sole',
  co_proprietors: '',
  scanned_deed_url: '',
}
const EMPTY_STEP2 = {
  registration_number: '',
  volume_ref: '',
  folio_ref: '',
  registration_entry_date: '',
  instrument_type: '',
  reviewer_notes: '',
}
const EMPTY_STEP3 = { registrar_notes: '' }
const EMPTY_RETURN = { returned_to_step: '', return_reason: '' }

// ── Small helpers ─────────────────────────────────────────────────────────────

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value || '—'}</p>
    </div>
  )
}

function SectionHeading({ step, title, completed, name }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold
        ${completed ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary'}`}>
        {completed ? '✓' : step}
      </div>
      <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {name && <p className="text-xs text-muted-foreground ml-auto">by {name}</p>}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Applications() {
  const { user } = useAuth()
  const role = user?.profile?.role
  const isSuperuser = user?.is_superuser

  const canCreate = isSuperuser || ['data_entry', 'admin'].includes(role)
  const isDataEntry = isSuperuser || ['data_entry', 'admin'].includes(role)
  const isReviewer = isSuperuser || ['reviewing_officer', 'admin'].includes(role)
  const isRegistrar = isSuperuser || ['registrar', 'admin'].includes(role)

  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [allParcels, setAllParcels] = useState([])

  // Create dialog
  const [newOpen, setNewOpen] = useState(false)
  const [step1Form, setStep1Form] = useState(EMPTY_STEP1)
  const [saving, setSaving] = useState(false)
  const [createError, setCreateError] = useState('')

  // View / action dialog
  const [viewOpen, setViewOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [step2Form, setStep2Form] = useState(EMPTY_STEP2)
  const [step3Form, setStep3Form] = useState(EMPTY_STEP3)
  const [returnForm, setReturnForm] = useState(EMPTY_RETURN)
  const [showReturn, setShowReturn] = useState(false)
  const [acting, setActing] = useState(false)
  const [actionError, setActionError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    appsApi.list({ search: search || undefined, status: filterStatus !== 'all' ? filterStatus : undefined })
      .then((r) => setData(r.data.results || r.data))
      .finally(() => setLoading(false))
  }, [search, filterStatus])

  useEffect(() => { load() }, [load])

  // ── Create ──────────────────────────────────────────────────────────────────

  const openNew = async () => {
    setStep1Form(EMPTY_STEP1); setCreateError('')
    const p = await parcelsApi.list({ page_size: 200 })
    setAllParcels(p.data.results || p.data)
    setNewOpen(true)
  }

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true); setCreateError('')
    try {
      const payload = { ...step1Form, parcel: step1Form.parcel ? Number(step1Form.parcel) : null }
      await appsApi.create(payload)
      setNewOpen(false); load()
    } catch (err) {
      const d = err.response?.data
      setCreateError(typeof d === 'object' ? Object.values(d).flat().join(' ') : 'An error occurred.')
    } finally { setSaving(false) }
  }

  // ── View / action ───────────────────────────────────────────────────────────

  const openView = async (app) => {
    setSelected(app)
    setStep2Form({
      registration_number: app.registration_number || '',
      volume_ref: app.volume_ref || '',
      folio_ref: app.folio_ref || '',
      registration_entry_date: app.registration_entry_date || '',
      instrument_type: app.instrument_type || '',
      reviewer_notes: app.reviewer_notes || '',
    })
    setStep3Form({ registrar_notes: app.registrar_notes || '' })
    setReturnForm(EMPTY_RETURN)
    setShowReturn(false)
    setActionError('')
    if (allParcels.length === 0) {
      const p = await parcelsApi.list({ page_size: 200 })
      setAllParcels(p.data.results || p.data)
    }
    setViewOpen(true)
  }

  // Determine what action the current officer can take
  const getActiveStep = (app) => {
    if (!app) return null
    const { status, returned_to_step } = app
    if (status === 'step1') return 1
    if (status === 'returned') return returned_to_step
    if (status === 'step2') return 2
    if (status === 'step3') return 3
    return null
  }

  const canActOnStep = (app) => {
    const step = getActiveStep(app)
    if (step === 1 && isDataEntry) return 1
    if (step === 2 && isReviewer) return 2
    if (step === 3 && isRegistrar) return 3
    return null
  }

  const handleStep1Submit = async () => {
    setActing(true); setActionError('')
    try {
      await appsApi.submitStep1(selected.id, {
        ...step1Form,
        parcel: step1Form.parcel ? Number(step1Form.parcel) : null,
      })
      setViewOpen(false); load()
    } catch (err) {
      const d = err.response?.data
      setActionError(typeof d === 'object' ? Object.values(d).flat().join(' ') : 'Failed to submit.')
    } finally { setActing(false) }
  }

  const handleStep2Submit = async (returning = false) => {
    setActing(true); setActionError('')
    try {
      const payload = returning
        ? { ...returnForm }
        : { ...step2Form }
      await appsApi.submitStep2(selected.id, payload)
      setViewOpen(false); load()
    } catch (err) {
      const d = err.response?.data
      setActionError(typeof d === 'object' ? Object.values(d).flat().join(' ') : 'Failed to submit.')
    } finally { setActing(false) }
  }

  const handleStep3Submit = async (returning = false) => {
    setActing(true); setActionError('')
    try {
      const payload = returning
        ? { ...step3Form, ...returnForm }
        : { ...step3Form }
      await appsApi.submitStep3(selected.id, payload)
      setViewOpen(false); load()
    } catch (err) {
      const d = err.response?.data
      setActionError(typeof d === 'object' ? Object.values(d).flat().join(' ') : 'Failed to submit.')
    } finally { setActing(false) }
  }

  // ── Setters ─────────────────────────────────────────────────────────────────

  const s1 = (k) => (e) => setStep1Form({ ...step1Form, [k]: e.target.value })
  const s1v = (k) => (v) => setStep1Form({ ...step1Form, [k]: v })
  const s2 = (k) => (e) => setStep2Form({ ...step2Form, [k]: e.target.value })
  const s2v = (k) => (v) => setStep2Form({ ...step2Form, [k]: v })
  const s3 = (k) => (e) => setStep3Form({ ...step3Form, [k]: e.target.value })
  const sr = (k) => (e) => setReturnForm({ ...returnForm, [k]: e.target.value })
  const srv = (k) => (v) => setReturnForm({ ...returnForm, [k]: v })

  const actingStep = selected ? canActOnStep(selected) : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="text-muted-foreground mt-1">Submit and manage registration applications</p>
        </div>
        {canCreate && (
          <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> New Application</Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search application #, applicant…" className="pl-9" value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-52"><SelectValue placeholder="All statuses" /></SelectTrigger>
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
              <TableHead>App #</TableHead>
              <TableHead>Applicant</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Parcel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => (
                <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
              ))}</TableRow>
            )) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  No applications found
                </TableCell>
              </TableRow>
            ) : data.map((app) => (
              <TableRow key={app.id}>
                <TableCell className="font-mono text-xs">{app.application_number}</TableCell>
                <TableCell className="font-medium">{app.applicant_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{app.application_type_display}</TableCell>
                <TableCell className="font-mono text-sm">
                  {app.parcel_number || app.parcel_number_requested || '—'}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE[app.status] || 'outline'}>
                    {STATUS_LABEL[app.status] || app.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(app.submitted_at)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openView(app)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* ── Create Dialog (Step 1) ─────────────────────────────────────────── */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Submit New Application</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-5 mt-2">
            {createError && <p className="text-sm text-destructive">{createError}</p>}

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Property Information</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Application Type *</Label>
                  <Select value={step1Form.application_type} onValueChange={s1v('application_type')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{APP_TYPES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Existing Parcel (if applicable)</Label>
                  <Select value={step1Form.parcel} onValueChange={s1v('parcel')}>
                    <SelectTrigger><SelectValue placeholder="Select parcel (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {allParcels.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.parcel_number} — {p.district_display}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!step1Form.parcel && (
                  <div className="space-y-1.5">
                    <Label>Requested Parcel Number</Label>
                    <Input value={step1Form.parcel_number_requested} onChange={s1('parcel_number_requested')} placeholder="e.g. ZNZ-MJN-001" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Ward</Label>
                    <Input value={step1Form.ward} onChange={s1('ward')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Village / Block</Label>
                    <Input value={step1Form.village_or_block} onChange={s1('village_or_block')} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Encumbrances / Restrictions</Label>
                  <Textarea rows={2} value={step1Form.encumbrances} onChange={s1('encumbrances')} placeholder="Any encumbrances or restrictions noted on the deed" />
                </div>
                <div className="space-y-1.5">
                  <Label>Description *</Label>
                  <Textarea required rows={3} value={step1Form.description} onChange={s1('description')} placeholder="Supporting details" />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Proprietorship Information</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Full Name *</Label>
                    <Input required value={step1Form.applicant_name} onChange={s1('applicant_name')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>National ID *</Label>
                    <Input required value={step1Form.applicant_national_id} onChange={s1('applicant_national_id')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone *</Label>
                    <Input required value={step1Form.applicant_phone} onChange={s1('applicant_phone')} placeholder="+255 7xx xxx xxx" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" value={step1Form.applicant_email} onChange={s1('applicant_email')} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Address</Label>
                  <Textarea rows={2} value={step1Form.applicant_address} onChange={s1('applicant_address')} />
                </div>
                <div className="space-y-1.5">
                  <Label>Nature of Ownership</Label>
                  <Select value={step1Form.ownership_type} onValueChange={s1v('ownership_type')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{OWNERSHIP_TYPES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {step1Form.ownership_type === 'joint' && (
                  <div className="space-y-1.5">
                    <Label>Co-Proprietors *</Label>
                    <Textarea required rows={3} value={step1Form.co_proprietors} onChange={s1('co_proprietors')}
                      placeholder="Names and ID details of all co-proprietors" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Scanned Deed URL</Label>
                  <Input type="url" value={step1Form.scanned_deed_url} onChange={s1('scanned_deed_url')} placeholder="https://…" />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Application
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── View / Action Dialog ──────────────────────────────────────────────── */}
      {selected && (
        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selected.application_number}
                <Badge variant={STATUS_BADGE[selected.status] || 'outline'} className="ml-1">
                  {STATUS_LABEL[selected.status] || selected.status}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 mt-1">

              {/* Step 1 — Data Entry */}
              <div className="rounded-lg border p-4">
                <SectionHeading step={1} title="Data Entry" completed={selected.step1_at}
                  name={selected.step1_by_name} />

                {actingStep === 1 ? (
                  /* Editable step 1 */
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Application Type *</Label>
                      <Select value={step1Form.application_type} onValueChange={s1v('application_type')}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{APP_TYPES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Existing Parcel</Label>
                      <Select value={step1Form.parcel} onValueChange={s1v('parcel')}>
                        <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {allParcels.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>{p.parcel_number} — {p.district_display}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {!step1Form.parcel && (
                      <div className="space-y-1.5">
                        <Label>Requested Parcel Number</Label>
                        <Input value={step1Form.parcel_number_requested} onChange={s1('parcel_number_requested')} />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5"><Label>Ward</Label><Input value={step1Form.ward} onChange={s1('ward')} /></div>
                      <div className="space-y-1.5"><Label>Village / Block</Label><Input value={step1Form.village_or_block} onChange={s1('village_or_block')} /></div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Encumbrances</Label>
                      <Textarea rows={2} value={step1Form.encumbrances} onChange={s1('encumbrances')} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Description *</Label>
                      <Textarea required rows={2} value={step1Form.description} onChange={s1('description')} />
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5"><Label>Full Name *</Label><Input required value={step1Form.applicant_name} onChange={s1('applicant_name')} /></div>
                      <div className="space-y-1.5"><Label>National ID *</Label><Input required value={step1Form.applicant_national_id} onChange={s1('applicant_national_id')} /></div>
                      <div className="space-y-1.5"><Label>Phone *</Label><Input required value={step1Form.applicant_phone} onChange={s1('applicant_phone')} /></div>
                      <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={step1Form.applicant_email} onChange={s1('applicant_email')} /></div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Address</Label>
                      <Textarea rows={2} value={step1Form.applicant_address} onChange={s1('applicant_address')} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Ownership Type</Label>
                      <Select value={step1Form.ownership_type} onValueChange={s1v('ownership_type')}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{OWNERSHIP_TYPES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    {step1Form.ownership_type === 'joint' && (
                      <div className="space-y-1.5">
                        <Label>Co-Proprietors</Label>
                        <Textarea rows={2} value={step1Form.co_proprietors} onChange={s1('co_proprietors')} />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label>Scanned Deed URL</Label>
                      <Input type="url" value={step1Form.scanned_deed_url} onChange={s1('scanned_deed_url')} placeholder="https://…" />
                    </div>
                  </div>
                ) : (
                  /* Read-only step 1 */
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      <Field label="Type" value={selected.application_type_display} />
                      <Field label="Parcel" value={selected.parcel_number || selected.parcel_number_requested} />
                      <Field label="Ward" value={selected.ward} />
                      <Field label="Village / Block" value={selected.village_or_block} />
                    </div>
                    {selected.encumbrances && <Field label="Encumbrances" value={selected.encumbrances} />}
                    {selected.description && <Field label="Description" value={selected.description} />}
                    <Separator />
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      <Field label="Applicant" value={selected.applicant_name} />
                      <Field label="National ID" value={selected.applicant_national_id} />
                      <Field label="Phone" value={selected.applicant_phone} />
                      <Field label="Email" value={selected.applicant_email} />
                      <Field label="Ownership" value={OWNERSHIP_TYPES.find(([v]) => v === selected.ownership_type)?.[1]} />
                      {selected.scanned_deed_url && (
                        <div>
                          <p className="text-xs text-muted-foreground">Scanned Deed</p>
                          <a href={selected.scanned_deed_url} target="_blank" rel="noreferrer"
                            className="text-sm text-primary underline truncate block">View</a>
                        </div>
                      )}
                    </div>
                    {selected.co_proprietors && <Field label="Co-Proprietors" value={selected.co_proprietors} />}
                    {selected.applicant_address && <Field label="Address" value={selected.applicant_address} />}
                  </div>
                )}
              </div>

              {/* Step 2 — Reviewing Officer */}
              {(['step2', 'step3', 'returned', 'approved', 'rejected'].includes(selected.status) || actingStep === 2) && (
                <div className="rounded-lg border p-4">
                  <SectionHeading step={2} title="Review" completed={selected.step2_at}
                    name={selected.step2_by_name} />

                  {actingStep === 2 ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>Registration Number *</Label>
                          <Input required value={step2Form.registration_number} onChange={s2('registration_number')} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Instrument Type</Label>
                          <Select value={step2Form.instrument_type} onValueChange={s2v('instrument_type')}>
                            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                            <SelectContent>{INSTRUMENT_TYPES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Volume Ref</Label>
                          <Input value={step2Form.volume_ref} onChange={s2('volume_ref')} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Folio Ref</Label>
                          <Input value={step2Form.folio_ref} onChange={s2('folio_ref')} />
                        </div>
                        <div className="space-y-1.5 col-span-2">
                          <Label>Registration Entry Date</Label>
                          <Input type="date" value={step2Form.registration_entry_date} onChange={s2('registration_entry_date')} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Notes for Registrar</Label>
                        <Textarea rows={2} value={step2Form.reviewer_notes} onChange={s2('reviewer_notes')} />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      <Field label="Registration Number" value={selected.registration_number} />
                      <Field label="Instrument Type" value={INSTRUMENT_TYPES.find(([v]) => v === selected.instrument_type)?.[1]} />
                      <Field label="Volume Ref" value={selected.volume_ref} />
                      <Field label="Folio Ref" value={selected.folio_ref} />
                      <Field label="Entry Date" value={selected.registration_entry_date} />
                      {selected.reviewer_notes && <Field label="Notes" value={selected.reviewer_notes} />}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3 — Registrar */}
              {(['step3', 'approved', 'rejected'].includes(selected.status) || actingStep === 3) && (
                <div className="rounded-lg border p-4">
                  <SectionHeading step={3} title="Registrar Approval" completed={selected.step3_at}
                    name={selected.step3_by_name} />

                  {actingStep === 3 ? (
                    <div className="space-y-1.5">
                      <Label>Registrar Notes</Label>
                      <Textarea rows={3} value={step3Form.registrar_notes} onChange={s3('registrar_notes')}
                        placeholder="Optional remarks for the record" />
                    </div>
                  ) : (
                    selected.registrar_notes && <Field label="Registrar Notes" value={selected.registrar_notes} />
                  )}
                </div>
              )}

              {/* Return info */}
              {selected.status === 'returned' && selected.return_reason && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <p className="text-sm font-semibold text-destructive mb-1">
                    Returned to Step {selected.returned_to_step}
                  </p>
                  <p className="text-sm">{selected.return_reason}</p>
                </div>
              )}

              {/* Action errors */}
              {actionError && <p className="text-sm text-destructive">{actionError}</p>}

              {/* Action buttons */}
              {actingStep === 1 && (
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
                  <Button onClick={handleStep1Submit} disabled={acting}>
                    {acting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Submit to Reviewing Officer
                  </Button>
                </div>
              )}

              {actingStep === 2 && !showReturn && (
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={() => { setShowReturn(true) }}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Return for Correction
                  </Button>
                  <Button onClick={() => handleStep2Submit(false)} disabled={acting}>
                    {acting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Submit to Registrar
                  </Button>
                </div>
              )}

              {actingStep === 2 && showReturn && (
                <div className="rounded-lg border p-4 space-y-3">
                  <p className="text-sm font-semibold">Return for Correction</p>
                  <div className="space-y-1.5">
                    <Label>Return to Step</Label>
                    <Select value={String(returnForm.returned_to_step)} onValueChange={srv('returned_to_step')}>
                      <SelectTrigger><SelectValue placeholder="Select step" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Step 1 — Data Entry</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Reason *</Label>
                    <Textarea required rows={3} value={returnForm.return_reason} onChange={sr('return_reason')}
                      placeholder="Describe the discrepancy or required correction" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowReturn(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={() => handleStep2Submit(true)} disabled={acting || !returnForm.return_reason}>
                      {acting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Return Application
                    </Button>
                  </div>
                </div>
              )}

              {actingStep === 3 && !showReturn && (
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={() => setShowReturn(true)}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Return for Correction
                  </Button>
                  <Button onClick={() => handleStep3Submit(false)} disabled={acting}>
                    {acting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approve &amp; Register
                  </Button>
                </div>
              )}

              {actingStep === 3 && showReturn && (
                <div className="rounded-lg border p-4 space-y-3">
                  <p className="text-sm font-semibold">Return for Correction</p>
                  <div className="space-y-1.5">
                    <Label>Return to Step</Label>
                    <Select value={String(returnForm.returned_to_step)} onValueChange={srv('returned_to_step')}>
                      <SelectTrigger><SelectValue placeholder="Select step" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Step 1 — Data Entry</SelectItem>
                        <SelectItem value="2">Step 2 — Reviewing Officer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Reason *</Label>
                    <Textarea required rows={3} value={returnForm.return_reason} onChange={sr('return_reason')}
                      placeholder="Describe what needs to be corrected" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowReturn(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={() => handleStep3Submit(true)} disabled={acting || !returnForm.return_reason}>
                      {acting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Return Application
                    </Button>
                  </div>
                </div>
              )}

              {!actingStep && (
                <div className="flex justify-end pt-1">
                  <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
