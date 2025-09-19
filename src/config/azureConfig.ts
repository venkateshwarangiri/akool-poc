// Azure OpenAI Configuration
// Replace these values with your actual Azure OpenAI credentials

export const AZURE_CONFIG = {
  // Your Azure OpenAI API Key
  apiKey: 'YOUR_AZURE_OPENAI_KEY_HERE',
  
  // Your Azure OpenAI Endpoint
  endpoint: 'https://your-resource.openai.azure.com/',
  
  // Deployment names
  gpt4oDeployment: 'gpt-4o',
  embeddingDeployment: 'text-embedding-3-large',
  
  // API version
  apiVersion: '2024-05-01-preview'
};

// Helper function to get environment variable or fallback to config
export function getConfigValue(envVar: string, fallback: string): string {
  return import.meta.env[envVar] || fallback;
}

// Get Azure OpenAI configuration
export function getAzureConfig() {
  return {
    apiKey: getConfigValue('VITE_AZURE_OPENAI_KEY', AZURE_CONFIG.apiKey),
    endpoint: getConfigValue('VITE_AZURE_OPENAI_ENDPOINT', AZURE_CONFIG.endpoint),
    gpt4oDeployment: getConfigValue('VITE_AZURE_GPT4O_DEPLOYMENT', AZURE_CONFIG.gpt4oDeployment),
    embeddingDeployment: getConfigValue('VITE_AZURE_EMBEDDING_DEPLOYMENT', AZURE_CONFIG.embeddingDeployment),
    apiVersion: getConfigValue('VITE_AZURE_API_VERSION', AZURE_CONFIG.apiVersion)
  };
}
