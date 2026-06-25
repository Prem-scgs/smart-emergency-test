'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Edit, Loader2, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { buildAdminApiHeaders } from '@/lib/admin-api'
import {
  CONTACT_COVERAGE_OPTIONS,
  getContactCoverageFromValues,
  getContactCoverageState,
  getContactRole,
  getSelectOptionLabel,
  isValidContactPhone,
  normalizeContactPhone,
  type ContactCoverage,
} from '@/lib/contact-coverage'
import { useAuth } from '@/lib/auth-context'
import { buildAdminCategoryCollections, getEmergencyCategoryLabel } from '@/lib/emergency-category-utils'
import { getEmergencyApiBaseUrl } from '@/lib/emergency-api-url'
import { useReferenceCategories } from '@/lib/reference-categories'
import {
  getLocationCanonicalName,
  getLocationDisplayName,
  useReferenceLocations,
} from '@/lib/reference-locations'
import type { EmergencyCategory } from '@/lib/types'

const API_BASE_URL = getEmergencyApiBaseUrl()

interface Contact {
  id: string
  name: string
  phone: string
  role: string | null
  category: string | null
  provinceCode: string | null
  province: string | null
  districtCode: string | null
  district: string | null
  is24Hours: boolean
  active: boolean
  createdAt: string
  updatedAt: string
}

interface ContactFormState {
  name: string
  phone: string
  category: string
  is24Hours: boolean
  active: boolean
}

const emptyForm: ContactFormState = {
  name: '',
  phone: '',
  category: 'fire',
  is24Hours: true,
  active: true,
}

function getCategoryLabel(category: string | null | undefined) {
  if (!category) return 'ไม่ระบุหน่วยงาน'
  return getEmergencyCategoryLabel(category, category)
}

function getCoverageLabel(contact: Contact) {
  if (contact.districtCode || contact.district) return 'อำเภอ / เขต'
  if (contact.provinceCode || contact.province) return 'จังหวัด'
  return 'ส่วนกลาง'
}

function toForm(contact: Contact): ContactFormState {
  return {
    name: contact.name,
    phone: contact.phone,
    category: contact.category ?? 'fire',
    is24Hours: contact.is24Hours,
    active: contact.active,
  }
}

