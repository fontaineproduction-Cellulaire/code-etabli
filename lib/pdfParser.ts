import pdfParse from 'pdf-parse'

export interface PdfChunk {
  content: string
  page: number
  section: string | null
  article: string | null
}

const CHUNK_SIZE = 500
const CHUNK_OVERLAP = 50

function detectArticle(text: string): string | null {
  const patterns = [
    /art\.?\s*(\d+[\.\d]*)/gi,
    /article\s+(\d+[\.\d]*)/gi,
    /(\d+\.\d+\.\d+[\.\d]*)/g,
  ]

  for (const pattern of patterns) {
    const match = pattern.exec(text)
    if (match) return match[1] || match[0]
  }
  return null
}

function detectSection(text: string): string | null {
  const patterns = [
    /^(section\s+\d+[\.\d]*[^\n]*)/im,
    /^(\d+[\.\d]+\s+[A-ZÀÂÉÈÊÎÔÙÛÇ][^\n]{3,50})/m,
    /^(chapitre\s+[IVXLCDM\d]+[^\n]*)/im,
    /^(partie\s+\d+[^\n]*)/im,
  ]

  for (const pattern of patterns) {
    const match = pattern.exec(text)
    if (match) return match[1].trim().slice(0, 100)
  }
  return null
}

function splitIntoChunks(text: string, targetSize: number, overlap: number): string[] {
  const words = text.split(/\s+/)
  const chunks: string[] = []
  let start = 0

  while (start < words.length) {
    const end = Math.min(start + targetSize, words.length)
    const chunk = words.slice(start, end).join(' ')
    if (chunk.trim().length > 20) {
      chunks.push(chunk.trim())
    }
    start += targetSize - overlap
  }

  return chunks
}

export async function extractPdfChunks(buffer: Buffer): Promise<PdfChunk[]> {
  const data = await pdfParse(buffer, {
    pagerender: (pageData: { getTextContent: () => Promise<{ items: Array<{ str: string; hasEOL?: boolean }> }> }) => {
      return pageData.getTextContent().then((textContent) => {
        let text = ''
        for (const item of textContent.items) {
          text += item.str
          if (item.hasEOL) text += '\n'
          else text += ' '
        }
        return text
      })
    },
  })

  const chunks: PdfChunk[] = []
  const pages = data.text.split('\f')

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const pageText = pages[pageIndex].trim()
    if (!pageText || pageText.length < 30) continue

    const pageNumber = pageIndex + 1
    const textChunks = splitIntoChunks(pageText, CHUNK_SIZE, CHUNK_OVERLAP)

    for (const chunkText of textChunks) {
      if (chunkText.length < 30) continue

      chunks.push({
        content: chunkText,
        page: pageNumber,
        section: detectSection(chunkText),
        article: detectArticle(chunkText),
      })
    }
  }

  return chunks
}
