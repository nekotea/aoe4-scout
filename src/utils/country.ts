const display = new Intl.DisplayNames(['zh-CN'], { type: 'region', fallback: 'none' })

export function getCountryName(code: string | null | undefined): string {
  if (!code) return ''
  try {
    return display.of(code.toUpperCase()) ?? code.toUpperCase()
  } catch {
    return code.toUpperCase()
  }
}

/** flag-icons 的 CSS 类名，如 'fi fi-cn' */
export function getCountryFlagClass(code: string | null | undefined): string {
  if (!code) return ''
  return `fi fi-${code.toLowerCase()}`
}