export default function ContactsPage() {
  const { user, hasPermission, canViewAllAgencies, getUserAgency } = useAuth()
  const { categories: referenceCategories } = useReferenceCategories()
  const {
    provinces,
    districts,
    provinceMap,
    selectedProvinceCode,
    setSelectedProvinceCode,
    isLoadingProvinces,
    isLoadingDistricts,
  } = useReferenceLocations({ autoSelectFirstProvince: false })

  const userAgency = getUserAgency()
  const agencyCategory = userAgency?.category
  const isSuperAdmin = canViewAllAgencies()
  const canCreateContact = isSuperAdmin || user?.role === 'agency_admin' || hasPermission('contacts.create')
  const contactCategories = useMemo(
    () => buildAdminCategoryCollections(referenceCategories).options,
    [referenceCategories]
  )

  const [contacts, setContacts] = useState<Contact[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [form, setForm] = useState<ContactFormState>(emptyForm)
  const [coverage, setCoverage] = useState<ContactCoverage>('central')
  const [selectedDistrictCode, setSelectedDistrictCode] = useState('')
  const [contactPendingDelete, setContactPendingDelete] = useState<Contact | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const roleScopeLabel = isSuperAdmin
    ? 'สิทธิ์: ทุกหน่วยงาน'
    : 'สิทธิ์: ' + (userAgency?.nameTh ?? userAgency?.name ?? 'หน่วยงานของฉัน')

  const loadContacts = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(API_BASE_URL + '/api/contacts', {
        headers: buildAdminApiHeaders(user),
      })
      if (!response.ok) {
        throw new Error('โหลดข้อมูลเบอร์ฉุกเฉินไม่สำเร็จ')
      }
      const data = (await response.json()) as Contact[]
      setContacts(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'โหลดข้อมูลเบอร์ฉุกเฉินไม่สำเร็จ')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    void loadContacts()
  }, [loadContacts])

  const filteredContacts = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase()
    return contacts.filter(contact => {
      const categoryLabel = getCategoryLabel(contact.category).toLowerCase()
      const matchesSearch =
        !keyword ||
        contact.name.toLowerCase().includes(keyword) ||
        contact.phone.toLowerCase().includes(keyword) ||
        categoryLabel.includes(keyword) ||
        (contact.province ?? '').toLowerCase().includes(keyword) ||
        (contact.district ?? '').toLowerCase().includes(keyword)
      const matchesCategory = categoryFilter === 'all' || contact.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [categoryFilter, contacts, searchTerm])

  const activeCount = contacts.filter(contact => contact.active).length
  const inactiveCount = contacts.length - activeCount
  const selectedProvince = provinceMap[selectedProvinceCode]
  const availableDistricts = useMemo(() => districts, [districts])

  function canManageContact(contact: Contact) {
    if (isSuperAdmin) return true
    return user?.role === 'agency_admin' && contact.category === agencyCategory
  }

  function getInitialForm(): ContactFormState {
    return {
      ...emptyForm,
      category: isSuperAdmin ? emptyForm.category : agencyCategory ?? emptyForm.category,
    }
  }

  function openCreateDialog() {
    if (!canCreateContact) {
      toast.error('บัญชีนี้ไม่มีสิทธิ์เพิ่มเบอร์ฉุกเฉิน')
      return
    }

    setEditingContact(null)
    setForm(getInitialForm())
    setCoverage('central')
    setSelectedProvinceCode('')
    setSelectedDistrictCode('')
    setIsDialogOpen(true)
  }

  function openEditDialog(contact: Contact) {
    if (!canManageContact(contact)) {
      toast.error('แก้ไขได้เฉพาะเบอร์ในหน่วยงานของคุณ')
      return
    }

    const matchedProvince = provinces.find(
      province =>
        province.provinceCode === contact.provinceCode ||
        getLocationCanonicalName(province) === (contact.province ?? '')
    )

    setEditingContact(contact)
    setForm(toForm(contact))
    setCoverage(
      getContactCoverageFromValues(
        contact.provinceCode,
        contact.province,
        contact.districtCode,
        contact.district
      )
    )
    setSelectedProvinceCode(matchedProvince?.provinceCode ?? contact.provinceCode ?? '')
    setSelectedDistrictCode(contact.districtCode ?? '')
    setIsDialogOpen(true)
  }

  async function saveContact() {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('กรุณากรอกชื่อหน่วยงานและเบอร์โทร')
      return
    }

    if (!isValidContactPhone(form.phone)) {
      toast.error('กรุณากรอกเบอร์ฉุกเฉิน เช่น 199, 1669 หรือเบอร์ไทย 9-10 หลัก')
      return
    }

    const effectiveCategory = isSuperAdmin ? form.category : agencyCategory
    if (!effectiveCategory) {
      toast.error('ไม่พบหน่วยงานของบัญชีนี้')
      return
    }

    if (editingContact && !canManageContact(editingContact)) {
      toast.error('แก้ไขได้เฉพาะเบอร์ในหน่วยงานของคุณ')
      return
    }

    const locationState = getContactCoverageState(
      coverage,
      selectedProvinceCode,
      selectedDistrictCode
    )
    const selectedProvince = provinceMap[locationState.provinceCode]
    const selectedDistrict = availableDistricts.find(
      district => (district.districtCode ?? district.id) === locationState.districtCode
    )

    try {
      setIsSaving(true)
      const method = editingContact ? 'PUT' : 'POST'
      const url = editingContact
        ? API_BASE_URL + '/api/contacts/' + editingContact.id
        : API_BASE_URL + '/api/contacts'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...buildAdminApiHeaders(user),
        },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: normalizeContactPhone(form.phone),
          role: getContactRole(),
          category: effectiveCategory,
          provinceCode: locationState.provinceCode || null,
          province: selectedProvince ? getLocationCanonicalName(selectedProvince) : null,
          districtCode: locationState.districtCode || null,
          district: selectedDistrict ? getLocationCanonicalName(selectedDistrict) : null,
          is24Hours: form.is24Hours,
          active: form.active,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.message ?? payload?.error ?? 'บันทึกข้อมูลเบอร์ฉุกเฉินไม่สำเร็จ')
      }

      toast.success(editingContact ? 'แก้ไขเบอร์ฉุกเฉินแล้ว' : 'เพิ่มเบอร์ฉุกเฉินแล้ว')
      setIsDialogOpen(false)
      await loadContacts()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'บันทึกข้อมูลเบอร์ฉุกเฉินไม่สำเร็จ')
    } finally {
      setIsSaving(false)
    }
  }

  function requestDeleteContact(contact: Contact) {
    if (!canManageContact(contact)) {
      toast.error('ลบได้เฉพาะเบอร์ในหน่วยงานของคุณ')
      return
    }

    setContactPendingDelete(contact)
  }

  async function deleteContact() {
    const contact = contactPendingDelete
    if (!contact || !canManageContact(contact)) {
      setContactPendingDelete(null)
      return
    }

    try {
      setIsDeleting(true)
      const response = await fetch(API_BASE_URL + '/api/contacts/' + contact.id, {
        method: 'DELETE',
        headers: buildAdminApiHeaders(user),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.message ?? payload?.error ?? 'ลบข้อมูลเบอร์ฉุกเฉินไม่สำเร็จ')
      }
      toast.success('ลบเบอร์ฉุกเฉินแล้ว')
      setContactPendingDelete(null)
      await loadContacts()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ลบข้อมูลเบอร์ฉุกเฉินไม่สำเร็จ')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">จัดการเบอร์ฉุกเฉิน</h1>
          <p className="text-sm text-muted-foreground">
            จัดการเบอร์ที่ mobile ใช้ค้นหาตามพิกัดและหมวดเหตุ
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="h-10 rounded-full px-4">
            {roleScopeLabel}
          </Badge>
          <Button variant="outline" onClick={loadContacts} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            โหลดใหม่
          </Button>
          {canCreateContact && (
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              เพิ่มเบอร์
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-2xl font-bold">{contacts.length}</p>
            <p className="text-sm text-muted-foreground">เบอร์ทั้งหมดตามสิทธิ์</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-2xl font-bold text-success">{activeCount}</p>
            <p className="text-sm text-muted-foreground">เปิดใช้งาน</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-2xl font-bold text-muted-foreground">{inactiveCount}</p>
            <p className="text-sm text-muted-foreground">ปิดใช้งาน</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>รายการเบอร์ฉุกเฉิน</CardTitle>
          <CardDescription>ค้นหาและจัดการเบอร์ผ่าน API จริง โดยจำกัดข้อมูลตาม role</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="ค้นหาชื่อ เบอร์ หน่วยงาน จังหวัด หรืออำเภอ"
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={value => setCategoryFilter(value ?? 'all')}>
              <SelectTrigger>
                <SelectValue>
                  {value =>
                    getSelectOptionLabel(
                      [{ value: 'all', label: 'ทุกหน่วยงาน' }, ...contactCategories],
                      value as string | null,
                      'หน่วยงาน'
                    )
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">ทุกหน่วยงาน</SelectItem>
                  {contactCategories.map(category => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>หน่วยงาน</TableHead>
                  <TableHead>หมวดเหตุ</TableHead>
                  <TableHead>เบอร์โทร</TableHead>
                  <TableHead>พื้นที่</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="w-28 text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                      กำลังโหลดเบอร์ฉุกเฉิน...
                    </TableCell>
                  </TableRow>
                ) : filteredContacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                      ไม่พบเบอร์ฉุกเฉิน
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContacts.map(contact => {
                    const canManage = canManageContact(contact)
                    return (
                      <TableRow key={contact.id}>
                        <TableCell>
                          <p className="font-medium">{contact.name}</p>
                        </TableCell>
                        <TableCell>{getCategoryLabel(contact.category)}</TableCell>
                        <TableCell>{contact.phone}</TableCell>
                        <TableCell>
                          <div>
                            <p>{[contact.district, contact.province].filter(Boolean).join(', ') || 'ส่วนกลาง'}</p>
                            <p className="text-xs text-muted-foreground">{getCoverageLabel(contact)}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={contact.active ? 'default' : 'secondary'}>
                            {contact.active ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                          </Badge>
                          {contact.is24Hours && (
                            <Badge variant="outline" className="ml-2">
                              24 ชม.
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(contact)}
                            disabled={!canManage}
                            aria-label="แก้ไขเบอร์"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => requestDeleteContact(contact)}
                            disabled={!canManage}
                            aria-label="ลบเบอร์"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-[620px]">
          <DialogHeader className="gap-2">
            <div className="flex items-center gap-2">
              <DialogTitle>{editingContact ? 'แก้ไขเบอร์ฉุกเฉิน' : 'เพิ่มเบอร์ฉุกเฉิน'}</DialogTitle>
              <Badge variant="outline">{editingContact ? 'กำลังแก้ไข' : 'รายการใหม่'}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              ระบุหน่วยงานและขอบเขตที่ mobile จะใช้ค้นหาเบอร์ในเหตุฉุกเฉิน
            </p>
          </DialogHeader>

          <div className="flex flex-col gap-5 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="name">ชื่อหน่วยงาน</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))}
                  placeholder="เช่น สถานีดับเพลิงเมืองพิษณุโลก"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">เบอร์โทร</Label>
                <Input
                  id="phone"
                  inputMode="tel"
                  value={form.phone}
                  onChange={event => setForm(prev => ({ ...prev, phone: event.target.value }))}
                  placeholder="เช่น 199, 1669 หรือ 0812345678"
                />
              </div>
              <div className="grid gap-2">
                <Label>หน่วยงาน / หมวดเหตุ</Label>
                {isSuperAdmin ? (
                  <Select
                    value={form.category}
                    onValueChange={value => setForm(prev => ({ ...prev, category: value ?? prev.category }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {value =>
                          getSelectOptionLabel(contactCategories, value as string | null, 'เลือกหน่วยงาน')
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {contactCategories.map(category => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={getCategoryLabel(agencyCategory)} disabled />
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 border-t pt-5">
              <div>
                <p className="text-sm font-medium">ขอบเขตบริการ</p>
                <p className="text-xs text-muted-foreground">กำหนดว่าหมายเลขนี้ควรถูกพบเมื่อใด</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="coverage">ระดับพื้นที่</Label>
                  <Select
                    value={coverage}
                    onValueChange={value => {
                      const next = getContactCoverageState(
                        (value ?? 'central') as ContactCoverage,
                        selectedProvinceCode,
                        selectedDistrictCode
                      )
                      setCoverage(next.coverage)
                      setSelectedProvinceCode(next.provinceCode)
                      setSelectedDistrictCode(next.districtCode)
                    }}
                  >
                    <SelectTrigger id="coverage" className="w-full">
                      <SelectValue>
                        {value =>
                          getSelectOptionLabel(
                            CONTACT_COVERAGE_OPTIONS,
                            value as string | null,
                            'เลือกระดับพื้นที่'
                          )
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {CONTACT_COVERAGE_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                {coverage !== 'central' && (
                  <div className="grid gap-2">
                    <Label htmlFor="province">จังหวัด</Label>
                    <Select
                      value={selectedProvinceCode || null}
                      onValueChange={value => {
                        setSelectedProvinceCode(value ?? '')
                        setSelectedDistrictCode('')
                      }}
                      disabled={isLoadingProvinces}
                    >
                      <SelectTrigger id="province" className="w-full">
                        <SelectValue>
                          {value => {
                            const province = provinces.find(
                              item => (item.provinceCode ?? item.id) === value
                            )
                            return province
                              ? getLocationDisplayName(province)
                              : isLoadingProvinces
                                ? 'กำลังโหลดจังหวัด...'
                                : 'เลือกจังหวัด'
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {provinces.map(province => (
                            <SelectItem key={province.provinceCode ?? province.id} value={province.provinceCode ?? province.id}>
                              {getLocationDisplayName(province)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {coverage === 'district' && (
                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="district">อำเภอ / เขต</Label>
                    <Select
                      value={selectedDistrictCode || null}
                      onValueChange={value => setSelectedDistrictCode(value ?? '')}
                      disabled={!selectedProvinceCode || isLoadingDistricts}
                    >
                      <SelectTrigger id="district" className="w-full">
                        <SelectValue>
                          {value => {
                            const district = availableDistricts.find(
                              item => (item.districtCode ?? item.id) === value
                            )
                            if (district) return getLocationDisplayName(district)
                            if (!selectedProvinceCode) return 'เลือกจังหวัดก่อน'
                            return isLoadingDistricts ? 'กำลังโหลดอำเภอ / เขต...' : 'เลือกอำเภอ / เขต'
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {availableDistricts.map(district => (
                            <SelectItem key={district.districtCode ?? district.id} value={district.districtCode ?? district.id}>
                              {getLocationDisplayName(district)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t pt-5">
              <p className="text-sm font-medium">สถานะการให้บริการ</p>
              <div className="flex items-center justify-between gap-4 py-1">
                <div>
                  <Label htmlFor="active">เปิดใช้งาน</Label>
                  <p className="text-xs text-muted-foreground">ให้ mobile ค้นหาและแสดงหมายเลขนี้</p>
                </div>
                <Switch id="active" checked={form.active} onCheckedChange={checked => setForm(prev => ({ ...prev, active: checked }))} />
              </div>
              <div className="flex items-center justify-between gap-4 py-1">
                <div>
                  <Label htmlFor="is24Hours">ให้บริการ 24 ชั่วโมง</Label>
                  <p className="text-xs text-muted-foreground">แสดงสถานะพร้อมให้บริการตลอดวัน</p>
                </div>
                <Switch id="is24Hours" checked={form.is24Hours} onCheckedChange={checked => setForm(prev => ({ ...prev, is24Hours: checked }))} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
              ยกเลิก
            </Button>
            <Button onClick={saveContact} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingContact ? 'บันทึกการแก้ไข' : 'เพิ่มเบอร์ฉุกเฉิน'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(contactPendingDelete)}
        onOpenChange={open => {
          if (!open && !isDeleting) setContactPendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2 />
            </AlertDialogMedia>
            <div>
              <AlertDialogTitle>ลบเบอร์ฉุกเฉิน?</AlertDialogTitle>
              <AlertDialogDescription>
                {contactPendingDelete
                  ? 'คุณกำลังจะลบ ' + contactPendingDelete.name + ' (' + contactPendingDelete.phone + ') ออกจากระบบ'
                  : ''}
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={deleteContact} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ลบเบอร์
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
