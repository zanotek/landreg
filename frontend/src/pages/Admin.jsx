import { useState, useEffect, useCallback } from 'react'
import { users as usersApi, appTypes as appTypesApi, appStatuses as appStatusesApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'
import { Plus, Search, Pencil, Trash2, KeyRound, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import Owners from './Owners'
import Parcels from './Parcels'
import Deeds from './Deeds'

const ROLES = [
  ['admin', 'Administrator'],
  ['data_entry', 'Records Module'],
  ['reviewing_officer', 'Registration Officer'],
  ['registrar', 'Registrar'],
]

const ROLE_BADGE = {
  admin: 'destructive',
  data_entry: 'secondary',
  reviewing_officer: 'info',
  registrar: 'success',
}

const TABS = [
  { id: 'users', label: 'Users' },
  { id: 'owners', label: 'Owners' },
  { id: 'parcels', label: 'Parcels' },
  { id: 'deeds', label: 'Register' },
  { id: 'app-types', label: 'Application Types' },
  { id: 'app-statuses', label: 'Application Statuses' },
]

const EMPTY_FORM = { username: '', first_name: '', last_name: '', email: '', password: '', role: 'data_entry', phone: '' }

function UsersTab() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [pwOpen, setPwOpen] = useState(false)
  const [pwUser, setPwUser] = useState(null)
  const [pw, setPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setLoadError('')
    usersApi.list({ search: search || undefined })
      .then((r) => setData(r.data.results || r.data))
      .catch(() => setLoadError('Failed to load users. Please refresh.'))
      .finally(() => setLoading(false))
  }, [search])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setError(''); setOpen(true) }
  const openEdit = (u) => {
    setEditing(u)
    setForm({ username: u.username, first_name: u.first_name, last_name: u.last_name, email: u.email, password: '', role: u.profile?.role || 'data_entry', phone: u.profile?.phone || '' })
    setError('')
    setOpen(true)
  }
  const openPw = (u) => { setPwUser(u); setPw(''); setPwError(''); setPwOpen(true) }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      if (editing) {
        const { password: _pw, ...payload } = form
        await usersApi.update(editing.id, payload)
      } else {
        await usersApi.create(form)
      }
      setOpen(false); load()
    } catch (err) {
      const d = err.response?.data
      setError(typeof d === 'object' ? Object.values(d).flat().join(' ') : 'An error occurred.')
    } finally { setSaving(false) }
  }

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete user "${u.username}"? This cannot be undone.`)) return
    await usersApi.delete(u.id); load()
  }

  const handlePwSave = async (e) => {
    e.preventDefault(); setPwSaving(true); setPwError('')
    try {
      await usersApi.setPassword(pwUser.id, pw)
      setPwOpen(false)
    } catch (err) {
      const d = err.response?.data
      setPwError(typeof d === 'object' ? Object.values(d).flat().join(' ') : 'An error occurred.')
    } finally { setPwSaving(false) }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const setV = (k) => (v) => setForm({ ...form, [k]: v })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Manage staff accounts and roles</p>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add User</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, username, email…" className="pl-9" value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
            )) : loadError ? (
              <TableRow><TableCell colSpan={6} className="text-center text-destructive py-10">{loadError}</TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">No users found</TableCell></TableRow>
            ) : data.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-mono font-medium">{u.username}</TableCell>
                <TableCell>{u.full_name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{u.email || '—'}</TableCell>
                <TableCell>
                  <Badge variant={ROLE_BADGE[u.profile?.role] || 'outline'}>
                    {ROLES.find(([v]) => v === u.profile?.role)?.[1] || u.profile?.role || '—'}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{u.profile?.phone || '—'}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" title="Reset password" onClick={() => openPw(u)}><KeyRound className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(u)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit User' : 'Create New User'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>First Name</Label>
                <Input value={form.first_name} onChange={set('first_name')} />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input value={form.last_name} onChange={set('last_name')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Username *</Label>
              <Input required value={form.username} onChange={set('username')} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={set('email')} />
            </div>
            {!editing && (
              <div className="space-y-1.5">
                <Label>Password *</Label>
                <Input required type="password" value={form.password} onChange={set('password')} placeholder="Min. 8 characters" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Role *</Label>
                <Select value={form.role} onValueChange={setV('role')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={set('phone')} placeholder="+255 7xx xxx xxx" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Save Changes' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Password — {pwUser?.username}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePwSave} className="space-y-4 mt-2">
            {pwError && <p className="text-sm text-destructive">{pwError}</p>}
            <div className="space-y-1.5">
              <Label>New Password *</Label>
              <Input required type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Min. 8 characters" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPwOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={pwSaving}>
                {pwSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ReferenceTab({ api: refApi, noun, columns }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ code: '', label: '', display_order: 0, is_active: true })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true); setLoadError('')
    refApi.list().then((r) => setData(r.data.results || r.data))
      .catch(() => setLoadError('Failed to load. Please refresh.'))
      .finally(() => setLoading(false))
  }, [refApi])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null); setForm({ code: '', label: '', display_order: 0, is_active: true }); setError(''); setOpen(true)
  }
  const openEdit = (row) => {
    setEditing(row); setForm({ code: row.code, label: row.label, display_order: row.display_order, is_active: row.is_active }); setError(''); setOpen(true)
  }
  const handleDelete = async (row) => {
    if (!window.confirm(`Delete "${row.label}"? This cannot be undone.`)) return
    await refApi.delete(row.id); load()
  }
  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      editing ? await refApi.update(editing.id, form) : await refApi.create(form)
      setOpen(false); load()
    } catch (err) {
      const d = err.response?.data
      setError(typeof d === 'object' ? Object.values(d).flat().join(' ') : 'An error occurred.')
    } finally { setSaving(false) }
  }
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Manage {noun.toLowerCase()} codes and labels</p>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add {noun}</Button>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Label</TableHead>
              <TableHead className="text-center">Order</TableHead>
              <TableHead className="text-center">Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
            )) : loadError ? (
              <TableRow><TableCell colSpan={5} className="text-center text-destructive py-10">{loadError}</TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">No {noun.toLowerCase()}s found</TableCell></TableRow>
            ) : data.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-sm">{row.code}</TableCell>
                <TableCell className="font-medium">{row.label}</TableCell>
                <TableCell className="text-center text-muted-foreground">{row.display_order}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={row.is_active ? 'success' : 'secondary'}>{row.is_active ? 'Yes' : 'No'}</Badge>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(row)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${noun}` : `Add ${noun}`}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="space-y-1.5">
              <Label>Code *</Label>
              <Input required value={form.code} onChange={set('code')} placeholder="e.g. new_registration" disabled={!!editing} />
            </div>
            <div className="space-y-1.5">
              <Label>Label *</Label>
              <Input required value={form.label} onChange={set('label')} placeholder="Display name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Display Order</Label>
                <Input type="number" min={0} value={form.display_order} onChange={set('display_order')} />
              </div>
              <div className="space-y-1.5">
                <Label>Active</Label>
                <Select value={String(form.is_active)} onValueChange={(v) => setForm({ ...form, is_active: v === 'true' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Save Changes' : `Add ${noun}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AppTypesTab() {
  return <ReferenceTab api={appTypesApi} noun="Application Type" />
}

function AppStatusesTab() {
  return <ReferenceTab api={appStatusesApi} noun="Application Status" />
}

export default function Admin() {
  const [tab, setTab] = useState('users')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground mt-1">Manage users, owners, parcels, and title deeds</p>
      </div>

      <div className="flex gap-0 border-b">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
              tab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersTab />}
      {tab === 'owners' && <Owners />}
      {tab === 'parcels' && <Parcels />}
      {tab === 'deeds' && <Deeds />}
      {tab === 'app-types' && <AppTypesTab />}
      {tab === 'app-statuses' && <AppStatusesTab />}
    </div>
  )
}
