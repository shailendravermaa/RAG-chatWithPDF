# Design Document

## Overview

This document outlines the technical design for transforming the CLI-based PDF chat application into a full-stack MERN application. The system follows a client-server architecture with a React frontend (Vite), Node.js/Express backend, and integrates with Pinecone vector database and Google Gemini AI services.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Upload Page  │  │  Chat Page   │  │ API Service  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────┬───────────────────────────────┘
                              │ HTTP/REST
┌─────────────────────────────▼───────────────────────────────┐
│              Backend (Node.js + Express)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Routes     │  │ Controllers  │  │  Services    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────┬───────────────────────────┬───────────────────┘
              │                           │
    ┌─────────▼─────────┐       ┌────────▼────────┐
    │  Pinecone Vector  │       │  Google Gemini  │
    │     Database      │       │      AI API     │
    └───────────────────┘       └─────────────────┘
```

### Technology Stack

**Frontend:**
- React 18+ with Vite
- Axios for HTTP requests
- CSS Modules or Tailwind CSS for styling
- React hooks for state management

**Backend:**
- Node.js with Express.js
- Multer for file upload handling
- LangChain for document processing
- Google Gemini AI for embeddings and chat
- Pinecone for vector storage
- dotenv for environment configuration

## Components and Interfaces

### Frontend Components

#### 1. App Component
- Root component managing routing and global state
- Maintains current document ID
- Handles navigation between upload and chat views

#### 2. DocumentUpload Component
- File input with drag-and-drop support
- Upload progress indicator
- File validation (PDF only, size limits)
- Calls API service to upload document
- Displays success/error messages

#### 3. ChatInterface Component
- Message list displaying conversation history
- Message input field with send button
- Loading indicator during query processing
- Auto-scroll to latest message
- Displays user and AI messages with distinct styling

#### 4. Message Component
- Renders individual messages
- Props: message text, sender (user/ai), timestamp
- Different styling for user vs AI messages

#### 5. API Service (apiService.js)
```javascript
// Service methods:
- uploadDocument(file) → returns { documentId, message }
- sendQuery(documentId, question, history) → returns { answer }
- getDocumentInfo(documentId) → returns { name, uploadDate }
```

### Backend Components

#### 1. Routes (routes/)

**documentRoutes.js**
```javascript
POST /api/documents/upload
GET /api/documents/:id
```

**queryRoutes.js**
```javascript
POST /api/query
```

#### 2. Controllers (controllers/)

**documentController.js**
- `uploadDocument(req, res)`: Handles file upload, validates, calls document service
- `getDocument(req, res)`: Retrieves document metadata

**queryController.js**
- `handleQuery(req, res)`: Processes user questions, calls query service

#### 3. Services (services/)

**documentService.js**
- `processDocument(filePath, documentId)`: 
  - Loads PDF using PDFLoader
  - Splits into chunks using RecursiveCharacterTextSplitter
  - Creates embeddings using GoogleGenerativeAIEmbeddings
  - Stores in Pinecone with documentId as namespace/metadata
  - Returns processing status

**queryService.js**
- `transformQuery(question, history)`: Uses Gemini to create standalone query
- `searchDocuments(query, documentId)`: Converts query to embeddings, searches Pinecone
- `generateAnswer(query, context, history)`: Uses Gemini with context to generate answer
- `processQuery(documentId, question, history)`: Orchestrates the full query pipeline

**embeddingService.js**
- `getEmbeddings()`: Returns configured GoogleGenerativeAIEmbeddings instance
- `embedText(text)`: Converts text to vector embedding

**pineconeService.js**
- `getIndex()`: Returns Pinecone index instance
- `storeVectors(documentId, chunks, embeddings)`: Stores document vectors
- `searchVectors(documentId, queryVector, topK)`: Searches for similar vectors

#### 4. Middleware (middleware/)

**uploadMiddleware.js**
- Multer configuration for file uploads
- File type validation (PDF only)
- File size limits (e.g., 10MB max)
- Temporary storage configuration

**errorHandler.js**
- Global error handling middleware
- Formats error responses consistently
- Logs errors for debugging

**validateRequest.js**
- Request validation middleware
- Validates required fields in request body
- Returns 400 for invalid requests

## Data Models

### Document Metadata (In-Memory or MongoDB)

```javascript
{
  documentId: String,        // Unique identifier (UUID)
  fileName: String,          // Original file name
  uploadDate: Date,          // Upload timestamp
  status: String,            // 'processing' | 'ready' | 'failed'
  pageCount: Number,         // Number of pages in PDF
  chunkCount: Number         // Number of chunks created
}
```

### Chat Message

```javascript
{
  role: String,              // 'user' | 'model'
  content: String,           // Message text
  timestamp: Date            // Message timestamp
}
```

### API Request/Response Formats

**Upload Document Request:**
```javascript
POST /api/documents/upload
Content-Type: multipart/form-data

file: <PDF file>
```

**Upload Document Response:**
```javascript
{
  success: true,
  documentId: "uuid-string",
  fileName: "document.pdf",
  message: "Document uploaded and processed successfully"
}
```

**Query Request:**
```javascript
POST /api/query
Content-Type: application/json

