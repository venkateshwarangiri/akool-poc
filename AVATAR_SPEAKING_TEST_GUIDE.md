# 🎤 Avatar Speaking Test Guide

## ✅ **Fix Applied:**
- **Added `from: "bot"` field** to RAG response message format
- **Enhanced debug logging** to track message format
- **Avatar mode verification** to ensure Mode 1 (Repeat)

## 🧪 **Step-by-Step Test Process:**

### **Step 1: Access the Application**
1. Open your browser
2. Go to `http://localhost:5173` (or the port shown in your terminal)
3. Wait for the application to load completely

### **Step 2: Upload Document to RAG System**
1. Navigate to **Enterprise Document Manager**
2. Upload your FAQ document (the one with member benefits information)
3. Verify that RAG system shows as **enabled** with document count > 0
4. Check console for: `✅ RAG system is properly enabled and connected`

### **Step 3: Configure Avatar Settings**
1. Select an **avatar** from the avatar selector
2. Ensure **voice settings** are configured
3. Verify **language** is set appropriately
4. Check that **Mode 1 (Repeat)** is selected (this is crucial for RAG)

### **Step 4: Start Avatar Streaming**
1. Click **"Start Streaming"** button
2. Wait for connection to establish
3. Verify avatar appears on screen
4. Check console for connection logs

### **Step 5: Test Voice Input with RAG**
1. Click the **microphone button** to enable voice input
2. Speak a question in any language:
   - **English**: "How to sign up?"
   - **Arabic**: "ممبر بینیفٹ" (member benefit)
   - **Tamil**: "கோடுஸ் ஸைனப்" (how to sign up)
3. Release the microphone button
4. **Listen carefully** for the avatar's response

## 🎯 **Expected Results:**

### **Console Logs to Look For:**
```
🎤 Voice message intercepted from user: [your question]
🧠 Processing voice message through RAG system - BLOCKING original message
🚫 Blocking original voice message from reaching avatar
🔍 Generating RAG response for question: [your question]
🔍 Sending RAG message to avatar: {
  messageText: "...",
  messageFormat: {...},
  messageString: "{\"v\":2,\"type\":\"chat\",\"mid\":\"msg-...\",\"idx\":0,\"fin\":true,\"pld\":{\"from\":\"bot\",\"text\":\"...\"}}"
}
✅ RAG message sent to avatar successfully
🔍 Avatar mode check - should be Mode 1 (Repeat) for RAG responses to work
```

### **Avatar Behavior:**
- ✅ **Avatar should speak** the RAG-generated response
- ✅ **No silence** - You should hear audio output
- ✅ **Relevant content** - Response should be related to your document
- ✅ **Not repeating your question** - Avatar speaks the answer, not your question

## 🚨 **Troubleshooting:**

### **If Avatar Still Doesn't Speak:**

1. **Check Message Format:**
   - Look for `"from":"bot"` in the messageString log
   - Verify the message format is correct

2. **Check Avatar Mode:**
   - Ensure avatar is in **Mode 1 (Repeat)**
   - Look for mode setting in console logs

3. **Check Audio Settings:**
   - Verify microphone permissions
   - Check browser audio settings
   - Ensure avatar audio is enabled

4. **Check Network:**
   - Verify stable internet connection
   - Check for any network errors in console

### **If You See Errors:**

1. **Unicode Errors:**
   - Should be fixed with the encoding update
   - Look for `InvalidCharacterError` in console

2. **RAG Processing Errors:**
   - Check if document is properly uploaded
   - Verify RAG system is enabled

3. **Connection Errors:**
   - Restart the streaming session
   - Check avatar selection

## 🎯 **Success Criteria:**

### **✅ Test Passes If:**
- Console shows all debug logs correctly
- Avatar speaks a relevant response
- Response is based on your uploaded document
- No errors in console

### **❌ Test Fails If:**
- Avatar remains silent
- Avatar repeats your question instead of answering
- Console shows errors
- Message format is incorrect

## 🚀 **Ready to Test:**

The development server should be running. Now:

1. **Open your browser** to the application
2. **Follow the test steps** above
3. **Speak to the avatar** and listen for the response
4. **Check console logs** for the debug messages
5. **Report results** - Does the avatar speak the RAG response?

**The fix should now make the avatar speak the RAG responses!**
