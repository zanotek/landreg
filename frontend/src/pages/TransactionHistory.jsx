import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { transactions as txApi } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { formatDate } from '@/lib/utils'
import { Search } from 'lucide-react'

const TYPES = [
  ['transfer', 'Transfer of Ownership'],
  ['subdivision', 'Subdivision & Amalgamation'],
  ['mortgage', 'Mortgage & Charge'],
  ['correction', 'Correction & Amendment'],
]

const TYPE_BADGE = {
  transfer: 'info',
  subdivision: 'secondary',
  mortgage: 'warning',
  correction: 'outline',
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
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase">{children}</p>
  )
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
          {/* Application info */}
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transaction History</h1>
        <p className="text-muted-foreground mt-1">
          Approved transfers, subdivisions, mortgages, and corrections
        </p>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search application, parcel, proprietor…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {TYPES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Application No.</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Parcel</TableHead>
              <TableHead>Primary Proprietor</TableHead>
              <TableHead>CRO / Ref</TableHead>
              <TableHead>Approved By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 7 }).map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                ))}
              </TableRow>
            )) : loadError ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-destructive py-10">{loadError}</TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  No transactions found
                </TableCell>
              </TableRow>
            ) : data.map((tx) => {
              const primary = tx.proprietors?.find((p) => p.is_primary)
              return (
                <TableRow
                  key={tx.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelected(tx)}
                >
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(tx.approval?.approved_at || tx.updated_at)}
                  </TableCell>
                  <TableCell className="font-mono font-medium">{tx.application_number}</TableCell>
                  <TableCell>
                    <Badge variant={TYPE_BADGE[tx.application_type] || 'outline'}>
                      {tx.application_type_display}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {tx.parcel_number || tx.parcel_number_requested || '—'}
                  </TableCell>
                  <TableCell className="font-medium">{primary?.full_name || '—'}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {tx.review?.registration_number || '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {tx.approval?.approved_by_name || '—'}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>

      <TransactionDetailModal tx={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
