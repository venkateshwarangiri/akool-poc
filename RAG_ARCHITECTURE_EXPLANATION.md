# 🏗️ RAG Architecture with Akool Streaming Avatar

## 📋 **Overview: How RAG Works Here**

The RAG (Retrieval-Augmented Generation) system in this Akool streaming avatar application is **directly integrated** into the frontend application, **NOT using external backend endpoints**. It's a **client-side RAG implementation** that processes documents locally and connects to external AI services for embeddings and LLM responses.

---

## 🏗️ **Architecture Overview**

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT-SIDE RAG SYSTEM                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐ │
│  │   Document      │    │   Embedding     │    │   LLM        │ │
│  │   Processing    │    │   Service       │    │   Service    │ │
│  │   (Local)       │    │   (External)    │    │   (External) │ │
│  └─────────────────┘    └─────────────────┘    └──────────────┘ │
│           │                       │                       │      │
│           ▼                       ▼                       ▼      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              RAG Processing Pipeline                        │ │
│  │  • Document Chunking  • Vector Search  • Response Gen     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Akool Avatar Integration                       │ │
│  │  • Voice Message Interception  • Response Streaming        │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 **Core Components**

### **1. Document Processing (Client-Side)**
```typescript
// Location: src/services/enterpriseRAGService.ts
class EnterpriseRAGService {
  // ✅ PDF processing using PDF.js (browser-compatible)
  private async extractTextFromFile(file: File): Promise<string>
  
  // ✅ Document chunking and storage (in-memory)
  private splitTextIntoChunks(text: string): string[]
  
  // ✅ Local document management
  private documents: Map<string, EnterpriseDocument> = new Map()
}
```

### **2. Embedding Service (External API)**
```typescript
// Uses Azure OpenAI or OpenAI for embeddings
private async generateEmbedding(text: string): Promise<number[]> {
  // Azure OpenAI endpoint:
  // ***REMOVED***openai/deployments/text-embedding-3-large/embeddings
  
  // OR OpenAI endpoint:
  // https://api.openai.com/v1/embeddings
}
```

### **3. LLM Service (External API)**
```typescript
// Uses Azure OpenAI or OpenAI for response generation
class LLMService {
  // Azure OpenAI endpoint:
  // ***REMOVED***openai/deployments/gpt-4o/chat/completions
  
  // OR OpenAI endpoint:
  // https://api.openai.com/v1/chat/completions
}
```

### **4. Akool Avatar Integration**
```typescript
// Location: src/hooks/useStreaming.ts
// Intercepts voice messages and routes through RAG
if (from === 'user') {
  // Process through RAG system
  await sendMessageWithRAG(client, text, userId, sessionId);
  return; // Block original message
}
```

---

## 🔄 **Complete Data Flow**

### **Step 1: Document Upload**
```
User uploads PDF → PDF.js extracts text → Document chunked → Embeddings generated → Stored in memory
```

### **Step 2: User Query (Voice/Chat)**
```
User asks question → Voice message intercepted → Query embedding generated → Semantic search → Context retrieved
```

### **Step 3: Response Generation**
```
Context + Query → LLM service → Response generated → Cleaned and formatted → Sent to avatar
```

### **Step 4: Avatar Response**
```
Avatar receives response → Speaks the answer → User hears RAG-generated response
```

---

## 🌐 **External Service Connections**

### **✅ Azure OpenAI Integration**
```bash
# Environment Variables Used:
VITE_AZURE_OPENAI_KEY=***REMOVED***
VITE_AZURE_OPENAI_ENDPOINT=***REMOVED***
VITE_AZURE_GPT4O_DEPLOYMENT=gpt-4o
VITE_AZURE_EMBEDDING_DEPLOYMENT=text-embedding-3-large
VITE_AZURE_API_VERSION=2024-05-01-preview
```

