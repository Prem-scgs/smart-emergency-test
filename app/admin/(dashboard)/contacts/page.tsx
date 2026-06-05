'use client'

import { useState } from 'react'
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Pencil, 
  Trash2,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  Download
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { mockEmergencyContacts, emergencyCategories, provinces, districts } from '@/lib/mock-data'
import { EmergencyContact, EmergencyCategory } from '@/lib/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Extended mock data for the table
const extendedContacts: EmergencyContact[] = [
  ...mockEmergencyContacts,
  {
    id: '6',
    agencyName: 'Chiang Mai Police Station',
    phoneNumber: '053-123456',
    category: 'police',
    province: 'Chiang Mai',
    district: 'Mueang',
    status: 'active',
    is24Hours: true,
  },
  {
    id: '7',
    agencyName: 'Phuket Fire Department',
    phoneNumber: '076-234567',
    category: 'fire',
    province: 'Phuket',
    district: 'Mueang Phuket',
    status: 'active',
    is24Hours: true,
  },
  {
    id: '8',
    agencyName: 'Pattaya Medical Center',
    phoneNumber: '038-345678',
    category: 'medical',
    province: 'Chonburi',
    district: 'Pattaya',
    status: 'inactive',
    is24Hours: false,
  },
]

export default function ContactsPage() {
  const [contacts, setContacts] = useState(extendedContacts)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<EmergencyCategory | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null)

  const [formData, setFormData] = useState({
    agencyName: '',
    phoneNumber: '',
    category: '' as EmergencyCategory | '',
    province: '',
    district: '',
    is24Hours: true,
    status: 'active' as 'active' | 'inactive',
  })

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.agencyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phoneNumber.includes(searchQuery) ||
      contact.province.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || contact.category === categoryFilter
    const matchesStatus = statusFilter === 'all' || contact.status === statusFilter
    return matchesSearch && matchesCategory && matchesStatus
  })

  const handleAddContact = () => {
    if (!formData.agencyName || !formData.phoneNumber || !formData.category) {
      toast.error('Please fill in all required fields')
      return
    }

    const newContact: EmergencyContact = {
      id: Date.now().toString(),
      agencyName: formData.agencyName,
      phoneNumber: formData.phoneNumber,
      category: formData.category,
      province: formData.province,
      district: formData.district,
      is24Hours: formData.is24Hours,
      status: formData.status,
    }

    setContacts([...contacts, newContact])
    setIsAddDialogOpen(false)
    resetForm()
    toast.success('Contact added successfully')
  }

  const handleEditContact = () => {
    if (!editingContact || !formData.agencyName || !formData.phoneNumber) {
      toast.error('Please fill in all required fields')
      return
    }

    setContacts(contacts.map(c => 
      c.id === editingContact.id 
        ? { ...c, ...formData, category: formData.category as EmergencyCategory }
        : c
    ))
    setEditingContact(null)
    resetForm()
    toast.success('Contact updated successfully')
  }

  const handleDeleteContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id))
    toast.success('Contact deleted')
  }

  const resetForm = () => {
    setFormData({
      agencyName: '',
      phoneNumber: '',
      category: '',
      province: '',
      district: '',
      is24Hours: true,
      status: 'active',
    })
  }

  const openEditDialog = (contact: EmergencyContact) => {
    setEditingContact(contact)
    setFormData({
      agencyName: contact.agencyName,
      phoneNumber: contact.phoneNumber,
      category: contact.category,
      province: contact.province,
      district: contact.district,
      is24Hours: contact.is24Hours,
      status: contact.status,
    })
  }

  const ContactForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-2">
          <Label>Agency Name *</Label>
          <Input
            value={formData.agencyName}
            onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
            placeholder="Enter agency name"
          />
        </div>
        <div className="space-y-2">
          <Label>Phone Number *</Label>
          <Input
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            placeholder="e.g., 191 or 02-123-4567"
          />
        </div>
        <div className="space-y-2">
          <Label>Category *</Label>
          <Select 
            value={formData.category} 
            onValueChange={(val) => setFormData({ ...formData, category: val as EmergencyCategory })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {emergencyCategories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Province</Label>
          <Select 
            value={formData.province} 
            onValueChange={(val) => setFormData({ ...formData, province: val, district: '' })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select province" />
            </SelectTrigger>
            <SelectContent>
              {provinces.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>District</Label>
          <Select 
            value={formData.district} 
            onValueChange={(val) => setFormData({ ...formData, district: val })}
            disabled={!formData.province}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select district" />
            </SelectTrigger>
            <SelectContent>
              {(districts[formData.province] || []).map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between col-span-2 p-3 bg-muted rounded-lg">
          <div>
            <Label>24/7 Availability</Label>
            <p className="text-xs text-muted-foreground">Agency operates around the clock</p>
          </div>
          <Switch
            checked={formData.is24Hours}
            onCheckedChange={(checked) => setFormData({ ...formData, is24Hours: checked })}
          />
        </div>
        <div className="flex items-center justify-between col-span-2 p-3 bg-muted rounded-lg">
          <div>
            <Label>Status</Label>
            <p className="text-xs text-muted-foreground">Active agencies appear in search results</p>
          </div>
          <Switch
            checked={formData.status === 'active'}
            onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? 'active' : 'inactive' })}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => {
          setIsAddDialogOpen(false)
          setEditingContact(null)
          resetForm()
        }}>
          Cancel
        </Button>
        <Button onClick={onSubmit}>{submitLabel}</Button>
      </DialogFooter>
    </div>
  )

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Emergency Contacts Management</CardTitle>
              <CardDescription>Manage emergency service agencies and their contact information</CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add New Emergency Contact</DialogTitle>
                  <DialogDescription>
                    Add a new emergency service agency to the database.
                  </DialogDescription>
                </DialogHeader>
                <ContactForm onSubmit={handleAddContact} submitLabel="Add Contact" />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val as EmergencyCategory | 'all')}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {emergencyCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as 'all' | 'active' | 'inactive')}>
              <SelectTrigger className="w-full md:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agency Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>24/7</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No contacts found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContacts.map((contact) => {
                    const category = emergencyCategories.find(c => c.id === contact.category)
                    return (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">{contact.agencyName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            {contact.phoneNumber}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn(category?.bgColor, category?.color)}>
                            {category?.name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {contact.district}, {contact.province}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={contact.status === 'active' ? 'default' : 'secondary'}>
                            {contact.status === 'active' ? (
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                            ) : (
                              <XCircle className="mr-1 h-3 w-3" />
                            )}
                            {contact.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {contact.is24Hours ? (
                            <Badge variant="outline" className="bg-success/10 text-success border-success/20">Yes</Badge>
                          ) : (
                            <Badge variant="outline">No</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openEditDialog(contact)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleDeleteContact(contact.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Info */}
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>Showing {filteredContacts.length} of {contacts.length} contacts</span>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingContact} onOpenChange={(open) => !open && setEditingContact(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Emergency Contact</DialogTitle>
            <DialogDescription>
              Update the emergency service agency information.
            </DialogDescription>
          </DialogHeader>
          <ContactForm onSubmit={handleEditContact} submitLabel="Save Changes" />
        </DialogContent>
      </Dialog>
    </div>
  )
}
