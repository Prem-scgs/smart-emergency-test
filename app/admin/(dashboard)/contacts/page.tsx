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
import { buildAdminApiHeaders } from '@/shared/api/admin-api'
import {
  canManageContactForScope,
  getContactCoverageKind,
  getContactCoverageFromValues,
  getContactCoverageState,
  getContactDisplayCategoryLabel,
  getEffectiveContactCategory,
  getInitialContactCategory,
  getContactRole,
  getSelectOptionLabel,
  isValidContactPhone,
  normalizeContactPhone,
  type ContactCoverage,
} from '@/entities/contact'
import { useAdminI18n } from '@/shared/i18n/admin'
import { useAuth } from '@/shared/auth'
import { buildAdminCategoryCollections, useReferenceCategories } from '@/shared/reference'
import { getEmergencyApiBaseUrl } from '@/shared/config/emergency-api'
import {
  getLocationCanonicalName,
  getLocationDisplayName,
  useLocationLookupMaps,
  useReferenceLocations,
} from '@/shared/location'

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
  const { language, t } = useAdminI18n()
  const preferThai = language !== 'en'
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
  const { provinceByCode, districtByCode } = useLocationLookupMaps()

  const userAgency = getUserAgency()
  const agencyCategory = userAgency?.category
  const isSuperAdmin = canViewAllAgencies()
  const canCreateContact = isSuperAdmin || user?.role === 'agency_admin' || hasPermission('contacts.create')
  const contactCategories = useMemo(
    () => buildAdminCategoryCollections(referenceCategories, preferThai).options,
    [preferThai, referenceCategories]
  )
  const coverageOptions = useMemo(
    () => [
      { value: 'central' as const, label: t('contactsCoverageCentral'), description: t('contactsCoverageCentralDescription') },
      { value: 'province' as const, label: t('contactsCoverageProvinceLevel'), description: t('contactsCoverageProvinceDescription') },
      { value: 'district' as const, label: t('contactsCoverageDistrictLevel'), description: t('contactsCoverageDistrictDescription') },
    ],
    [t]
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

  const roleScopeName =
    (preferThai
      ? userAgency?.nameTh ?? userAgency?.name
      : userAgency?.name ?? userAgency?.nameTh) ?? t('contactsOwnAgencyFallback')
  const roleScopeLabel = isSuperAdmin ? t('contactsScopeAll') : t('contactsScopePrefix') + roleScopeName

  function getContactCategoryLabel(category: string | null | undefined) {
    return getContactDisplayCategoryLabel(category, contactCategories, t('contactsUnspecifiedAgency'))
  }

  function getContactCoverageLabel(contact: Contact) {
    const coverageKind = getContactCoverageKind(contact)
    if (coverageKind === 'district') return t('contactsCoverageDistrict')
    if (coverageKind === 'province') return t('contactsCoverageProvince')
    return t('contactsCoverageCentral')
  }

  function getContactAreaLabel(contact: Contact) {
    const provinceFromMaster = contact.provinceCode
      ? getLocationDisplayName(provinceByCode[contact.provinceCode], preferThai)
      : ''
    const districtFromMaster = contact.districtCode
      ? getLocationDisplayName(districtByCode[contact.districtCode], preferThai)
      : ''
    const province = provinceFromMaster || contact.province
    const district = districtFromMaster || contact.district
    return [district, province].filter(Boolean).join(', ') || t('contactsCoverageCentral')
  }

  const loadContacts = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(API_BASE_URL + '/api/contacts', {
        headers: buildAdminApiHeaders(user),
      })
      if (!response.ok) {
        throw new Error(t('contactsLoadError'))
      }
      const data = (await response.json()) as Contact[]
      setContacts(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('contactsLoadError'))
    } finally {
      setIsLoading(false)
    }
  }, [t, user])

  useEffect(() => {
    void loadContacts()
  }, [loadContacts])

  const filteredContacts = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase()
    return contacts.filter(contact => {
      const categoryLabel = getContactCategoryLabel(contact.category).toLowerCase()
      const areaLabel = getContactAreaLabel(contact).toLowerCase()
      const matchesSearch =
        !keyword ||
        contact.name.toLowerCase().includes(keyword) ||
        contact.phone.toLowerCase().includes(keyword) ||
        categoryLabel.includes(keyword) ||
        areaLabel.includes(keyword) ||
        (contact.province ?? '').toLowerCase().includes(keyword) ||
        (contact.district ?? '').toLowerCase().includes(keyword)
      const matchesCategory = categoryFilter === 'all' || contact.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [categoryFilter, contacts, searchTerm, contactCategories, districtByCode, preferThai, provinceByCode, t])

  const activeCount = contacts.filter(contact => contact.active).length
  const inactiveCount = contacts.length - activeCount
  const selectedProvince = provinceMap[selectedProvinceCode]
  const availableDistricts = useMemo(() => districts, [districts])
  const selectedProvinceLabel = selectedProvince
    ? getLocationDisplayName(selectedProvince, preferThai)
    : isLoadingProvinces
      ? t('contactsProvinceLoading')
      : t('contactsSelectProvince')
  const selectedDistrict = availableDistricts.find(
    district => (district.districtCode ?? district.id) === selectedDistrictCode
  )
  const selectedDistrictLabel = selectedDistrict
    ? getLocationDisplayName(selectedDistrict, preferThai)
    : !selectedProvinceCode
      ? t('contactsSelectProvinceFirst')
      : isLoadingDistricts
        ? t('contactsDistrictLoading')
        : t('contactsSelectDistrict')

  function canManageContact(contact: Contact) {
    return canManageContactForScope(
      { isSuperAdmin, role: user?.role, agencyCategory },
      contact
    )
  }

  function getInitialForm(): ContactFormState {
    return {
      ...emptyForm,
      category: getInitialContactCategory(isSuperAdmin, agencyCategory, emptyForm.category),
    }
  }

  function openCreateDialog() {
    if (!canCreateContact) {
      toast.error(t('contactsNoCreatePermission'))
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
      toast.error(t('contactsEditOwnAgencyOnly'))
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
      toast.error(t('contactsRequiredError'))
      return
    }

    if (!isValidContactPhone(form.phone)) {
      toast.error(t('contactsPhoneInvalidError'))
      return
    }

    const effectiveCategory = getEffectiveContactCategory(isSuperAdmin, form.category, agencyCategory)
    if (!effectiveCategory) {
      toast.error(t('contactsNoAgencyError'))
      return
    }

    if (editingContact && !canManageContact(editingContact)) {
      toast.error(t('contactsEditOwnAgencyOnly'))
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
        throw new Error(payload?.message ?? payload?.error ?? t('contactsSaveError'))
      }

      toast.success(editingContact ? t('contactsSaveEditSuccess') : t('contactsSaveCreateSuccess'))
      setIsDialogOpen(false)
      await loadContacts()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('contactsSaveError'))
    } finally {
      setIsSaving(false)
    }
  }

  function requestDeleteContact(contact: Contact) {
    if (!canManageContact(contact)) {
      toast.error(t('contactsDeleteOwnAgencyOnly'))
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
        throw new Error(payload?.message ?? payload?.error ?? t('contactsDeleteError'))
      }
      toast.success(t('contactsDeleteSuccess'))
      setContactPendingDelete(null)
      await loadContacts()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('contactsDeleteError'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('contactsPageTitle')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('contactsPageDescription')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="h-10 rounded-full px-4">
            {roleScopeLabel}
          </Badge>
          <Button variant="outline" onClick={loadContacts} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('contactsReload')}
          </Button>
          {canCreateContact && (
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              {t('contactsAddShort')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-2xl font-bold">{contacts.length}</p>
            <p className="text-sm text-muted-foreground">{t('contactsTotal')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-2xl font-bold text-success">{activeCount}</p>
            <p className="text-sm text-muted-foreground">{t('contactsActive')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-2xl font-bold text-muted-foreground">{inactiveCount}</p>
            <p className="text-sm text-muted-foreground">{t('contactsInactive')}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('contactsListTitle')}</CardTitle>
          <CardDescription>{t('contactsListDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder={t('contactsSearchPlaceholder')}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={value => setCategoryFilter(value ?? 'all')}>
              <SelectTrigger>
                <SelectValue>
                  {value =>
                    getSelectOptionLabel(
                      [{ value: 'all', label: t('contactsAllAgencies') }, ...contactCategories],
                      value as string | null,
                      t('contactsAgencyFallback')
                    )
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">{t('contactsAllAgencies')}</SelectItem>
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
                  <TableHead>{t('contactsTableAgency')}</TableHead>
                  <TableHead>{t('contactsTableCategory')}</TableHead>
                  <TableHead>{t('contactsTablePhone')}</TableHead>
                  <TableHead>{t('contactsTableArea')}</TableHead>
                  <TableHead>{t('contactsTableStatus')}</TableHead>
                  <TableHead className="w-28 text-right">{t('contactsTableActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                      {t('contactsLoading')}
                    </TableCell>
                  </TableRow>
                ) : filteredContacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                      {t('contactsEmpty')}
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
                        <TableCell>{getContactCategoryLabel(contact.category)}</TableCell>
                        <TableCell>{contact.phone}</TableCell>
                        <TableCell>
                          <div>
                            <p>{getContactAreaLabel(contact)}</p>
                            <p className="text-xs text-muted-foreground">{getContactCoverageLabel(contact)}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={contact.active ? 'default' : 'secondary'}>
                            {contact.active ? t('contactsStatusActive') : t('contactsStatusInactive')}
                          </Badge>
                          {contact.is24Hours && (
                            <Badge variant="outline" className="ml-2">
                              {t('contacts24Hours')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(contact)}
                            disabled={!canManage}
                            aria-label={t('contactsEditAria')}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => requestDeleteContact(contact)}
                            disabled={!canManage}
                            aria-label={t('contactsDeleteAria')}
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
              <DialogTitle>{editingContact ? t('contactsEditTitle') : t('contactsCreateTitle')}</DialogTitle>
              <Badge variant="outline">{editingContact ? t('contactsEditingBadge') : t('contactsNewBadge')}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('contactsDialogDescription')}
            </p>
          </DialogHeader>

          <div className="flex flex-col gap-5 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="name">{t('contactsNameLabel')}</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))}
                  placeholder={t('contactsNamePlaceholder')}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">{t('contactsPhoneLabel')}</Label>
                <Input
                  id="phone"
                  inputMode="tel"
                  value={form.phone}
                  onChange={event => setForm(prev => ({ ...prev, phone: event.target.value }))}
                  placeholder={t('contactsPhonePlaceholder')}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t('contactsCategoryLabel')}</Label>
                {isSuperAdmin ? (
                  <Select
                    value={form.category}
                    onValueChange={value => setForm(prev => ({ ...prev, category: value ?? prev.category }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {value =>
                          getSelectOptionLabel(contactCategories, value as string | null, t('contactsSelectAgency'))
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
                  <Input value={getContactCategoryLabel(agencyCategory)} disabled />
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 border-t pt-5">
              <div>
                <p className="text-sm font-medium">{t('contactsCoverageTitle')}</p>
                <p className="text-xs text-muted-foreground">{t('contactsCoverageDescription')}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="coverage">{t('contactsCoverageLevelLabel')}</Label>
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
                            coverageOptions,
                            value as string | null,
                            t('contactsSelectCoverage')
                          )
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {coverageOptions.map(option => (
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
                    <Label htmlFor="province">{t('contactsProvinceLabel')}</Label>
                    <Select
                      value={selectedProvinceCode || null}
                      onValueChange={value => {
                        setSelectedProvinceCode(value ?? '')
                        setSelectedDistrictCode('')
                      }}
                      disabled={isLoadingProvinces}
                    >
                      <SelectTrigger id="province" className="w-full">
                        <span className="truncate">{selectedProvinceLabel}</span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {provinces.map(province => (
                            <SelectItem key={province.provinceCode ?? province.id} value={province.provinceCode ?? province.id}>
                              {getLocationDisplayName(province, preferThai)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {coverage === 'district' && (
                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="district">{t('contactsDistrictLabel')}</Label>
                    <Select
                      value={selectedDistrictCode || null}
                      onValueChange={value => setSelectedDistrictCode(value ?? '')}
                      disabled={!selectedProvinceCode || isLoadingDistricts}
                    >
                      <SelectTrigger id="district" className="w-full">
                        <span className="truncate">{selectedDistrictLabel}</span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {availableDistricts.map(district => (
                            <SelectItem key={district.districtCode ?? district.id} value={district.districtCode ?? district.id}>
                              {getLocationDisplayName(district, preferThai)}
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
              <p className="text-sm font-medium">{t('contactsServiceStatusTitle')}</p>
              <div className="flex items-center justify-between gap-4 py-1">
                <div>
                  <Label htmlFor="active">{t('contactsActive')}</Label>
                  <p className="text-xs text-muted-foreground">{t('contactsActiveDescription')}</p>
                </div>
                <Switch id="active" checked={form.active} onCheckedChange={checked => setForm(prev => ({ ...prev, active: checked }))} />
              </div>
              <div className="flex items-center justify-between gap-4 py-1">
                <div>
                  <Label htmlFor="is24Hours">{t('contacts24HoursLabel')}</Label>
                  <p className="text-xs text-muted-foreground">{t('contacts24HoursDescription')}</p>
                </div>
                <Switch id="is24Hours" checked={form.is24Hours} onCheckedChange={checked => setForm(prev => ({ ...prev, is24Hours: checked }))} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
              {t('contactsCancel')}
            </Button>
            <Button onClick={saveContact} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingContact ? t('contactsSaveEdit') : t('contactsSaveCreate')}
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
              <AlertDialogTitle>{t('contactsDeleteTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {contactPendingDelete
                  ? t('contactsDeleteDescriptionPrefix') +
                    contactPendingDelete.name +
                    ' (' +
                    contactPendingDelete.phone +
                    ')' +
                    t('contactsDeleteDescriptionSuffix')
                  : ''}
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('contactsCancel')}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={deleteContact} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('contactsDeleteConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
