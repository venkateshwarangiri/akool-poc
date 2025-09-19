declare module './azureConfig.local' {
  export const AZURE_CONFIG_LOCAL: {
    apiKey: string;
    endpoint: string;
    gpt4oDeployment: string;
    embeddingDeployment: string;
    apiVersion: string;
  };
}
