# 🔍 RAG Debugging Guide

## ❌ **Current Issue:**
The avatar is in Repeat mode but is repeating the user's question instead of responding with RAG-generated content from documents.

## 🔍 **Debugging Steps:**

### **Step 1: Check ChatInterface Routing**
When you send a message, check the console for these logs:

**Expected ChatInterface Debug:**
```
🔍 ChatInterface Debug: {
  ragState: {...},
  ragEnabled: true,
  hasSendMessageWithRAG: true,
  llmConfig: {...},
  llmEnabled: true,
  message: "your message"
}
🧠 Using Enterprise RAG for message processing
```

**If you DON'T see these logs:**
- The ChatInterface is not routing messages through RAG
- Check if `ragState.isEnabled` is actually true
- Check if `sendMessageWithRAG` is being passed correctly

### **Step 2: Check RAG Function Call**
If you see the ChatInterface logs, check for these RAG function logs:

**Expected RAG Function Logs:**
```
🚀 sendMessageWithRAG called with: { question: "your question", userId: "user", sessionId: "session_..." }
🚀 RAG service state: { hasLLMService: true, isEnabled: true, enterpriseLLMService: true }
🔍 Generating RAG response for question: your question
🔍 RAG response generated: { answer: "...", confidence: 0.85, sourcesCount: 2, sources: [...] }
🔍 Sending RAG message to avatar: { messageText: "...", messageFormat: {...} }
✅ RAG message sent to avatar successfully
```

**If you DON'T see these logs:**
- The `sendMessageWithRAG` function is not being called
- There's an issue with the ChatInterface routing

### **Step 3: Test RAG Response Generation**
Use the new "Test RAG Response" button to test RAG without sending to avatar:

1. **Click "Test RAG Response" button**
2. **Check console for:**
```
🧪 Testing RAG response generation for: What is in the document?
🧪 RAG test response: {
  answer: "Based on the document, ...",
  confidence: 0.85,
  sourcesCount: 2,
  sources: [...]
}
```

**If you DON'T see this:**
- RAG service is not properly configured
- LLM service is not connected
- Documents are not properly indexed

### **Step 4: Check Message Format**
If RAG generates responses but avatar doesn't use them, check the message format:

**Expected Message Format:**
```
🔍 Sending RAG message to avatar: {
  messageText: "Based on the document, ...",
  messageFormat: {
    v: 2,
    type: "chat",
    mid: "msg-1234567890",
    idx: 0,
    fin: true,
    pld: { text: "Based on the document, ..." }
  }
}
```

## 🧪 **Testing Checklist:**

### **1. Basic RAG Test:**
- [ ] Click "Test RAG Response" button
- [ ] Check console for RAG test response
- [ ] Verify response contains document content

### **2. ChatInterface Test:**
- [ ] Send a message to avatar
- [ ] Check console for ChatInterface debug logs
- [ ] Verify "🧠 Using Enterprise RAG for message processing" appears

### **3. RAG Function Test:**
- [ ] Check console for "🚀 sendMessageWithRAG called with:"
- [ ] Check console for "🔍 Generating RAG response for question:"
- [ ] Check console for "🔍 RAG response generated:"

### **4. Message Sending Test:**
- [ ] Check console for "🔍 Sending RAG message to avatar:"
- [ ] Check console for "✅ RAG message sent to avatar successfully"

### **5. Avatar Response Test:**
- [ ] Avatar should repeat the RAG response, not the user's question
- [ ] Response should contain information from your documents

## 🔧 **Common Issues & Solutions:**

### **Issue 1: No ChatInterface Debug Logs**
**Solution:** Check if RAG state is properly enabled and passed to ChatInterface

### **Issue 2: No RAG Function Logs**
**Solution:** Check if `sendMessageWithRAG` is being passed correctly to ChatInterface

### **Issue 3: RAG Test Fails**
**Solution:** Check LLM service connection and document indexing

### **Issue 4: RAG Generates Response But Avatar Doesn't Use It**
**Solution:** Check message format and avatar mode (must be Mode 1 - Repeat)

### **Issue 5: Avatar Still Repeats Question**
**Solution:** Verify avatar is in Mode 1 (Repeat) and message format is correct

## 📋 **Debug Commands:**

### **Test RAG Response Generation:**
```javascript
// In browser console
testRAGResponse('What is in the document?');
```

### **Check RAG State:**
```javascript
// In browser console
console.log('RAG State:', ragState);
console.log('LLM Service:', llmServiceRef.current);
console.log('Enterprise LLM Service:', enterpriseRAGService.getLLMService());
```

### **Check Document Stats:**
```javascript
// In browser console
console.log('Document Stats:', enterpriseRAGService.getStats());
```

## 🎯 **Expected Final Result:**
When everything works correctly:
1. **User sends message** → ChatInterface routes to RAG
2. **RAG processes message** → Generates response from documents
3. **RAG sends response to avatar** → Avatar repeats RAG response
4. **Avatar speaks document content** → Not the user's question

**The avatar should respond with information from your documents, not repeat your question!**
