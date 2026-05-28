import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function generateEmbedding(text: string): Promise<number[]> {
  const input = text.replace(/\n/g, ' ').trim().slice(0, 8000)

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input,
    encoding_format: 'float',
  })

  return response.data[0].embedding
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  if (denominator === 0) return 0

  return dotProduct / denominator
}

export function embeddingToSql(embedding: number[]): string {
  return `[${embedding.join(',')}]`
}
