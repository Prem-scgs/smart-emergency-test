import { mockUserProfile } from './mock-data'
import type { UserProfile } from './types'

const API_BASE_URL = 'http://localhost:4000'

let cachedUserProfile: UserProfile | null = null
let userProfilePromise: Promise<UserProfile> | null = null

export function __resetUserProfileCache() {
  cachedUserProfile = null
  userProfilePromise = null
}

export async function loadMockUserProfile(fetchImpl: typeof fetch = fetch) {
  if (cachedUserProfile) return cachedUserProfile
  if (userProfilePromise) return userProfilePromise

  userProfilePromise = (async () => {
    try {
      const response = await fetchImpl(API_BASE_URL + '/api/users/mock-profile')
      if (!response.ok) {
        cachedUserProfile = mockUserProfile
        return cachedUserProfile
      }

      cachedUserProfile = (await response.json()) as UserProfile
      return cachedUserProfile
    } catch {
      cachedUserProfile = mockUserProfile
      return cachedUserProfile
    } finally {
      userProfilePromise = null
    }
  })()

  return userProfilePromise
}
