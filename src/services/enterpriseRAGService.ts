// Enterprise-Ready RAG Service for Streaming Avatar
// Features: Document processing, vector embeddings, semantic search, caching, analytics

import { LLMService } from './llmService';

export interface EnterpriseDocument {
  id: string;
  name: string;
  content: string;
  type: 'pdf' | 'docx' | 'txt' | 'html' | 'md';
  size: number;
  uploadDate: Date;
  lastModified: Date;
  metadata: {
    author?: string;
    department?: string;
    category?: string;
    tags?: string[];
    version?: string;
    confidentiality?: 'public' | 'internal' | 'confidential';
  };
  chunks: DocumentChunk[];
  status: 'processing' | 'ready' | 'error';
  processingError?: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  embedding: number[];
  metadata: {
    chunkIndex: number;
    startChar: number;
    endChar: number;
    pageNumber?: number;
    section?: string;
    confidence: number;
  };
  tokens: number;
}

export interface SearchResult {
  chunk: DocumentChunk;
  document: EnterpriseDocument;
  similarity: number;
  relevanceScore: number;
  context: string;
}

export interface RAGResponse {
  answer: string;
  sources: SearchResult[];
  confidence: number;
  metadata: {
    totalChunks: number;
    searchTime: number;
    processingTime: number;
    tokensUsed: number;
    model: string;
    cacheHit: boolean;
  };
  analytics: {
    queryType: string;
    documentTypes: string[];
    departments: string[];
    responseQuality: 'high' | 'medium' | 'low';
  };
}

export interface RAGConfig {
  maxChunks: number;
  similarityThreshold: number;
  enableCaching: boolean;
  cacheExpiry: number; // minutes
  enableAnalytics: boolean;
  enableAuditLog: boolean;
  maxTokens: number;
  temperature: number;
}

export interface AnalyticsEvent {
  id: string;
  timestamp: Date;
  eventType: 'query' | 'document_upload' | 'document_delete' | 'error';
  userId?: string;
  sessionId?: string;
  details: Record<string, any>;
}

export class EnterpriseRAGService {
  private documents: Map<string, EnterpriseDocument> = new Map();
  private embeddings: Map<string, number[]> = new Map();
  private cache: Map<string, { response: RAGResponse; timestamp: Date }> = new Map();
  private analytics: AnalyticsEvent[] = [];
  private llmService: LLMService | null = null;
  private config: RAGConfig;
  // private isProcessing = false; // Removed unused variable

  constructor(config: Partial<RAGConfig> = {}) {
    this.config = {
      maxChunks: 5,
      similarityThreshold: 0.05, // Much lower threshold for better document matching
      enableCaching: true,
      cacheExpiry: 60, // 1 hour
      enableAnalytics: true,
      enableAuditLog: true,
      maxTokens: 2000,
      temperature: 0.3,
      ...config
    };
  }

  // Initialize with LLM service
  setLLMService(llmService: LLMService): void {
    this.llmService = llmService;
  }

