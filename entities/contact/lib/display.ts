export function getSelectOptionLabel(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string | null | undefined,
  fallback: string
) {
  return options.find(option => option.value === value)?.label ?? fallback
}

export function getContactDisplayCategoryLabel(
  category: string | null | undefined,
  options: ReadonlyArray<{ value: string; label: string }>,
  fallback: string
) {
  if (!category) return fallback
  return getSelectOptionLabel(options, category, category)
}
