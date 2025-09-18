# Chroma Cloud Setup Guide

## 🚀 Quick Setup

### 1. Create Environment File

Create `.env.development.local` in your project root:

```bash
# Akool Configuration (REQUIRED)
VITE_OPENAPI_HOST=https://openapi.akool.com
VITE_OPENAPI_TOKEN=your_access_token_here
VITE_SERVER_BASE=/streaming/avatar

# Chroma Cloud Configuration (REQUIRED for RAG)
VITE_CHROMA_API_KEY=ck-D3ctzwSTiYLQjjwe15EkEiLBjKzzRg5J8QgVzzrqFQw5
VITE_CHROMA_TENANT=cdf95420-77eb-4b06-a3a2-15eb8db79166
VITE_CHROMA_DATABASE=akooldb
VITE_CHROMA_COLLECTION_NAME=enterprise_documents

# LLM Configuration (OPTIONAL - for RAG)
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Analytics (OPTIONAL)
VITE_ANALYTICS_ENABLED=true
VITE_AUDIT_LOGGING=true
```

### 2. Your Chroma Cloud Configuration

Your current Chroma Cloud setup is perfect:

```typescript
const client = new CloudClient({
  apiKey: 'ck-D3ctzwSTiYLQjjwe15EkEiLBjKzzRg5J8QgVzzrqFQw5',
  tenant: 'cdf95420-77eb-4b06-a3a2-15eb8db79166',
  database: 'akooldb'
});
```

## 🔧 What You Need to Add

### Required APIs & URLs:

1. **Akool API Token** (REQUIRED)
   - Get from: https://openapi.akool.com/api/open/v3/getToken
   - Replace `your_access_token_here` in `.env.development.local`

2. **OpenAI API Key** (REQUIRED for embeddings)
   - Get from: https://platform.openai.com/api-keys
   - Replace `your_openai_api_key_here` in `.env.development.local`

3. **Chroma Cloud** (ALREADY CONFIGURED ✅)
   - Your API key: `ck-D3ctzwSTiYLQjjwe15EkEiLBjKzzRg5J8QgVzzrqFQw5`
   - Your tenant: `cdf95420-77eb-4b06-a3a2-15eb8db79166`
   - Your database: `akooldb`

## 🧪 Test Your Setup

### Test Chroma Connection:
```bash
# In your browser console or test file
import { chromaRAGService } from './src/services/chromaRAGService';

// Test connection
const isConnected = await chromaRAGService.testConnection();
console.log('Chroma connected:', isConnected);
```

### Test Document Upload:
```javascript
// Upload a test document
const file = new File(['This is a test document'], 'test.txt', { type: 'text/plain' });
const document = await chromaRAGService.addDocument(file, {
  department: 'IT',
  confidentiality: 'internal'
});
console.log('Document uploaded:', document);
```

### Test Search:
```javascript
// Search for documents
const results = await chromaRAGService.searchDocuments('test document');
console.log('Search results:', results);
```

## 📊 Performance Benefits

| Feature | Before (In-Memory) | After (Chroma Cloud) |
|---------|-------------------|---------------------|
| **Storage** | Browser memory only | Persistent cloud storage |
| **Search Speed** | O(n) linear scan | O(log n) vector search |
| **Scalability** | ~50 documents max | 1M+ documents |
| **Persistence** | Lost on refresh | Permanent storage |
| **Filtering** | Basic | Advanced metadata filtering |
| **Concurrent Access** | Single user | Multi-user support |

## 🔍 What's Different Now

### Before (In-Memory):
```typescript
// Stored in browser memory
private embeddings: Map<string, number[]> = new Map();

// Linear search through all chunks
for (const chunk of document.chunks) {
  const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);
  // Check every single chunk!
}
```

### After (Chroma Cloud):
```typescript
// Stored in Chroma Cloud
await this.collection.add({
  ids: chunkIds,
  embeddings: embeddings,
  documents: documents,
  metadatas: metadatas
});

// Vector search with filtering
const results = await this.collection.query({
  queryEmbeddings: [queryEmbedding],
  nResults: this.config.maxChunks,
  where: { department: { $in: ['HR', 'IT'] } }
});
```

## 🚀 Next Steps

1. **Create your `.env.development.local` file** with the configuration above
2. **Get your Akool API token** from the Akool dashboard
3. **Get your OpenAI API key** for embeddings
4. **Test the connection** using the test code above
5. **Upload some documents** and try the RAG functionality

## 🆘 Troubleshooting

### Common Issues:

1. **"Chroma initialization failed"**
   - Check your API key and tenant ID
   - Ensure your Chroma Cloud account is active

2. **"Embedding API error"**
   - Check your OpenAI API key
   - Ensure you have credits in your OpenAI account

3. **"Document upload failed"**
   - Check file size (should be < 10MB)
   - Ensure file type is supported (txt, md, html)

### Debug Mode:
```javascript
// Enable debug logging
chromaRAGService.updateConfig({
  enableAnalytics: true,
  enableAuditLog: true
});
```

Your Chroma Cloud setup is perfect! You just need to add the Akool and OpenAI API keys to make everything work.
