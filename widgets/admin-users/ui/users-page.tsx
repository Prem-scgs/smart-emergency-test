'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Edit, KeyRound, Loader2, Plus, RefreshCw, Search, ShieldCheck, UserX } from 'lucide-react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getEmergencyApiBaseUrl } from '@/shared/config/emergency-api'
import { buildAdminApiHeaders } from '@/shared/api/admin-api'
import { useAuth, type AdminRole } from '@/shared/auth'
import { useAdminI18n } from '@/shared/i18n/admin'

import { emptyAdminUserForm, getAdminUserFormError, toAdminUserForm } from '../lib/form'
import type { AdminManagedUser, AdminUserDialogMode, AdminUserFormState } from '../model/types'

const API_BASE_URL = getEmergencyApiBaseUrl()
const roles: AdminRole[] = ['super_admin', 'agency_admin', 'viewer']

type AgencyOption = { id: string; name: string; category: string }
type UsersResponse = { users: AdminManagedUser[]; agencies: AgencyOption[] }

async function readApiError(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { message?: string }
    return payload.message || fallback
  } catch {
    return fallback
  }
}

/**
 * หน้าจัดการบัญชี admin จริงสำหรับ super_admin
 *
 * API เป็นผู้บังคับสิทธิ์และ self-protection ตัวจริง ส่วน guard ฝั่ง UI ช่วยป้องกันการกดพลาด
 * เมื่อเปลี่ยน role/active backend จะอ่านสถานะล่าสุดจาก DB ใน request ถัดไป จึงมีผลกับ JWT เดิมทันที
 */
