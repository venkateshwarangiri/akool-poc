import React, { useState, useEffect } from 'react';
import { LLMConfig } from '../../services/llmService';
import { useLLMIntegration } from '../../hooks/useLLMIntegration';
import './styles.css';

interface AzureOpenAIConfigProps {
  onConfigChange?: (config: LLMConfig | null) => void;
}

interface AzureOpenAIConfig {
  apiKey: string;
  endpoint: string;
  deployment: string;
  apiVersion: string;
  embeddingDeployment: string;
}

const AzureOpenAIConfig: React.FC<AzureOpenAIConfigProps> = ({ onConfigChange }) => {
  const { state, enableLLM, disableLLM, testConnection, clearError } = useLLMIntegration();
  
  const [azureConfig, setAzureConfig] = useState<AzureOpenAIConfig>({
    apiKey: '***REMOVED***',
    endpoint: '***REMOVED***',
    deployment: 'gpt-4o',
    apiVersion: '2024-05-01-preview',
    embeddingDeployment: 'text-embedding-3-large',
  });

  const [isTesting, setIsTesting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load from environment variables if available
  useEffect(() => {
    const envConfig = {
      apiKey: import.meta.env.VITE_AZURE_OPENAI_KEY || '',
      endpoint: import.meta.env.VITE_AZURE_OPENAI_ENDPOINT || '',
      deployment: import.meta.env.VITE_AZURE_GPT4O_DEPLOYMENT || 'gpt-4o',
      apiVersion: import.meta.env.VITE_AZURE_API_VERSION || '2024-05-01-preview',
      embeddingDeployment: import.meta.env.VITE_AZURE_EMBEDDING_DEPLOYMENT || 'text-embedding-3-large',
    };

    if (envConfig.apiKey && envConfig.endpoint) {
      setAzureConfig(envConfig);
    }
  }, []);

  // Update parent component when config changes
  useEffect(() => {
    if (state.isEnabled) {
      onConfigChange?.(state.config);
    } else {
      onConfigChange?.(null);
    }
  }, [state.isEnabled, state.config, onConfigChange]);

  const handleAzureConfigChange = (field: keyof AzureOpenAIConfig, value: string) => {
    setAzureConfig(prev => ({ ...prev, [field]: value }));
  };

  const buildLLMConfig = (): LLMConfig => {
    // Ensure endpoint doesn't end with slash to avoid double slashes
    const baseEndpoint = azureConfig.endpoint.endsWith('/') 
      ? azureConfig.endpoint.slice(0, -1) 
      : azureConfig.endpoint;
    
    const endpoint = `${baseEndpoint}/openai/deployments/${azureConfig.deployment}/chat/completions?api-version=${azureConfig.apiVersion}`;
    
    return {
      endpoint,
      apiKey: azureConfig.apiKey,
      model: azureConfig.deployment,
      maxTokens: 1000,
      temperature: 0.7,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
    };
  };

  const handleEnableLLM = async () => {
    if (!azureConfig.apiKey.trim()) {
      alert('Please enter your Azure OpenAI API key');
      return;
    }

    if (!azureConfig.endpoint.trim()) {
      alert('Please enter your Azure OpenAI endpoint');
      return;
    }

    try {
      const llmConfig = buildLLMConfig();
      console.log('🔧 Azure OpenAI Config Debug:', {
        azureConfig,
        llmConfig,
        endpoint: llmConfig.endpoint
      });
      await enableLLM(llmConfig);
    } catch (error) {
      console.error('Failed to enable Azure OpenAI:', error);
    }
  };

  const handleDisableLLM = () => {
    disableLLM();
  };

  const handleTestConnection = async () => {
    if (!state.isEnabled) {
      alert('Please enable Azure OpenAI service first');
      return;
    }

    setIsTesting(true);
    try {
      const isConnected = await testConnection();
      if (isConnected) {
        alert('✅ Azure OpenAI connection test successful!');
      } else {
        alert('❌ Azure OpenAI connection test failed');
      }
    } catch (error) {
      alert(`❌ Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const loadPreset = (preset: 'gpt-4o' | 'gpt-35-turbo' | 'custom') => {
    switch (preset) {
      case 'gpt-4o':
        setAzureConfig(prev => ({
          ...prev,
          deployment: 'gpt-4o',
          embeddingDeployment: 'text-embedding-3-large',
        }));
        break;
      case 'gpt-35-turbo':
        setAzureConfig(prev => ({
          ...prev,
          deployment: 'gpt-35-turbo',
          embeddingDeployment: 'text-embedding-ada-002',
        }));
        break;
      case 'custom':
        setAzureConfig(prev => ({
          ...prev,
          deployment: '',
          embeddingDeployment: '',
        }));
        break;
    }
  };

  const isConfigured = azureConfig.apiKey && azureConfig.endpoint;

  return (
    <div className="azure-openai-config">
      <div className="config-header">
        <h3>🔵 Azure OpenAI Configuration</h3>
        <div className="config-status">
          <span className={`status-indicator ${state.isEnabled ? 'enabled' : 'disabled'}`}>
            {state.isEnabled ? '🟢 Enabled' : '🔴 Disabled'}
          </span>
          {state.isProcessing && <span className="processing">⏳ Processing...</span>}
        </div>
      </div>

      {state.error && (
        <div className="error-message">
          <span>❌ {state.error}</span>
          <button onClick={clearError} className="clear-error-btn">✕</button>
        </div>
      )}

      <div className="config-content">
        <div className="config-section">
          <label htmlFor="azure-api-key">Azure OpenAI API Key *</label>
          <input
            id="azure-api-key"
            type="password"
            value={azureConfig.apiKey}
            onChange={(e) => handleAzureConfigChange('apiKey', e.target.value)}
            placeholder="Enter your Azure OpenAI API key"
            disabled={state.isEnabled}
          />
          <small>Get your API key from the Azure OpenAI portal</small>
        </div>

        <div className="config-section">
          <label htmlFor="azure-endpoint">Azure OpenAI Endpoint *</label>
          <input
            id="azure-endpoint"
            type="url"
            value={azureConfig.endpoint}
            onChange={(e) => handleAzureConfigChange('endpoint', e.target.value)}
            placeholder="***REMOVED***"
            disabled={state.isEnabled}
          />
          <small>Your Azure OpenAI resource endpoint URL</small>
        </div>

        <div className="config-section">
          <label htmlFor="azure-deployment">Chat Deployment Name</label>
          <input
            id="azure-deployment"
            type="text"
            value={azureConfig.deployment}
            onChange={(e) => handleAzureConfigChange('deployment', e.target.value)}
            placeholder="gpt-4o"
            disabled={state.isEnabled}
          />
          <small>Name of your chat completion deployment</small>
        </div>

        <div className="config-section">
          <label htmlFor="azure-api-version">API Version</label>
          <input
            id="azure-api-version"
            type="text"
            value={azureConfig.apiVersion}
            onChange={(e) => handleAzureConfigChange('apiVersion', e.target.value)}
            placeholder="2024-05-01-preview"
            disabled={state.isEnabled}
          />
          <small>Azure OpenAI API version</small>
        </div>

        <div className="preset-buttons">
          <button onClick={() => loadPreset('gpt-4o')} disabled={state.isEnabled}>
            GPT-4o
          </button>
          <button onClick={() => loadPreset('gpt-35-turbo')} disabled={state.isEnabled}>
            GPT-3.5 Turbo
          </button>
          <button onClick={() => loadPreset('custom')} disabled={state.isEnabled}>
            Custom
          </button>
        </div>

        <button
          className="toggle-advanced"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? '▼' : '▶'} Advanced Settings
        </button>

        {showAdvanced && (
          <div className="advanced-settings">
            <div className="config-section">
              <label htmlFor="azure-embedding-deployment">Embedding Deployment Name</label>
              <input
                id="azure-embedding-deployment"
                type="text"
                value={azureConfig.embeddingDeployment}
                onChange={(e) => handleAzureConfigChange('embeddingDeployment', e.target.value)}
                placeholder="text-embedding-3-large"
                disabled={state.isEnabled}
              />
              <small>Name of your embedding deployment (for RAG system)</small>
            </div>
          </div>
        )}

        <div className="config-actions">
          {!state.isEnabled ? (
            <button
              className="enable-btn"
              onClick={handleEnableLLM}
              disabled={!isConfigured || state.isProcessing}
            >
              {state.isProcessing ? '⏳ Enabling...' : '🚀 Enable Azure OpenAI'}
            </button>
          ) : (
            <div className="enabled-actions">
              <button
                className="test-btn"
                onClick={handleTestConnection}
                disabled={isTesting}
              >
                {isTesting ? '⏳ Testing...' : '🧪 Test Connection'}
              </button>
              <button
                className="disable-btn"
                onClick={handleDisableLLM}
                disabled={state.isProcessing}
              >
                🔴 Disable
              </button>
            </div>
          )}
        </div>

        {state.isEnabled && (
          <div className="config-info">
            <h4>✅ Azure OpenAI Configuration Active</h4>
            <div className="config-details">
              <p><strong>Endpoint:</strong> {state.config.endpoint}</p>
              <p><strong>Model:</strong> {state.config.model}</p>
              <p><strong>API Key:</strong> {state.config.apiKey ? '••••••••' : 'Not set'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AzureOpenAIConfig;
