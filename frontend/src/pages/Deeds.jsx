import { useState, useEffect, useCallback } from 'react'
import { deeds as deedsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'
import { Search, Printer } from 'lucide-react'

const STATUSES = [
  ['active', 'Active'], ['transferred', 'Transferred'],
  ['cancelled', 'Cancelled'], ['suspended', 'Suspended'],
]
const STATUS_BADGE = {
  active: 'success', transferred: 'info', cancelled: 'destructive', suspended: 'secondary',
}

export default function Deeds() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [loadError, setLoadError] = useState('')
  const [printingDeed, setPrintingDeed] = useState(null)

  useEffect(() => {
    if (!printingDeed) return
    window.print()
    const handler = () => setPrintingDeed(null)
    window.addEventListener('afterprint', handler, { once: true })
    return () => window.removeEventListener('afterprint', handler)
  }, [printingDeed])

  const load = useCallback(() => {
    setLoading(true)
    setLoadError('')
    deedsApi.list({ search: search || undefined, status: filterStatus !== 'all' ? filterStatus : undefined })
      .then((r) => setData(r.data.results || r.data))
      .catch(() => setLoadError('Failed to load deeds. Please refresh the page.'))
      .finally(() => setLoading(false))
  }, [search, filterStatus])

  useEffect(() => { load() }, [load])

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
        <Button variant="outline" onClick={() => window.print()}>
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
              <TableRow key={d.id}>
                <TableCell className="font-mono font-medium">{d.deed_number}</TableCell>
                <TableCell className="font-mono text-sm">{d.parcel_number}</TableCell>
                <TableCell className="font-medium">{d.owner_name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{d.owner_national_id}</TableCell>
                <TableCell className="text-sm">{formatDate(d.registration_date)}</TableCell>
                <TableCell><Badge variant={STATUS_BADGE[d.status] || 'outline'}>{d.status_display}</Badge></TableCell>
                <TableCell className="text-muted-foreground text-sm">{d.registered_by_name || '—'}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" title="Print" onClick={() => setPrintingDeed(d)}><Printer className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* ── Print-only layout ── */}
      <div className="hidden print:block text-black text-[10pt]">

        {/* ── Individual deed certificate ── */}
        {printingDeed ? (
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
              <div><span className="font-bold">CRO No.:</span> <span className="font-mono">{printingDeed.deed_number}</span></div>
              {printingDeed.certificate_number && (
                <div><span className="font-bold">Certificate No.:</span> <span className="font-mono">{printingDeed.certificate_number}</span></div>
              )}
              <div><span className="font-bold">Status:</span> {printingDeed.status_display}</div>
            </div>

            {/* Sections */}
            {[
              {
                title: 'Property Details',
                rows: [
                  ['Parcel Number', printingDeed.parcel_number],
                ],
              },
              {
                title: 'Ownership Details',
                rows: [
                  ['Full Name', printingDeed.owner_name],
                  ['Identification No.', printingDeed.owner_national_id],
                  ['Ownership Type', printingDeed.ownership_type_display || '—'],
                ],
              },
              {
                title: 'Registration Details',
                rows: [
                  ['Registration Date', formatDate(printingDeed.registration_date)],
                  ['First Registration Date', formatDate(printingDeed.first_registration_date) || '—'],
                  ['Issued Date', formatDate(printingDeed.issued_date) || '—'],
                  ['Expiry Date', formatDate(printingDeed.expiry_date) || '—'],
                ],
              },
              {
                title: 'Receipt Information',
                rows: [
                  ['Received From', printingDeed.received_from || '—'],
                  ['Received Date', formatDate(printingDeed.received_date) || '—'],
                  ['Received By', printingDeed.received_by || '—'],
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
            {printingDeed.notes && (
              <div className="mb-4">
                <h2 className="text-[9pt] font-bold uppercase tracking-wide border-b border-black mb-1 pb-0.5">Notes</h2>
                <p className="text-[9pt] mt-1">{printingDeed.notes}</p>
              </div>
            )}

            {/* Signature block */}
            <div className="mt-10 grid grid-cols-2 gap-12 text-[9pt]">
              <div>
                <div className="border-t border-black pt-1">
                  <p className="font-medium">Registered By</p>
                  <p className="text-gray-600">{printingDeed.registered_by_name || '—'}</p>
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

    </div>
  )
}
