// Debug Endpoint Construction
// Test the actual endpoint construction with your Azure OpenAI credentials

export function debugEndpointConstruction(): void {
  console.log('🔧 Debugging Azure OpenAI endpoint construction...');
  
  // Test with your actual credentials
  const testConfig = {
    apiKey: '***REMOVED***',
    endpoint: '***REMOVED***',
    deployment: 'gpt-4o',
    apiVersion: '2024-05-01-preview'
  };
  
  console.log('📋 Input config:', testConfig);
  
  // Test endpoint construction
  const baseEndpoint = testConfig.endpoint.endsWith('/') 
    ? testConfig.endpoint.slice(0, -1) 
    : testConfig.endpoint;
  
  const constructedEndpoint = `${baseEndpoint}/openai/deployments/${testConfig.deployment}/chat/completions?api-version=${testConfig.apiVersion}`;
  
  console.log('🔧 Endpoint construction:');
  console.log('  Base endpoint:', baseEndpoint);
  console.log('  Constructed endpoint:', constructedEndpoint);
  
  // Expected endpoint
  const expectedEndpoint = '***REMOVED***openai/deployments/gpt-4o/chat/completions?api-version=2024-05-01-preview';
  
  console.log('✅ Expected endpoint:', expectedEndpoint);
  console.log('🎯 Match:', constructedEndpoint === expectedEndpoint);
  
  if (constructedEndpoint !== expectedEndpoint) {
    console.error('❌ Endpoint construction failed!');
    console.log('Expected:', expectedEndpoint);
    console.log('Got:', constructedEndpoint);
  } else {
    console.log('✅ Endpoint construction is correct!');
  }
  
  // Test the actual request
  console.log('🧪 Testing actual request...');
  
  fetch(constructedEndpoint, {
    method: 'POST',
    headers: {
      'api-key': testConfig.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'Hello, this is a test message.' }],
      max_tokens: 10
    })
  })
  .then(response => {
    console.log('📡 Response status:', response.status);
    console.log('📡 Response statusText:', response.statusText);
    
    if (response.ok) {
      console.log('✅ Request successful!');
      return response.json();
    } else {
      console.log('❌ Request failed!');
      return response.text();
    }
  })
  .then(data => {
    console.log('📋 Response data:', data);
  })
  .catch(error => {
    console.error('❌ Request error:', error);
  });
}

// Export for easy testing in browser console
(window as any).debugEndpoint = debugEndpointConstruction;
