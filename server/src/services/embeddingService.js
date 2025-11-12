import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

let embeddingsInstance = null;


export const getEmbeddings = () => {
  if (!embeddingsInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    
    embeddingsInstance = new GoogleGenerativeAIEmbeddings({
      apiKey: apiKey,
      modelName: 'text-embedding-004',
    });
  }
  
  return embeddingsInstance;
};


export const embedText = async (text) => {
  try {
    const embeddings = getEmbeddings();
    const vector = await embeddings.embedQuery(text);
    return vector;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
};


export const embedTexts = async (texts) => {
  try {
    const embeddings = getEmbeddings();
    const vectors = await embeddings.embedDocuments(texts);
    return vectors;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw new Error(`Failed to generate embeddings: ${error.message}`);
  }
};
