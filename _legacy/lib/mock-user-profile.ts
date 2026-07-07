import type { UserProfile } from './user-profile-types.ts'

export const mockUserProfile: UserProfile = {
  id: '1',
  name: 'John Doe',
  phone: '+66 81 234 5678',
  emergencyContacts: [
    { id: '1', name: 'Jane Doe', phone: '+66 82 345 6789', relationship: 'Spouse' },
    { id: '2', name: 'Bob Smith', phone: '+66 83 456 7890', relationship: 'Parent' },
    { id: '3', name: 'Alice Johnson', phone: '+66 84 567 8901', relationship: 'Sibling' },
  ],
  settings: {
    language: 'en',
    notifications: true,
    offlineMode: false,
    darkMode: false,
  },
}
