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

// Optional local override for development only (do not require at build time)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
let AZURE_CONFIG_LOCAL: typeof AZURE_CONFIG | undefined;
try {
  // Use eval to avoid static analysis bundling this import in CI
  // eslint-disable-next-line no-eval
  const mod = eval('undefined');
  AZURE_CONFIG_LOCAL = (mod as any)?.AZURE_CONFIG_LOCAL;
} catch {}

// Get Azure OpenAI configuration
export function getAzureConfig() {
  // Use local config if available, otherwise use default config
  const config = AZURE_CONFIG_LOCAL || AZURE_CONFIG;
  
  console.log('Using config:', config === AZURE_CONFIG_LOCAL ? 'LOCAL' : 'DEFAULT');
  
  return {
    apiKey: getConfigValue('VITE_AZURE_OPENAI_KEY', config.apiKey),
    endpoint: getConfigValue('VITE_AZURE_OPENAI_ENDPOINT', config.endpoint),
    gpt4oDeployment: getConfigValue('VITE_AZURE_GPT4O_DEPLOYMENT', config.gpt4oDeployment),
    embeddingDeployment: getConfigValue('VITE_AZURE_EMBEDDING_DEPLOYMENT', config.embeddingDeployment),
    apiVersion: getConfigValue('VITE_AZURE_API_VERSION', config.apiVersion)
  };
}
