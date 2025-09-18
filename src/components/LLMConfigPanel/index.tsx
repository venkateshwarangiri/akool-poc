import React, { useState, useEffect } from 'react';
import { LLMConfig } from '../../services/llmService';
import { useLLMIntegration } from '../../hooks/useLLMIntegration';
import './styles.css';

interface LLMConfigPanelProps {
  onConfigChange?: (config: LLMConfig | null) => void;
}

const LLMConfigPanel: React.FC<LLMConfigPanelProps> = ({ onConfigChange }) => {
  const { state, enableLLM, disableLLM, updateConfig, testConnection, clearError } = useLLMIntegration();
  
  const [config, setConfig] = useState<LLMConfig>({
    endpoint: '***REMOVED***openai/deployments/gpt-4o/chat/completions?api-version=2024-05-01-preview',
    apiKey: '***REMOVED***',
    model: 'gpt-4o',
    maxTokens: 1000,
    temperature: 0.7,
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  });

  const [isTesting, setIsTesting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update parent component when config changes
  useEffect(() => {
    onConfigChange?.(state.isEnabled ? state.config : null);
  }, [state.isEnabled, state.config, onConfigChange]);

  const handleEnableLLM = async () => {
    if (!config.endpoint.trim()) {
      alert('Please enter an LLM service endpoint');
      return;
    }

    try {
      await enableLLM(config);
    } catch (error) {
      console.error('Failed to enable LLM:', error);
    }
  };

  const handleDisableLLM = () => {
    disableLLM();
  };

  const handleTestConnection = async () => {
    if (!state.isEnabled) {
      alert('Please enable LLM service first');
      return;
    }

    setIsTesting(true);
    try {
      const isConnected = await testConnection();
      if (isConnected) {
        alert('✅ LLM service connection test successful!');
      } else {
        alert('❌ LLM service connection test failed');
      }
    } catch (error) {
      alert(`❌ Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleConfigChange = (field: keyof LLMConfig, value: string | number) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    updateConfig({ [field]: value });
  };

  const loadPreset = (preset: 'openai' | 'anthropic' | 'azure-openai' | 'custom') => {
    switch (preset) {
      case 'openai':
        setConfig(prev => ({
          ...prev,
          endpoint: 'https://api.openai.com/v1/chat/completions',
          model: 'gpt-3.5-turbo',
          maxTokens: 1000,
          temperature: 0.7,
        }));
        break;
      case 'anthropic':
        setConfig(prev => ({
          ...prev,
          endpoint: 'https://api.anthropic.com/v1/messages',
          model: 'claude-3-sonnet-20240229',
          maxTokens: 1000,
          temperature: 0.7,
        }));
        break;
      case 'azure-openai':
        setConfig(prev => ({
          ...prev,
          endpoint: '***REMOVED***openai/deployments/gpt-4o/chat/completions?api-version=2024-05-01-preview',
          apiKey: '***REMOVED***',
          model: 'gpt-4o',
          maxTokens: 1000,
          temperature: 0.7,
        }));
        break;
      case 'custom':
        setConfig(prev => ({
          ...prev,
          endpoint: '',
          model: '',
          maxTokens: 1000,
          temperature: 0.7,
        }));
        break;
    }
  };

  return (
    <div className="llm-config-panel">
      <div className="llm-config-header">
        <h3>🤖 LLM Integration</h3>
        <div className="llm-status">
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

      <div className="llm-config-content">
        <div className="config-section">
          <label htmlFor="endpoint">LLM Service Endpoint *</label>
          <input
            id="endpoint"
            type="url"
            value={config.endpoint}
            onChange={(e) => handleConfigChange('endpoint', e.target.value)}
            placeholder="https://api.openai.com/v1/chat/completions"
            disabled={state.isEnabled}
          />
        </div>

        <div className="config-section">
          <label htmlFor="apiKey">API Key</label>
          <input
            id="apiKey"
            type="password"
            value={config.apiKey || ''}
            onChange={(e) => handleConfigChange('apiKey', e.target.value)}
            placeholder="Enter your API key"
            disabled={state.isEnabled}
          />
        </div>

        <div className="config-section">
          <label htmlFor="model">Model</label>
          <input
            id="model"
            type="text"
            value={config.model || ''}
            onChange={(e) => handleConfigChange('model', e.target.value)}
            placeholder="gpt-3.5-turbo, claude-3-sonnet, etc."
            disabled={state.isEnabled}
          />
        </div>

        <div className="preset-buttons">
          <button onClick={() => loadPreset('openai')} disabled={state.isEnabled}>
            OpenAI
          </button>
          <button onClick={() => loadPreset('azure-openai')} disabled={state.isEnabled}>
            Azure OpenAI
          </button>
          <button onClick={() => loadPreset('anthropic')} disabled={state.isEnabled}>
            Anthropic
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
              <label htmlFor="maxTokens">Max Tokens</label>
              <input
                id="maxTokens"
                type="number"
                value={config.maxTokens || 1000}
                onChange={(e) => handleConfigChange('maxTokens', parseInt(e.target.value) || 1000)}
                min="1"
                max="4000"
                disabled={state.isEnabled}
              />
            </div>

            <div className="config-section">
              <label htmlFor="temperature">Temperature</label>
              <input
                id="temperature"
                type="number"
                value={config.temperature || 0.7}
                onChange={(e) => handleConfigChange('temperature', parseFloat(e.target.value) || 0.7)}
                min="0"
                max="2"
                step="0.1"
                disabled={state.isEnabled}
              />
            </div>

            <div className="config-section">
              <label htmlFor="timeout">Timeout (ms)</label>
              <input
                id="timeout"
                type="number"
                value={config.timeout || 30000}
                onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value) || 30000)}
                min="5000"
                max="120000"
                step="1000"
                disabled={state.isEnabled}
              />
            </div>

            <div className="config-section">
              <label htmlFor="retryAttempts">Retry Attempts</label>
              <input
                id="retryAttempts"
                type="number"
                value={config.retryAttempts || 3}
                onChange={(e) => handleConfigChange('retryAttempts', parseInt(e.target.value) || 3)}
                min="0"
                max="10"
                disabled={state.isEnabled}
              />
            </div>
          </div>
        )}

        <div className="llm-actions">
          {!state.isEnabled ? (
            <button
              className="enable-btn"
              onClick={handleEnableLLM}
              disabled={!config.endpoint.trim() || state.isProcessing}
            >
              {state.isProcessing ? 'Enabling...' : 'Enable LLM'}
            </button>
          ) : (
            <>
              <button
                className="test-btn"
                onClick={handleTestConnection}
                disabled={isTesting}
              >
                {isTesting ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                className="disable-btn"
                onClick={handleDisableLLM}
                disabled={state.isProcessing}
              >
                Disable LLM
              </button>
            </>
          )}
        </div>

        {state.lastResponse && (
          <div className="last-response">
            <h4>Last LLM Response:</h4>
            <div className="response-content">
              <p><strong>Answer:</strong> {state.lastResponse.answer}</p>
              {state.lastResponse.metadata && (
                <div className="response-metadata">
                  <p><strong>Processing Time:</strong> {state.lastResponse.metadata.processing_time}ms</p>
                  {state.lastResponse.metadata.model && (
                    <p><strong>Model:</strong> {state.lastResponse.metadata.model}</p>
                  )}
                  {state.lastResponse.metadata.tokens_used && (
                    <p><strong>Tokens Used:</strong> {state.lastResponse.metadata.tokens_used}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LLMConfigPanel;
