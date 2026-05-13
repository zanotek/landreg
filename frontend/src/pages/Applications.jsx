import { useState, useEffect, useCallback } from 'react'
import { applications as appsApi, parcels as parcelsApi } from '@/lib/api'
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
import { Plus, Search, Eye, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

const APP_TYPES = [
  ['new_registration', 'New Registration'],
  ['transfer', 'Transfer of Ownership'],
  ['subdivision', 'Subdivision'],
  ['correction', 'Correction of Records'],
  ['cancellation', 'Cancellation'],
]
const STATUSES = [
  ['pending', 'Pending'], ['under_review', 'Under Review'],
  ['approved', 'Approved'], ['rejected', 'Rejected'], ['cancelled', 'Cancelled'],
]
const STATUS_BADGE = {
  pending: 'warning', under_review: 'info', approved: 'success',
  rejected: 'destructive', cancelled: 'secondary',
}

const EMPTY_APP = {
  applicant_name: '', applicant_national_id: '', applicant_phone: '', applicant_email: '',
  application_type: 'new_registration', parcel: '', parcel_number_requested: '', description: '',
}
const EMPTY_REVIEW = { status: 'under_review', rejection_reason: '', notes: '' }

export default function Applications() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  // New application dialog
  const [newOpen, setNewOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_APP)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [allParcels, setAllParcels] = useState([])
  // Review / view dialog
  const [reviewOpen, setReviewOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [review, setReview] = useState(EMPTY_REVIEW)
  const [reviewing, setReviewing] = useState(false)
  const [reviewError, setReviewError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    appsApi.list({ search: search || undefined, status: filterStatus !== 'all' ? filterStatus : undefined })
      .then((r) => setData(r.data.results || r.data))
      .finally(() => setLoading(false))
  }, [search, filterStatus])

  useEffect(() => { load() }, [load])

  const openNew = async () => {
    setForm(EMPTY_APP); setFormError('')
    const p = await parcelsApi.list({ page_size: 200 })
    setAllParcels(p.data.results || p.data)
    setNewOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setFormError('')
    try {
      const payload = { ...form, parcel: form.parcel ? Number(form.parcel) : null }
      await appsApi.create(payload)
      setNewOpen(false); load()
    } catch (err) {
      const d = err.response?.data
      setFormError(typeof d === 'object' ? Object.values(d).flat().join(' ') : 'An error occurred.')
    } finally { setSaving(false) }
  }

  const openReview = (app) => {
    setSelected(app)
    setReview({ status: app.status, rejection_reason: app.rejection_reason || '', notes: app.notes || '' })
    setReviewError('')
    setReviewOpen(true)
  }

  const handleReview = async (e) => {
    e.preventDefault(); setReviewing(true); setReviewError('')
    try {
      await appsApi.review(selected.id, review)
      setReviewOpen(false); load()
    } catch (err) {
      setReviewError('Failed to update application.')
    } finally { setReviewing(false) }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const setV = (k) => (v) => setForm({ ...form, [k]: v })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="text-muted-foreground mt-1">Submit and manage registration applications</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> New Application</Button>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search application #, applicant…" className="pl-9" value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
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
              <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
            )) : data.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">No applications found</TableCell></TableRow>
            ) : data.map((app) => (
              <TableRow key={app.id}>
                <TableCell className="font-mono text-xs">{app.application_number}</TableCell>
                <TableCell className="font-medium">{app.applicant_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{app.application_type_display}</TableCell>
                <TableCell className="font-mono text-sm">{app.parcel_number || app.parcel_number_requested || '—'}</TableCell>
                <TableCell><Badge variant={STATUS_BADGE[app.status] || 'outline'}>{app.status_display}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(app.submitted_at)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openReview(app)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* New Application Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Submit New Application</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 mt-2">
            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Applicant Information</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Full Name *</Label>
                  <Input required value={form.applicant_name} onChange={set('applicant_name')} />
                </div>
                <div className="space-y-1.5">
                  <Label>National ID *</Label>
                  <Input required value={form.applicant_national_id} onChange={set('applicant_national_id')} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone *</Label>
                  <Input required value={form.applicant_phone} onChange={set('applicant_phone')} placeholder="+255 7xx xxx xxx" />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={form.applicant_email} onChange={set('applicant_email')} />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Application Details</p>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Application Type *</Label>
                  <Select value={form.application_type} onValueChange={setV('application_type')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{APP_TYPES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Existing Parcel (if applicable)</Label>
                  <Select value={form.parcel} onValueChange={setV('parcel')}>
                    <SelectTrigger><SelectValue placeholder="Select parcel (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {allParcels.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.parcel_number} — {p.district_display}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {!form.parcel && (
                  <div className="space-y-1.5">
                    <Label>Requested Parcel Number</Label>
                    <Input value={form.parcel_number_requested} onChange={set('parcel_number_requested')} placeholder="For new registration" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Description / Supporting Details *</Label>
                  <Textarea required rows={4} value={form.description} onChange={set('description')}
                    placeholder="Describe the purpose and supporting information for this application…" />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Application
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      {selected && (
        <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Review Application</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm mt-2">
              <div className="grid grid-cols-2 gap-2 bg-muted/40 rounded-lg p-3">
                <div><span className="text-muted-foreground">Ref:</span> <span className="font-mono font-medium">{selected.application_number}</span></div>
                <div><span className="text-muted-foreground">Type:</span> {selected.application_type_display}</div>
                <div><span className="text-muted-foreground">Applicant:</span> {selected.applicant_name}</div>
                <div><span className="text-muted-foreground">ID:</span> {selected.applicant_national_id}</div>
                <div><span className="text-muted-foreground">Phone:</span> {selected.applicant_phone}</div>
                <div><span className="text-muted-foreground">Submitted:</span> {formatDate(selected.submitted_at)}</div>
              </div>
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-muted-foreground mb-1">Description</p>
                <p>{selected.description}</p>
              </div>
            </div>
            <Separator className="my-2" />
            <form onSubmit={handleReview} className="space-y-4">
              {reviewError && <p className="text-sm text-destructive">{reviewError}</p>}
              <div className="space-y-1.5">
                <Label>Update Status</Label>
                <Select value={review.status} onValueChange={(v) => setReview({ ...review, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {review.status === 'rejected' && (
                <div className="space-y-1.5">
                  <Label>Rejection Reason *</Label>
                  <Textarea required value={review.rejection_reason}
                    onChange={(e) => setReview({ ...review, rejection_reason: e.target.value })} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Officer Notes</Label>
                <Textarea value={review.notes}
                  onChange={(e) => setReview({ ...review, notes: e.target.value })}
                  placeholder="Internal notes…" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setReviewOpen(false)}>Close</Button>
                <Button type="submit" disabled={reviewing}>
                  {reviewing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Status
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
