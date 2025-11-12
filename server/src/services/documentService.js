import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { getEmbeddings } from './embeddingService.js';
import { storeVectors } from './pineconeService.js';
import fs from 'fs/promises';


export const processDocument = async (filePath, documentId, fileName) => {
  try {
    // Verify file exists before processing
    try {
      const stats = await fs.stat(filePath);
      console.log(`Processing file: ${filePath}, Size: ${stats.size} bytes`);
    } catch (err) {
      throw new Error(`File not found at path: ${filePath}`);
    }
    
    // Step 1: Load PDF file using pdf-parse directly (dynamic import to avoid initialization issues)
    console.log('Loading PDF with pdf-parse...');
    const pdfParse = (await import('pdf-parse')).default;
    const dataBuffer = await fs.readFile(filePath);
    const pdfData = await pdfParse(dataBuffer);
    
    if (!pdfData || !pdfData.text || pdfData.text.trim().length === 0) {
      throw new Error('Failed to extract text from PDF or PDF is empty');
    }
    
    const pageCount = pdfData.numpages;
    console.log(`Loaded ${pageCount} pages, extracted ${pdfData.text.length} characters`);
    
    // Create a document object similar to LangChain's format
    const docs = [{
      pageContent: pdfData.text,
      metadata: {
        source: filePath,
        pdf: {
          totalPages: pdfData.numpages
        }
      }
    }];
    
    // Step 2: Split documents into chunks
    console.log('Splitting document into chunks...');
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    
    const chunks = await textSplitter.splitDocuments(docs);
    const chunkCount = chunks.length;
    console.log(`Created ${chunkCount} chunks`);
    
    if (chunks.length === 0) {
      throw new Error('No chunks created from document');
    }
    
    // Step 3: Generate embeddings for chunks
    console.log('Generating embeddings...');
    const embeddings = getEmbeddings();
    
    // Extract text content from chunks
    const texts = chunks.map(chunk => chunk.pageContent);
    
    // Generate embeddings for all chunks
    const vectors = await embeddings.embedDocuments(texts);
    console.log(`Generated ${vectors.length} embeddings`);
    
    // Step 4: Store vectors in Pinecone
    console.log('Storing vectors in Pinecone...');
    await storeVectors(documentId, chunks, vectors, fileName);
    console.log('Document processing completed successfully');
    
    return {
      success: true,
      pageCount,
      chunkCount,
      documentId
    };
  } catch (error) {
    console.error('Error processing document:', error);
    throw new Error(`Failed to process PDF document: ${error.message}`);
  }
};
