'use client'

import { useEffect, useState } from 'react'
import { 
  User, 
  Phone, 
  Users, 
  Settings, 
  Globe, 
  Bell, 
  WifiOff, 
  Moon,
  ChevronRight,
  Edit2,
  Trash2,
  Plus,
  ArrowLeft,
  Save
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
import { loadMockUserProfile } from '../lib/user-profile'
import type { PersonalEmergencyContact, UserProfile } from '../lib/user-profile-types'
import { toast } from 'sonner'

interface UserProfileScreenProps {
  onBack: () => void
}

export function UserProfileScreen({ onBack }: UserProfileScreenProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [editingContact, setEditingContact] = useState<PersonalEmergencyContact | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newContact, setNewContact] = useState<Partial<PersonalEmergencyContact>>({})

  useEffect(() => {
    async function loadProfile() {
      const data = await loadMockUserProfile()
      setProfile(data)
    }

    void loadProfile()
  }, [])

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 text-sm text-muted-foreground">
        กำลังโหลดข้อมูลโปรไฟล์...
      </div>
    )
  }

  const handleToggleSetting = (key: keyof typeof profile.settings) => {
    setProfile(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: !prev.settings[key],
      },
    }))
    toast.success('Settings updated')
  }

  const handleAddContact = () => {
    if (!newContact.name || !newContact.phone) {
      toast.error('Please fill in all required fields')
      return
    }
    
    const contact: PersonalEmergencyContact = {
      id: Date.now().toString(),
      name: newContact.name,
      phone: newContact.phone,
      relationship: newContact.relationship || 'Other',
    }
    
    setProfile(prev => ({
      ...prev,
      emergencyContacts: [...prev.emergencyContacts, contact],
    }))
    setNewContact({})
    setIsAddDialogOpen(false)
    toast.success('Emergency contact added')
  }

  const handleDeleteContact = (id: string) => {
    setProfile(prev => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.filter(c => c.id !== id),
    }))
    toast.success('Contact removed')
  }

  return (
    <div className="flex flex-col min-h-screen bg-background safe-area-inset">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">Profile</h1>
            <p className="text-xs text-muted-foreground">Manage your account</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Personal Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name"
                value={profile.name}
                onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input 
                id="phone"
                value={profile.phone}
                onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contacts */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Emergency Contacts
              </CardTitle>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Emergency Contact</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input 
                        value={newContact.name || ''}
                        onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Contact name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input 
                        value={newContact.phone || ''}
                        onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+66 XX XXX XXXX"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Relationship</Label>
                      <Select 
                        value={newContact.relationship || ''} 
                        onValueChange={(val) => setNewContact(prev => ({ ...prev, relationship: val }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select relationship" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Spouse">Spouse</SelectItem>
                          <SelectItem value="Parent">Parent</SelectItem>
                          <SelectItem value="Sibling">Sibling</SelectItem>
                          <SelectItem value="Child">Child</SelectItem>
                          <SelectItem value="Friend">Friend</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddContact}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Contact
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {profile.emergencyContacts.map((contact, index) => (
              <div key={contact.id}>
                {index > 0 && <Separator className="mb-3" />}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{contact.name}</p>
                    <p className="text-sm text-muted-foreground">{contact.phone}</p>
                    <p className="text-xs text-muted-foreground">{contact.relationship}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDeleteContact(contact.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {profile.emergencyContacts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No emergency contacts added
              </p>
            )}
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Language */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">Language</p>
                  <p className="text-xs text-muted-foreground">Select your preferred language</p>
                </div>
              </div>
              <Select 
                value={profile.settings.language} 
                onValueChange={(val) => setProfile(prev => ({ 
                  ...prev, 
                  settings: { ...prev.settings, language: val as 'en' | 'th' } 
                }))}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="th">Thai</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Notifications */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive emergency alerts</p>
                </div>
              </div>
              <Switch 
                checked={profile.settings.notifications}
                onCheckedChange={() => handleToggleSetting('notifications')}
              />
            </div>

            <Separator />

            {/* Offline Mode */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <WifiOff className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">Offline Mode</p>
                  <p className="text-xs text-muted-foreground">Cache emergency contacts</p>
                </div>
              </div>
              <Switch 
                checked={profile.settings.offlineMode}
                onCheckedChange={() => handleToggleSetting('offlineMode')}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
