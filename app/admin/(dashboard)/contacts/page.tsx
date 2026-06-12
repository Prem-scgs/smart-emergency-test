'use client'

import { useEffect, useMemo, useState } from 'react'
import { Edit, Loader2, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { buildAdminCategoryCollections, getEmergencyCategoryLabel } from '@/lib/emergency-category-utils'
import { useReferenceCategories } from '@/lib/reference-categories'
import {
  getLocationCanonicalName,
  getLocationDisplayName,
  useReferenceLocations,
} from '@/lib/reference-locations'

const API_BASE_URL = 'http://localhost:4000'


interface Contact {
  id: string
  name: string
  phone: string
  role: string | null
  category: string
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
  role: string
  category: string
  province: string
  district: string
  is24Hours: boolean
  active: boolean
}

const emptyForm: ContactFormState = {
  name: '',
  phone: '',
  role: '',
  category: 'fire',
  province: '',
  district: '',
  is24Hours: true,
  active: true,
}

function getCategoryLabel(category: string) {
  return getEmergencyCategoryLabel(category, category)
}

function toForm(contact: Contact): ContactFormState {
  return {
    name: contact.name,
    phone: contact.phone,
    role: contact.role ?? '',
    category: contact.category,
    province: contact.province ?? '',
    district: contact.district ?? '',
    is24Hours: contact.is24Hours,
    active: contact.active,
  }
}

export default function ContactsPage() {
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
  const contactCategories = useMemo(() => buildAdminCategoryCollections(referenceCategories).options, [referenceCategories])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [form, setForm] = useState<ContactFormState>(emptyForm)

  async function loadContacts() {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_BASE_URL}/api/contacts`)
      if (!response.ok) {
        throw new Error('Failed to load contacts')
      }
      const data = (await response.json()) as Contact[]
      setContacts(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load contacts')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadContacts()
  }, [])

  const filteredContacts = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase()
    return contacts.filter(contact => {
      const matchesSearch =
        !keyword ||
        contact.name.toLowerCase().includes(keyword) ||
        contact.phone.toLowerCase().includes(keyword) ||
        (contact.province ?? '').toLowerCase().includes(keyword) ||
        (contact.district ?? '').toLowerCase().includes(keyword)
      const matchesCategory = categoryFilter === 'all' || contact.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [categoryFilter, contacts, searchTerm])

  const activeCount = contacts.filter(contact => contact.active).length
  const inactiveCount = contacts.length - activeCount

  function openCreateDialog() {
    setEditingContact(null)
    setForm(emptyForm)
    setSelectedProvinceCode('')
    setIsDialogOpen(true)
  }

  function openEditDialog(contact: Contact) {
    setEditingContact(contact)
    setForm(toForm(contact))
    const matchedProvince = provinces.find(
      province => getLocationCanonicalName(province) === (contact.province ?? '')
    )
    setSelectedProvinceCode(matchedProvince?.provinceCode ?? '')
    setIsDialogOpen(true)
  }

  async function saveContact() {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('Name and phone are required')
      return
    }

    try {
      setIsSaving(true)
      const method = editingContact ? 'PUT' : 'POST'
      const url = editingContact
        ? `${API_BASE_URL}/api/contacts/${editingContact.id}`
        : `${API_BASE_URL}/api/contacts`

      const selectedDistrict = availableDistricts.find(
        district => getLocationCanonicalName(district) === form.district
      )

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          role: form.role.trim() || null,
          category: form.category,
          provinceCode: selectedProvinceCode || null,
          province: form.province.trim() || null,
          districtCode: selectedDistrict?.districtCode ?? null,
          district: form.district.trim() || null,
          is24Hours: form.is24Hours,
          active: form.active,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.message ?? 'Failed to save contact')
      }

      toast.success(editingContact ? 'Contact updated in DB' : 'Contact added to DB')
      setIsDialogOpen(false)
      await loadContacts()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save contact')
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteContact(contact: Contact) {
    if (!window.confirm(`Delete ${contact.name}?`)) {
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/contacts/${contact.id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete contact')
      }
      toast.success('Contact deleted from DB')
      await loadContacts()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete contact')
    }
  }

  const selectedProvince = provinceMap[selectedProvinceCode]
  const availableDistricts = useMemo(() => districts, [districts])

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Emergency Contacts</h1>
          <p className="text-sm text-muted-foreground">
            Data is loaded from PostgreSQL through the backend API.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadContacts} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-2xl font-bold">{contacts.length}</p>
            <p className="text-sm text-muted-foreground">All contacts in DB</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-2xl font-bold text-success">{activeCount}</p>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-2xl font-bold text-muted-foreground">{inactiveCount}</p>
            <p className="text-sm text-muted-foreground">Inactive</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact List</CardTitle>
          <CardDescription>Add, edit, and delete records through the real API.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="Search name, phone, province, district"
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {contactCategories.map(category => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                      Loading contacts...
                    </TableCell>
                  </TableRow>
                ) : filteredContacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                      No contacts found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContacts.map(contact => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{contact.name}</p>
                          <p className="text-xs text-muted-foreground">{contact.role || 'No role'}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getCategoryLabel(contact.category)}</TableCell>
                      <TableCell>{contact.phone}</TableCell>
                      <TableCell>
                        {[contact.district, contact.province].filter(Boolean).join(', ') || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={contact.active ? 'default' : 'secondary'}>
                          {contact.active ? 'Active' : 'Inactive'}
                        </Badge>
                        {contact.is24Hours && (
                          <Badge variant="outline" className="ml-2">
                            24h
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(contact)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteContact(contact)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editingContact ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={event => setForm(prev => ({ ...prev, phone: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={form.role}
                onChange={event => setForm(prev => ({ ...prev, role: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={value => setForm(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contactCategories.map(category => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="province">Province</Label>
                <Select
                  value={selectedProvinceCode || '__none__'}
                  onValueChange={value => {
                    const nextCode = value === '__none__' ? '' : value
                    setSelectedProvinceCode(nextCode)
                    const province = provinceMap[nextCode]
                    setForm(prev => ({
                      ...prev,
                      province: province ? getLocationCanonicalName(province) : '',
                      district: '',
                    }))
                  }}
                  disabled={isLoadingProvinces}
                >
                  <SelectTrigger id="province">
                    <SelectValue placeholder="Select province" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-</SelectItem>
                    {provinces.map(province => (
                      <SelectItem
                        key={province.provinceCode ?? province.id}
                        value={province.provinceCode ?? province.id}
                      >
                        {getLocationDisplayName(province)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="district">District</Label>
                <Select
                  value={form.district || '__none__'}
                  onValueChange={value => {
                    const district = availableDistricts.find(
                      item => getLocationCanonicalName(item) === value
                    )
                    setForm(prev => ({
                      ...prev,
                      district: value === '__none__' ? '' : value,
                      province:
                        district && selectedProvince
                          ? getLocationCanonicalName(selectedProvince)
                          : prev.province,
                    }))
                  }}
                  disabled={!selectedProvinceCode || isLoadingDistricts}
                >
                  <SelectTrigger id="district">
                    <SelectValue placeholder="Select district" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-</SelectItem>
                    {availableDistricts.map(district => (
                      <SelectItem
                        key={district.districtCode ?? district.id}
                        value={getLocationCanonicalName(district)}
                      >
                        {getLocationDisplayName(district)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 rounded-md border p-4">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="active">Active</Label>
                <Switch
                  id="active"
                  checked={form.active}
                  onCheckedChange={checked => setForm(prev => ({ ...prev, active: checked }))}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="is24Hours">Available 24 hours</Label>
                <Switch
                  id="is24Hours"
                  checked={form.is24Hours}
                  onCheckedChange={checked => setForm(prev => ({ ...prev, is24Hours: checked }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveContact} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
