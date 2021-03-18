export function toggleGroupWidgetVisibility (id, isVisible) {
  return GroupWidget.toggleVisibility(id, isVisible)
}

export function updateWidgetSettings (id, settings) {
  return GroupWidget.updateSettings(id, settings)
}
