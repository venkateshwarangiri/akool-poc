# 🔍 Detailed RAG Flow: Embeddings, Context Retrieval, LLM Integration & Akool Connection

## 📋 **Complete Technical Flow**

This document explains the detailed technical flow of how embeddings are stored, context is retrieved, sent to LLM, and how the complete RAG system connects to Akool streaming avatar.

---

## 🏗️ **1. EMBEDDING STORAGE & VECTOR MANAGEMENT**

### **✅ Two Storage Options:**

#### **Option A: In-Memory Storage (Enterprise RAG)**
```typescript
// Location: src/services/enterpriseRAGService.ts
export class EnterpriseRAGService {
  // ✅ In-memory document storage
  private documents: Map<string, EnterpriseDocument> = new Map()
  
  // ✅ In-memory embedding storage
  private embeddings: Map<string, number[]> = new Map()
  
  // ✅ In-memory cache for responses
  private cache: Map<string, { response: RAGResponse; timestamp: Date }> = new Map()
}
```

#### **Option B: Chroma Cloud Storage (Chroma RAG)**
```typescript
// Location: src/services/chromaRAGService.ts
export class ChromaRAGService {
  // ✅ Chroma Cloud client for vector storage
  private client: CloudClient;
  private collection: any;
  
  // ✅ Local document metadata storage
  private documents: Map<string, ChromaDocument> = new Map()
  
  // ✅ Local response cache
  private cache: Map<string, { response: ChromaRAGResponse; timestamp: Date }> = new Map()
}
```

### **🔧 Embedding Generation Process:**

```typescript
// Step 1: Document Upload & Processing
async addDocument(file: File): Promise<EnterpriseDocument> {
  // 1. Extract text from PDF using PDF.js
  const content = await this.extractTextFromFile(file);
  
  // 2. Split into chunks
  const chunks = await this.createChunks(document, content);
  
  // 3. Generate embeddings for each chunk
  for (const chunk of chunks) {
    const embedding = await this.generateEmbedding(chunk.content);
    chunk.embedding = embedding;
    
    // 4. Store embedding
    this.embeddings.set(chunk.id, embedding); // In-memory
    // OR
    await this.collection.add({ // Chroma Cloud
      embeddings: [embedding],
      documents: [chunk.content],
      metadatas: [chunk.metadata],
      ids: [chunk.id]
    });
  }
}
```

### **🌐 Embedding API Calls:**

```typescript
// Azure OpenAI Embedding Endpoint
private async generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(
    `${azureEndpoint}/openai/deployments/text-embedding-3-large/embeddings?api-version=2024-05-01-preview`,
    {
      method: 'POST',
      headers: {
        'api-key': azureKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text
      })
    }
  );
  
  const data = await response.json();
  return data.data[0].embedding; // Returns 3072-dimensional vector
}
```

---

## 🔍 **2. CONTEXT RETRIEVAL & SEMANTIC SEARCH**

### **✅ Search Process:**

```typescript
// Step 1: Generate query embedding
async searchDocuments(query: string): Promise<SearchResult[]> {
  // 1. Generate embedding for user query
  const queryEmbedding = await this.generateEmbedding(query);
  
  // 2. Search for similar chunks
  const results = await this.performSemanticSearch(queryEmbedding);
  
  // 3. Filter by similarity threshold
  const filteredResults = results.filter(result => 
    result.similarity >= this.config.similarityThreshold
  );
  
  return filteredResults;
}
```

### **🔧 Semantic Search Implementation:**

#### **In-Memory Search (Enterprise RAG):**
```typescript
private async performSemanticSearch(queryEmbedding: number[]): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  
  // Iterate through all documents and chunks
  for (const [documentId, document] of this.documents) {
    for (const chunk of document.chunks) {
      // Get stored embedding
      const chunkEmbedding = this.embeddings.get(chunk.id);
      if (!chunkEmbedding) continue;
      
      // Calculate cosine similarity
      const similarity = this.calculateCosineSimilarity(queryEmbedding, chunkEmbedding);
      
      if (similarity >= this.config.similarityThreshold) {
        results.push({
          chunk,
          document,
          similarity,
          relevanceScore: similarity,
          context: this.extractContext(chunk.content, query)
        });
      }
    }
  }
  
  // Sort by similarity score
  return results.sort((a, b) => b.similarity - a.similarity);
}
```

