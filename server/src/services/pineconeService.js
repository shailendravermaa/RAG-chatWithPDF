import { Pinecone } from '@pinecone-database/pinecone';

let pineconeClient = null;
let pineconeIndex = null;


const getPineconeClient = () => {
  if (!pineconeClient) {
    const apiKey = process.env.PINECONE_API_KEY;
    
    if (!apiKey) {
      throw new Error('PINECONE_API_KEY environment variable is not set');
    }
    
    pineconeClient = new Pinecone({
      apiKey: apiKey,
    });
  }
  
  return pineconeClient;
};


export const getIndex = () => {
  if (!pineconeIndex) {
    const indexName = process.env.PINECONE_INDEX_NAME;
    
    if (!indexName) {
      throw new Error('PINECONE_INDEX_NAME environment variable is not set');
    }
    
    const client = getPineconeClient();
    pineconeIndex = client.index(indexName);
  }
  
  return pineconeIndex;
};


export const storeVectors = async (documentId, chunks, vectors, fileName) => {
  try {
    if (!chunks || chunks.length === 0) {
      throw new Error('No chunks provided for storage');
    }
    
    if (!vectors || vectors.length === 0) {
      throw new Error('No vectors provided for storage');
    }
    
    if (chunks.length !== vectors.length) {
      throw new Error('Number of chunks and vectors must match');
    }
    
    const index = getIndex();
    
    // Prepare vectors for upsert
    const records = chunks.map((chunk, i) => {
      const metadata = {
        documentId: documentId,
        fileName: fileName,
        text: chunk.pageContent,
        chunkIndex: i,
      };
      
      // Only add pageNumber if it exists (Pinecone doesn't accept null values)
      const pageNumber = chunk.metadata?.loc?.pageNumber || chunk.metadata?.pageNumber;
      if (pageNumber !== null && pageNumber !== undefined) {
        metadata.pageNumber = pageNumber;
      }
      
      return {
        id: `${documentId}-chunk-${i}`,
        values: vectors[i],
        metadata
      };
    });
    
    // Upsert vectors in batches (Pinecone recommends batches of 100)
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await index.upsert(batch);
    }
  } catch (error) {
    console.error('Error storing vectors in Pinecone:', error);
    throw new Error(`Failed to store vectors: ${error.message}`);
  }
};


export const searchVectors = async (documentId, queryVector, topK = 10) => {
  try {
    if (!queryVector || queryVector.length === 0) {
      throw new Error('Query vector is required');
    }
    
    const index = getIndex();
    
    // Query Pinecone with filter for specific document
    const queryResponse = await index.query({
      vector: queryVector,
      topK: topK,
      includeMetadata: true,
      filter: {
        documentId: { $eq: documentId }
      }
    });
    
    return queryResponse.matches || [];
  } catch (error) {
    console.error('Error searching vectors in Pinecone:', error);
    throw new Error(`Failed to search vectors: ${error.message}`);
  }
};
