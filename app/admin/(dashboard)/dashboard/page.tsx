'use client'

import { useMemo } from 'react'

import { useAdminI18n } from '@/lib/admin-i18n'
import { useAuth } from '@/lib/auth-context'
import { buildAdminCategoryCollections } from '@/lib/emergency-category-utils'
import { useReferenceCategories } from '@/lib/reference-categories'
import {
  useLocationLookupMaps,
  useReferenceLocations,
} from '@/lib/reference-locations'
import { DashboardMapSection } from '@/widgets/dashboard-map'

export default function DashboardPage() {
  const { user, canViewAllAgencies, getFilteredCategories, getUserAgency } = useAuth()
  const { language, t } = useAdminI18n()
  const preferThai = language !== 'en'
  const { categories: referenceCategories } = useReferenceCategories()
  const { provinces, districts, isLoadingProvinces, isLoadingDistricts } =
    useReferenceLocations({ autoSelectFirstProvince: false })
  const { provinceByCode, districtByCode } = useLocationLookupMaps()
  const { labelMap: categoryLabelMap } = useMemo(
    () => buildAdminCategoryCollections(referenceCategories, preferThai),
    [preferThai, referenceCategories]
  )
  const isSuperAdmin = canViewAllAgencies()
  const agency = getUserAgency()
  const allowedCategories = useMemo(() => getFilteredCategories(), [getFilteredCategories])

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <DashboardMapSection
        user={user}
        isSuperAdmin={isSuperAdmin}
        agency={agency}
        allowedCategories={allowedCategories}
        categoryLabelMap={categoryLabelMap}
        language={language}
        t={t}
        provinces={provinces}
        districts={districts}
        provinceByCode={provinceByCode}
        districtByCode={districtByCode}
        isLocationLoading={isLoadingProvinces || isLoadingDistricts}
      />
    </div>
  )
}
