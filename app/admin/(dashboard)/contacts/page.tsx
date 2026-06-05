'use client'

import { useState } from 'react'
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Pencil, 
  Trash2,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  Download,
  Upload,
  Clock,
  Building2,
  ChevronDown,
  SlidersHorizontal,
  Copy,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
import { Checkbox } from '@/components/ui/checkbox'
import { mockEmergencyContacts, emergencyCategories, provinces, districts } from '@/lib/mock-data'
import { EmergencyContact, EmergencyCategory } from '@/lib/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Extended mock data for the table
const extendedContacts: EmergencyContact[] = [
  ...mockEmergencyContacts,
  {
    id: '6',
    agencyName: 'สถานีตำรวจภูธรเชียงใหม่',
    phoneNumber: '053-123456',
    category: 'police',
    province: 'เชียงใหม่',
    district: 'เมือง',
    status: 'active',
    is24Hours: true,
  },
  {
    id: '7',
    agencyName: 'สถานีดับเพลิงภูเก็ต',
    phoneNumber: '076-234567',
    category: 'fire',
    province: 'ภูเก็ต',
    district: 'เมืองภูเก็ต',
    status: 'active',
    is24Hours: true,
  },
  {
    id: '8',
    agencyName: 'ศูนย์แพทย์พัทยา',
    phoneNumber: '038-345678',
    category: 'medical',
    province: 'ชลบุรี',
    district: 'พัทยา',
    status: 'inactive',
    is24Hours: false,
  },
  {
    id: '9',
    agencyName: 'หน่วยกู้ภัยสระบุรี',
    phoneNumber: '036-456789',
    category: 'rescue',
    province: 'สระบุรี',
    district: 'เมืองสระบุรี',
    status: 'active',
    is24Hours: true,
  },
  {
    id: '10',
    agencyName: 'ศูนย์ป้องกันภัยพิบัติ นนทบุรี',
    phoneNumber: '02-987654',
    category: 'flood',
    province: 'นนทบุรี',
    district: 'เมืองนนทบุรี',
    status: 'active',
    is24Hours: false,
  },
]