{
  documentId: "uuid-string",
  question: "What is a binary tree?",
  history: [
    { role: "user", content: "Previous question" },
    { role: "model", content: "Previous answer" }
  ]
}
```

**Query Response:**
```javascript
{
  success: true,
  answer: "A binary tree is...",
  timestamp: "2025-11-10T10:30:00Z"
}
```

## Error Handling

### Frontend Error Handling

1. **Network Errors**: Display "Connection failed. Please check your internet connection."
2. **Upload Errors**: Display specific error message from backend
3. **Query Errors**: Display "Failed to get answer. Please try again."
4. **Validation Errors**: Display inline validation messages

### Backend Error Handling

1. **File Upload Errors**:
   - Invalid file type → 400 "Only PDF files are allowed"
   - File too large → 413 "File size exceeds 10MB limit"
   - No file provided → 400 "No file uploaded"

2. **Processing Errors**:
   - PDF parsing fails → 500 "Failed to process PDF document"
   - Embedding fails → 500 "Failed to create embeddings"
   - Pinecone storage fails → 500 "Failed to store document vectors"

3. **Query Errors**:
   - Missing documentId → 400 "Document ID is required"
   - Document not found → 404 "Document not found"
   - LLM API fails → 500 "Failed to generate answer"
   - Vector search fails → 500 "Failed to search document"

4. **Error Response Format**:
```javascript
{
  success: false,
  error: "Error message",
  code: "ERROR_CODE"
}
```

## Testing Strategy

### Frontend Testing

1. **Component Tests**:
   - DocumentUpload: Test file selection, drag-and-drop, validation
   - ChatInterface: Test message sending, display, history
   - Message: Test rendering for user/AI messages

2. **Integration Tests**:
   - Test API service calls with mocked responses
   - Test error handling flows
   - Test navigation between upload and chat

### Backend Testing

1. **Unit Tests**:
   - documentService: Test PDF processing, chunking, embedding
   - queryService: Test query transformation, search, answer generation
   - Controllers: Test request handling and response formatting

2. **Integration Tests**:
   - Test complete upload flow from API to Pinecone
   - Test complete query flow from API to LLM response
   - Test error scenarios and error responses

3. **API Tests**:
   - Test all endpoints with valid and invalid inputs
   - Test file upload with various file types and sizes
   - Test query with and without history

## Project Structure

```
pdf-chat-mern-app/
├── client/                          # Frontend React application
│   ├── public/
│   │   └── vite.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── DocumentUpload.jsx
│   │   │   ├── ChatInterface.jsx
│   │   │   ├── Message.jsx
│   │   │   └── LoadingSpinner.jsx
│   │   ├── services/
│   │   │   └── apiService.js
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── main.jsx
│   │   └── index.css
│   ├── .env
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
├── server/                          # Backend Node.js application
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── documentController.js
│   │   │   └── queryController.js
│   │   ├── services/
│   │   │   ├── documentService.js
│   │   │   ├── queryService.js
│   │   │   ├── embeddingService.js
│   │   │   └── pineconeService.js
│   │   ├── routes/
│   │   │   ├── documentRoutes.js
│   │   │   └── queryRoutes.js
│   │   ├── middleware/
│   │   │   ├── uploadMiddleware.js
│   │   │   ├── errorHandler.js
│   │   │   └── validateRequest.js
│   │   ├── utils/
│   │   │   └── logger.js
│   │   └── server.js
│   ├── uploads/                     # Temporary file storage
│   ├── .env
│   └── package.json
│
├── DAY01ChatWithPDF/               # Original CLI code (reference)
│   ├── index.js
│   ├── query.js
│   └── package.json
│
└── README.md                        # Project documentation
```

## Configuration

### Frontend Environment Variables (.env)
```
VITE_API_BASE_URL=http://localhost:5000/api
```

### Backend Environment Variables (.env)
```
PORT=5000
GEMINI_API_KEY=your_gemini_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=your_index_name
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

## Security Considerations

1. **File Upload Security**:
   - Validate file types on both frontend and backend
   - Limit file sizes to prevent DoS
   - Store uploaded files temporarily and clean up after processing
   - Sanitize file names to prevent path traversal

2. **API Security**:
   - Implement rate limiting to prevent abuse
   - Validate all input data
   - Use CORS to restrict allowed origins
   - Don't expose sensitive error details to clients

3. **Environment Variables**:
   - Never commit .env files to version control
   - Use different API keys for development and production
   - Rotate API keys periodically

## Performance Considerations

1. **Document Processing**:
   - Process documents asynchronously
   - Provide status updates to frontend
   - Clean up temporary files after processing

2. **Query Processing**:
   - Cache embeddings model instance
   - Reuse Pinecone connection
   - Implement request timeout (30 seconds)

3. **Frontend**:
   - Lazy load components
   - Debounce user input if implementing auto-complete
   - Optimize re-renders with React.memo where appropriate

## Deployment Considerations

1. **Frontend**: Deploy to Vercel, Netlify, or similar
2. **Backend**: Deploy to Railway, Render, or AWS
3. **Environment**: Ensure all environment variables are configured
4. **CORS**: Update allowed origins for production
5. **File Storage**: Consider using cloud storage (S3) instead of local filesystem for production