#### **Chroma Cloud Search:**
```typescript
private async performSemanticSearch(queryEmbedding: number[]): Promise<ChromaSearchResult[]> {
  // Use Chroma's built-in similarity search
  const results = await this.collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: this.config.maxChunks,
    include: ['documents', 'metadatas', 'distances']
  });
  
  return results.map((result, index) => ({
    chunk: {
      id: result.ids[0],
      content: result.documents[0],
      metadata: result.metadatas[0]
    },
    similarity: 1 - result.distances[0], // Convert distance to similarity
    relevanceScore: 1 - result.distances[0]
  }));
}
```

### **📊 Similarity Calculation:**
```typescript
private calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

---

## 🤖 **3. LLM INTEGRATION & CONTEXT SENDING**

### **✅ Context Building:**
```typescript
// Build context from search results
private buildContext(searchResults: SearchResult[]): string {
  const contextParts: string[] = [];
  
  for (const result of searchResults.slice(0, this.config.maxChunks)) {
    contextParts.push(`
Document: ${result.document.name}
Content: ${result.chunk.content}
Similarity: ${result.similarity.toFixed(3)}
Department: ${result.document.metadata.department || 'Unknown'}
    `);
  }
  
  return contextParts.join('\n---\n');
}
```

### **🔧 Enhanced Prompt Creation:**
```typescript
private createEnhancedPrompt(query: string, context: string): string {
  return `You are a helpful AI assistant with access to document information. Provide concise, informative answers using the available information.

DOCUMENT INFORMATION AVAILABLE:
${context}

USER QUESTION: ${query}

INSTRUCTIONS:
1. Provide SHORT and SWEET informative answers using the available document information
2. Be concise but helpful - give key information without unnecessary details
3. Use file names, document types, and content descriptions to answer questions
4. If the question is about the document, provide brief but useful information about the document
5. If the question is about topics in the document, explain what's available in a concise way
6. Keep responses focused and to the point - avoid lengthy explanations
7. Only use the fallback response "I don't have information about this in my knowledge base" if the question is completely unrelated to documents, files, or any information that could reasonably be found in documents
8. For document-related questions, provide brief but informative responses
9. Give clear, concise answers that address the user's question directly

Answer concisely and informatively:`;
}
```

### **🌐 LLM API Call:**
```typescript
// Azure OpenAI LLM Endpoint
async processWithLLM(request: LLMRequest): Promise<LLMResponse> {
  const response = await fetch(
    `${azureEndpoint}/openai/deployments/gpt-4o/chat/completions?api-version=2024-05-01-preview`,
    {
      method: 'POST',
      headers: {
        'api-key': azureKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: `You are a helpful AI assistant. Use the following context to answer questions: ${request.context}`
          },
          {
            role: 'user',
            content: request.question
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        stream: false
      })
    }
  );
  
  const data = await response.json();
  return {
    answer: data.choices[0].message.content,
    metadata: {
      model: data.model,
      tokensUsed: data.usage.total_tokens,
      processingTime: Date.now() - startTime
    }
  };
}
```

---

## 🎤 **4. AKOOL AVATAR INTEGRATION**

### **✅ Voice Message Interception:**
```typescript
// Location: src/hooks/useStreaming.ts
const onStreamMessage = useCallback((uid: UID, body: Uint8Array) => {
  const msg = new TextDecoder().decode(body);
  const parsed = JSON.parse(msg);
  
  // Check if this is a user voice message
  if (parsed.pld?.from === 'user') {
    const text = parsed.pld.text;
    console.log('🎤 Voice message intercepted from user:', text);
    
    // Process voice message through RAG system if enabled
    if (ragState?.isEnabled && sendMessageWithRAG) {
      console.log('🧠 Processing voice message through RAG system');
      
      // Process the voice message through RAG and BLOCK the original message
      sendMessageWithRAG(client, text, 'user', `voice_session_${Date.now()}`)
        .then(() => {
          console.log('✅ Voice message processed through RAG successfully');
        })
        .catch((error) => {
          console.error('❌ Error processing voice message through RAG:', error);
        });
      
      // IMPORTANT: Return early to prevent the original voice message from being processed
      return;
    }
  }
}, [ragState, sendMessageWithRAG, client]);
```

### **🔧 RAG Response Processing:**
```typescript
// Location: src/hooks/useEnterpriseRAG.ts
const sendMessageWithRAG = useCallback(async (
  client: RTCClient,
  question: string,
  userId?: string,
  sessionId?: string
) => {
  try {
    // 1. Generate RAG response
    const ragResponse = await enterpriseRAGService.generateRAGResponse(
      question,
      userId,
      sessionId
    );
    
    // 2. Clean the response to remove source citations
    const cleanedAnswer = cleanRAGResponse(ragResponse.answer);
    
    // 3. Prepare the message with cleaned RAG response
    const message = {
      v: 2,
      type: "chat",
      mid: `msg-${Date.now()}`,
      idx: 0,
      fin: true,
      pld: {
        from: "bot", // ✅ Use "bot" as per ChatResponsePayload interface
        text: cleanedAnswer // ✅ Use cleaned response for avatar
      }
    };
    
    // 4. Truncate response to fit Agora stream message limits (32KB max)
    const maxTextLength = 25000;
    let finalText = cleanedAnswer;
    
    if (cleanedAnswer.length > maxTextLength) {
      finalText = cleanedAnswer.substring(0, maxTextLength) + "... [Response truncated due to size limit]";
    }
    
    // 5. Send the processed message to the avatar
    await client.sendStreamMessage(JSON.stringify(message), false);
    
    console.log('✅ RAG message sent to avatar successfully');
    
  } catch (error) {
    console.error('❌ Error in RAG message processing:', error);
    throw error;
  }
}, []);
```

### **🎯 Message Format for Akool:**
```typescript
// Akool expects this specific message format
const message = {
  v: 2,                    // Version field (required)
  type: "chat",            // Message type
  mid: `msg-${Date.now()}`, // Message ID
  idx: 0,                  // Index (for streaming)
  fin: true,               // Final chunk flag
  pld: {
    from: "bot",           // Required for avatar to speak
    text: cleanedAnswer    // The RAG-generated response
  }
};
```

---

## 🔄 **5. COMPLETE RAG FLOW DIAGRAM**

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPLETE RAG FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   Document  │    │   Embedding │    │   Vector    │        │
│  │   Upload    │───▶│ Generation  │───▶│   Storage   │        │
│  │   (PDF.js)  │    │ (Azure API) │    │ (Memory/DB) │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│           │                                 │                  │
│           ▼                                 ▼                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   Text      │    │   Chunking  │    │   Embedding │        │
│  │ Extraction  │───▶│   Process   │───▶│   Storage   │        │
│  │             │    │             │    │             │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   User      │    │   Query     │    │   Semantic  │        │
│  │   Voice     │───▶│   Embedding │───▶│   Search    │        │
│  │   Input     │    │ (Azure API) │    │ (Similarity)│        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│           │                                 │                  │
│           ▼                                 ▼                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   Voice     │    │   Context   │    │   Relevant  │        │
│  │Interception │───▶│   Building  │───▶│   Chunks    │        │
│  │ (useStream) │    │             │    │ Retrieved   │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│           │                                 │                  │
│           ▼                                 ▼                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   RAG       │    │   Enhanced  │    │   LLM       │        │
│  │ Processing  │───▶│   Prompt    │───▶│   Service   │        │
│  │             │    │ Creation    │    │ (Azure API) │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│           │                                 │                  │
│           ▼                                 ▼                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   Response  │    │   Message   │    │   Akool     │        │
│  │ Generation  │───▶│ Formatting  │───▶│   Avatar    │        │
│  │             │    │ & Cleaning  │    │ Streaming   │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│           │                                 │                  │
│           ▼                                 ▼                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   Response  │    │   Voice     │    │   User      │        │
│  │   Truncation│───▶│   Output    │───▶│   Hears     │        │
│  │ (32KB Limit)│    │ (Avatar)    │    │ Response    │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 **6. KEY TECHNICAL DETAILS**

### **✅ Embedding Storage:**
- **In-Memory**: `Map<string, number[]>` for fast access
- **Chroma Cloud**: Persistent vector database with metadata
- **Vector Dimensions**: 3072 (text-embedding-3-large model)
- **Similarity Threshold**: 0.05 (configurable)

### **✅ Context Retrieval:**
- **Semantic Search**: Cosine similarity calculation
- **Max Chunks**: 5 (configurable)
- **Context Building**: Combines relevant chunks with metadata
- **Caching**: Response caching for performance

### **✅ LLM Integration:**
- **Azure OpenAI**: GPT-4o model for response generation
- **Prompt Engineering**: Enhanced prompts with context
- **Token Limits**: 2000 tokens (configurable)
- **Temperature**: 0.3 for consistent responses

### **✅ Akool Connection:**
- **Voice Interception**: Captures user voice input
- **Message Blocking**: Prevents original message from reaching avatar
- **Response Formatting**: Proper message structure for Akool
- **Size Limits**: 32KB message limit with truncation

---

## 🚀 **7. PERFORMANCE OPTIMIZATIONS**

### **✅ Caching Strategy:**
```typescript
// Response caching for repeated queries
private cache: Map<string, { response: RAGResponse; timestamp: Date }> = new Map()

