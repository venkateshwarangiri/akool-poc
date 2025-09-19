# Azure Static Web Apps Deployment Setup

## Environment Variables Configuration

To enable LLM and embedding functionality, you need to configure the following environment variables in your Azure Static Web Apps:

### Required Environment Variables

1. **VITE_AZURE_OPENAI_KEY**
   - Your Azure OpenAI API key
   - Get this from Azure Portal → Your OpenAI Resource → Keys and Endpoint

2. **VITE_AZURE_OPENAI_ENDPOINT**
   - Your Azure OpenAI endpoint URL
   - Format: `https://your-resource-name.openai.azure.com/`

3. **VITE_AZURE_GPT4O_DEPLOYMENT** (Optional)
   - Default: `gpt-4o`
   - Your GPT-4o deployment name

4. **VITE_AZURE_EMBEDDING_DEPLOYMENT** (Optional)
   - Default: `text-embedding-3-large`
   - Your embedding deployment name

5. **VITE_AZURE_API_VERSION** (Optional)
   - Default: `2024-05-01-preview`

### How to Set Environment Variables in Azure Static Web Apps

1. **Go to Azure Portal**
   - Navigate to your Static Web App resource

2. **Configuration Section**
   - Click on "Configuration" in the left menu
   - Go to "Application settings" tab

3. **Add Environment Variables**
   - Click "Add" to add each environment variable
   - Set the name and value for each variable
   - Make sure to mark them as "Production" environment

4. **Save and Restart**
   - Click "Save" to save the configuration
   - The app will automatically restart with new settings

### Example Configuration

```
VITE_AZURE_OPENAI_KEY = your-actual-api-key-here
VITE_AZURE_OPENAI_ENDPOINT = https://your-resource.openai.azure.com/
VITE_AZURE_GPT4O_DEPLOYMENT = gpt-4o
VITE_AZURE_EMBEDDING_DEPLOYMENT = text-embedding-3-large
VITE_AZURE_API_VERSION = 2024-05-01-preview
```

### Verification

After setting the environment variables:

1. **Wait 2-3 minutes** for the app to restart
2. **Refresh your Azure Static Web Apps URL**
3. **Check browser console** for any configuration errors
4. **Test LLM functionality** by asking a question in the chat

### Troubleshooting

- **Blank page**: Check if all required environment variables are set
- **LLM not working**: Verify API key and endpoint are correct
- **Embeddings not working**: Check if embedding deployment exists
- **Console errors**: Look for specific error messages in browser dev tools

### Security Notes

- Never commit API keys to your repository
- Use Azure Key Vault for production environments
- Rotate keys regularly
- Monitor usage in Azure Portal
