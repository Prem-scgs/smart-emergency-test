'use client'

import { useState, useMemo } from 'react'
import { 
  MapPin, 
  Layers, 
  Square, 
  Pentagon, 
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { mockEmergencyContacts } from '@/lib/mock-data'
import { toast } from 'sonner'

interface GISLayer {
  id: string
  name: string
  type: 'province' | 'district' | 'subdistrict' | 'emergency'
  visible: boolean
  color: string
  count: number
}

const initialLayers: GISLayer[] = [
  { id: 'provinces', name: 'Province Boundaries', type: 'province', visible: true, color: '#1976D2', count: 77 },
  { id: 'districts', name: 'District Boundaries', type: 'district', visible: true, color: '#2E7D32', count: 928 },
  { id: 'subdistricts', name: 'Subdistrict Boundaries', type: 'subdistrict', visible: false, color: '#ED6C02', count: 7255 },
  { id: 'emergency', name: 'Emergency Zones', type: 'emergency', visible: true, color: '#D32F2F', count: 156 },
]

// Agency-specific zones (filter based on category)
const agencyZones: Record<string, { name: string; area: string; count: number }> = {
  'medical': { name: 'Medical Service Zones', area: '12.5 km²', count: 12 },
  'police': { name: 'Police Patrol Zones', area: '8.3 km²', count: 8 },
  'fire': { name: 'Fire Station Coverage', area: '15.2 km²', count: 5 },
  'rescue': { name: 'Rescue Operation Zones', area: '20.1 km²', count: 10 },
  'flood': { name: 'Flood Risk Areas', area: '45.8 km²', count: 18 },
  'road-accident': { name: 'Traffic Control Zones', area: '30.5 km²', count: 15 },
}

const mockPolygons = [
  { id: '1', name: 'Bangkok High Risk Zone', type: 'emergency', province: 'Bangkok', area: '45.2 km2', category: 'medical' },
  { id: '2', name: 'Chiang Mai Flood Zone', type: 'emergency', province: 'Chiang Mai', area: '23.8 km2', category: 'flood' },
  { id: '3', name: 'Phuket Tourist Area', type: 'emergency', province: 'Phuket', area: '12.5 km2', category: 'police' },
  { id: '4', name: 'Pattaya Beach Zone', type: 'emergency', province: 'Chonburi', area: '8.3 km2', category: 'rescue' },
]

export default function GISPage() {
  const { user } = useAuth()
  const [layers, setLayers] = useState<GISLayer[]>([])
  const [selectedTool, setSelectedTool] = useState<'select' | 'draw' | 'edit' | 'delete'>('select')
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState(true)

  // Update layers based on user role
  useMemo(() => {
    if (user?.role === 'superadmin') {
      setLayers(initialLayers)
    } else if (user?.agency) {
      // Agency Admin: show specific layers with counts for their agency
      const agencyZoneData = agencyZones[user.agency.category]
      const adjustedLayers = initialLayers.map(layer => {
        if (layer.type === 'emergency') {
          return {
            ...layer,
            name: agencyZoneData.name,
            count: agencyZoneData.count,
          }
        }
        return layer
      })
      setLayers(adjustedLayers)
    }
  }, [user])

  const filteredPolygons = useMemo(() => {
    if (user?.role === 'superadmin') {
      return mockPolygons
    }
    // Agency Admin เห็นเฉพาะ polygon ของหน่วยงานตัวเอง
    if (user?.agency) {
      return mockPolygons.filter(polygon => polygon.category === user.agency.category)
    }
    return []
  }, [user])

  const toggleLayerVisibility = (id: string) => {
    setLayers(layers.map(layer => 
      layer.id === id ? { ...layer, visible: !layer.visible } : layer
    ))
  }

  const handleToolSelect = (tool: typeof selectedTool) => {
    setSelectedTool(tool)
    toast.info(`${tool.charAt(0).toUpperCase() + tool.slice(1)} tool selected`)
  }

  const handleDeletePolygon = (id: string) => {
    toast.success('Polygon deleted')
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-foreground">GIS Management</h2>
          <p className="text-sm text-muted-foreground">
            {user?.role === 'superadmin' 
              ? 'Manage geographic boundaries nationwide' 
              : `Manage ${user?.agency?.nameTh || 'your agency'} zones`}
          </p>
        </div>

        <ScrollArea className="flex-1">
          {/* Tools */}
          <div className="p-4 border-b">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Tools</Label>
            <div className="grid grid-cols-4 gap-2 mt-3">
              <Button
                variant={selectedTool === 'select' ? 'default' : 'outline'}
                size="sm"
                className="h-12 flex-col gap-1"
                onClick={() => handleToolSelect('select')}
              >
                <MapPin className="h-4 w-4" />
                <span className="text-xs">Select</span>
              </Button>
              <Button
                variant={selectedTool === 'draw' ? 'default' : 'outline'}
                size="sm"
                className="h-12 flex-col gap-1"
                onClick={() => handleToolSelect('draw')}
              >
                <Pentagon className="h-4 w-4" />
                <span className="text-xs">Draw</span>
              </Button>
              <Button
                variant={selectedTool === 'edit' ? 'default' : 'outline'}
                size="sm"
                className="h-12 flex-col gap-1"
                onClick={() => handleToolSelect('edit')}
              >
                <Square className="h-4 w-4" />
                <span className="text-xs">Edit</span>
              </Button>
              <Button
                variant={selectedTool === 'delete' ? 'destructive' : 'outline'}
                size="sm"
                className="h-12 flex-col gap-1"
                onClick={() => handleToolSelect('delete')}
              >
                <Trash2 className="h-4 w-4" />
                <span className="text-xs">Delete</span>
              </Button>
            </div>
          </div>

          {/* Layers */}
          <Collapsible open={isLayersPanelOpen} onOpenChange={setIsLayersPanelOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Layers</span>
              </div>
              <ChevronDown className={cn(
                'h-4 w-4 text-muted-foreground transition-transform',
                isLayersPanelOpen && 'rotate-180'
              )} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 space-y-2">
                {layers.map((layer) => (
                  <div 
                    key={layer.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: layer.color }}
                      />
                      <div>
                        <p className="text-sm font-medium">{layer.name}</p>
                        <p className="text-xs text-muted-foreground">{layer.count} features</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleLayerVisibility(layer.id)}
                    >
                      {layer.visible ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Emergency Contacts/Locations */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Locations</Label>
              <span className="text-xs font-medium text-muted-foreground">{filteredContacts.length}</span>
            </div>
            <div className="space-y-2">
              {filteredContacts.length > 0 ? (
                filteredContacts.map((contact) => (
                  <div 
                    key={contact.id}
                    className="p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <p className="text-sm font-medium">{contact.agencyName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {contact.province}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{contact.distance} km</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">No locations to display</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Emergency Zones */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Emergency Zones</Label>
              <Button variant="ghost" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {filteredPolygons.length > 0 ? (
                filteredPolygons.map((polygon) => (
                  <div 
                    key={polygon.id}
                    className="p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium">{polygon.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {polygon.province}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{polygon.area}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => handleDeletePolygon(polygon.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">No zones to display</p>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative bg-muted">
        {/* Map Placeholder */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-primary/10 mb-4">
              <MapPin className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Interactive Map</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {user?.role === 'superadmin' 
                ? 'Google Maps integration area. Draw, edit, and manage geographic boundaries for all emergency response zones nationwide.'
                : `Google Maps integration for ${user?.agency?.nameTh || 'your agency'}. Draw, edit, and manage geographic boundaries and coverage areas.`}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {layers.filter(l => l.visible).map((layer) => (
                <Badge 
                  key={layer.id} 
                  variant="outline"
                  style={{ borderColor: layer.color, color: layer.color }}
                >
                  {layer.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Map Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <Card className="w-auto">
            <CardContent className="p-2">
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8">+</Button>
                <Separator />
                <Button variant="ghost" size="icon" className="h-8 w-8">-</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coordinates Display */}
        <div className="absolute bottom-4 left-4">
          <Card>
            <CardContent className="p-3">
              <p className="text-xs font-mono text-muted-foreground">
                Lat: 13.7563, Lng: 100.5018
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
