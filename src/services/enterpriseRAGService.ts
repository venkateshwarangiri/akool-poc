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
      // Always use API proxy (with azure override from current LLM config)
      const llmCfg = this.llmService?.getConfig() as any;
      const response = await fetch('/api/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          input: text,
          azure: {
            apiKey: llmCfg?.apiKey,
            endpoint: llmCfg?.endpoint,
            apiVersion: llmCfg?.apiVersion ?? '2024-05-01-preview',
            deployment: llmCfg?.embeddingDeployment ?? 'text-embedding-3-large'
          }
        }),
      });
      if (!response.ok) {
        throw new Error(`Embedding API proxy error: ${response.status}`);
      }
      return (await response.json()).data[0].embedding;
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

  // Expose current config for hooks/components
  public getConfig(): RAGConfig {
    return this.config;
  }

  // Expose basic stats for UI/auto-enable logic
  public getStats(): { documentCount: number; totalChunks: number } {
    let totalChunks = 0;
    for (const [, doc] of this.documents) {
      totalChunks += doc.chunks.length;
    }
    return {
      documentCount: this.documents.size,
      totalChunks
    };
  }

  // Allow hooks to verify LLM service availability
  public getLLMService(): LLMService | null {
    return this.llmService;
  }

  private createEnhancedPrompt(query: string, context: string): string {
    return `You are an expert assistant. Answer SHORT and SWEET (2-3 sentences max).
Use only the provided context. If unsure, say you don’t know.

User question:
${query}

Context:
${context}`;
  }

  // Placeholder for other methods like classifyQuery, assessResponseQuality, etc.
  // These would typically be defined elsewhere or are not provided in the original file.
  // For the purpose of this edit, we'll assume they exist or are placeholders.
  private classifyQuery(query: string): string {
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('who') || lowerQuery.includes('what') || lowerQuery.includes('when') || lowerQuery.includes('where') || lowerQuery.includes('why')) {
      return 'question';
    }
    if (lowerQuery.includes('tell me') || lowerQuery.includes('explain') || lowerQuery.includes('describe') || lowerQuery.includes('show me')) {
      return 'information_request';
    }
    if (lowerQuery.includes('do you know') || lowerQuery.includes('can you tell me') || lowerQuery.includes('do you have') || lowerQuery.includes('have you')) {
      return 'information_request';
    }
    return 'general_query';
  }

  private assessResponseQuality(confidence: number, sourceCount: number): 'high' | 'medium' | 'low' {
    if (confidence > 0.8) {
      return 'high';
    }
    if (confidence > 0.5) {
      return 'medium';
    }
    return 'low';
  }

  private logAnalytics(eventType: 'query' | 'document_upload' | 'document_delete' | 'error', details: Record<string, any>): void {
    const event: AnalyticsEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      eventType,
      details,
    };
    this.analytics.push(event);
    console.log('🔄 Analytics Event:', event);
  }

  private getFileType(fileName: string): 'pdf' | 'docx' | 'txt' | 'html' | 'md' {
    const lowerCaseFileName = fileName.toLowerCase();
    if (lowerCaseFileName.endsWith('.pdf')) {
      return 'pdf';
    }
    if (lowerCaseFileName.endsWith('.docx') || lowerCaseFileName.endsWith('.doc')) {
      return 'docx';
    }
    if (lowerCaseFileName.endsWith('.txt')) {
      return 'txt';
    }
    if (lowerCaseFileName.endsWith('.html')) {
      return 'html';
    }
    if (lowerCaseFileName.endsWith('.md')) {
      return 'md';
    }
    return 'txt'; // Default to txt if file type is unknown
  }

  private async extractTextFromFile(file: File): Promise<string> {
    if (file.type === 'application/pdf') {
      return this.extractTextFromPDF(file);
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type === 'application/msword') {
      return this.extractTextFromDOCX(file);
    } else if (file.type === 'text/plain') {
      return this.extractTextFromTXT(file);
    } else if (file.type === 'text/html') {
      return this.extractTextFromHTML(file);
    } else if (file.type === 'text/markdown') {
      return this.extractTextFromMD(file);
    } else {
      throw new Error(`Unsupported file type: ${file.type}`);
    }
  }

  private async extractTextFromPDF(file: File): Promise<string> {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    return new Promise((resolve, reject) => {
      reader.onload = async (event) => {
        if (event.target?.result) {
          try {
            const pdf = await pdfjsLib.getDocument(event.target.result).promise;
            let text = '';
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              text += content.items.map(item => item.str).join(' ');
            }
            resolve(text);
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error('Failed to read PDF file'));
        }
      };
      reader.onerror = (error) => {
        reject(error);
      };
    });
  }

  private async extractTextFromDOCX(file: File): Promise<string> {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    return new Promise((resolve, reject) => {
      reader.onload = async (event) => {
        if (event.target?.result) {
          try {
            const doc = await docx.load(event.target.result);
            const text = doc.getText();
            resolve(text);
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error('Failed to read DOCX file'));
        }
      };
      reader.onerror = (error) => {
        reject(error);
      };
    });
  }

  private async extractTextFromTXT(file: File): Promise<string> {
    const reader = new FileReader();
    reader.readAsText(file);
    return new Promise((resolve, reject) => {
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string);
        } else {
          reject(new Error('Failed to read TXT file'));
        }
      };
      reader.onerror = (error) => {
        reject(error);
      };
    });
  }

  private async extractTextFromHTML(file: File): Promise<string> {
    const reader = new FileReader();
    reader.readAsText(file);
    return new Promise((resolve, reject) => {
      reader.onload = (event) => {
        if (event.target?.result) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(event.target.result as string, 'text/html');
          const text = doc.body.textContent || '';
          resolve(text);
        } else {
          reject(new Error('Failed to read HTML file'));
        }
      };
      reader.onerror = (error) => {
        reject(error);
      };
    });
  }

  private async extractTextFromMD(file: File): Promise<string> {
    const reader = new FileReader();
    reader.readAsText(file);
    return new Promise((resolve, reject) => {
      reader.onload = (event) => {
        if (event.target?.result) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(event.target.result as string, 'text/html');
          const text = doc.body.textContent || '';
          resolve(text);
        } else {
          reject(new Error('Failed to read MD file'));
        }
      };
      reader.onerror = (error) => {
        reject(error);
      };
    });
  }

  private estimateTokens(text: string): number {
    // Simple token estimation (approximate)
    // This is a very rough estimate and might need a proper tokenizer for accurate counts
    return Math.ceil(text.length / 4); // Average word length is 4 characters
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }
}

// Singleton instance for backward-compatible imports
export const enterpriseRAGService = new EnterpriseRAGService();