export default function UsersPage() {
  const { user } = useAuth()
  const { t } = useAdminI18n()
  const [users, setUsers] = useState<AdminManagedUser[]>([])
  const [agencies, setAgencies] = useState<AgencyOption[]>([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [activeFilter, setActiveFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [dialogMode, setDialogMode] = useState<AdminUserDialogMode>(null)
  const [selectedUser, setSelectedUser] = useState<AdminManagedUser | null>(null)
  const [form, setForm] = useState<AdminUserFormState>(emptyAdminUserForm)

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(API_BASE_URL + '/api/admin/users', {
        headers: buildAdminApiHeaders(user),
      })
      if (!response.ok) throw new Error(await readApiError(response, t('usersLoadError')))
      const data = (await response.json()) as UsersResponse
      setUsers(data.users)
      setAgencies(data.agencies)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('usersLoadError'))
    } finally {
      setIsLoading(false)
    }
  }, [t, user])

  useEffect(() => {
    if (user?.role === 'super_admin') void loadUsers()
    else setIsLoading(false)
  }, [loadUsers, user?.role])

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return users.filter(item => {
      const matchesSearch = !keyword || item.displayName.toLowerCase().includes(keyword) || item.email.toLowerCase().includes(keyword) || (item.agency?.name ?? '').toLowerCase().includes(keyword)
      const matchesRole = roleFilter === 'all' || item.role === roleFilter
      const matchesActive = activeFilter === 'all' || item.active === (activeFilter === 'active')
      return matchesSearch && matchesRole && matchesActive
    })
  }, [activeFilter, roleFilter, search, users])

  function roleLabel(role: AdminRole) {
    if (role === 'super_admin') return t('roleSuperAdmin')
    if (role === 'agency_admin') return t('roleAgencyAdmin')
    return t('roleViewer')
  }

  function openCreate() {
    setSelectedUser(null)
    setForm(emptyAdminUserForm)
    setDialogMode('create')
  }

  function openEdit(item: AdminManagedUser) {
    setSelectedUser(item)
    setForm(toAdminUserForm(item))
    setDialogMode('edit')
  }

  function openPassword(item: AdminManagedUser) {
    if (item.id === user?.id) return toast.error(t('usersSelfProtected'))
    setSelectedUser(item)
    setForm({ ...toAdminUserForm(item), password: '' })
    setDialogMode('password')
  }

  function formError(requirePassword: boolean) {
    const error = getAdminUserFormError(form, requirePassword)
    if (!error) return null
    const messages = {
      'email-required': t('usersEmailRequired'),
      'email-invalid': t('usersEmailInvalid'),
      'name-required': t('usersNameRequired'),
      'password-too-short': t('usersPasswordTooShort'),
      'agency-required': t('usersAgencyRequired'),
      'super-admin-agency-forbidden': t('usersSuperAdminAgencyForbidden'),
    }
    return messages[error]
  }

  async function saveUser() {
    const isCreate = dialogMode === 'create'
    const error = formError(isCreate)
    if (error) return toast.error(error)
    if (!isCreate && !selectedUser) return

    setIsSaving(true)
    try {
      const body = {
        email: form.email.trim(),
        displayName: form.displayName.trim(),
        ...(isCreate ? { password: form.password } : {}),
        ...(!selectedUser || selectedUser.id !== user?.id
          ? {
              role: form.role,
              agencyId: form.role === 'super_admin' ? null : form.agencyId,
            }
          : {}),
      }
      const response = await fetch(
        API_BASE_URL + (isCreate ? '/api/admin/users' : `/api/admin/users/${selectedUser!.id}`),
        {
          method: isCreate ? 'POST' : 'PATCH',
          headers: {
            ...buildAdminApiHeaders(user),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      )
      if (!response.ok) throw new Error(await readApiError(response, t('usersSaveError')))
      toast.success(isCreate ? t('usersCreated') : t('usersUpdated'))
      setDialogMode(null)
      await loadUsers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('usersSaveError'))
    } finally {
      setIsSaving(false)
    }
  }

  async function resetPassword() {
    if (!selectedUser || selectedUser.id === user?.id) return
    if (form.password.length < 8) return toast.error(t('usersPasswordTooShort'))
    await patchSelected({ password: form.password }, t('usersPasswordReset'))
  }

  async function patchSelected(
    body: Record<string, unknown>,
    successMessage: string,
    targetUser = selectedUser
  ) {
    if (!targetUser) return
    setIsSaving(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${targetUser.id}`, {
        method: 'PATCH', headers: { ...buildAdminApiHeaders(user), 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (!response.ok) throw new Error(await readApiError(response, t('usersSaveError')))
      toast.success(successMessage)
      setDialogMode(null)
      await loadUsers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('usersSaveError'))
    } finally {
      setIsSaving(false)
    }
  }

  async function deactivateSelected() {
    if (!selectedUser || selectedUser.id === user?.id) return
    setIsSaving(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${selectedUser.id}`, {
        method: 'DELETE', headers: buildAdminApiHeaders(user),
      })
      if (!response.ok) throw new Error(await readApiError(response, t('usersSaveError')))
      toast.success(t('usersDeactivated'))
      setDialogMode(null)
      await loadUsers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('usersSaveError'))
    } finally {
      setIsSaving(false)
    }
  }

  if (user?.role !== 'super_admin') {
    return <div className="p-6"><Card><CardHeader><CardTitle>{t('usersForbiddenTitle')}</CardTitle><CardDescription>{t('usersForbiddenDescription')}</CardDescription></CardHeader></Card></div>
  }

  const selfSelected = selectedUser?.id === user?.id
  const editDialogOpen = dialogMode === 'create' || dialogMode === 'edit'

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">{t('usersTitle')}</h1><p className="text-muted-foreground">{t('usersDescription')}</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={() => void loadUsers()} disabled={isLoading}><RefreshCw className="h-4 w-4" />{t('usersReload')}</Button><Button onClick={openCreate}><Plus className="h-4 w-4" />{t('usersAdd')}</Button></div>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />{t('usersListTitle')}</CardTitle><CardDescription>{t('usersListDescription')}</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_180px]">
            <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder={t('usersSearchPlaceholder')} className="pl-9" /></div>
            <Select value={roleFilter} onValueChange={value => value && setRoleFilter(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t('usersAllRoles')}</SelectItem>{roles.map(role => <SelectItem key={role} value={role}>{roleLabel(role)}</SelectItem>)}</SelectContent></Select>
            <Select value={activeFilter} onValueChange={value => value && setActiveFilter(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t('usersAllStatuses')}</SelectItem><SelectItem value="active">{t('usersActive')}</SelectItem><SelectItem value="inactive">{t('usersInactive')}</SelectItem></SelectContent></Select>
          </div>

          <Table><TableHeader><TableRow><TableHead>{t('usersTableUser')}</TableHead><TableHead>{t('usersTableRole')}</TableHead><TableHead>{t('usersTableAgency')}</TableHead><TableHead>{t('usersTableStatus')}</TableHead><TableHead className="text-right">{t('usersTableActions')}</TableHead></TableRow></TableHeader>
            <TableBody>{isLoading ? <TableRow><TableCell colSpan={5} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow> : filteredUsers.length === 0 ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">{t('usersEmpty')}</TableCell></TableRow> : filteredUsers.map(item => {
              const isSelf = item.id === user.id
              return <TableRow key={item.id}><TableCell><div className="font-medium">{item.displayName}{isSelf ? ` (${t('usersYou')})` : ''}</div><div className="text-sm text-muted-foreground">{item.email}</div></TableCell><TableCell>{roleLabel(item.role)}</TableCell><TableCell>{item.agency?.name ?? '-'}</TableCell><TableCell><Badge variant={item.active ? 'default' : 'secondary'}>{item.active ? t('usersActive') : t('usersInactive')}</Badge></TableCell><TableCell><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" onClick={() => openEdit(item)} aria-label={t('usersEdit')}><Edit className="h-4 w-4" /></Button><Button size="icon" variant="ghost" disabled={isSelf} onClick={() => openPassword(item)} aria-label={t('usersResetPassword')}><KeyRound className="h-4 w-4" /></Button>{item.active ? <Button size="icon" variant="ghost" disabled={isSelf} onClick={() => { setSelectedUser(item); setDialogMode('deactivate') }} aria-label={t('usersDeactivate')}><UserX className="h-4 w-4" /></Button> : <Button size="sm" variant="outline" onClick={() => void patchSelected({ active: true }, t('usersReactivated'), item)}>{t('usersReactivate')}</Button>}</div></TableCell></TableRow>
            })}</TableBody></Table>
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={open => !open && setDialogMode(null)}><DialogContent><DialogHeader><DialogTitle>{dialogMode === 'create' ? t('usersCreateTitle') : t('usersEditTitle')}</DialogTitle></DialogHeader><div className="grid gap-4 py-2"><div className="grid gap-2"><Label htmlFor="user-name">{t('usersName')}</Label><Input id="user-name" value={form.displayName} onChange={event => setForm(current => ({ ...current, displayName: event.target.value }))} /></div><div className="grid gap-2"><Label htmlFor="user-email">{t('usersEmail')}</Label><Input id="user-email" type="email" value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} /></div>{dialogMode === 'create' && <div className="grid gap-2"><Label htmlFor="user-password">{t('usersPassword')}</Label><Input id="user-password" type="password" value={form.password} onChange={event => setForm(current => ({ ...current, password: event.target.value }))} /></div>}<div className="grid gap-2"><Label>{t('usersRole')}</Label><Select disabled={selfSelected} value={form.role} onValueChange={value => value && setForm(current => ({ ...current, role: value as AdminRole, agencyId: value === 'super_admin' ? '' : current.agencyId }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{roles.map(role => <SelectItem key={role} value={role}>{roleLabel(role)}</SelectItem>)}</SelectContent></Select></div>{form.role !== 'super_admin' && <div className="grid gap-2"><Label>{t('usersAgency')}</Label><Select disabled={selfSelected} value={form.agencyId} onValueChange={agencyId => agencyId && setForm(current => ({ ...current, agencyId }))}><SelectTrigger><SelectValue placeholder={t('usersSelectAgency')} /></SelectTrigger><SelectContent>{agencies.map(agency => <SelectItem key={agency.id} value={agency.id}>{agency.name} ({agency.category})</SelectItem>)}</SelectContent></Select></div>}{selfSelected && <p className="text-sm text-muted-foreground">{t('usersSelfProtected')}</p>}</div><DialogFooter><Button variant="outline" onClick={() => setDialogMode(null)}>{t('usersCancel')}</Button><Button onClick={() => void saveUser()} disabled={isSaving}>{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}{t('usersSave')}</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={dialogMode === 'password'} onOpenChange={open => !open && setDialogMode(null)}><DialogContent><DialogHeader><DialogTitle>{t('usersResetPassword')}</DialogTitle></DialogHeader><div className="grid gap-2 py-2"><Label htmlFor="reset-password">{t('usersNewPassword')}</Label><Input id="reset-password" type="password" value={form.password} onChange={event => setForm(current => ({ ...current, password: event.target.value }))} /></div><DialogFooter><Button variant="outline" onClick={() => setDialogMode(null)}>{t('usersCancel')}</Button><Button onClick={() => void resetPassword()} disabled={isSaving}>{t('usersSave')}</Button></DialogFooter></DialogContent></Dialog>

      <AlertDialog open={dialogMode === 'deactivate'} onOpenChange={open => !open && setDialogMode(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('usersDeactivateTitle')}</AlertDialogTitle><AlertDialogDescription>{t('usersDeactivateDescription')}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t('usersCancel')}</AlertDialogCancel><AlertDialogAction onClick={() => void deactivateSelected()} disabled={isSaving}>{t('usersDeactivate')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  )
}
