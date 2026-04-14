import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'

// Vite resolves this URL to the bundled worker asset at build time
GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href

/**
 * Extracts plain text from a PDF File object.
 * Returns up to 15,000 characters (~5–6 pages), which is enough signal
 * for the matching algorithm without bloating the Claude context window.
 *
 * @param {File} file - A PDF File from an <input type="file"> element
 * @returns {Promise<string>} Extracted text, capped at 15k chars
 */
export async function extractPdfText(file) {
  const buffer = await file.arrayBuffer()
  const pdf = await getDocument({ data: buffer }).promise
  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    pages.push(content.items.map(item => item.str).join(' '))
  }
  return pages.join('\n').slice(0, 15000)
}
