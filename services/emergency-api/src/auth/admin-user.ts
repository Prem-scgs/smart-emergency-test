export type AdminRole = "super_admin" | "agency_admin" | "viewer";
export type AdminUserRow = { id: string; email: string; display_name: string; password_hash: string; jwt_subject: string; role: AdminRole; agency_id: string | null; active: boolean; created_at: Date | string; updated_at: Date | string; agency_name?: string | null; agency_category?: string | null };

export function normalizeEmail(email: string) { return email.trim().toLowerCase(); }
export function validateRoleAgency(role: AdminRole, agencyId: string | null) {
  if (role === "super_admin" && agencyId) throw new Error("Super admin cannot belong to an agency");
  if (role !== "super_admin" && !agencyId) throw new Error("Agency is required for scoped roles");
}
export function mapAdminUserProfile(row: AdminUserRow) {
  return { id: row.id, email: row.email, displayName: row.display_name,
    role: row.role, agencyId: row.agency_id,
    agency: row.agency_id && row.agency_name && row.agency_category ? { id: row.agency_id, name: row.agency_name, category: row.agency_category } : null,
    active: row.active,
    createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString() };
}