  // Document processing with enterprise features
  async addDocument(
    file: File, 
    metadata: Partial<EnterpriseDocument['metadata']> = {}
  ): Promise<EnterpriseDocument> {
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // this.isProcessing = true; // Removed unused property
      
      const document: EnterpriseDocument = {
        id: documentId,
        name: file.name,
        content: '',
        type: this.getFileType(file.name),
        size: file.size,
        uploadDate: new Date(),
        lastModified: new Date(),
        metadata: {
          confidentiality: 'internal',
          ...metadata
        },
        chunks: [],
        status: 'processing'
      };

      this.documents.set(documentId, document);
      this.logAnalytics('document_upload', { documentId, fileName: file.name, size: file.size });

      // Process document content
      const content = await this.extractTextFromFile(file);
      document.content = content;

      // Create chunks with embeddings
      const chunks = await this.createChunks(document, content);
      document.chunks = chunks;

      // Generate embeddings for each chunk
      for (const chunk of chunks) {
        const embedding = await this.generateEmbedding(chunk.content);
        chunk.embedding = embedding;
        this.embeddings.set(chunk.id, embedding);
      }

      document.status = 'ready';
      this.logAnalytics('document_upload', { documentId, status: 'success', chunks: chunks.length });

      return document;
    } catch (error) {
      const document = this.documents.get(documentId);
      if (document) {
        document.status = 'error';
        document.processingError = error instanceof Error ? error.message : 'Unknown error';
      }
      
      this.logAnalytics('error', { 
        documentId, 
        error: error instanceof Error ? error.message : 'Unknown error',
        operation: 'document_processing'
      });
      
      throw error;
    } finally {
      // this.isProcessing = false; // Removed unused property
    }
  }

  // Advanced chunking with semantic boundaries
  private async createChunks(document: EnterpriseDocument, content: string): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    const chunkSize = 1000;
    const overlap = 200;
    
    // Try to split by sections first
    const sections = this.splitBySections(content);
    
    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
      const section = sections[sectionIndex];
      
      if (section.length <= chunkSize) {
        // Section fits in one chunk
        const chunk = this.createChunk(document.id, section, sectionIndex, 0, section.length);
        chunks.push(chunk);
      } else {
        // Split section into smaller chunks
        const sectionChunks = this.splitTextIntoChunks(section, chunkSize, overlap);
        
        for (let chunkIndex = 0; chunkIndex < sectionChunks.length; chunkIndex++) {
          const chunkContent = sectionChunks[chunkIndex];
          const startChar = content.indexOf(chunkContent);
          const chunk = this.createChunk(
            document.id, 
            chunkContent, 
            sectionIndex, 
            startChar, 
            startChar + chunkContent.length,
            `Section ${sectionIndex + 1}`
          );
          chunks.push(chunk);
        }
      }
    }
    
    return chunks;
  }

  private createChunk(
    documentId: string, 
    content: string, 
    chunkIndex: number, 
    startChar: number, 
    endChar: number,
    section?: string
  ): DocumentChunk {
    return {
      id: `${documentId}_chunk_${chunkIndex}`,
      documentId,
      content: content.trim(),
      embedding: [], // Will be filled later
      metadata: {
        chunkIndex,
        startChar,
        endChar,
        section,
        confidence: 1.0
      },
      tokens: this.estimateTokens(content)
    };
  }

  // Split content by sections (headers, paragraphs, etc.)
  private splitBySections(content: string): string[] {
    // Split by double newlines, headers, or other semantic boundaries
    const sections = content
      .split(/\n\s*\n|#{1,6}\s+/)
      .map(section => section.trim())
      .filter(section => section.length > 50);
    
    return sections.length > 0 ? sections : [content];
  }

  // Split text into overlapping chunks
  private splitTextIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let start = 0;
    
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      let chunk = text.slice(start, end);
      
      // Try to break at sentence boundaries
      if (end < text.length) {
        const lastSentence = chunk.lastIndexOf('.');
        const lastNewline = chunk.lastIndexOf('\n');
        const breakPoint = Math.max(lastSentence, lastNewline);
        
        if (breakPoint > start + chunkSize * 0.5) {
          chunk = chunk.slice(0, breakPoint + 1);
        }
      }
      
      chunks.push(chunk);
      start = end - overlap;
    }
    
    return chunks.filter(chunk => chunk.length > 50);
  }

  // Generate embeddings using OpenAI or other embedding service
  private async generateEmbedding(text: string): Promise<number[]> {
    if (!this.llmService) {
      // Fallback to simple embedding if no LLM service
      return this.generateSimpleEmbedding(text);
    }

    try {
      // Check if we have Azure OpenAI configuration (same as ChromaRAGService)
      const azureKey = import.meta.env.VITE_AZURE_OPENAI_KEY || '***REMOVED***';
      const azureEndpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT || '***REMOVED***';
      const azureEmbeddingDeployment = import.meta.env.VITE_AZURE_EMBEDDING_DEPLOYMENT || 'text-embedding-3-large';
      const azureApiVersion = import.meta.env.VITE_AZURE_API_VERSION || '2024-05-01-preview';

      if (azureKey && azureEndpoint) {
        // Use Azure OpenAI embeddings
        // Ensure endpoint doesn't end with slash to avoid double slashes
        const baseEndpoint = azureEndpoint.endsWith('/') ? azureEndpoint.slice(0, -1) : azureEndpoint;
        
        const response = await fetch(
          `${baseEndpoint}/openai/deployments/${azureEmbeddingDeployment}/embeddings?api-version=${azureApiVersion}`,
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

        if (!response.ok) {
          throw new Error(`Azure OpenAI Embedding API error: ${response.status}`);
        }

        const data = await response.json();
        return data.data[0].embedding;
      } else {
        // Fallback to direct OpenAI
        const config = this.llmService.getConfig();
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: text,
            model: 'text-embedding-ada-002'
          })
        });

        if (!response.ok) {
          throw new Error(`OpenAI Embedding API error: ${response.status}`);
        }

        const data = await response.json();
        return data.data[0].embedding;
      }
    } catch (error) {
      console.warn('Failed to generate embedding, using fallback:', error);
      return this.generateSimpleEmbedding(text);
    }
  }

  // Fallback simple embedding
  private generateSimpleEmbedding(text: string): number[] {
    const words = text.toLowerCase().split(/\s+/);
    const wordCounts = new Map<string, number>();
    
    words.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });
    
    const allWords = Array.from(new Set(words));
    const embedding = new Array(384).fill(0); // OpenAI embedding dimension
    
    allWords.forEach((word, index) => {
      if (index < 384) {
        embedding[index] = wordCounts.get(word) || 0;
      }
    });
    
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
  }

  // Advanced semantic search with ranking
  async searchDocuments(
    query: string, 
    filters: {
      documentTypes?: string[];
      departments?: string[];
      confidentiality?: string[];
      dateRange?: { start: Date; end: Date };
    } = {}
  ): Promise<SearchResult[]> {
    const startTime = Date.now();
    
    console.log('🔍 Search Documents Debug:', {
      query,
      documentCount: this.documents.size,
      filters
    });
    
    if (this.documents.size === 0) {
      console.log('❌ No documents available for search');
      return [];
    }

    const queryEmbedding = await this.generateEmbedding(query);
    console.log('🔍 Query embedding generated:', {
      embeddingLength: queryEmbedding.length,
      embeddingPreview: queryEmbedding.slice(0, 5)
    });
    
    const results: SearchResult[] = [];

    // Search through all chunks with filtering
    for (const [, document] of this.documents) {
      // Apply document-level filters
      if (filters.documentTypes && !filters.documentTypes.includes(document.type)) {
        continue;
      }
      
      if (filters.departments && document.metadata.department && 
          !filters.departments.includes(document.metadata.department)) {
        continue;
      }
      
      if (filters.confidentiality && document.metadata.confidentiality && 
          !filters.confidentiality.includes(document.metadata.confidentiality)) {
        continue;
      }
      
      if (filters.dateRange && 
          (document.uploadDate < filters.dateRange.start || 
           document.uploadDate > filters.dateRange.end)) {
        continue;
      }

      // Search chunks
      console.log(`🔍 Searching document: ${document.name}, chunks: ${document.chunks.length}`);
      for (const chunk of document.chunks) {
        console.log(`🔍 Chunk ${chunk.id}:`, {
          hasEmbedding: chunk.embedding.length > 0,
          embeddingLength: chunk.embedding.length,
          contentPreview: chunk.content.substring(0, 100) + '...'
        });
        
        if (chunk.embedding.length > 0) {
          const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);
          console.log(`🔍 Chunk ${chunk.id} similarity:`, {
            similarity,
            threshold: this.config.similarityThreshold,
            passesThreshold: similarity >= this.config.similarityThreshold
          });
          
          if (similarity >= this.config.similarityThreshold) {
            const relevanceScore = this.calculateRelevanceScore(query, chunk.content, similarity);
            
            results.push({
              chunk,
              document,
              similarity,
              relevanceScore,
              context: this.extractContext(chunk.content, query)
            });
          }
        }
      }
    }

    // Sort by relevance score and return top results
    const sortedResults = results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, this.config.maxChunks);

    console.log('🔍 Search Results:', {
      totalResults: results.length,
      finalResults: sortedResults.length,
      maxChunks: this.config.maxChunks,
      similarityThreshold: this.config.similarityThreshold,
      results: sortedResults.map(r => ({
        document: r.document.name,
        similarity: r.similarity,
        relevanceScore: r.relevanceScore,
        contentPreview: r.chunk.content.substring(0, 100) + '...'
      }))
    });

    this.logAnalytics('query', {
      query,
      resultsCount: sortedResults.length,
      searchTime: Date.now() - startTime,
      filters
    });

    return sortedResults;
  }

  // Calculate relevance score combining similarity and other factors
  private calculateRelevanceScore(query: string, content: string, similarity: number): number {
    let score = similarity;
    
    // Boost score for exact keyword matches
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();
    const keywordMatches = queryWords.filter(word => contentLower.includes(word)).length;
    score += (keywordMatches / queryWords.length) * 0.2;
    
    // Boost score for recent documents
    // This would be implemented based on document age
    
    return Math.min(score, 1.0);
  }

  // Extract relevant context around the match
  private extractContext(content: string, query: string, contextLength: number = 200): string {
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();
    
    // Find the best match position
    let bestPosition = 0;
    let maxMatches = 0;
    
    for (let i = 0; i < content.length - contextLength; i += 50) {
      const snippet = contentLower.slice(i, i + contextLength);
      const matches = queryWords.filter(word => snippet.includes(word)).length;
      
      if (matches > maxMatches) {
        maxMatches = matches;
        bestPosition = i;
      }
    }
    
    const start = Math.max(0, bestPosition - contextLength / 2);
    const end = Math.min(content.length, start + contextLength);
    
    return content.slice(start, end);
  }

  // Generate RAG response with enterprise features
  async generateRAGResponse(
    query: string,
    userId?: string,
    sessionId?: string
  ): Promise<RAGResponse> {
    const startTime = Date.now();
    
    // Check cache first
    const cacheKey = this.generateCacheKey(query);
    if (this.config.enableCaching) {
      const cached = this.cache.get(cacheKey);
      if (cached && this.isCacheValid(cached.timestamp)) {
        this.logAnalytics('query', { query, cacheHit: true, userId, sessionId });
        return {
          ...cached.response,
          metadata: { ...cached.response.metadata, cacheHit: true }
        };
      }
    }

    if (!this.llmService) {
      throw new Error('LLM service not configured');
    }

    // Search for relevant documents
    const searchResults = await this.searchDocuments(query);
    
    if (searchResults.length === 0) {
      const response: RAGResponse = {
        answer: "I don't have any relevant information in my knowledge base to answer that question. Please try rephrasing your question or contact support for assistance.",
        sources: [],
        confidence: 0,
        metadata: {
          totalChunks: 0,
          searchTime: Date.now() - startTime,
          processingTime: 0,
          tokensUsed: 0,
          model: this.llmService.getConfig().model || 'unknown',
          cacheHit: false
        },
        analytics: {
          queryType: this.classifyQuery(query),
          documentTypes: [],
          departments: [],
          responseQuality: 'low'
        }
      };
      
      this.logAnalytics('query', { query, noResults: true, userId, sessionId });
      return response;
    }

    // Build context from search results
    const context = this.buildContext(searchResults);
    const confidence = this.calculateConfidence(searchResults);

      // Create enhanced prompt
      const enhancedPrompt = this.createEnhancedPrompt(query, context);

    try {
      // Generate response using LLM
      const llmResponse = await this.llmService.processWithLLM({
        question: enhancedPrompt,
        context: context,
        metadata: {
          rag_enabled: true,
          source_documents: searchResults.map(r => r.document.name),
          chunk_count: searchResults.length,
          confidence: confidence
        }
      });

      const response: RAGResponse = {
        answer: llmResponse.answer,
        sources: searchResults,
        confidence: confidence,
        metadata: {
          totalChunks: searchResults.length,
          searchTime: Date.now() - startTime,
          processingTime: llmResponse.metadata?.processing_time || 0,
          tokensUsed: llmResponse.metadata?.tokens_used || 0,
          model: llmResponse.metadata?.model || 'unknown',
          cacheHit: false
        },
        analytics: {
          queryType: this.classifyQuery(query),
          documentTypes: [...new Set(searchResults.map(r => r.document.type))],
          departments: [...new Set(searchResults.map(r => r.document.metadata.department).filter(Boolean) as string[])],
          responseQuality: this.assessResponseQuality(confidence, searchResults.length)
        }
      };

      // Cache the response
      if (this.config.enableCaching) {
        this.cache.set(cacheKey, { response, timestamp: new Date() });
      }

      this.logAnalytics('query', { 
        query, 
        success: true, 
        confidence, 
        sources: searchResults.length,
        userId, 
        sessionId 
      });

      return response;
    } catch (error) {
      this.logAnalytics('error', { 
        query, 
        error: error instanceof Error ? error.message : 'Unknown error',
        operation: 'rag_response_generation',
        userId, 
        sessionId 
      });
      throw error;
    }
  }

  // Helper methods
  private generateCacheKey(query: string): string {
    // Use encodeURIComponent to handle Unicode characters properly
    const normalizedQuery = query.toLowerCase().trim();
    return `rag_${encodeURIComponent(normalizedQuery).replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  private isCacheValid(timestamp: Date): boolean {
    const expiryTime = this.config.cacheExpiry * 60 * 1000; // Convert to milliseconds
    return Date.now() - timestamp.getTime() < expiryTime;
  }

  private buildContext(searchResults: SearchResult[]): string {
    return searchResults
      .map((result, index) => 
        `[Source ${index + 1} from "${result.document.name}" (${result.document.metadata.department || 'Unknown Department'})]:\n${result.context}\n`
      )
      .join('\n');
  }

  private calculateConfidence(searchResults: SearchResult[]): number {
    if (searchResults.length === 0) return 0;
    
    const avgSimilarity = searchResults.reduce((sum, r) => sum + r.similarity, 0) / searchResults.length;
    const sourceCount = Math.min(searchResults.length / this.config.maxChunks, 1);
    
    return (avgSimilarity * 0.7 + sourceCount * 0.3);
  }

  private createEnhancedPrompt(query: string, context: string): string {
    return `You are a helpful AI assistant with access to document information. Provide SHORT and SWEET informative answers using the available information.

DOCUMENT INFORMATION AVAILABLE:
${context}

USER QUESTION: ${query}

INSTRUCTIONS:
1. Provide SHORT and SWEET informative answers using the available document information
2. Be concise but helpful - give key information without unnecessary details
3. Keep responses focused and to the point - avoid lengthy explanations
4. Give clear, concise answers that address the user's question directly
5. Use conversational, natural language that flows well
6. Include key details, names, and specific information from the documents
7. Only use the fallback response "I don't have information about this in my knowledge base" if the question is completely unrelated to documents, files, or any information that could reasonably be found in documents
8. For document-related questions, provide concise and informative responses with key examples
9. Keep responses to 2-3 sentences maximum while still being helpful

EXAMPLES OF CONCISE RESPONSES:
- "What are Maya's skills?" → "Maya specializes in climate risk assessment, climate finance, and renewable energy policy. She has extensive experience with World Bank and Green Climate Fund projects."
- "What is this document about?" → Brief explanation of document purpose and key topics
- "Tell me about Maya" → Short explanation of what information is available about Maya
- "What can you tell me about this file?" → Concise file information and capabilities
- "What information do you have?" → Brief summary of available document information

ONLY use fallback for completely unrelated questions like:
- "What's the weather today?"
- "How do I cook pasta?"
- "What's 2+2?"

Answer with concise information from the documents:`;
  }

  private classifyQuery(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('how to') || lowerQuery.includes('how do')) return 'how_to';
    if (lowerQuery.includes('what is') || lowerQuery.includes('what are')) return 'definition';
    if (lowerQuery.includes('why')) return 'explanation';
    if (lowerQuery.includes('when')) return 'temporal';
    if (lowerQuery.includes('where')) return 'location';
    if (lowerQuery.includes('who')) return 'person';
    return 'general';
  }

  private assessResponseQuality(confidence: number, sourceCount: number): 'high' | 'medium' | 'low' {
    if (confidence > 0.8 && sourceCount >= 2) return 'high';
    if (confidence > 0.6 && sourceCount >= 1) return 'medium';
    return 'low';
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private getFileType(filename: string): EnterpriseDocument['type'] {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf': return 'pdf';
      case 'docx': case 'doc': return 'docx';
      case 'txt': case 'md': return 'txt';
      case 'html': case 'htm': return 'html';
      default: return 'txt';
    }
  }

  private async extractTextFromFile(file: File): Promise<string> {
    const fileType = this.getFileType(file.name);
    
    switch (fileType) {
      case 'txt':
      case 'md':
        return await file.text();
      
      case 'html':
        const htmlText = await file.text();
        return htmlText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      
      case 'pdf':
        try {
          console.log('🔧 Starting PDF processing with browser-based approach');
          
          // Use a simpler approach - try to extract text using browser APIs
          const arrayBuffer = await file.arrayBuffer();
          console.log('📄 PDF file loaded, size:', arrayBuffer.byteLength, 'bytes');
          
          // Try to use PDF.js with minimal configuration
          const pdfjsLib = await import('pdfjs-dist');
          
          // Disable worker completely to avoid CORS issues
          pdfjsLib.GlobalWorkerOptions.workerSrc = null as any;
          
          console.log('📄 Attempting PDF text extraction with main thread processing...');
          
          try {
            const pdf = await pdfjsLib.getDocument({
              data: arrayBuffer,
              useWorkerFetch: false,
              isEvalSupported: false,
              useSystemFonts: false,
              disableAutoFetch: true,
              disableStream: true,
              disableRange: true,
              disableFontFace: true,
              maxImageSize: 512 * 512,
              cMapUrl: '',
              cMapPacked: false,
              verbosity: 0,
              stopAtErrors: false
            }).promise;
            
            console.log('📖 PDF loaded successfully, pages:', pdf.numPages);
            
            let fullText = '';
            
            // Extract text from each page with better error handling
            for (let i = 1; i <= pdf.numPages; i++) {
              try {
                console.log(`📄 Processing page ${i}/${pdf.numPages}`);
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                
                // Extract text more carefully
                const pageText = textContent.items
                  .filter((item: any) => item.str && typeof item.str === 'string')
                  .map((item: any) => item.str.trim())
                  .filter(text => text.length > 0)
                  .join(' ');
                
                if (pageText.trim()) {
                  fullText += `\n--- Page ${i} ---\n${pageText}\n`;
                }
                
                // Small delay to prevent blocking
                await new Promise(resolve => setTimeout(resolve, 10));
                
              } catch (pageError) {
                console.warn(`⚠️ Error processing page ${i}:`, pageError);
                // Continue with other pages
              }
            }
            
            console.log('✅ PDF processing completed successfully, text length:', fullText.length);
            return fullText.trim();
            
          } catch (pdfError) {
            console.warn('⚠️ PDF.js failed, trying alternative approach:', pdfError);
            
            // Try alternative PDF processing approach
            try {
              console.log('📄 Attempting alternative PDF text extraction...');
              
              // Try with different PDF.js configuration
              const pdf2 = await pdfjsLib.getDocument({
                data: arrayBuffer,
                useWorkerFetch: false,
                isEvalSupported: false,
                useSystemFonts: false,
                disableAutoFetch: true,
                disableStream: true,
                disableRange: true,
                disableFontFace: true,
                maxImageSize: 256 * 256,
                cMapUrl: '',
                cMapPacked: false,
                verbosity: 0,
                stopAtErrors: true
              }).promise;
              
              console.log('📖 Alternative PDF loading successful, pages:', pdf2.numPages);
              
              let altText = '';
              for (let i = 1; i <= Math.min(pdf2.numPages, 5); i++) { // Limit to first 5 pages
                try {
                  const page = await pdf2.getPage(i);
                  const textContent = await page.getTextContent();
                  const pageText = textContent.items
                    .filter((item: any) => item.str && typeof item.str === 'string')
                    .map((item: any) => item.str.trim())
                    .filter(text => text.length > 0)
                    .join(' ');
                  
                  if (pageText.trim()) {
                    altText += `\n--- Page ${i} ---\n${pageText}\n`;
                  }
                } catch (pageError) {
                  console.warn(`⚠️ Error in alternative processing page ${i}:`, pageError);
                }
              }
              
              if (altText.trim()) {
                console.log('✅ Alternative PDF processing successful, text length:', altText.length);
                return altText.trim();
              }
              
            } catch (altError) {
              console.warn('⚠️ Alternative PDF processing also failed:', altError);
            }
            
            // Final fallback: Create informative placeholder
            const fileName = file.name || 'PDF Document';
            const fileSize = (arrayBuffer.byteLength / 1024).toFixed(1);
            
            const fallbackText = `
              DOCUMENT INFORMATION:
              
              Document Details:
              - Document Name: ${fileName}
              - File Type: PDF Document
              - File Size: ${fileSize} KB
              - Processing Status: Uploaded but text extraction failed
              - Note: This document was uploaded but the text content could not be extracted due to technical limitations
              
              Available Information:
              - Document metadata and file details
              - File size and processing status
              - Document type and format information
              
              Limitations:
              - Text content extraction failed
              - Only basic file information is available
              - RAG responses will be limited to file metadata
              
              The document has been uploaded to the system but text extraction encountered issues. You can still ask questions about the document file itself, but detailed content analysis is not available.
            `;
            
            console.log('📄 PDF fallback text generated for:', fileName);
            return fallbackText.trim();
          }
          
        } catch (error) {
          console.error('PDF processing error:', error);
          throw new Error('PDF processing failed. Please try converting to text or Word format for best results.');
        }
      
      case 'docx':
        try {
          const mammoth = await import('mammoth');
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          return result.value;
        } catch (error) {
          console.error('DOCX processing error:', error);
          throw new Error('Failed to process DOCX file. Please try converting to text first.');
        }
      
      default:
        try {
          return await file.text();
        } catch {
          throw new Error(`Unsupported file type: ${fileType}`);
        }
    }
  }

  private logAnalytics(eventType: AnalyticsEvent['eventType'], details: Record<string, any>): void {
    if (!this.config.enableAnalytics) return;
    
    const event: AnalyticsEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      eventType,
      details
    };
    
    this.analytics.push(event);
    
    // Keep only last 1000 events to prevent memory issues
    if (this.analytics.length > 1000) {
      this.analytics = this.analytics.slice(-1000);
    }
  }

  // Public API methods
  getDocuments(): EnterpriseDocument[] {
    return Array.from(this.documents.values());
  }

  getDocument(id: string): EnterpriseDocument | undefined {
    return this.documents.get(id);
  }

  removeDocument(id: string): boolean {
    const document = this.documents.get(id);
    if (document) {
      // Remove embeddings
      document.chunks.forEach(chunk => {
        this.embeddings.delete(chunk.id);
      });
      
      this.documents.delete(id);
      this.logAnalytics('document_delete', { documentId: id });
      return true;
    }
    return false;
  }

  clearAllDocuments(): void {
    this.documents.clear();
    this.embeddings.clear();
    this.cache.clear();
    this.logAnalytics('document_delete', { all: true });
  }

  getStats(): {
    documentCount: number;
    totalChunks: number;
    totalSize: number;
    cacheSize: number;
    analyticsEvents: number;
  } {
    let totalChunks = 0;
    let totalSize = 0;
    
    for (const document of this.documents.values()) {
      totalChunks += document.chunks.length;
      totalSize += document.size;
    }
    
    return {
      documentCount: this.documents.size,
      totalChunks,
      totalSize,
      cacheSize: this.cache.size,
      analyticsEvents: this.analytics.length
    };
  }

  getAnalytics(): AnalyticsEvent[] {
    return [...this.analytics];
  }

  updateConfig(newConfig: Partial<RAGConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): RAGConfig {
    return { ...this.config };
  }

  getLLMService(): LLMService | null {
    return this.llmService;
  }
}

// Singleton instance
export const enterpriseRAGService = new EnterpriseRAGService();
