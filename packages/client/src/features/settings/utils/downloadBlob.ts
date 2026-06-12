// Triggers a browser download for a blob response. The filename comes from
// the Content-Disposition header when present, falling back to `fallbackName`.
export function downloadBlob(blob: Blob, contentDisposition: string | undefined, fallbackName: string): void {
  const match = contentDisposition?.match(/filename="([^"]+)"/)
  const filename = match?.[1] ?? fallbackName
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
