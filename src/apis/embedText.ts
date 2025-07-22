import OpenAI from "openai";

// Cache for the API key to avoid repeated requests
let cachedApiKey: string | null = null;

// Function to fetch OpenAI API key from backend
async function getOpenAiApiKey(): Promise<string> {
  if (cachedApiKey) {
    return cachedApiKey;
  }

  try {
    const response = await fetch(
      "https://bd81fefc95be.ngrok-free.app/api/config/openai-key"
    );
    const data = await response.json();

    if (data.success && data.data?.openai_api_key) {
      cachedApiKey = data.data.openai_api_key;
      return cachedApiKey as string;
    } else {
      throw new Error("Failed to get OpenAI API key from backend");
    }
  } catch (error) {
    throw new Error(
      `Failed to fetch OpenAI API key: ${(error as Error).message}`
    );
  }
}

// Initialize OpenAI client lazily
let openaiClient: OpenAI | null = null;

async function getOpenAiClient(): Promise<OpenAI> {
  if (!openaiClient) {
    const apiKey = await getOpenAiApiKey();
    openaiClient = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, // Required for browser usage, but not recommended for production!
    });
  }
  return openaiClient;
}

export async function getEmbedding(text: string): Promise<number[]> {
  const openai = await getOpenAiClient();
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });

  if (!embedding.data || !embedding.data[0]?.embedding) {
    throw new Error("Failed to get embedding from OpenAI");
  }

  return embedding.data[0].embedding as number[];
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const normB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return dot / (normA * normB);
}
