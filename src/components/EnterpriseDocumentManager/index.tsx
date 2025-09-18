import React, { useState, useEffect, useCallback } from 'react';
import { EnterpriseDocument, enterpriseRAGService, RAGConfig } from '../../services/enterpriseRAGService';
import './styles.css';

interface EnterpriseDocumentManagerProps {
  onDocumentChange?: (documents: EnterpriseDocument[]) => void;
  onConfigChange?: (config: RAGConfig) => void;
  onDocumentUploaded?: () => void;
}

const EnterpriseDocumentManager: React.FC<EnterpriseDocumentManagerProps> = ({
  onDocumentChange,
  onConfigChange,
  onDocumentUploaded
}) => {
  const [documents, setDocuments] = useState<EnterpriseDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<RAGConfig>(enterpriseRAGService.getConfig());
  const [stats, setStats] = useState(enterpriseRAGService.getStats());
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredDocuments, setFilteredDocuments] = useState<EnterpriseDocument[]>([]);
  const [showChatTest, setShowChatTest] = useState(false);
  const [chatTestQuery, setChatTestQuery] = useState('');
  const [chatTestResponse, setChatTestResponse] = useState('');
  const [isTestingChat, setIsTestingChat] = useState(false);

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
    loadStats();
  }, []);

  // Update filtered documents when search query or documents change
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredDocuments(documents);
    } else {
      const filtered = documents.filter(doc =>
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.metadata.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.metadata.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.metadata.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredDocuments(filtered);
    }
  }, [searchQuery, documents]);

  const loadDocuments = useCallback(() => {
    const docs = enterpriseRAGService.getDocuments();
    setDocuments(docs);
    onDocumentChange?.(docs);
  }, [onDocumentChange]);

  const loadStats = useCallback(() => {
    const currentStats = enterpriseRAGService.getStats();
    setStats(currentStats);
  }, []);

  const testChatResponse = useCallback(async () => {
    if (!chatTestQuery.trim()) return;
    
    setIsTestingChat(true);
    setChatTestResponse('');
    
    try {
      console.log('🧪 Testing RAG chat response for:', chatTestQuery);
      const response = await enterpriseRAGService.generateRAGResponse(chatTestQuery);
      setChatTestResponse(response.answer);
      console.log('✅ RAG chat test response:', response);
    } catch (error) {
      console.error('❌ RAG chat test error:', error);
      setChatTestResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTestingChat(false);
    }
  }, [chatTestQuery]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const uploadPromises: Promise<void>[] = [];

    for (const file of Array.from(files)) {
      const uploadPromise = uploadDocument(file);
      uploadPromises.push(uploadPromise);
    }

    try {
      await Promise.all(uploadPromises);
      loadDocuments();
      loadStats();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Some documents failed to upload. Please check the console for details.');
    } finally {
      setIsUploading(false);
      setUploadProgress({});
      // Reset file input
      event.target.value = '';
    }
  };

  const uploadDocument = async (file: File): Promise<void> => {
    const fileId = `${file.name}_${Date.now()}`;
    
    try {
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const current = prev[fileId] || 0;
          if (current < 90) {
            return { ...prev, [fileId]: current + 10 };
          }
          return prev;
        });
      }, 200);

      // Extract metadata from filename or user input
      const metadata = extractMetadataFromFilename(file.name);
      
      await enterpriseRAGService.addDocument(file, metadata);
      
      clearInterval(progressInterval);
      setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
      
      // Notify parent component about successful upload
      if (onDocumentUploaded) {
        onDocumentUploaded();
      }
      
      // Remove progress after a delay
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
      }, 1000);
      
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error);
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[fileId];
        return newProgress;
      });
      throw error;
    }
  };

  const extractMetadataFromFilename = (filename: string) => {
    // Simple metadata extraction from filename
    // In production, you might have a more sophisticated system
    const parts = filename.toLowerCase().split(/[._-]/);
    
    return {
      department: parts.find(part => 
        ['hr', 'finance', 'engineering', 'marketing', 'sales', 'legal'].includes(part)
      ),
      category: parts.find(part => 
        ['policy', 'procedure', 'manual', 'guide', 'report', 'contract'].includes(part)
      ),
      tags: parts.filter(part => part.length > 2 && part.length < 20),
      confidentiality: filename.toLowerCase().includes('confidential') ? 'confidential' as const : 'internal' as const
    };
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      const success = enterpriseRAGService.removeDocument(documentId);
      if (success) {
        loadDocuments();
        loadStats();
        setSelectedDocuments(prev => {
          const newSet = new Set(prev);
          newSet.delete(documentId);
          return newSet;
        });
      }
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedDocuments.size === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedDocuments.size} selected documents?`)) {
      for (const docId of selectedDocuments) {
        enterpriseRAGService.removeDocument(docId);
      }
      loadDocuments();
      loadStats();
      setSelectedDocuments(new Set());
    }
  };

  const handleSelectDocument = (documentId: string) => {
    setSelectedDocuments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(documentId)) {
        newSet.delete(documentId);
      } else {
        newSet.add(documentId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedDocuments.size === filteredDocuments.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(filteredDocuments.map(doc => doc.id)));
    }
  };

  const handleConfigChange = (field: keyof RAGConfig, value: any) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    enterpriseRAGService.updateConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusIcon = (status: EnterpriseDocument['status']) => {
    switch (status) {
      case 'processing': return '⏳';
      case 'ready': return '✅';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  const getConfidentialityColor = (confidentiality: string) => {
    switch (confidentiality) {
      case 'public': return '#28a745';
      case 'internal': return '#ffc107';
      case 'confidential': return '#dc3545';
      default: return '#6c757d';
    }
  };

  return (
    <div className="enterprise-document-manager">
      <div className="document-manager-header">
        <h3>📚 Enterprise Knowledge Base</h3>
        <div className="header-actions">
          <button
            className="config-btn"
            onClick={() => setShowConfig(!showConfig)}
            title="Configuration"
          >
            ⚙️
          </button>
          <div className="stats-summary">
            <span className="stat-item">
              📄 {stats.documentCount} docs
            </span>
            <span className="stat-item">
              🧩 {stats.totalChunks} chunks
            </span>
            <span className="stat-item">
              💾 {formatFileSize(stats.totalSize)}
            </span>
          </div>
        </div>
      </div>

      {showConfig && (
        <div className="config-panel">
          <h4>RAG Configuration</h4>
          <div className="config-grid">
            <div className="config-item">
              <label>Max Chunks</label>
              <input
                type="number"
                value={config.maxChunks}
                onChange={(e) => handleConfigChange('maxChunks', parseInt(e.target.value))}
                min="1"
                max="20"
              />
            </div>
            <div className="config-item">
              <label>Similarity Threshold</label>
              <input
                type="number"
                value={config.similarityThreshold}
                onChange={(e) => handleConfigChange('similarityThreshold', parseFloat(e.target.value))}
                min="0"
                max="1"
                step="0.1"
              />
            </div>
            <div className="config-item">
              <label>Cache Expiry (minutes)</label>
              <input
                type="number"
                value={config.cacheExpiry}
                onChange={(e) => handleConfigChange('cacheExpiry', parseInt(e.target.value))}
                min="5"
                max="1440"
              />
            </div>
            <div className="config-item">
              <label>Max Tokens</label>
              <input
                type="number"
                value={config.maxTokens}
                onChange={(e) => handleConfigChange('maxTokens', parseInt(e.target.value))}
                min="100"
                max="4000"
              />
            </div>
            <div className="config-item">
              <label>Temperature</label>
              <input
                type="number"
                value={config.temperature}
                onChange={(e) => handleConfigChange('temperature', parseFloat(e.target.value))}
                min="0"
                max="2"
                step="0.1"
              />
            </div>
            <div className="config-item">
              <label>
                <input
                  type="checkbox"
                  checked={config.enableCaching}
                  onChange={(e) => handleConfigChange('enableCaching', e.target.checked)}
                />
                Enable Caching
              </label>
            </div>
            <div className="config-item">
              <label>
                <input
                  type="checkbox"
                  checked={config.enableAnalytics}
                  onChange={(e) => handleConfigChange('enableAnalytics', e.target.checked)}
                />
                Enable Analytics
              </label>
            </div>
          </div>
        </div>
      )}

      {/* RAG Chat Test Section */}
      <div className="rag-chat-test-section">
        <div className="chat-test-header">
          <h4>🧪 RAG Chat Test</h4>
          <button
            className="toggle-chat-test-btn"
            onClick={() => setShowChatTest(!showChatTest)}
          >
            {showChatTest ? '🔼 Hide' : '🔽 Show'} Chat Test
          </button>
        </div>
        
        {showChatTest && (
          <div className="chat-test-panel">
            <div className="chat-test-input">
              <input
                type="text"
                placeholder="Ask a question about your documents..."
                value={chatTestQuery}
                onChange={(e) => setChatTestQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && testChatResponse()}
                disabled={isTestingChat}
              />
              <button
                onClick={testChatResponse}
                disabled={isTestingChat || !chatTestQuery.trim()}
                className="test-chat-btn"
              >
                {isTestingChat ? '⏳ Testing...' : '🚀 Test'}
              </button>
            </div>
            
            {chatTestResponse && (
              <div className="chat-test-response">
                <h5>RAG Response:</h5>
                <div className="response-content">
                  {chatTestResponse}
                </div>
              </div>
            )}
            
            <div className="chat-test-examples">
              <h6>Try these example questions:</h6>
              <div className="example-questions">
                <button onClick={() => setChatTestQuery('What is this document about?')}>
                  What is this document about?
                </button>
                <button onClick={() => setChatTestQuery('What information does this document contain?')}>
                  What information does this document contain?
                </button>
                <button onClick={() => setChatTestQuery('What are the main topics in this document?')}>
                  What are the main topics in this document?
                </button>
                <button onClick={() => setChatTestQuery('How can I use this document?')}>
                  How can I use this document?
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="document-actions">
        <div className="upload-section">
          <input
            type="file"
            multiple
            accept=".txt,.md,.pdf,.docx,.html"
            onChange={handleFileUpload}
            disabled={isUploading}
            id="document-upload"
            style={{ display: 'none' }}
          />
          <label htmlFor="document-upload" className="upload-btn">
            {isUploading ? '⏳ Uploading...' : '📤 Upload Documents'}
          </label>
        </div>

        <div className="search-section">
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        {selectedDocuments.size > 0 && (
          <div className="bulk-actions">
            <span className="selected-count">
              {selectedDocuments.size} selected
            </span>
            <button
              className="delete-selected-btn"
              onClick={handleDeleteSelected}
            >
              🗑️ Delete Selected
            </button>
          </div>
        )}
      </div>

      <div className="documents-list">
        <div className="list-header">
          <div className="select-all">
            <input
              type="checkbox"
              checked={filteredDocuments.length > 0 && selectedDocuments.size === filteredDocuments.length}
              onChange={handleSelectAll}
            />
            <span>Select All</span>
          </div>
          <div className="list-stats">
            Showing {filteredDocuments.length} of {documents.length} documents
          </div>
        </div>

        {filteredDocuments.length === 0 ? (
          <div className="empty-state">
            {documents.length === 0 ? (
              <>
                <div className="empty-icon">📚</div>
                <h4>No documents uploaded</h4>
                <p>Upload your first document to start building your knowledge base</p>
              </>
            ) : (
              <>
                <div className="empty-icon">🔍</div>
                <h4>No documents found</h4>
                <p>Try adjusting your search criteria</p>
              </>
            )}
          </div>
        ) : (
          <div className="documents-grid">
            {filteredDocuments.map((document) => (
              <div
                key={document.id}
                className={`document-card ${selectedDocuments.has(document.id) ? 'selected' : ''} ${document.status}`}
              >
                <div className="document-header">
                  <input
                    type="checkbox"
                    checked={selectedDocuments.has(document.id)}
                    onChange={() => handleSelectDocument(document.id)}
                  />
                  <div className="document-info">
                    <h5 className="document-name" title={document.name}>
                      {document.name}
                    </h5>
                    <div className="document-meta">
                      <span className="status">
                        {getStatusIcon(document.status)}
                        {document.status}
                      </span>
                      <span className="file-type">{document.type.toUpperCase()}</span>
                      <span className="file-size">{formatFileSize(document.size)}</span>
                    </div>
                  </div>
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteDocument(document.id)}
                    title="Delete document"
                  >
                    🗑️
                  </button>
                </div>

                <div className="document-details">
                  <div className="metadata">
                    {document.metadata.department && (
                      <span className="metadata-item">
                        🏢 {document.metadata.department}
                      </span>
                    )}
                    {document.metadata.category && (
                      <span className="metadata-item">
                        📁 {document.metadata.category}
                      </span>
                    )}
                    <span 
                      className="metadata-item confidentiality"
                      style={{ color: getConfidentialityColor(document.metadata.confidentiality || 'internal') }}
                    >
                      🔒 {document.metadata.confidentiality || 'internal'}
                    </span>
                  </div>

                  <div className="document-stats">
                    <span>📄 {document.chunks.length} chunks</span>
                    <span>📅 {formatDate(document.uploadDate)}</span>
                  </div>

                  {document.metadata.tags && document.metadata.tags.length > 0 && (
                    <div className="tags">
                      {document.metadata.tags.slice(0, 3).map((tag, index) => (
                        <span key={index} className="tag">
                          #{tag}
                        </span>
                      ))}
                      {document.metadata.tags.length > 3 && (
                        <span className="tag-more">
                          +{document.metadata.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {document.status === 'error' && document.processingError && (
                    <div className="error-message">
                      ❌ {document.processingError}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {Object.keys(uploadProgress).length > 0 && (
        <div className="upload-progress">
          <h4>Upload Progress</h4>
          {Object.entries(uploadProgress).map(([fileId, progress]) => (
            <div key={fileId} className="progress-item">
              <span className="progress-filename">{fileId}</span>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="progress-percentage">{progress}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EnterpriseDocumentManager;
