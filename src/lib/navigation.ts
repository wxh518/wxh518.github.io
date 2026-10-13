// Use layout coordinates: an entering Motion section can still be translated.
// Reading its visual rectangle would leave the final heading behind the navbar.
export function scrollToSection(id: string, animated: boolean) {
  let element = document.getElementById(id)
  if (!element) return false
  let top = 0
  while (element) {
    top += element.offsetTop
    element = element.offsetParent as HTMLElement | null
  }
  const headerHeight = document.querySelector('header.site-header')?.getBoundingClientRect().height ?? 68
  window.scrollTo({ top: Math.max(0, top - headerHeight - 35), behavior: animated ? 'smooth' : 'instant' })
  return true
}
