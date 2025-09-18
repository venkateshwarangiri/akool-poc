# 🔧 Azure OpenAI Request Format Fix

## ❌ **Problem Identified:**
The error "HTTP 400: Unsupported data type" was caused by sending the wrong request format to Azure OpenAI.

## ✅ **Root Cause:**
Azure OpenAI expects a specific request format with a `messages` array, but the code was sending a custom format with `question` and `context` fields.

## 🔧 **Fix Applied:**

### **1. Request Body Format**
**Before (Incorrect):**
```json
{
  "question": "Hello, can you respond with a simple greeting?",
  "context": "This is a test message.",
  "model": "gpt-4o",
  "max_tokens": 1000,
  "temperature": 0.7
}
```

**After (Correct for Azure OpenAI):**
```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful AI assistant. Use the following context to answer questions: This is a test message."
    },
    {
      "role": "user", 
      "content": "Hello, can you respond with a simple greeting?"
    }
  ],
  "max_tokens": 1000,
  "temperature": 0.7,
  "stream": false
}
```

### **2. Response Parsing**
**Before:**
```javascript
answer: response.answer || response.text || response.response || response.content || ''
```

**After (Azure OpenAI format):**
```javascript
answer: response.choices?.[0]?.message?.content || ''
```

### **3. Conditional Logic**
The code now detects Azure OpenAI endpoints and uses the correct format:
- **Azure OpenAI**: Uses `messages` array format
- **Other LLMs**: Uses custom format with `question` and `context`

## 🧪 **Test the Fix:**

1. **Open browser**: `http://localhost:5173`
2. **Go to "Enterprise RAG" tab**
3. **Click "Enable LLM"** (credentials are pre-filled)
4. **Check browser console** for debug logs
5. **Should see successful connection!**

## 📋 **Debug Information:**
The fix includes enhanced debug logging that shows:
- Endpoint URL
- Request body format
- Whether it's detected as Azure OpenAI
- API key presence

## 🎉 **Expected Result:**
- ✅ No more "HTTP 400: Unsupported data type" errors
- ✅ Successful Azure OpenAI connection
- ✅ Proper response parsing
- ✅ Ready for RAG system testing

**The Azure OpenAI integration should now work correctly! 🚀**
