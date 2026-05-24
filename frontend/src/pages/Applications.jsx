import { useState, useEffect, useCallback } from 'react'
import { applications as appsApi, parcels as parcelsApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth.jsx'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { formatDate } from '@/lib/utils'
import { Plus, Search, Eye, Loader2, CheckCircle2, RotateCcw, UserPlus, Trash2 } from 'lucide-react'

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
const ID_TYPES = [
  ['national_id', 'National ID'],
  ['passport', 'Passport'],
  ['company_reg', 'Company Registration'],
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
const DISTRICTS = [
  ['mjini', 'Mjini (Urban West)'], ['magharibi', 'Magharibi (West)'],
  ['kaskazini_a', 'Kaskazini A'], ['kaskazini_b', 'Kaskazini B'],
  ['kati', 'Kati (Central)'], ['kusini', 'Kusini (South)'],
  ['chake_chake', 'Chake Chake'], ['mkoani', 'Mkoani'],
  ['wete', 'Wete'], ['micheweni', 'Micheweni'],
]
const LAND_USE = [
  ['residential', 'Residential'], ['commercial', 'Commercial'],
  ['agricultural', 'Agricultural'], ['industrial', 'Industrial'],
  ['institutional', 'Institutional'], ['mixed', 'Mixed Use'],
]
const REGIONS = [
  ['mjini_magharibi', 'Mjini Magharibi'],
  ['kaskazini_unguja', 'Kaskazini Unguja'],
  ['kusini_unguja', 'Kusini Unguja'],
  ['kaskazini_pemba', 'Kaskazini Pemba'],
  ['kusini_pemba', 'Kusini Pemba'],
]
const STATUSES = [
  ['step1', 'Step 1 – Data Entry'],
  ['step2', 'Step 2 – Registration Module'],
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
const APP_TYPE_MAP = Object.fromEntries(APP_TYPES)
const OWNERSHIP_MAP = Object.fromEntries(OWNERSHIP_TYPES)

const EMPTY_APP = {
  application_type: 'new_registration',
  parcel: 'none',
  parcel_number_requested: '',
  ownership_type: 'sole',
  scanned_deed_url: '',
  description: '',
  certificate_number: '',
  registration_date: '',
  first_registration_date: '',
  issued_date: '',
  expiry_date: '',
  received_from: '',
  received_date: '',
  received_by: '',
}
const EMPTY_PARCEL = {
  parcel_number: '', zupin: '', house_number: '',
  district: '', region: '', shehia: '',
  area_sqm: '', land_use: '', location_description: '',
}
const EMPTY_PROPRIETOR = (is_primary = false) => ({
  full_name: '', national_id: '', id_type: 'national_id',
  phone: '', email: '', address: '', is_primary,
})
const EMPTY_STEP2 = {
  registration_number: '', volume_ref: '', folio_ref: '',
  registration_entry_date: '', instrument_type: '', reviewer_notes: '',
}
const EMPTY_STEP3 = { registrar_notes: '' }
const EMPTY_RETURN = { returned_to_step: '', return_reason: '' }

// ── Display helpers ───────────────────────────────────────────────────────────

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value || '—'}</p>
    </div>
  )
}

function StepHeading({ step, title, completed, name }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold
        ${completed ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary'}`}>
        {completed ? '✓' : step}
      </div>
      <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex-1">{title}</p>
      {name && <p className="text-xs text-muted-foreground">by {name}</p>}
    </div>
  )
}

