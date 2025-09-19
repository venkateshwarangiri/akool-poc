import React from 'react';

export const EnvDebug: React.FC = () => {
  const envVars = {
    VITE_AZURE_OPENAI_KEY: import.meta.env.VITE_AZURE_OPENAI_KEY,
    VITE_AZURE_OPENAI_ENDPOINT: import.meta.env.VITE_AZURE_OPENAI_ENDPOINT,
    VITE_AZURE_GPT4O_DEPLOYMENT: import.meta.env.VITE_AZURE_GPT4O_DEPLOYMENT,
    VITE_AZURE_EMBEDDING_DEPLOYMENT: import.meta.env.VITE_AZURE_EMBEDDING_DEPLOYMENT,
    VITE_AZURE_API_VERSION: import.meta.env.VITE_AZURE_API_VERSION,
  };

  const hasKey = !!envVars.VITE_AZURE_OPENAI_KEY;
  const hasEndpoint = !!envVars.VITE_AZURE_OPENAI_ENDPOINT;
  const isConfigured = hasKey && hasEndpoint;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      background: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '8px',
      padding: '16px',
      maxWidth: '500px',
      zIndex: 1000,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      fontSize: '12px',
      fontFamily: 'monospace'
    }}>
      <div style={{ marginBottom: '12px' }}>
        <strong>🔍 Environment Variables Debug:</strong>
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>Status:</strong> {isConfigured ? '✅ Configured' : '❌ Not Configured'}
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong>Key Present:</strong> {hasKey ? '✅ Yes' : '❌ No'}
        {hasKey && <span style={{ color: '#28a745' }}> (Length: {envVars.VITE_AZURE_OPENAI_KEY?.length})</span>}
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong>Endpoint Present:</strong> {hasEndpoint ? '✅ Yes' : '❌ No'}
        {hasEndpoint && <span style={{ color: '#28a745' }}> ({envVars.VITE_AZURE_OPENAI_ENDPOINT})</span>}
      </div>

      <details style={{ marginTop: '12px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Show All Environment Variables</summary>
        <div style={{ marginTop: '8px', background: '#e9ecef', padding: '8px', borderRadius: '4px' }}>
          {Object.entries(envVars).map(([key, value]) => (
            <div key={key} style={{ marginBottom: '4px' }}>
              <strong>{key}:</strong> {value ? `✅ ${value}` : '❌ undefined'}
            </div>
          ))}
        </div>
      </details>

      <div style={{ marginTop: '12px', fontSize: '11px', color: '#6c757d' }}>
        <strong>Mode:</strong> {import.meta.env.MODE}<br/>
        <strong>Dev:</strong> {import.meta.env.DEV ? 'Yes' : 'No'}<br/>
        <strong>Prod:</strong> {import.meta.env.PROD ? 'Yes' : 'No'}
      </div>
    </div>
  );
};

export default EnvDebug;
