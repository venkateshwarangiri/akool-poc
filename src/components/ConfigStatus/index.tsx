import React from 'react';
import { getAzureConfig } from '../../config/azureConfig';

interface ConfigStatusProps {
  onRetry?: () => void;
}

export const ConfigStatus: React.FC<ConfigStatusProps> = ({ onRetry }) => {
  const config = getAzureConfig();
  const hasAzureKey = !!config.apiKey && config.apiKey !== 'YOUR_AZURE_OPENAI_KEY_HERE';
  const hasAzureEndpoint = !!config.endpoint && config.endpoint !== 'https://your-resource.openai.azure.com/';
  const isConfigured = hasAzureKey && hasAzureEndpoint;

  // Debug logging
  console.log('ConfigStatus Debug:', {
    hasAzureKey,
    hasAzureEndpoint,
    isConfigured,
    keyValue: import.meta.env.VITE_AZURE_OPENAI_KEY,
    endpointValue: import.meta.env.VITE_AZURE_OPENAI_ENDPOINT,
    mode: import.meta.env.MODE,
    prod: import.meta.env.PROD
  });

  if (isConfigured) {
    return null; // Don't show anything if properly configured
  }

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: '#fff3cd',
      border: '1px solid #ffeaa7',
      borderRadius: '8px',
      padding: '16px',
      maxWidth: '400px',
      zIndex: 1000,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ 
          fontSize: '20px', 
          marginRight: '8px' 
        }}>⚠️</span>
        <strong style={{ color: '#856404' }}>Configuration Required</strong>
      </div>
      
      <div style={{ color: '#856404', fontSize: '14px', marginBottom: '12px' }}>
        <p style={{ margin: '0 0 8px 0' }}>
          LLM and embedding services are not configured. Please set the following environment variables:
        </p>
        <ul style={{ margin: '0', paddingLeft: '20px' }}>
          {!hasAzureKey && <li>VITE_AZURE_OPENAI_KEY</li>}
          {!hasAzureEndpoint && <li>VITE_AZURE_OPENAI_ENDPOINT</li>}
        </ul>
      </div>

      <div style={{ fontSize: '12px', color: '#6c757d' }}>
        <p style={{ margin: '0 0 8px 0' }}>
          <strong>For Azure Static Web Apps:</strong>
        </p>
        <ol style={{ margin: '0', paddingLeft: '20px' }}>
          <li>Go to Azure Portal → Your Static Web App</li>
          <li>Configuration → Application settings</li>
          <li>Add the missing environment variables</li>
          <li>Save and wait for restart</li>
        </ol>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginTop: '12px',
            padding: '8px 16px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
};

export default ConfigStatus;