function ProprietorFields({ value, onChange, label }) {
  return (
    <div className="space-y-2 rounded-md border p-3">
      {label && <p className="text-xs font-semibold text-muted-foreground uppercase">{label}</p>}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1"><Label className="text-xs">Full Name *</Label>
          <Input required value={value.full_name} onChange={(e) => onChange({ ...value, full_name: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-xs">ID Type</Label>
          <Select value={value.id_type} onValueChange={(v) => onChange({ ...value, id_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ID_TYPES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
          </Select></div>
        <div className="space-y-1"><Label className="text-xs">ID Number *</Label>
          <Input required value={value.national_id} onChange={(e) => onChange({ ...value, national_id: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-xs">Phone</Label>
          <Input value={value.phone} onChange={(e) => onChange({ ...value, phone: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-xs">Email</Label>
          <Input type="email" value={value.email} onChange={(e) => onChange({ ...value, email: e.target.value })} /></div>
        <div className="space-y-1 col-span-2"><Label className="text-xs">Address</Label>
          <Input value={value.address} onChange={(e) => onChange({ ...value, address: e.target.value })} /></div>
      </div>
    </div>
  )
}

function Step1Fields({
  af, setAf, pp, setPp, cps, setCps,
  allParcels, showNewParcel, setShowNewParcel, newParcel, setNewParcel,
}) {
  const availableParcels = af.application_type === 'new_registration'
    ? allParcels.filter(p => p.status !== 'registered')
    : allParcels
  return (
    <div className="space-y-4">

      {/* ── Section 1: Application Information ─────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Application Information</p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Application Type *</Label>
            <Select value={af.application_type} onValueChange={(v) => setAf({ ...af, application_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{APP_TYPES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={2} value={af.description} onChange={(e) => setAf({ ...af, description: e.target.value })} placeholder="Supporting details" />
          </div>
        </div>
      </div>

      <Separator />

      {/* ── Section 2: Title Information ────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Title Information</p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Certificate Number</Label>
            <Input value={af.certificate_number} onChange={(e) => setAf({ ...af, certificate_number: e.target.value })} placeholder="e.g. CERT-001" />
          </div>

          {/* Parcel */}
          <div className="space-y-1.5">
            <Label>Existing Parcel</Label>
            <Select value={af.parcel} onValueChange={(v) => { setAf({ ...af, parcel: v }); setShowNewParcel(false) }}>
              <SelectTrigger><SelectValue placeholder="Select parcel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None / New Parcel</SelectItem>
                {availableParcels.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.parcel_number} — {p.district_display}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {af.parcel === 'none' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="showNP" checked={showNewParcel}
                  onChange={(e) => setShowNewParcel(e.target.checked)} className="h-4 w-4" />
                <label htmlFor="showNP" className="text-sm">Register new parcel inline</label>
              </div>
              {showNewParcel ? (
                <div className="rounded-md border p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">New Parcel Details</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Parcel Number *</Label>
                      <Input required value={newParcel.parcel_number} onChange={(e) => setNewParcel({ ...newParcel, parcel_number: e.target.value })} /></div>
                    <div className="space-y-1"><Label className="text-xs">ZUPIN</Label>
                      <Input value={newParcel.zupin} onChange={(e) => setNewParcel({ ...newParcel, zupin: e.target.value })} placeholder="Zanzibar Unique Parcel ID" /></div>
                    <div className="space-y-1"><Label className="text-xs">House No.</Label>
                      <Input value={newParcel.house_number} onChange={(e) => setNewParcel({ ...newParcel, house_number: e.target.value })} placeholder="Optional" /></div>
                    <div className="space-y-1"><Label className="text-xs">Area (m²) *</Label>
                      <Input required type="number" value={newParcel.area_sqm} onChange={(e) => setNewParcel({ ...newParcel, area_sqm: e.target.value })} /></div>
                    <div className="space-y-1"><Label className="text-xs">Region</Label>
                      <Select value={newParcel.region || ''} onValueChange={(v) => setNewParcel({ ...newParcel, region: v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{REGIONS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                      </Select></div>
                    <div className="space-y-1"><Label className="text-xs">Shehia</Label>
                      <Input value={newParcel.shehia} onChange={(e) => setNewParcel({ ...newParcel, shehia: e.target.value })} placeholder="e.g. Mwanakwerekwe" /></div>
                    <div className="space-y-1"><Label className="text-xs">District *</Label>
                      <Select value={newParcel.district} onValueChange={(v) => setNewParcel({ ...newParcel, district: v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{DISTRICTS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                      </Select></div>
                    <div className="space-y-1"><Label className="text-xs">Land Use *</Label>
                      <Select value={newParcel.land_use} onValueChange={(v) => setNewParcel({ ...newParcel, land_use: v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{LAND_USE.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                      </Select></div>
                    <div className="space-y-1 col-span-2"><Label className="text-xs">Location Description *</Label>
                      <Textarea rows={2} required value={newParcel.location_description} onChange={(e) => setNewParcel({ ...newParcel, location_description: e.target.value })} /></div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>Requested Parcel Number</Label>
                  <Input value={af.parcel_number_requested} onChange={(e) => setAf({ ...af, parcel_number_requested: e.target.value })} placeholder="e.g. ZNZ-MJN-001" />
                </div>
              )}
            </div>
          )}

          {/* Proprietors */}
          <div className="space-y-1.5">
            <Label>Nature of Ownership</Label>
            <Select value={af.ownership_type} onValueChange={(v) => setAf({ ...af, ownership_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{OWNERSHIP_TYPES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <ProprietorFields value={pp} onChange={setPp} label="Primary Proprietor" />
          {cps.map((cp, i) => (
            <div key={i} className="relative">
              <ProprietorFields
                value={cp}
                onChange={(v) => { const n = [...cps]; n[i] = v; setCps(n) }}
                label={`Co-Proprietor ${i + 1}`}
              />
              <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 text-destructive"
                type="button" onClick={() => setCps(cps.filter((_, j) => j !== i))}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {af.ownership_type !== 'sole' && (
            <Button type="button" variant="outline" size="sm" className="gap-1.5"
              onClick={() => setCps([...cps, EMPTY_PROPRIETOR(false)])}>
              <UserPlus className="h-3.5 w-3.5" /> Add Co-Proprietor
            </Button>
          )}
          <div className="space-y-1.5">
            <Label>Scanned Deed URL</Label>
            <Input type="url" value={af.scanned_deed_url} onChange={(e) => setAf({ ...af, scanned_deed_url: e.target.value })} placeholder="https://…" />
          </div>
        </div>
      </div>

      <Separator />

      {/* ── Section 3: Registration & Dates ─────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Registration &amp; Dates</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Registration Date</Label>
            <Input type="date" value={af.registration_date} onChange={(e) => setAf({ ...af, registration_date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>First Registration Date</Label>
            <Input type="date" value={af.first_registration_date} onChange={(e) => setAf({ ...af, first_registration_date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Issued Date</Label>
            <Input type="date" value={af.issued_date} onChange={(e) => setAf({ ...af, issued_date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Expiry Date</Label>
            <Input type="date" value={af.expiry_date} onChange={(e) => setAf({ ...af, expiry_date: e.target.value })} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Received From</Label>
            <Input value={af.received_from} onChange={(e) => setAf({ ...af, received_from: e.target.value })} placeholder="Person or entity" />
          </div>
          <div className="space-y-1.5">
            <Label>Received Date</Label>
            <Input type="date" value={af.received_date} onChange={(e) => setAf({ ...af, received_date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Received By</Label>
            <Input value={af.received_by} onChange={(e) => setAf({ ...af, received_by: e.target.value })} placeholder="Officer name" />
          </div>
        </div>
      </div>

    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Applications() {
  const { user } = useAuth()
  const role = user?.profile?.role
  const isSuperuser = user?.is_superuser
  const isDataEntry = isSuperuser || ['data_entry', 'admin'].includes(role)
  const isReviewer = isSuperuser || ['reviewing_officer', 'admin'].includes(role)
  const isRegistrar = isSuperuser || ['registrar', 'admin'].includes(role)

  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [allParcels, setAllParcels] = useState([])

  // ── Create dialog state ───────────────────────────────────────────────────
  const [newOpen, setNewOpen] = useState(false)
  const [appForm, setAppForm] = useState(EMPTY_APP)
  const [newParcel, setNewParcel] = useState(EMPTY_PARCEL)
  const [showNewParcel, setShowNewParcel] = useState(false)
  const [primaryProp, setPrimaryProp] = useState(EMPTY_PROPRIETOR(true))
  const [coProps, setCoProps] = useState([])
  const [saving, setSaving] = useState(false)
  const [createError, setCreateError] = useState('')

  // ── View dialog state ─────────────────────────────────────────────────────
  const [viewOpen, setViewOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [step1AppEdit, setStep1AppEdit] = useState(EMPTY_APP)
  const [step1PrimaryEdit, setStep1PrimaryEdit] = useState(EMPTY_PROPRIETOR(true))
  const [step1CoPropsEdit, setStep1CoPropsEdit] = useState([])
  const [step2Form, setStep2Form] = useState(EMPTY_STEP2)
  const [step3Form, setStep3Form] = useState(EMPTY_STEP3)
  const [returnForm, setReturnForm] = useState(EMPTY_RETURN)
  const [showReturn, setShowReturn] = useState(false)
  const [acting, setActing] = useState(false)
  const [actionError, setActionError] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)
  const [confirmCreateOpen, setConfirmCreateOpen] = useState(false)
  const [confirmStep1Open, setConfirmStep1Open] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    appsApi.list({
      search: search || undefined,
      status: filterStatus !== 'all' ? filterStatus : undefined,
    })
      .then((r) => setData(r.data.results || r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [search, filterStatus])

  useEffect(() => { load() }, [load])

  const loadParcels = async () => {
    if (allParcels.length > 0) return
    const p = await parcelsApi.list({ page_size: 200 })
    setAllParcels(p.data.results || p.data)
  }

  // ── Create ──────────────────────────────────────────────────────────────────

  const openNew = async () => {
    setAppForm(EMPTY_APP)
    setNewParcel(EMPTY_PARCEL)
    setShowNewParcel(false)
    setPrimaryProp(EMPTY_PROPRIETOR(true))
    setCoProps([])
    setCreateError('')
    try { await loadParcels() } catch {}
    setNewOpen(true)
  }

  const buildStep1Payload = (af, np, showNP, pp, cps) => {
    const nullDate = (v) => v || null
    return {
      ...af,
      parcel: af.parcel !== 'none' ? Number(af.parcel) : null,
      registration_date: nullDate(af.registration_date),
      first_registration_date: nullDate(af.first_registration_date),
      issued_date: nullDate(af.issued_date),
      expiry_date: nullDate(af.expiry_date),
      received_date: nullDate(af.received_date),
      ...(showNP && af.parcel === 'none' ? { new_parcel: np } : {}),
      proprietors: [{ ...pp, is_primary: true }, ...cps.map((c) => ({ ...c, is_primary: false }))],
    }
  }

  const handleCreate = (e) => {
    e.preventDefault()
    setCreateError('')
    setConfirmCreateOpen(true)
  }

  const handleConfirmedCreate = async () => {
    setSaving(true); setCreateError('')
    try {
      await appsApi.create(buildStep1Payload(appForm, newParcel, showNewParcel, primaryProp, coProps))
      setConfirmCreateOpen(false); setNewOpen(false); load()
    } catch (err) {
      const d = err.response?.data
      setCreateError(typeof d === 'object' ? JSON.stringify(d) : 'An error occurred.')
      setConfirmCreateOpen(false)
    } finally { setSaving(false) }
  }

  // ── View / action ───────────────────────────────────────────────────────────

  const populateViewState = (app) => {
    const pp = app.proprietors?.find((p) => p.is_primary) ?? app.proprietors?.[0] ?? {}
    setStep1AppEdit({
      application_type: app.application_type || 'new_registration',
      parcel: app.parcel ? String(app.parcel) : 'none',
      parcel_number_requested: app.parcel_number_requested || '',
      ownership_type: app.ownership_type || 'sole',
      scanned_deed_url: app.scanned_deed_url || '',
      description: app.description || '',
      certificate_number: app.certificate_number || '',
      registration_date: app.registration_date || '',
      first_registration_date: app.first_registration_date || '',
      issued_date: app.issued_date || '',
      expiry_date: app.expiry_date || '',
      received_from: app.received_from || '',
      received_date: app.received_date || '',
      received_by: app.received_by || '',
    })
    setStep1PrimaryEdit({ ...EMPTY_PROPRIETOR(true), ...pp, is_primary: true })
    setStep1CoPropsEdit((app.proprietors?.filter((p) => !p.is_primary) || []).map((p) => ({ ...p })))
    setStep2Form({
      registration_number: app.review?.registration_number || '',
      volume_ref: app.review?.volume_ref || '',
      folio_ref: app.review?.folio_ref || '',
      registration_entry_date: app.review?.registration_entry_date || '',
      instrument_type: app.review?.instrument_type || '',
      reviewer_notes: app.review?.reviewer_notes || '',
    })
    setStep3Form({ registrar_notes: app.approval?.registrar_notes || '' })
  }

  const openView = async (app) => {
    // Show dialog immediately with list-row data, then replace with fresh detail fetch
    setSelected(app)
    populateViewState(app)
    setReturnForm(EMPTY_RETURN)
    setShowReturn(false)
    setActionError('')
    setViewOpen(true)
    await loadParcels()
    // Fetch full detail (includes nested proprietors, review, approval)
    setDetailLoading(true)
    try {
      const res = await appsApi.get(app.id)
      setSelected(res.data)
      populateViewState(res.data)
    } finally {
      setDetailLoading(false)
    }
  }

  const getActiveStep = (app) => {
    if (!app) return null
    if (app.status === 'step1') return 1
    if (app.status === 'returned') return app.returned_to_step
    if (app.status === 'step2') return 2
    if (app.status === 'step3') return 3
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
      await appsApi.submitStep1(
        selected.id,
        buildStep1Payload(step1AppEdit, null, false, step1PrimaryEdit, step1CoPropsEdit),
      )
      setViewOpen(false); load()
    } catch (err) {
      const d = err.response?.data
      setActionError(typeof d === 'object' ? JSON.stringify(d) : 'Failed.')
    } finally { setActing(false) }
  }

  const handleStep2Submit = async (returning = false) => {
    setActing(true); setActionError('')
    try {
      const nullStr = (v) => v || null
      const payload = returning ? returnForm : {
        ...step2Form,
        registration_number: nullStr(step2Form.registration_number),
        registration_entry_date: nullStr(step2Form.registration_entry_date),
      }
      await appsApi.submitStep2(selected.id, payload)
      setViewOpen(false); load()
    } catch (err) {
      const d = err.response?.data
      setActionError(typeof d === 'object' ? JSON.stringify(d) : 'Failed.')
    } finally { setActing(false) }
  }

  const handleStep3Submit = async (returning = false) => {
    setActing(true); setActionError('')
    try {
      await appsApi.submitStep3(selected.id, returning ? { ...step3Form, ...returnForm } : step3Form)
      setViewOpen(false); load()
    } catch (err) {
      const d = err.response?.data
      setActionError(typeof d === 'object' ? JSON.stringify(d) : 'Failed.')
    } finally { setActing(false) }
  }

  const actingStep = selected ? canActOnStep(selected) : null
  const primaryPropDisplay = selected?.proprietors?.find((p) => p.is_primary) ?? selected?.proprietors?.[0]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="text-muted-foreground mt-1">Submit and manage registration applications</p>
        </div>
        {isDataEntry && (
          <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> New Application</Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search application #, name, ID…" className="pl-9" value={search}
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
              <TableHead>Proprietor</TableHead>
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
            ) : data.map((app) => {
              const pp = app.proprietors?.find((p) => p.is_primary) ?? app.proprietors?.[0]
              return (
                <TableRow key={app.id}>
                  <TableCell className="font-mono text-xs">{app.application_number}</TableCell>
                  <TableCell className="font-medium">{pp?.full_name || '—'}</TableCell>
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
              )
            })}
          </TableBody>
        </Table>
      </Card>

      {/* ── Create Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Application</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            {createError && <p className="text-sm text-destructive">{createError}</p>}
            <Step1Fields
              af={appForm} setAf={setAppForm}
              pp={primaryProp} setPp={setPrimaryProp}
              cps={coProps} setCps={setCoProps}
              allParcels={allParcels}
              showNewParcel={showNewParcel} setShowNewParcel={setShowNewParcel}
              newParcel={newParcel} setNewParcel={setNewParcel}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Submit for Registration
              </Button>
            </div>
          </form>

          {/* ── Confirmation modal (nested) ─────────────────────────────────── */}
          <Dialog open={confirmCreateOpen} onOpenChange={setConfirmCreateOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Confirm Submission</DialogTitle></DialogHeader>
              <div className="space-y-3 my-2">
                <p className="text-sm text-muted-foreground">
                  Please verify the details below are correct. Once confirmed, this application will
                  be sent directly to the Registration Module.
                </p>
                <div className="rounded-md border p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Application Type</span>
                    <span className="font-medium">{APP_TYPE_MAP[appForm.application_type]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Primary Proprietor</span>
                    <span className="font-medium">{primaryProp.full_name || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID Number</span>
                    <span className="font-medium">{primaryProp.national_id || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ownership</span>
                    <span className="font-medium">{OWNERSHIP_MAP[appForm.ownership_type]}</span>
                  </div>
                  {coProps.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Co-Proprietors</span>
                      <span className="font-medium">{coProps.length}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Parcel</span>
                    <span className="font-medium">
                      {appForm.parcel !== 'none'
                        ? (allParcels.find(p => String(p.id) === appForm.parcel)?.parcel_number || `#${appForm.parcel}`)
                        : showNewParcel
                          ? (newParcel.parcel_number ? `New: ${newParcel.parcel_number}` : 'New parcel')
                          : (appForm.parcel_number_requested || 'None selected')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmCreateOpen(false)}>Back</Button>
                <Button onClick={handleConfirmedCreate} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Confirm &amp; Submit
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </DialogContent>
      </Dialog>

      {/* ── View / Action Dialog ──────────────────────────────────────────────── */}
      {selected && (
        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent className="max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 flex-wrap">
                {selected.application_number}
                <Badge variant={STATUS_BADGE[selected.status] || 'outline'} className="ml-1">
                  {STATUS_LABEL[selected.status] || selected.status}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            {detailLoading && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading full record…
              </p>
            )}

            <div className="space-y-4 mt-1">

              {/* ── Step 1 ─────────────────────────────────────────────────── */}
              <div className="rounded-lg border p-4">
                <StepHeading step={1} title="Data Entry"
                  completed={selected.step1_at} name={selected.step1_by_name} />

                {actingStep === 1 ? (
                  <Step1Fields
                    af={step1AppEdit} setAf={setStep1AppEdit}
                    pp={step1PrimaryEdit} setPp={setStep1PrimaryEdit}
                    cps={step1CoPropsEdit} setCps={setStep1CoPropsEdit}
                    allParcels={allParcels}
                    showNewParcel={showNewParcel} setShowNewParcel={setShowNewParcel}
                    newParcel={newParcel} setNewParcel={setNewParcel}
                  />
                ) : (
                  <div className="space-y-3">
                    {/* Application info */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      <Field label="Type" value={selected.application_type_display} />
                      {selected.description && <Field label="Description" value={selected.description} />}
                    </div>
                    <Separator />
                    {/* Title info */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      {selected.certificate_number && <Field label="Certificate Number" value={selected.certificate_number} />}
                      <Field label="Parcel" value={selected.parcel_number || selected.parcel_number_requested} />
                      <Field label="Ownership" value={selected.ownership_type_display} />
                      {selected.scanned_deed_url && (
                        <div>
                          <p className="text-xs text-muted-foreground">Scanned Deed</p>
                          <a href={selected.scanned_deed_url} target="_blank" rel="noreferrer"
                            className="text-sm text-primary underline">View</a>
                        </div>
                      )}
                    </div>
                    <Separator />
                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      {selected.registration_date && <Field label="Registration Date" value={selected.registration_date} />}
                      {selected.first_registration_date && <Field label="First Reg. Date" value={selected.first_registration_date} />}
                      {selected.issued_date && <Field label="Issued Date" value={selected.issued_date} />}
                      {selected.expiry_date && <Field label="Expiry Date" value={selected.expiry_date} />}
                      {selected.received_from && <Field label="Received From" value={selected.received_from} />}
                      {selected.received_date && <Field label="Received Date" value={selected.received_date} />}
                      {selected.received_by && <Field label="Received By" value={selected.received_by} />}
                    </div>
                    {/* Parcel detail */}
                    {selected.parcel_detail && (
                      <>
                        <Separator />
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                          {selected.parcel_detail.zupin && <Field label="ZUPIN" value={selected.parcel_detail.zupin} />}
                          {selected.parcel_detail.house_number && <Field label="House No." value={selected.parcel_detail.house_number} />}
                          <Field label="District" value={selected.parcel_detail.district_display} />
                          <Field label="Area" value={selected.parcel_detail.area_sqm ? `${selected.parcel_detail.area_sqm} m²` : null} />
                          {selected.parcel_detail.region_display && <Field label="Region" value={selected.parcel_detail.region_display} />}
                          {selected.parcel_detail.shehia && <Field label="Shehia" value={selected.parcel_detail.shehia} />}
                          <Field label="Land Use" value={selected.parcel_detail.land_use_display} />
                          {selected.parcel_detail.ward && <Field label="Ward" value={selected.parcel_detail.ward} />}
                          {selected.parcel_detail.village_or_block && <Field label="Village / Block" value={selected.parcel_detail.village_or_block} />}
                          {selected.parcel_detail.encumbrances && <Field label="Encumbrances" value={selected.parcel_detail.encumbrances} />}
                        </div>
                      </>
                    )}
                    <Separator />
                    {/* Proprietors */}
                    {selected.proprietors?.map((p, i) => (
                      <div key={p.id} className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <div className="col-span-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">
                            {p.is_primary ? 'Primary Proprietor' : `Co-Proprietor ${i}`}
                          </p>
                        </div>
                        <Field label="Name" value={p.full_name} />
                        <Field label={p.id_type_display || 'ID'} value={p.national_id} />
                        {p.phone && <Field label="Phone" value={p.phone} />}
                        {p.email && <Field label="Email" value={p.email} />}
                        {p.address && <Field label="Address" value={p.address} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Step 2 ─────────────────────────────────────────────────── */}
              {(['step2', 'step3', 'returned', 'approved', 'rejected'].includes(selected.status) || actingStep === 2) && (
                <div className="rounded-lg border p-4">
                  <StepHeading step={2} title="Registration Info"
                    completed={selected.review?.reviewed_at}
                    name={selected.review?.reviewed_by_name} />

                  {actingStep === 2 ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>Registration Number *</Label>
                          <Input value={step2Form.registration_number}
                            onChange={(e) => setStep2Form({ ...step2Form, registration_number: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Instrument Type</Label>
                          <Select value={step2Form.instrument_type}
                            onValueChange={(v) => setStep2Form({ ...step2Form, instrument_type: v })}>
                            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                            <SelectContent>
                              {INSTRUMENT_TYPES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Volume Ref</Label>
                          <Input value={step2Form.volume_ref}
                            onChange={(e) => setStep2Form({ ...step2Form, volume_ref: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Folio Ref</Label>
                          <Input value={step2Form.folio_ref}
                            onChange={(e) => setStep2Form({ ...step2Form, folio_ref: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Registration Entry Date</Label>
                          <Input type="date" value={step2Form.registration_entry_date}
                            onChange={(e) => setStep2Form({ ...step2Form, registration_entry_date: e.target.value })} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Notes for Registrar</Label>
                        <Textarea rows={2} value={step2Form.reviewer_notes}
                          onChange={(e) => setStep2Form({ ...step2Form, reviewer_notes: e.target.value })} />
                      </div>
                    </div>
                  ) : selected.review && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      <Field label="Registration Number" value={selected.review.registration_number} />
                      <Field label="Instrument" value={selected.review.instrument_type_display} />
                      <Field label="Volume" value={selected.review.volume_ref} />
                      <Field label="Folio" value={selected.review.folio_ref} />
                      <Field label="Entry Date" value={selected.review.registration_entry_date} />
                      {selected.review.reviewer_notes && (
                        <div className="col-span-2">
                          <Field label="Reviewer Notes" value={selected.review.reviewer_notes} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 3 ─────────────────────────────────────────────────── */}
              {(['step3', 'approved', 'rejected'].includes(selected.status) || actingStep === 3) && (
                <div className="rounded-lg border p-4">
                  <StepHeading step={3} title="Registrar Approval"
                    completed={selected.approval?.approved_at}
                    name={selected.approval?.approved_by_name} />

                  {actingStep === 3 ? (
                    <div className="space-y-1.5">
                      <Label>Registrar Notes</Label>
                      <Textarea rows={3} value={step3Form.registrar_notes}
                        onChange={(e) => setStep3Form({ registrar_notes: e.target.value })}
                        placeholder="Optional remarks for the record" />
                    </div>
                  ) : selected.approval?.registrar_notes && (
                    <Field label="Registrar Notes" value={selected.approval.registrar_notes} />
                  )}
                </div>
              )}

              {/* ── Return info ─────────────────────────────────────────────── */}
              {selected.status === 'returned' && selected.return_reason && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <p className="text-sm font-semibold text-destructive mb-1">
                    Returned to Step {selected.returned_to_step}
                  </p>
                  <p className="text-sm">{selected.return_reason}</p>
                </div>
              )}

              {actionError && <p className="text-sm text-destructive">{actionError}</p>}

              {/* ── Action buttons ──────────────────────────────────────────── */}
              {actingStep === 1 && (
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
                  <Button onClick={() => setConfirmStep1Open(true)} disabled={acting}>
                    {acting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Submit to Registration Module
                  </Button>
                </div>
              )}

              {/* ── Step 1 confirmation modal (nested) ─────────────────────── */}
              <Dialog open={confirmStep1Open} onOpenChange={setConfirmStep1Open}>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle>Confirm Submission</DialogTitle></DialogHeader>
                  <div className="space-y-3 my-2">
                    <p className="text-sm text-muted-foreground">
                      Please verify the details below are correct. Once confirmed, this application
                      will be sent to the Registration Module.
                    </p>
                    <div className="rounded-md border p-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Application Type</span>
                        <span className="font-medium">{APP_TYPE_MAP[step1AppEdit.application_type]}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Primary Proprietor</span>
                        <span className="font-medium">{step1PrimaryEdit.full_name || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ID Number</span>
                        <span className="font-medium">{step1PrimaryEdit.national_id || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ownership</span>
                        <span className="font-medium">{OWNERSHIP_MAP[step1AppEdit.ownership_type]}</span>
                      </div>
                      {step1CoPropsEdit.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Co-Proprietors</span>
                          <span className="font-medium">{step1CoPropsEdit.length}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Parcel</span>
                        <span className="font-medium">
                          {selected?.parcel_number || selected?.parcel_number_requested || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setConfirmStep1Open(false)}>Back</Button>
                    <Button onClick={() => { setConfirmStep1Open(false); handleStep1Submit() }} disabled={acting}>
                      {acting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Confirm &amp; Submit
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {actingStep === 2 && !showReturn && (
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={() => setShowReturn(true)}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Return for Correction
                  </Button>
                  <Button onClick={() => handleStep2Submit(false)} disabled={acting}>
                    {acting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Submit to Registrar
                  </Button>
                </div>
              )}

              {actingStep === 3 && !showReturn && (
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={() => setShowReturn(true)}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Return for Correction
                  </Button>
                  <Button onClick={() => handleStep3Submit(false)} disabled={acting}>
                    {acting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Approve &amp; Register
                  </Button>
                </div>
              )}

              {(actingStep === 2 || actingStep === 3) && showReturn && (
                <div className="rounded-lg border p-4 space-y-3">
                  <p className="text-sm font-semibold">Return for Correction</p>
                  <div className="space-y-1.5">
                    <Label>Return to Step</Label>
                    <Select value={String(returnForm.returned_to_step)}
                      onValueChange={(v) => setReturnForm({ ...returnForm, returned_to_step: v })}>
                      <SelectTrigger><SelectValue placeholder="Select step" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Step 1 — Data Entry</SelectItem>
                        {actingStep === 3 && <SelectItem value="2">Step 2 — Registration Module</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Reason *</Label>
                    <Textarea rows={3} value={returnForm.return_reason}
                      onChange={(e) => setReturnForm({ ...returnForm, return_reason: e.target.value })}
                      placeholder="Describe what needs to be corrected" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowReturn(false)}>Cancel</Button>
                    <Button variant="destructive"
                      onClick={() => actingStep === 2 ? handleStep2Submit(true) : handleStep3Submit(true)}
                      disabled={acting || !returnForm.return_reason || !returnForm.returned_to_step}>
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
