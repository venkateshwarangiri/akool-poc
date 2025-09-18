import React, { useState, useEffect } from 'react';
import { ApiService, Knowledge, KnowledgeCreateRequest, KnowledgeUpdateRequest } from '../../apiService';
import { FileUploadService } from '../../services/fileUploadService';
import { testKnowledgeAPI } from '../../utils/testApi';
import './styles.css';

interface AdminPanelProps {
  api: ApiService | null;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ api }) => {
  const [knowledgeBases, setKnowledgeBases] = useState<Knowledge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchName, setSearchName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingKnowledge, setEditingKnowledge] = useState<Knowledge | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<KnowledgeCreateRequest>({
    name: '',
    prologue: '',
    prompt: '',
    docs: [],
    urls: []
  });

  const [newUrl, setNewUrl] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  useEffect(() => {
    if (api) {
      loadKnowledgeBases();
    }
  }, [api, currentPage, searchName]);

  // Debug: Log knowledgeBases state changes
  useEffect(() => {
    console.log('Knowledge bases state updated:', knowledgeBases);
  }, [knowledgeBases]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      formData.docs?.forEach(doc => {
        if (doc.url.startsWith('blob:')) {
          FileUploadService.revokeUrl(doc.url);
        }
      });
    };
  }, []);

  const loadKnowledgeBases = async () => {
    if (!api) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await api.getKnowledgeList(currentPage, 10, searchName || undefined);
      console.log('Knowledge list response:', response);
      console.log('Knowledge bases array:', response.knowledge_list);
      setKnowledgeBases(response.knowledge_list || []);
      setTotalPages(Math.ceil((response.total || 0) / 10));
    } catch (err) {
      console.error('Error loading knowledge bases:', err);
      setError(err instanceof Error ? err.message : 'Failed to load knowledge bases');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!api) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      // Upload files and get URLs
      let docs = formData.docs || [];
      if (uploadedFiles.length > 0) {
        const uploadedDocs = await FileUploadService.uploadFiles(uploadedFiles);
        docs = [...docs, ...uploadedDocs];
      }

      const dataToSend = {
        ...formData,
        docs: docs,
        urls: formData.urls?.filter(url => url.trim() !== '')
      };

      console.log('Creating knowledge base with data:', dataToSend);
      const createdKnowledge = await api.createKnowledge(dataToSend);
      console.log('Created knowledge base:', createdKnowledge);
      
      setSuccess(`Knowledge base created successfully! ID: ${createdKnowledge._id}`);
      setShowCreateForm(false);
      resetForm();
      loadKnowledgeBases();
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      console.error('Error creating knowledge base:', err);
      setError(err instanceof Error ? err.message : 'Failed to create knowledge base');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!api || !editingKnowledge) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      // Upload new files and get URLs
      let docs = formData.docs || [];
      if (uploadedFiles.length > 0) {
        const uploadedDocs = await FileUploadService.uploadFiles(uploadedFiles);
        docs = [...docs, ...uploadedDocs];
      }

      const dataToSend: KnowledgeUpdateRequest = {
        id: editingKnowledge._id,
        ...formData,
        docs: docs,
        urls: formData.urls?.filter(url => url.trim() !== '')
      };

      await api.updateKnowledge(dataToSend);
      setSuccess('Knowledge base updated successfully!');
      setEditingKnowledge(null);
      resetForm();
      loadKnowledgeBases();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update knowledge base');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!api) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.deleteKnowledge(id);
      setSuccess('Knowledge base deleted successfully!');
      setDeleteConfirm(null);
      loadKnowledgeBases();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete knowledge base');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      prologue: '',
      prompt: '',
      docs: [],
      urls: []
    });
    setNewUrl('');
    setUploadedFiles([]);
  };

  const startEdit = (knowledge: Knowledge) => {
    setEditingKnowledge(knowledge);
    setFormData({
      name: knowledge.name || '',
      prologue: knowledge.prologue || '',
      prompt: knowledge.prompt || '',
      docs: knowledge.docs || [],
      urls: knowledge.urls || []
    });
    setUploadedFiles([]);
  };

  const addUrl = () => {
    if (newUrl.trim()) {
      setFormData(prev => ({
        ...prev,
        urls: [...(prev.urls || []), newUrl.trim()]
      }));
      setNewUrl('');
    }
  };

  const removeUrl = (index: number) => {
    setFormData(prev => ({
      ...prev,
      urls: prev.urls?.filter((_, i) => i !== index) || []
    }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleTestAPI = async () => {
    setTesting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const result = await testKnowledgeAPI();
      if (result.success) {
        setSuccess('API test successful! Check console for details.');
        loadKnowledgeBases(); // Refresh the list
      } else {
        setError(`API test failed: ${result.error}`);
      }
    } catch (err) {
      setError(`API test error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setTesting(false);
    }
  };

  if (!api) {
    return (
      <div className="admin-panel">
        <div className="error-message">
          API not initialized. Please check your configuration.
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Knowledge Base Admin</h1>
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={handleTestAPI}
            disabled={testing}
          >
            {testing ? 'Testing...' : 'Test API'}
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateForm(true)}
          >
            Create Knowledge Base
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {success && (
        <div className="success-message">
          {success}
        </div>
      )}

      {/* Search and Filter */}
      <div className="search-section">
        <input
          type="text"
          placeholder="Search by name..."
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          className="search-input"
        />
        <button 
          className="btn btn-secondary"
          onClick={loadKnowledgeBases}
          disabled={loading}
        >
          Search
        </button>
      </div>

      {/* Debug Info */}
      <div style={{ background: '#f8f9fa', padding: '10px', marginBottom: '20px', borderRadius: '5px', fontSize: '12px' }}>
        <strong>Debug Info:</strong> Loading: {loading.toString()}, Count: {knowledgeBases.length}, 
        Data: {JSON.stringify(knowledgeBases.slice(0, 1))}
      </div>

      {/* Knowledge Bases List */}
      <div className="knowledge-list">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : knowledgeBases.length === 0 ? (
          <div className="no-data">No knowledge bases found</div>
        ) : (
          <div className="knowledge-grid">
            {knowledgeBases.map((kb) => (
              <div key={kb._id} className="knowledge-card">
                <div className="knowledge-header">
                  <h3>{kb.name || 'Unnamed Knowledge Base'}</h3>
                  <div className="knowledge-actions">
                    <button 
                      className="btn btn-sm btn-secondary"
                      onClick={() => startEdit(kb)}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => setDeleteConfirm(kb._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                <div className="knowledge-content">
                  {kb.prologue && (
                    <div className="knowledge-field">
                      <strong>Prologue:</strong> {kb.prologue}
                    </div>
                  )}
                  {kb.prompt && (
                    <div className="knowledge-field">
                      <strong>Prompt:</strong> {kb.prompt.substring(0, 100)}...
                    </div>
                  )}
                  {kb.docs && kb.docs.length > 0 && (
                    <div className="knowledge-field">
                      <strong>Documents:</strong> {kb.docs.length} file(s)
                    </div>
                  )}
                  {kb.urls && kb.urls.length > 0 && (
                    <div className="knowledge-field">
                      <strong>URLs:</strong> {kb.urls.length} URL(s)
                    </div>
                  )}
                  <div className="knowledge-meta">
                    <small>Created: {formatDate(kb.create_time)}</small>
                    <small>ID: {kb._id}</small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button 
              className="btn btn-secondary"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading}
            >
              Previous
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button 
              className="btn btn-secondary"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || loading}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateForm || editingKnowledge) && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingKnowledge ? 'Edit Knowledge Base' : 'Create Knowledge Base'}</h2>
              <button 
                className="btn btn-sm btn-secondary"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingKnowledge(null);
                  resetForm();
                }}
              >
                ×
              </button>
            </div>

            <div className="modal-content">
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Knowledge base name"
                  maxLength={100}
                />
              </div>

              <div className="form-group">
                <label>Prologue</label>
                <input
                  type="text"
                  value={formData.prologue || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, prologue: e.target.value }))}
                  placeholder="Opening message/greeting text"
                  maxLength={100}
                />
              </div>

              <div className="form-group">
                <label>Prompt</label>
                <textarea
                  value={formData.prompt || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                  placeholder="AI prompt instructions"
                  maxLength={10000}
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label>URLs</label>
                <div className="url-input-group">
                  <input
                    type="url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="Add URL"
                  />
                  <button 
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={addUrl}
                  >
                    Add
                  </button>
                </div>
                {formData.urls && formData.urls.length > 0 && (
                  <div className="url-list">
                    {formData.urls.map((url, index) => (
                      <div key={index} className="url-item">
                        <span>{url}</span>
                        <button 
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => removeUrl(index)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Documents</label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.md,.json,.xml,.csv"
                  onChange={handleFileUpload}
                />
                {uploadedFiles.length > 0 && (
                  <div className="file-list">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="file-item">
                        <span>{file.name} ({formatFileSize(file.size)})</span>
                        <button 
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => removeFile(index)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingKnowledge(null);
                  resetForm();
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={editingKnowledge ? handleUpdate : handleCreate}
                disabled={loading || !formData.name?.trim()}
              >
                {loading ? 'Saving...' : (editingKnowledge ? 'Update' : 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Confirm Delete</h2>
            </div>
            <div className="modal-content">
              <p>Are you sure you want to delete this knowledge base? This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger"
                onClick={() => handleDelete(deleteConfirm)}
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
