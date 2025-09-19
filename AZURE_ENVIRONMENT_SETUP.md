# Azure Static Web Apps Environment Variables Setup

## 🎯 **Correct Way to Set Environment Variables**

### **Step 1: Go to Azure Portal**
1. Navigate to [Azure Portal](https://portal.azure.com)
2. Find your **Static Web App** resource
3. Click on your Static Web App

### **Step 2: Configure Environment Variables**
1. In the left menu, click **"Configuration"**
2. Click **"Application settings"** tab
3. Click **"+ Add"** to add each environment variable

### **Step 3: Add These Environment Variables**

Add these **exact** environment variables:

```
Name: VITE_AZURE_OPENAI_KEY
Value: [Your Azure OpenAI API Key]

Name: VITE_AZURE_OPENAI_ENDPOINT  
Value: [Your Azure OpenAI Endpoint URL]

Name: VITE_AZURE_GPT4O_DEPLOYMENT
Value: gpt-4o

Name: VITE_AZURE_EMBEDDING_DEPLOYMENT
Value: text-embedding-3-large

Name: VITE_AZURE_API_VERSION
Value: 2024-05-01-preview
```

### **Step 4: Save Configuration**
1. Click **"Save"** at the top
2. Wait 2-3 minutes for the app to restart
3. Your app will automatically rebuild with the new environment variables

## 🔍 **How to Get Your Azure OpenAI Credentials**

### **Get API Key:**
1. Go to Azure Portal → Your OpenAI resource
2. Click **"Keys and Endpoint"** in the left menu
3. Copy **Key 1** or **Key 2**

### **Get Endpoint:**
1. In the same **"Keys and Endpoint"** page
2. Copy the **Endpoint** URL (looks like: `https://your-resource.openai.azure.com/`)

## ✅ **Verification Steps**

After setting environment variables:

1. **Wait 3-5 minutes** for Azure to restart
2. **Visit your Static Web App URL**
3. **Check**: Configuration warning should disappear
4. **Test LLM**: Go to "LLM Integration" tab and ask a question
5. **Test RAG**: Go to "Enterprise Documents" tab and test document search

## 🚨 **Troubleshooting**

### **If configuration warning still shows:**
- Wait longer (up to 10 minutes)
- Hard refresh browser (Ctrl+F5)
- Check if environment variable names are exactly correct
- Verify the values don't have extra spaces

### **If LLM not working:**
- Check if your API key has proper permissions
- Verify the endpoint URL is correct
- Check if your GPT-4o deployment exists

### **If embeddings not working:**
- Check if you have a text-embedding deployment
- Verify the embedding deployment name matches your environment variable

## 📋 **Environment Variable Checklist**

- [ ] VITE_AZURE_OPENAI_KEY (your actual API key)
- [ ] VITE_AZURE_OPENAI_ENDPOINT (your actual endpoint)
- [ ] VITE_AZURE_GPT4O_DEPLOYMENT (gpt-4o)
- [ ] VITE_AZURE_EMBEDDING_DEPLOYMENT (text-embedding-3-large)
- [ ] VITE_AZURE_API_VERSION (2024-05-01-preview)
- [ ] All variables saved in Azure Portal
- [ ] App restarted (wait 3-5 minutes)
- [ ] Configuration warning disappeared
- [ ] LLM and embedding services working
