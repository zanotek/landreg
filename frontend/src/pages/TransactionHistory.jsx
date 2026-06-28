import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { transactions as txApi } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDate } from '@/lib/utils'
import { Search, User, MapPin } from 'lucide-react'

const TYPES = [
  ['new_registration', 'New Registration'],
  ['transfer', 'Transfer of Ownership'],
  ['subdivision', 'Subdivision & Amalgamation'],
  ['mortgage', 'Mortgage & Charge'],
  ['correction', 'Correction & Amendment'],
]

const TYPE_BADGE = {
  new_registration: 'success',
  transfer: 'info',
  subdivision: 'secondary',
  mortgage: 'warning',
  correction: 'outline',
}

const TYPE_DOT = {
  new_registration: 'bg-green-500',
  transfer: 'bg-blue-500',
  subdivision: 'bg-purple-500',
  mortgage: 'bg-yellow-500',
  correction: 'bg-gray-400',
}

function Field({ label, value }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}

function SectionHeading({ children }) {
  return <p className="text-xs font-semibold text-muted-foreground uppercase">{children}</p>
}

function TransactionDetailModal({ tx, onClose }) {
  if (!tx) return null
  const primary = tx.proprietors?.find((p) => p.is_primary)
  const coProps = tx.proprietors?.filter((p) => !p.is_primary) || []

  return (
    <Dialog open={!!tx} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono">{tx.application_number}</DialogTitle>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={TYPE_BADGE[tx.application_type] || 'outline'}>
              {tx.application_type_display}
            </Badge>
            {tx.approval?.approved_at && (
              <span className="text-xs text-muted-foreground">
                Approved {formatDate(tx.approval.approved_at)}
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Type" value={tx.application_type_display} />
            {tx.description && <Field label="Description" value={tx.description} />}
          </div>

          <Separator />
          <SectionHeading>Property Info</SectionHeading>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Parcel" value={tx.parcel_number || tx.parcel_number_requested} />
            {tx.certificate_number && <Field label="Certificate Number" value={tx.certificate_number} />}
            <Field label="Ownership" value={tx.ownership_type_display} />
            {tx.parcel_detail && (
              <>
                {tx.parcel_detail.zupin && <Field label="ZUPIN" value={tx.parcel_detail.zupin} />}
                <Field label="District" value={tx.parcel_detail.district_display} />
                {tx.parcel_detail.region_display && <Field label="Region" value={tx.parcel_detail.region_display} />}
                {tx.parcel_detail.shehia && <Field label="Shehia" value={tx.parcel_detail.shehia} />}
                <Field label="Land Use" value={tx.parcel_detail.land_use_display} />
                {tx.parcel_detail.area_sqm && <Field label="Area" value={`${tx.parcel_detail.area_sqm} m²`} />}
              </>
            )}
          </div>

          {primary && (
            <>
              <Separator />
              <SectionHeading>Primary Proprietor</SectionHeading>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Field label="Name" value={primary.full_name} />
                <Field label={primary.id_type_display || 'ID'} value={primary.national_id} />
                {primary.phone && <Field label="Phone" value={primary.phone} />}
                {primary.email && <Field label="Email" value={primary.email} />}
                {primary.address && <Field label="Address" value={primary.address} />}
              </div>
            </>
          )}

          {coProps.map((p, i) => (
            <div key={p.id}>
              <Separator />
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-4">
                <div className="col-span-2"><SectionHeading>Co-Proprietor {i + 1}</SectionHeading></div>
                <Field label="Name" value={p.full_name} />
                <Field label={p.id_type_display || 'ID'} value={p.national_id} />
                {p.phone && <Field label="Phone" value={p.phone} />}
                {p.email && <Field label="Email" value={p.email} />}
              </div>
            </div>
          ))}

          {tx.review && (
            <>
              <Separator />
              <SectionHeading>Registration Info</SectionHeading>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {tx.review.registration_number && <Field label="CRO Number" value={tx.review.registration_number} />}
                {tx.review.volume_ref && <Field label="Volume" value={tx.review.volume_ref} />}
                {tx.review.folio_ref && <Field label="Folio" value={tx.review.folio_ref} />}
                {tx.review.instrument_type_display && <Field label="Instrument Type" value={tx.review.instrument_type_display} />}
                {tx.review.registration_entry_date && <Field label="Entry Date" value={formatDate(tx.review.registration_entry_date)} />}
                {tx.review.reviewer_notes && <Field label="Notes" value={tx.review.reviewer_notes} />}
                {tx.review.reviewed_by_name && <Field label="Reviewed By" value={tx.review.reviewed_by_name} />}
              </div>
            </>
          )}

          {tx.approval && (
            <>
              <Separator />
              <SectionHeading>Approval</SectionHeading>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {tx.approval.approved_by_name && <Field label="Approved By" value={tx.approval.approved_by_name} />}
                {tx.approval.approved_at && <Field label="Approved At" value={formatDate(tx.approval.approved_at)} />}
                {tx.approval.registrar_notes && <Field label="Notes" value={tx.approval.registrar_notes} />}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function TimelineEntry({ tx, index, isLast, onClick }) {
  const primary = tx.proprietors?.find((p) => p.is_primary)
  const coProps = tx.proprietors?.filter((p) => !p.is_primary) || []
  const dot = TYPE_DOT[tx.application_type] || 'bg-gray-400'

  return (
    <div className="relative flex gap-4">
      {/* Spine */}
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 z-10 ${dot}`} />
        {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
      </div>

      {/* Card */}
      <div
        className="flex-1 mb-4 rounded-lg border bg-card p-4 cursor-pointer hover:bg-accent/40 transition-colors"
        onClick={onClick}
      >
        {/* Header row */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs text-muted-foreground font-medium w-5 text-center">
            {index + 1}.
          </span>
          <Badge variant={TYPE_BADGE[tx.application_type] || 'outline'}>
            {tx.application_type_display}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDate(tx.approval?.approved_at || tx.updated_at)}
          </span>
          <span className="text-xs font-mono text-muted-foreground ml-auto">
            {tx.application_number}
          </span>
        </div>

        {/* Proprietors */}
        <div className="space-y-1.5">
          {primary && (
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium">{primary.full_name}</span>
              <span className="text-xs text-muted-foreground font-mono">{primary.national_id}</span>
              {coProps.length > 0 && (
                <span className="text-xs text-muted-foreground">(primary)</span>
              )}
            </div>
          )}
          {coProps.map((p) => (
            <div key={p.id} className="flex items-center gap-2 pl-1">
              <User className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">{p.full_name}</span>
              <span className="text-xs text-muted-foreground font-mono">{p.national_id}</span>
            </div>
          ))}
          {!primary && !coProps.length && (
            <p className="text-xs text-muted-foreground italic">No proprietor recorded</p>
          )}
        </div>

        {/* CRO ref if available */}
        {tx.review?.registration_number && (
          <p className="text-xs text-muted-foreground mt-2 font-mono">
            CRO: {tx.review.registration_number}
          </p>
        )}
      </div>
    </div>
  )
}

export default function TransactionHistory() {
  const [searchParams] = useSearchParams()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(() => searchParams.get('search') || '')
  const [filterType, setFilterType] = useState('all')
  const [loadError, setLoadError] = useState('')
  const [selected, setSelected] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    setLoadError('')
    txApi.list({
      search: search || undefined,
      application_type: filterType !== 'all' ? filterType : undefined,
    })
      .then((r) => setData(r.data.results || r.data))
      .catch(() => setLoadError('Failed to load transaction history. Please refresh.'))
      .finally(() => setLoading(false))
  }, [search, filterType])

  useEffect(() => { load() }, [load])

  // Group entries by parcel, preserving chronological order within each group
  const groups = data.reduce((acc, tx) => {
    const key = tx.parcel_number || tx.parcel_number_requested || '—'
    if (!acc[key]) acc[key] = []
    acc[key].push(tx)
    return acc
  }, {})
  const parcelKeys = Object.keys(groups)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transaction History</h1>
        <p className="text-muted-foreground mt-1">
          Ownership chain per parcel — registrations, transfers, mortgages, and more
        </p>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search parcel, proprietor, application…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {TYPES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : loadError ? (
        <p className="text-center text-destructive py-10">{loadError}</p>
      ) : parcelKeys.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">No transactions found</p>
      ) : (
        <div className="space-y-6">
          {parcelKeys.map((parcel) => {
            const entries = groups[parcel]
            return (
              <Card key={parcel}>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono">{parcel}</span>
                    <span className="text-muted-foreground font-normal text-xs ml-1">
                      {entries.length} transaction{entries.length !== 1 ? 's' : ''}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-2">
                  {entries.map((tx, i) => (
                    <TimelineEntry
                      key={tx.id}
                      tx={tx}
                      index={i}
                      isLast={i === entries.length - 1}
                      onClick={() => setSelected(tx)}
                    />
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <TransactionDetailModal tx={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
