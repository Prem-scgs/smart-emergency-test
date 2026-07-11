/**
 * Public API ของ shared auth layer
 *
 * AuthProvider/useAuth ถูกใช้ครอบ admin ทั้งหมด และ role/permission ที่ export จากที่นี่
 * เป็น contract ของ dashboard, contacts, reports, settings และ notification filtering.
 */
export {
  AuthProvider,
  useAuth,
} from './auth-context'

export {
  ADMIN_ACCESS_TOKEN_STORAGE_KEY,
  clearAdminAccessToken,
  getStoredAdminAccessToken,
  saveAdminAccessToken,
} from './session'

export {
  ROLE_PERMISSIONS,
} from './types'

export type {
  AdminRole,
  AdminUser,
  Agency,
  AuthState,
} from './types'
