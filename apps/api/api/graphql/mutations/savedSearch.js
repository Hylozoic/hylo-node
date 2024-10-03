export function createSavedSearch (attributes) {
  return SavedSearch.create(attributes)
}

export function deleteSavedSearch (savedSearchId) {
  return SavedSearch.delete(savedSearchId)
}
