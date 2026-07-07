export type EmergencyCategory =
  | 'police'
  | 'medical'
  | 'fire'
  | 'rescue'
  | 'flood'
  | 'road-accident'
  | 'child'
  | 'elderly'
  | 'animal'
  | 'tourist'

export interface EmergencyCategoryInfo {
  id: EmergencyCategory
  name: string
  description: string
  icon: string
  color: string
  bgColor: string
  recommendedAgency: string
}
