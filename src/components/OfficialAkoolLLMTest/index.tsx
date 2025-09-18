/**
 * Official Akool LLM Test Component
 * 
 * This component provides a clean interface to test the official Akool LLM integration
 * following the exact pattern from their documentation.
 */

import React, { useState } from 'react';
import { useOfficialAkoolLLM } from '../../hooks/useOfficialAkoolLLM';

interface OfficialAkoolLLMTestProps {
  onMessageSent?: (question: string) => void;
}

export const OfficialAkoolLLMTest: React.FC<OfficialAkoolLLMTestProps> = ({ onMessageSent }) => {
  const [testQuestion, setTestQuestion] = useState('How to sign up?');
  const [isInitialized, setIsInitialized] = useState(false);
  
  const {
    state,
    initializeService,
    sendMessageWithOfficialLLM,
    disableService,
    testService,
    isReady,
  } = useOfficialAkoolLLM();

  const handleInitialize = async (serviceType: 'azure' | 'openai') => {
    console.log('🔧 Initializing Official Akool LLM Service...');
    const success = await initializeService(serviceType);
    setIsInitialized(success);
    
    if (success) {
      console.log('✅ Service initialized successfully');
    } else {
      console.error('❌ Service initialization failed');
    }
  };

  const handleSendMessage = async () => {
    if (!testQuestion.trim()) {
      alert('Please enter a test question');
      return;
    }

    try {
      console.log('🚀 Sending message using official Akool pattern:', testQuestion);
      await sendMessageWithOfficialLLM(testQuestion);
      onMessageSent?.(testQuestion);
      console.log('✅ Message sent successfully');
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      alert(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleTestService = async () => {
    try {
      console.log('🧪 Testing Official Akool LLM Service...');
      const success = await testService();
      if (success) {
        alert('✅ Service test completed successfully!');
      } else {
        alert('❌ Service test failed');
      }
    } catch (error) {
      console.error('❌ Service test error:', error);
      alert(`Service test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="official-akool-llm-test p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">🎯 Official Akool LLM Integration Test</h3>
      
      {/* Service Status */}
      <div className="mb-4 p-3 rounded border">
        <h4 className="font-medium mb-2">Service Status:</h4>
        <div className="space-y-1 text-sm">
          <div>Status: <span className={state.isEnabled ? 'text-green-600' : 'text-red-600'}>
            {state.isEnabled ? '✅ Enabled' : '❌ Disabled'}
          </span></div>
          <div>Service Type: <span className="text-blue-600">
            {state.serviceType || 'None'}
          </span></div>
          <div>Processing: <span className={state.isProcessing ? 'text-yellow-600' : 'text-gray-600'}>
            {state.isProcessing ? '⏳ Processing...' : '✅ Ready'}
          </span></div>
          {state.error && (
            <div className="text-red-600">Error: {state.error}</div>
          )}
        </div>
      </div>

      {/* Initialize Service */}
      {!isInitialized && (
        <div className="mb-4 p-3 rounded border bg-blue-50">
          <h4 className="font-medium mb-2">Initialize Service:</h4>
          <div className="space-x-2">
            <button
              onClick={() => handleInitialize('azure')}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={state.isProcessing}
            >
              Initialize Azure OpenAI
            </button>
            <button
              onClick={() => handleInitialize('openai')}
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              disabled={state.isProcessing}
            >
              Initialize OpenAI
            </button>
          </div>
        </div>
      )}

      {/* Test Interface */}
      {isInitialized && (
        <div className="space-y-4">
          {/* Test Question Input */}
          <div>
            <label className="block text-sm font-medium mb-1">Test Question:</label>
            <input
              type="text"
              value={testQuestion}
              onChange={(e) => setTestQuestion(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Enter your test question..."
            />
          </div>

          {/* Action Buttons */}
          <div className="space-x-2">
            <button
              onClick={handleSendMessage}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              disabled={state.isProcessing || !testQuestion.trim()}
            >
              {state.isProcessing ? '⏳ Sending...' : '🚀 Send Message'}
            </button>
            
            <button
              onClick={handleTestService}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={state.isProcessing}
            >
              🧪 Test Service
            </button>
            
            <button
              onClick={disableService}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              disabled={state.isProcessing}
            >
              🔌 Disable Service
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 p-3 rounded border bg-yellow-50">
        <h4 className="font-medium mb-2">📋 Instructions:</h4>
        <ol className="text-sm space-y-1 list-decimal list-inside">
          <li>Initialize the service with your preferred LLM provider</li>
          <li>Make sure the avatar is connected and streaming</li>
          <li>Enter a test question and click "Send Message"</li>
          <li>Listen for the avatar's response</li>
          <li>Check console logs for detailed debugging information</li>
        </ol>
      </div>

      {/* Debug Info */}
      <div className="mt-4 p-3 rounded border bg-gray-100">
        <h4 className="font-medium mb-2">🔍 Debug Info:</h4>
        <div className="text-sm space-y-1">
          <div>Service Ready: <span className={isReady ? 'text-green-600' : 'text-red-600'}>
            {isReady ? '✅ Yes' : '❌ No'}
          </span></div>
          <div>Last Response: <span className="text-gray-600">
            {state.lastResponse || 'None'}
          </span></div>
        </div>
      </div>
    </div>
  );
};
