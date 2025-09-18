// Test API function to verify token and endpoints
export async function testKnowledgeAPI(): Promise<{ success: boolean; data?: any; error?: string }> {
  const openapiHost = import.meta.env.VITE_OPENAPI_HOST;
  const openapiToken = import.meta.env.VITE_OPENAPI_TOKEN;
  
  console.log('Testing API with:');
  console.log('Host:', openapiHost);
  console.log('Token:', openapiToken ? 'Present' : 'Missing');
  
  if (!openapiHost || !openapiToken) {
    console.error('Missing API configuration');
    return { success: false, error: 'No endpoint provided' };
  }
  
  try {
    // Test list endpoint
    console.log('Testing list endpoint...');
    const listResponse = await fetch(`${openapiHost}/api/open/v4/knowledge/list?page=1&size=10`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${openapiToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    const listData = await listResponse.json();
    console.log('List response:', listData);
    
    if (listData.code === 1000) {
      console.log('✅ List API working');
      return { success: true, data: listData };
    } else {
      console.log('❌ List API error:', listData.msg);
      return { success: false, error: listData.msg };
    }
  } catch (error) {
    console.error('❌ API test failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
