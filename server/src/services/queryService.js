import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { embedText } from './embeddingService.js';
import { searchVectors } from './pineconeService.js';

let geminiModel = null;


const getGeminiModel = () => {
  if (!geminiModel) {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    
    geminiModel = new ChatGoogleGenerativeAI({
      apiKey,
      model: 'gemini-2.0-flash',
      temperature: 0.7,
    });
  }
  
  return geminiModel;
};


export const transformQuery = async (question, history = []) => {
  try {
    // If no history, return the question as-is
    if (!history || history.length === 0) {
      return question;
    }
    
    const model = getGeminiModel();
    
    // Build conversation context from history
    let conversationContext = 'Previous conversation:\n';
    for (const message of history) {
      const role = message.role === 'user' ? 'User' : 'Assistant';
      conversationContext += `${role}: ${message.content}\n`;
    }
    
    // Create prompt for query transformation
    const prompt = `${conversationContext}

Current question: ${question}

Based on the conversation history above, rewrite the current question as a standalone question that includes all necessary context. If the question already has all the context, return it as-is.

Standalone question:`;
    
    const response = await model.invoke(prompt);
    const standaloneQuery = response.content.trim();
    return standaloneQuery;
  } catch (error) {
    console.error('Error transforming query:', error);
    // If transformation fails, return original question
    return question;
  }
};


export const searchDocuments = async (documentId, query, topK = 10) => {
  try {
    // Convert query to embedding
    const queryVector = await embedText(query);
    
    // Search Pinecone for similar vectors
    const searchResults = await searchVectors(documentId, queryVector, topK);
    
    if (!searchResults || searchResults.length === 0) {
      return '';
    }
    
    // Extract and format context from search results
    const context = searchResults
      .map((result, index) => {
        const text = result.metadata?.text || '';
        const score = result.score?.toFixed(4) || 'N/A';
        return `[Chunk ${index + 1}, Relevance: ${score}]\n${text}`;
      })
      .join('\n\n---\n\n');
    
    return context;
  } catch (error) {
    console.error('Error searching documents:', error);
    throw new Error(`Failed to search documents: ${error.message}`);
  }
};


export const generateAnswer = async (query, context, history = []) => {
  try {
    const model = getGeminiModel();
    
    // Build system instruction for DSA expert behavior
    const systemInstruction = `You are an expert in Data Structures and Algorithms (DSA). Your role is to provide clear, accurate, and helpful answers based on the provided document context.

Guidelines:
- Answer questions based primarily on the provided context
- If the context doesn't contain enough information, acknowledge this and provide what you can
- Be concise but thorough in your explanations
- Use examples when helpful
- If asked about code or algorithms, explain them step by step
- Maintain a helpful and educational tone`;
    
    // Build conversation history context
    let conversationContext = '';
    if (history && history.length > 0) {
      conversationContext = '\n\nPrevious conversation:\n';
      for (const message of history) {
        const role = message.role === 'user' ? 'User' : 'Assistant';
        conversationContext += `${role}: ${message.content}\n`;
      }
    }
    
    // Build the complete prompt
    const prompt = `${systemInstruction}

Document Context:
${context}
${conversationContext}

Current Question: ${query}

Please provide a helpful answer based on the document context and conversation history:`;
    
    const response = await model.invoke(prompt);
    const answer = response.content.trim();
    
    return {
      answer,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating answer:', error);
    throw new Error(`Failed to generate answer: ${error.message}`);
  }
};


export const processQuery = async (documentId, question, history = []) => {
  const maxRetries = 1;
  let lastError = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Step 1: Transform query with conversation history
      const standaloneQuery = await transformQuery(question, history);
      
      // Step 2: Search for relevant document chunks
      const context = await searchDocuments(documentId, standaloneQuery);
      
      if (!context || context.trim().length === 0) {
        return {
          answer: "I couldn't find any relevant information in the document to answer your question. Could you please rephrase or ask something else?",
          timestamp: new Date().toISOString()
        };
      }
      
      // Step 3: Generate answer with LLM
      const result = await generateAnswer(standaloneQuery, context, history);
      return result;
      
    } catch (error) {
      lastError = error;
      console.error(`Error in query processing (attempt ${attempt + 1}):`, error.message);
      
      // If this is a vector search error, don't retry
      if (error.message.includes('search')) {
        throw error;
      }
      
      // If we've exhausted retries, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait a bit before retrying (exponential backoff)
      const waitTime = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  // This should never be reached, but just in case
  throw lastError || new Error('Query processing failed');
};