const categoryColors: Record<EmergencyCategory, { bg: string; text: string; dot: string }> = {
  'police': { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400' },
  'medical': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  'fire': { bg: 'bg-orange-500/10', text: 'text-orange-400', dot: 'bg-orange-400' },
  'rescue': { bg: 'bg-cyan-500/10', text: 'text-cyan-400', dot: 'bg-cyan-400' },
  'flood': { bg: 'bg-sky-500/10', text: 'text-sky-400', dot: 'bg-sky-400' },
  'road-accident': { bg: 'bg-rose-500/10', text: 'text-rose-400', dot: 'bg-rose-400' },
}

const categoryNamesThai: Record<EmergencyCategory, string> = {
  'police': 'ตำรวจ',
  'medical': 'การแพทย์',
  'fire': 'ดับเพลิง',
  'rescue': 'กู้ภัย',
  'flood': 'อุทกภัย',
  'road-accident': 'อุบัติเหตุ',
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState(extendedContacts)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<EmergencyCategory | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null)
  const [selectedRows, setSelectedRows] = useState<string[]>([])

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
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน')
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
    toast.success('เพิ่มข้อมูลติดต่อสำเร็จ')
  }

  const handleEditContact = () => {
    if (!editingContact || !formData.agencyName || !formData.phoneNumber) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน')
      return
    }

    setContacts(contacts.map(c => 
      c.id === editingContact.id 
        ? { ...c, ...formData, category: formData.category as EmergencyCategory }
        : c
    ))
    setEditingContact(null)
    resetForm()
    toast.success('อัปเดตข้อมูลสำเร็จ')
  }

  const handleDeleteContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id))
    toast.success('ลบข้อมูลสำเร็จ')
  }

  const handleBulkDelete = () => {
    setContacts(contacts.filter(c => !selectedRows.includes(c.id)))
    setSelectedRows([])
    toast.success(`ลบ ${selectedRows.length} รายการสำเร็จ`)
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

  const toggleSelectAll = () => {
    if (selectedRows.length === filteredContacts.length) {
      setSelectedRows([])
    } else {
      setSelectedRows(filteredContacts.map(c => c.id))
    }
  }

  const toggleSelectRow = (id: string) => {
    setSelectedRows(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    )
  }

  const copyPhoneNumber = (phone: string) => {
    navigator.clipboard.writeText(phone)
    toast.success('คัดลอกเบอร์โทรแล้ว')
  }

  // Stats
  const stats = {
    total: contacts.length,
    active: contacts.filter(c => c.status === 'active').length,
    inactive: contacts.filter(c => c.status === 'inactive').length,
    available24h: contacts.filter(c => c.is24Hours).length,
  }

  const ContactForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-6 py-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">ชื่อหน่วยงาน *</Label>
          <Input
            value={formData.agencyName}
            onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
            placeholder="กรอกชื่อหน่วยงาน"
            className="bg-muted/50 border-border/50 focus:border-primary"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">เบอร์โทรศัพท์ *</Label>
            <Input
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              placeholder="เช่น 191 หรือ 02-123-4567"
              className="bg-muted/50 border-border/50 focus:border-primary"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">ประเภท *</Label>
            <Select 
              value={formData.category} 
              onValueChange={(val) => setFormData({ ...formData, category: val as EmergencyCategory })}
            >
              <SelectTrigger className="bg-muted/50 border-border/50">
                <SelectValue placeholder="เลือกประเภท" />
              </SelectTrigger>
              <SelectContent>
                {emergencyCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <span className={cn('w-2 h-2 rounded-full', categoryColors[cat.id as EmergencyCategory]?.dot)} />
                      {categoryNamesThai[cat.id as EmergencyCategory]}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">จังหวัด</Label>
            <Select 
              value={formData.province} 
              onValueChange={(val) => setFormData({ ...formData, province: val, district: '' })}
            >
              <SelectTrigger className="bg-muted/50 border-border/50">
                <SelectValue placeholder="เลือกจังหวัด" />
              </SelectTrigger>
              <SelectContent>
                {provinces.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">อำเภอ/เขต</Label>
            <Select 
              value={formData.district} 
              onValueChange={(val) => setFormData({ ...formData, district: val })}
              disabled={!formData.province}
            >
              <SelectTrigger className="bg-muted/50 border-border/50">
                <SelectValue placeholder="เลือกอำเภอ/เขต" />
              </SelectTrigger>
              <SelectContent>
                {(districts[formData.province] || []).map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-emerald-500/10">
                <Clock className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium">เปิดให้บริการ 24 ชั่วโมง</p>
                <p className="text-xs text-muted-foreground">หน่วยงานพร้อมให้บริการตลอดเวลา</p>
              </div>
            </div>
            <Switch
              checked={formData.is24Hours}
              onCheckedChange={(checked) => setFormData({ ...formData, is24Hours: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-3">
              <div className={cn(
                'p-2 rounded-md',
                formData.status === 'active' ? 'bg-emerald-500/10' : 'bg-muted'
              )}>
                {formData.status === 'active' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">สถานะการใช้งาน</p>
                <p className="text-xs text-muted-foreground">
                  {formData.status === 'active' ? 'แสดงในผลการค้นหา' : 'ไม่แสดงในผลการค้นหา'}
                </p>
              </div>
            </div>
            <Switch
              checked={formData.status === 'active'}
              onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? 'active' : 'inactive' })}
            />
          </div>
        </div>
      </div>

      <DialogFooter className="gap-2">
        <Button 
          variant="outline" 
          onClick={() => {
            setIsAddDialogOpen(false)
            setEditingContact(null)
            resetForm()
          }}
        >
          ยกเลิก
        </Button>
        <Button onClick={onSubmit} className="bg-primary hover:bg-primary/90">
          {submitLabel}
        </Button>
      </DialogFooter>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">ข้อมูลการติดต่อฉุกเฉิน</h1>
        <p className="text-sm text-muted-foreground">
          จัดการข้อมูลหน่วยงานและเบอร์โทรศัพท์ฉุกเฉินในระบบ
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">หน่วยงานทั้งหมด</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.active}</p>
                <p className="text-xs text-muted-foreground">เปิดใช้งาน</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <XCircle className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.inactive}</p>
                <p className="text-xs text-muted-foreground">ปิดใช้งาน</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-500/10">
                <Clock className="h-5 w-5 text-sky-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.available24h}</p>
                <p className="text-xs text-muted-foreground">24 ชั่วโมง</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border-b border-border/50">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาชื่อ, เบอร์โทร, หรือพื้นที่..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-muted/50 border-border/50"
                />
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    ตัวกรอง
                    {(categoryFilter !== 'all' || statusFilter !== 'all') && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                        {[categoryFilter !== 'all', statusFilter !== 'all'].filter(Boolean).length}
                      </Badge>
                    )}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>ประเภท</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setCategoryFilter('all')}>
                    <span className={cn(categoryFilter === 'all' && 'text-primary font-medium')}>
                      ทั้งหมด
                    </span>
                  </DropdownMenuItem>
                  {emergencyCategories.map(cat => (
                    <DropdownMenuItem key={cat.id} onClick={() => setCategoryFilter(cat.id as EmergencyCategory)}>
                      <div className="flex items-center gap-2">
                        <span className={cn('w-2 h-2 rounded-full', categoryColors[cat.id as EmergencyCategory]?.dot)} />
                        <span className={cn(categoryFilter === cat.id && 'text-primary font-medium')}>
                          {categoryNamesThai[cat.id as EmergencyCategory]}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>สถานะ</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                    <span className={cn(statusFilter === 'all' && 'text-primary font-medium')}>ทั้งหมด</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('active')}>
                    <span className={cn(statusFilter === 'active' && 'text-primary font-medium')}>เปิดใช้งาน</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('inactive')}>
                    <span className={cn(statusFilter === 'inactive' && 'text-primary font-medium')}>ปิดใช้งาน</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-2">
              {selectedRows.length > 0 && (
                <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  ลบ ({selectedRows.length})
                </Button>
              )}
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                นำเข้า
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                ส่งออก
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-primary hover:bg-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    เพิ่มข้อมูล
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>เพิ่มข้อมูลติดต่อฉุกเฉิน</DialogTitle>
                    <DialogDescription>
                      เพิ่มหน่วยงานบริการฉุกเฉินใหม่เข้าสู่ระบบ
                    </DialogDescription>
                  </DialogHeader>
                  <ContactForm onSubmit={handleAddContact} submitLabel="เพิ่มข้อมูล" />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedRows.length === filteredContacts.length && filteredContacts.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="font-medium">หน่วยงาน</TableHead>
                  <TableHead className="font-medium">เบอร์โทร</TableHead>
                  <TableHead className="font-medium">ประเภท</TableHead>
                  <TableHead className="font-medium">พื้นที่</TableHead>
                  <TableHead className="font-medium">สถานะ</TableHead>
                  <TableHead className="font-medium text-center">24/7</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Building2 className="h-8 w-8" />
                        <p>ไม่พบข้อมูลที่ค้นหา</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContacts.map((contact) => {
                    const colors = categoryColors[contact.category]
                    return (
                      <TableRow 
                        key={contact.id} 
                        className={cn(
                          'border-border/50 transition-colors',
                          selectedRows.includes(contact.id) && 'bg-primary/5'
                        )}
                      >
                        <TableCell>
                          <Checkbox 
                            checked={selectedRows.includes(contact.id)}
                            onCheckedChange={() => toggleSelectRow(contact.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={cn('p-2 rounded-lg', colors?.bg)}>
                              <Building2 className={cn('h-4 w-4', colors?.text)} />
                            </div>
                            <span className="font-medium">{contact.agencyName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 group">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono">{contact.phoneNumber}</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => copyPhoneNumber(contact.phoneNumber)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary" 
                            className={cn('gap-1.5', colors?.bg, colors?.text, 'border-0')}
                          >
                            <span className={cn('w-1.5 h-1.5 rounded-full', colors?.dot)} />
                            {categoryNamesThai[contact.category]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            {contact.district}, {contact.province}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              'w-2 h-2 rounded-full',
                              contact.status === 'active' ? 'bg-emerald-400' : 'bg-muted-foreground'
                            )} />
                            <span className={cn(
                              'text-sm',
                              contact.status === 'active' ? 'text-emerald-400' : 'text-muted-foreground'
                            )}>
                              {contact.status === 'active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {contact.is24Hours ? (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                              <Clock className="h-3 w-3 mr-1" />
                              24/7
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
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
                              <DropdownMenuItem onClick={() => openEditDialog(contact)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                แก้ไข
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => copyPhoneNumber(contact.phoneNumber)}>
                                <Copy className="mr-2 h-4 w-4" />
                                คัดลอกเบอร์
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDeleteContact(contact.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                ลบ
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

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-border/50 text-sm text-muted-foreground">
            <span>
              แสดง {filteredContacts.length} จาก {contacts.length} รายการ
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                ก่อนหน้า
              </Button>
              <Button variant="outline" size="sm" disabled>
                ถัดไป
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingContact} onOpenChange={(open) => !open && setEditingContact(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลติดต่อ</DialogTitle>
            <DialogDescription>
              อัปเดตข้อมูลหน่วยงานบริการฉุกเฉิน
            </DialogDescription>
          </DialogHeader>
          <ContactForm onSubmit={handleEditContact} submitLabel="บันทึกการเปลี่ยนแปลง" />
        </DialogContent>
      </Dialog>
    </div>
  )
}