// Cache key generation
private generateCacheKey(query: string): string {
  return encodeURIComponent(query.toLowerCase().trim()).replace(/[^a-zA-Z0-9]/g, '_');
}

// Cache validation
private isCacheValid(timestamp: Date): boolean {
  const now = new Date();
  const diffMinutes = (now.getTime() - timestamp.getTime()) / (1000 * 60);
  return diffMinutes < this.config.cacheExpiry;
}
```

### **✅ Memory Management:**
```typescript
// Document cleanup
private cleanupOldDocuments(): void {
  const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
  
  for (const [id, document] of this.documents) {
    if (document.uploadDate < cutoffDate) {
      this.documents.delete(id);
      // Clean up associated embeddings
      for (const chunk of document.chunks) {
        this.embeddings.delete(chunk.id);
      }
    }
  }
}
```

---

## 🎯 **Summary**

**The complete RAG flow works as follows:**

1. **📄 Document Processing**: PDFs are processed using PDF.js, text is extracted and chunked
2. **🔢 Embedding Generation**: Each chunk gets a 3072-dimensional vector via Azure OpenAI
3. **💾 Vector Storage**: Embeddings stored in-memory or Chroma Cloud with metadata
4. **🎤 Voice Interception**: User voice input is captured and processed through RAG
5. **🔍 Semantic Search**: Query embedding is generated and similar chunks are retrieved
6. **📝 Context Building**: Relevant chunks are combined into context for LLM
7. **🤖 LLM Processing**: Enhanced prompt with context is sent to Azure OpenAI GPT-4o
8. **🧹 Response Cleaning**: LLM response is cleaned and formatted for avatar
9. **📤 Akool Integration**: Response is sent to Akool avatar in proper message format
10. **🎤 Voice Output**: Avatar speaks the RAG-generated response to user

**This creates a complete end-to-end RAG system that processes documents, retrieves relevant context, generates intelligent responses, and delivers them through the Akool streaming avatar.**
