// Test Azure OpenAI Integration
// Run this to verify your Azure OpenAI setup is working

import { createAzureOpenAIService } from '../services/llmService';
import { chromaRAGService } from '../services/chromaRAGService';

export async function testAzureOpenAIConnection(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    console.log('🧪 Testing Azure OpenAI connection...');
    
    // Test 1: Create Azure OpenAI service
    const azureService = createAzureOpenAIService();
    console.log('✅ Azure OpenAI service created');
    
    // Test 2: Test connection
    const isConnected = await azureService.testConnection();
    if (!isConnected) {
      return {
        success: false,
        message: 'Failed to connect to Azure OpenAI'
      };
    }
    console.log('✅ Azure OpenAI connection test successful');
    
    // Test 3: Test chat completion
    const testResponse = await azureService.processWithLLM({
      question: 'Hello, this is a test message from Azure OpenAI. Please respond with "Azure OpenAI is working!"'
    });
    
    console.log('✅ Azure OpenAI chat completion test successful');
    console.log('📝 Response:', testResponse.answer);
    
    return {
      success: true,
      message: 'Azure OpenAI connection and chat completion successful!',
      details: {
        response: testResponse.answer,
        model: testResponse.metadata?.model,
        processingTime: testResponse.metadata?.processing_time
      }
    };
    
  } catch (error) {
    console.error('❌ Azure OpenAI test failed:', error);
    return {
      success: false,
      message: `Azure OpenAI test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error
    };
  }
}

export async function testAzureOpenAIEmbeddings(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    console.log('🧪 Testing Azure OpenAI embeddings...');
    
    // Test embedding generation
    const testText = 'This is a test document for Azure OpenAI embedding generation.';
    
    // Create a temporary LLM service for embedding test
    const azureService = createAzureOpenAIService();
    chromaRAGService.setLLMService(azureService);
    
    // Test embedding generation
    const embedding = await (chromaRAGService as any).generateEmbedding(testText);
    
    if (embedding && embedding.length > 0) {
      console.log('✅ Azure OpenAI embedding generation successful');
      console.log('📊 Embedding dimension:', embedding.length);
      console.log('📊 First few values:', embedding.slice(0, 5));
      
      return {
        success: true,
        message: 'Azure OpenAI embedding generation successful!',
        details: {
          embeddingDimension: embedding.length,
          sampleValues: embedding.slice(0, 5),
          testText: testText
        }
      };
    } else {
      return {
        success: false,
        message: 'Embedding generation returned empty result'
      };
    }
    
  } catch (error) {
    console.error('❌ Azure OpenAI embedding test failed:', error);
    return {
      success: false,
      message: `Azure OpenAI embedding test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error
    };
  }
}

export async function testAzureOpenAIWithChroma(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    console.log('🧪 Testing Azure OpenAI with Chroma RAG...');
    
    // Test 1: Initialize Chroma
    await chromaRAGService.initialize();
    console.log('✅ Chroma initialized');
    
    // Test 2: Set up Azure OpenAI service
    const azureService = createAzureOpenAIService();
    chromaRAGService.setLLMService(azureService);
    console.log('✅ Azure OpenAI service configured with Chroma');
    
    // Test 3: Upload test document
    const testContent = 'Azure OpenAI is a cloud-based service that provides access to OpenAI\'s language models. It offers enterprise-grade security, compliance, and customization options. The service supports GPT-4, GPT-3.5, and embedding models. It integrates seamlessly with Azure services and provides dedicated capacity for production workloads.';
    const testFile = new File([testContent], 'azure-openai-test.txt', { type: 'text/plain' });
    
    console.log('📄 Uploading test document...');
    const document = await chromaRAGService.addDocument(testFile, {
      department: 'Engineering',
      confidentiality: 'internal',
      author: 'Test User',
      category: 'Azure OpenAI Testing'
    });
    console.log('✅ Test document uploaded successfully');
    
    // Test 4: Search and generate RAG response
    console.log('🔍 Testing RAG response generation...');
    const ragResponse = await chromaRAGService.generateRAGResponse('What is Azure OpenAI?');
    
    console.log('✅ RAG response generated successfully');
    console.log('📝 Answer:', ragResponse.answer);
    console.log('📊 Confidence:', ragResponse.confidence);
    console.log('📚 Sources:', ragResponse.sources.length);
    
    // Test 5: Clean up
    console.log('🧹 Cleaning up test document...');
    await chromaRAGService.removeDocument(document.id);
    console.log('✅ Test document removed successfully');
    
    return {
      success: true,
      message: 'Azure OpenAI with Chroma RAG test successful!',
      details: {
        answer: ragResponse.answer,
        confidence: ragResponse.confidence,
        sourcesCount: ragResponse.sources.length,
        searchTime: ragResponse.metadata.searchTime,
        processingTime: ragResponse.metadata.processingTime,
        model: ragResponse.metadata.model
      }
    };
    
  } catch (error) {
    console.error('❌ Azure OpenAI with Chroma test failed:', error);
    return {
      success: false,
      message: `Azure OpenAI with Chroma test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error
    };
  }
}

// Run all Azure OpenAI tests
export async function runAllAzureOpenAITests(): Promise<void> {
  console.log('🚀 Starting Azure OpenAI integration tests...\n');
  
  // Test 1: Basic connection
  const connectionTest = await testAzureOpenAIConnection();
  console.log('\n📋 Connection Test Result:', connectionTest);
  
  if (connectionTest.success) {
    console.log('\n🎉 Azure OpenAI connection test passed! Proceeding to embedding test...\n');
    
    // Test 2: Embeddings
    const embeddingTest = await testAzureOpenAIEmbeddings();
    console.log('\n📋 Embedding Test Result:', embeddingTest);
    
    if (embeddingTest.success) {
      console.log('\n🎉 Azure OpenAI embedding test passed! Proceeding to full RAG test...\n');
      
      // Test 3: Full RAG integration
      const ragTest = await testAzureOpenAIWithChroma();
      console.log('\n📋 RAG Integration Test Result:', ragTest);
      
      if (ragTest.success) {
        console.log('\n🎉 All Azure OpenAI tests passed successfully!');
        console.log('✅ Your Azure OpenAI integration is ready to use!');
        console.log('🚀 You can now use the full RAG system with Azure OpenAI!');
      } else {
        console.log('\n⚠️ RAG integration test failed. Check your Chroma configuration.');
      }
    } else {
      console.log('\n⚠️ Embedding test failed. Check your Azure OpenAI configuration.');
    }
  } else {
    console.log('\n❌ Azure OpenAI connection test failed. Check your API key and endpoint.');
  }
}

// Export for easy testing in browser console
(window as any).testAzureOpenAI = {
  connection: testAzureOpenAIConnection,
  embeddings: testAzureOpenAIEmbeddings,
  withChroma: testAzureOpenAIWithChroma,
  all: runAllAzureOpenAITests
};
