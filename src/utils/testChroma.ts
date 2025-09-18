// Test Chroma Cloud Connection
// Run this to verify your Chroma setup is working

import { chromaRAGService } from '../services/chromaRAGService';

export async function testChromaConnection(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    console.log('🧪 Testing Chroma Cloud connection...');
    
    // Test 1: Initialize connection
    await chromaRAGService.initialize();
    console.log('✅ Chroma initialization successful');
    
    // Test 2: Test connection
    const isConnected = await chromaRAGService.testConnection();
    if (!isConnected) {
      return {
        success: false,
        message: 'Failed to connect to Chroma Cloud'
      };
    }
    console.log('✅ Chroma connection test successful');
    
    // Test 3: Get collection stats
    const stats = chromaRAGService.getStats();
    console.log('📊 Collection stats:', stats);
    
    // Test 4: Create a test document
    const testContent = 'This is a test document for Chroma Cloud integration. It contains information about the streaming avatar project and RAG system.';
    const testFile = new File([testContent], 'test-chroma.txt', { type: 'text/plain' });
    
    console.log('📄 Uploading test document...');
    const document = await chromaRAGService.addDocument(testFile, {
      department: 'IT',
      confidentiality: 'internal',
      author: 'Test User',
      category: 'Testing'
    });
    console.log('✅ Test document uploaded successfully:', document.id);
    
    // Test 5: Search for the document
    console.log('🔍 Testing search functionality...');
    const searchResults = await chromaRAGService.searchDocuments('test document streaming avatar');
    console.log('✅ Search test successful, found', searchResults.length, 'results');
    
    // Test 6: Clean up test document
    console.log('🧹 Cleaning up test document...');
    await chromaRAGService.removeDocument(document.id);
    console.log('✅ Test document removed successfully');
    
    return {
      success: true,
      message: 'All Chroma Cloud tests passed successfully!',
      details: {
        collectionName: stats.chromaCollection,
        documentCount: stats.documentCount,
        totalChunks: stats.totalChunks,
        searchResults: searchResults.length
      }
    };
    
  } catch (error) {
    console.error('❌ Chroma test failed:', error);
    return {
      success: false,
      message: `Chroma test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error
    };
  }
}

// Test with LLM integration
export async function testChromaWithLLM(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    console.log('🤖 Testing Chroma with LLM integration...');
    
    // Check if LLM service is configured
    const config = chromaRAGService.getConfig();
    console.log('📋 Current config:', config);
    
    // Test RAG response generation
    const testContent = 'The streaming avatar project uses Akool SDK for real-time avatar generation. It supports multiple languages and voice options. The RAG system allows the avatar to answer questions based on uploaded documents.';
    const testFile = new File([testContent], 'rag-test.txt', { type: 'text/plain' });
    
    console.log('📄 Uploading RAG test document...');
    const document = await chromaRAGService.addDocument(testFile, {
      department: 'Engineering',
      confidentiality: 'internal',
      category: 'Documentation'
    });
    
    console.log('🔍 Testing RAG response generation...');
    const ragResponse = await chromaRAGService.generateRAGResponse('What is the streaming avatar project?');
    
    console.log('✅ RAG response generated:', ragResponse.answer);
    console.log('📊 Response confidence:', ragResponse.confidence);
    console.log('📚 Sources found:', ragResponse.sources.length);
    
    // Clean up
    await chromaRAGService.removeDocument(document.id);
    
    return {
      success: true,
      message: 'Chroma with LLM integration test passed!',
      details: {
        answer: ragResponse.answer,
        confidence: ragResponse.confidence,
        sourcesCount: ragResponse.sources.length,
        processingTime: ragResponse.metadata.processingTime
      }
    };
    
  } catch (error) {
    console.error('❌ Chroma with LLM test failed:', error);
    return {
      success: false,
      message: `Chroma with LLM test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error
    };
  }
}

// Run all tests
export async function runAllChromaTests(): Promise<void> {
  console.log('🚀 Starting Chroma Cloud integration tests...\n');
  
  // Test 1: Basic connection
  const connectionTest = await testChromaConnection();
  console.log('\n📋 Connection Test Result:', connectionTest);
  
  if (connectionTest.success) {
    console.log('\n🎉 Basic Chroma tests passed! Proceeding to LLM integration test...\n');
    
    // Test 2: LLM integration
    const llmTest = await testChromaWithLLM();
    console.log('\n📋 LLM Integration Test Result:', llmTest);
    
    if (llmTest.success) {
      console.log('\n🎉 All Chroma Cloud tests passed successfully!');
      console.log('✅ Your Chroma Cloud integration is ready to use!');
    } else {
      console.log('\n⚠️ LLM integration test failed. Check your OpenAI API key configuration.');
    }
  } else {
    console.log('\n❌ Basic Chroma tests failed. Check your Chroma Cloud configuration.');
  }
}

// Export for easy testing in browser console
(window as any).testChroma = {
  connection: testChromaConnection,
  withLLM: testChromaWithLLM,
  all: runAllChromaTests
};
