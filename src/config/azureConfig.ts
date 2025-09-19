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

// Try to import local config if it exists
let LOCAL_CONFIG: any = null;
try {
  LOCAL_CONFIG = require('./azureConfig.local').AZURE_CONFIG_LOCAL;
} catch (e) {
  // Local config doesn't exist, use default
}

// Get Azure OpenAI configuration
export function getAzureConfig() {
  // Use local config if available, otherwise use environment variables or default config
  const config = LOCAL_CONFIG || AZURE_CONFIG;
  
  return {
    apiKey: getConfigValue('VITE_AZURE_OPENAI_KEY', config.apiKey),
    endpoint: getConfigValue('VITE_AZURE_OPENAI_ENDPOINT', config.endpoint),
    gpt4oDeployment: getConfigValue('VITE_AZURE_GPT4O_DEPLOYMENT', config.gpt4oDeployment),
    embeddingDeployment: getConfigValue('VITE_AZURE_EMBEDDING_DEPLOYMENT', config.embeddingDeployment),
    apiVersion: getConfigValue('VITE_AZURE_API_VERSION', config.apiVersion)
  };
}