### **✅ Akool API Integration**
```bash
# Environment Variables Used:
VITE_OPENAPI_HOST=https://openapi.akool.com
VITE_OPENAPI_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **✅ Optional: Chroma Cloud (Alternative Vector Store)**
```bash
# Environment Variables Used:
VITE_CHROMA_API_KEY=ck-D3ctzwSTiYLQjjwe15EkEiLBjKzzRg5J8QgVzzrqFQw5
VITE_CHROMA_TENANT=cdf95420-77eb-4b06-a3a2-15eb8db79166
VITE_CHROMA_DATABASE=akooldb
VITE_CHROMA_COLLECTION_NAME=enterprise_documents
```

---

## 🎯 **Key Features**

### **✅ Client-Side Processing**
- **No backend required** - Everything runs in the browser
- **Document processing** using PDF.js (browser-compatible)
- **In-memory storage** of documents and embeddings
- **Real-time processing** without server round-trips

### **✅ External AI Services**
- **Azure OpenAI** for embeddings and LLM responses
- **Fallback to OpenAI** if Azure is not configured
- **Akool API** for avatar streaming and voice processing

### **✅ Voice Integration**
- **Voice message interception** - RAG processes voice input
- **Response streaming** - Avatar speaks RAG-generated answers
- **Message blocking** - Prevents original voice message from reaching avatar

### **✅ Document Support**
- **PDF processing** with PDF.js
- **Text extraction** and chunking
- **Embedding generation** for semantic search
- **Fallback handling** for processing errors

---

## 🔧 **Configuration Options**

### **RAG Configuration**
```typescript
interface RAGConfig {
  maxChunks: number;           // Max chunks to retrieve (default: 5)
  similarityThreshold: number; // Min similarity score (default: 0.05)
  enableCaching: boolean;      // Enable response caching (default: true)
  cacheExpiry: number;         // Cache expiry in minutes (default: 60)
  maxTokens: number;           // Max tokens in response (default: 2000)
  temperature: number;         // LLM temperature (default: 0.3)
}
```

### **Avatar Mode Configuration**
```typescript
// Mode 1 (Repeat) - Avatar repeats received text (RAG responses)
// Mode 2 (Dialogue) - Avatar generates responses (LLM responses)
VITE_MODE_TYPE=1  // Default to Repeat mode for RAG
```

---

## 🚀 **Deployment Architecture**

### **✅ Frontend-Only Deployment**
```
┌─────────────────────────────────────────────────────────────────┐
│                    Vercel/Netlify/GitHub Pages                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              React Application                              │ │
│  │  • RAG Processing  • Document Management  • Voice Handling │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Services                            │
│  • Azure OpenAI (Embeddings + LLM)  • Akool API (Avatar)      │
└─────────────────────────────────────────────────────────────────┘
```

### **✅ No Backend Required**
- **Static hosting** - Can be deployed to any static hosting service
- **Client-side processing** - All RAG logic runs in the browser
- **External APIs only** - Only connects to Azure OpenAI and Akool APIs

---

## 🎯 **Advantages of This Architecture**

### **✅ Simplicity**
- **No backend maintenance** - Everything runs in the browser
- **Easy deployment** - Just deploy the React app
- **No server costs** - Only pay for external API usage

### **✅ Performance**
- **Fast processing** - No server round-trips for document processing
- **Real-time responses** - Direct integration with avatar streaming
- **Efficient caching** - In-memory caching of embeddings and responses

### **✅ Scalability**
- **Client-side scaling** - Each user has their own processing
- **API-based scaling** - External services handle the heavy lifting
- **Flexible configuration** - Easy to switch between different AI providers

---

## 🔍 **Summary**

**The RAG system in this Akool streaming avatar application is:**

1. **✅ Directly Integrated** - No external backend endpoints
2. **✅ Client-Side Processing** - Runs entirely in the browser
3. **✅ External AI Services** - Uses Azure OpenAI/OpenAI for embeddings and LLM
4. **✅ Akool Integration** - Seamlessly integrated with Akool avatar streaming
5. **✅ Voice-Enabled** - Processes voice input and generates voice responses
6. **✅ Document-Ready** - Handles PDF uploads and text processing
7. **✅ Production-Ready** - Can be deployed as a static application

**This architecture provides a complete RAG solution without requiring any backend infrastructure, making it easy to deploy and maintain while providing powerful document-based question answering capabilities through the Akool streaming avatar.**
