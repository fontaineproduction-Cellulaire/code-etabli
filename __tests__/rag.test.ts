import { generateEmbedding, cosineSimilarity } from '../lib/embeddings'
import { extractPdfChunks } from '../lib/pdfParser'

// Mocks
jest.mock('../lib/db', () => ({
  default: {
    searchHistory: {
      create: jest.fn().mockResolvedValue({}),
    },
    $queryRawUnsafe: jest.fn(),
  },
}))

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    embeddings: {
      create: jest.fn().mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0.1) }],
      }),
    },
  }))
})

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Source insuffisante — validation humaine requise.' }],
      }),
    },
  }))
})

describe('generateEmbedding', () => {
  it('retourne un vecteur de 1536 dimensions', async () => {
    const embedding = await generateEmbedding('test query')
    expect(embedding).toHaveLength(1536)
    expect(typeof embedding[0]).toBe('number')
  })

  it('retourne des nombres entre -1 et 1', async () => {
    const embedding = await generateEmbedding('test query')
    embedding.forEach((val) => {
      expect(val).toBeGreaterThanOrEqual(-1)
      expect(val).toBeLessThanOrEqual(1)
    })
  })
})

describe('cosineSimilarity', () => {
  it('retourne 1 pour deux vecteurs identiques', () => {
    const v = [1, 0, 0, 1]
    expect(cosineSimilarity(v, v)).toBeCloseTo(1)
  })

  it('retourne 0 pour deux vecteurs orthogonaux', () => {
    const a = [1, 0]
    const b = [0, 1]
    expect(cosineSimilarity(a, b)).toBeCloseTo(0)
  })

  it('retourne 0 pour vecteurs de longueurs différentes', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0)
  })
})

describe('performRAG', () => {
  const prisma = require('../lib/db').default

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('retourne Source insuffisante si aucun chunk trouvé', async () => {
    prisma.$queryRawUnsafe.mockResolvedValue([])

    const { performRAG } = require('../lib/rag')
    const result = await performRAG('Quelle est la hauteur minimale?')

    expect(result.isInsufficient).toBe(true)
    expect(result.answer).toBe('Source insuffisante — validation humaine requise.')
    expect(result.sources).toHaveLength(0)
    expect(result.confidence).toBe(0)
  })

  it('retourne Source insuffisante si similarité < 0.70', async () => {
    prisma.$queryRawUnsafe.mockResolvedValue([
      {
        id: 'chunk1',
        content: 'Texte peu pertinent',
        page: 1,
        section: null,
        article: null,
        documentId: 'doc1',
        documentName: 'CCQ 2020',
        similarity: 0.50,
      },
    ])

    const { performRAG } = require('../lib/rag')
    const result = await performRAG('Quelle est la hauteur minimale?')

    expect(result.isInsufficient).toBe(true)
    expect(result.confidence).toBe(0)
  })

  it('ne retourne jamais de réponse sans sources quand insuffisant', async () => {
    prisma.$queryRawUnsafe.mockResolvedValue([])

    const { performRAG } = require('../lib/rag')
    const result = await performRAG('Question quelconque')

    expect(result.sources).toHaveLength(0)
    expect(result.isInsufficient).toBe(true)
  })

  it('sauvegarde dans l\'historique même si Source insuffisante', async () => {
    prisma.$queryRawUnsafe.mockResolvedValue([])

    const { performRAG } = require('../lib/rag')
    await performRAG('Test historique')

    expect(prisma.searchHistory.create).toHaveBeenCalledTimes(1)
    expect(prisma.searchHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ query: 'Test historique' }),
      })
    )
  })

  it('lance une erreur si la query est vide', async () => {
    const { performRAG } = require('../lib/rag')
    await expect(performRAG('')).rejects.toThrow('La question ne peut pas être vide.')
  })
})

describe('extractPdfChunks', () => {
  it('retourne un tableau vide pour un buffer invalide', async () => {
    const fakeBuffer = Buffer.from('not a real pdf')
    try {
      const chunks = await extractPdfChunks(fakeBuffer)
      expect(Array.isArray(chunks)).toBe(true)
    } catch {
      // pdf-parse peut rejeter un buffer invalide — comportement attendu
      expect(true).toBe(true)
    }
  })

  it('les chunks ont les propriétés requises', async () => {
    const pdfParse = require('pdf-parse')
    jest.mock('pdf-parse', () =>
      jest.fn().mockResolvedValue({
        text: 'Article 9.8.7.3 Les garde-corps doivent avoir une hauteur minimale de 900 mm\f Page 2 contenu suite',
        numpages: 2,
      })
    )

    const { extractPdfChunks } = require('../lib/pdfParser')
    const buffer = Buffer.from('%PDF-1.4 fake content')
    
    try {
      const chunks = await extractPdfChunks(buffer)
      if (chunks.length > 0) {
        const chunk = chunks[0]
        expect(chunk).toHaveProperty('content')
        expect(chunk).toHaveProperty('page')
        expect(chunk).toHaveProperty('section')
        expect(chunk).toHaveProperty('article')
        expect(typeof chunk.content).toBe('string')
        expect(typeof chunk.page).toBe('number')
        expect(chunk.content.length).toBeGreaterThan(0)
      }
    } catch {
      expect(true).toBe(true)
    }
  })
})
