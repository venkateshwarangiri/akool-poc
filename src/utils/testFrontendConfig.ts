// Test Frontend Configuration
// Run this to verify frontend configuration components work

import { LLMConfigs } from '../services/llmService';

export function testFrontendConfiguration(): {
  success: boolean;
  message: string;
  details?: any;
} {
  try {
    console.log('🧪 Testing frontend configuration components...');
    
    // Test 1: Azure OpenAI config creation
    const azureConfig = LLMConfigs.azureOpenAI(
      'test-api-key',
      'https://test-resource.openai.azure.com/',
      'gpt-4o',
      '2024-05-01-preview'
    );
    
    console.log('✅ Azure OpenAI config created:', azureConfig);
    
    // Test 2: Validate config structure
    const requiredFields = ['endpoint', 'apiKey', 'model', 'maxTokens', 'temperature'];
    const hasAllFields = requiredFields.every(field => field in azureConfig);
    
    if (!hasAllFields) {
      return {
        success: false,
        message: 'Azure OpenAI config missing required fields'
      };
    }
    
    console.log('✅ Azure OpenAI config has all required fields');
    
    // Test 3: Validate endpoint format
    const isValidEndpoint = azureConfig.endpoint.includes('openai.azure.com') && 
                           azureConfig.endpoint.includes('deployments') &&
                           azureConfig.endpoint.includes('api-version');
    
    if (!isValidEndpoint) {
      return {
        success: false,
        message: 'Azure OpenAI endpoint format is invalid'
      };
    }
    
    console.log('✅ Azure OpenAI endpoint format is valid');
    
    // Test 4: Test other LLM configs
    const openaiConfig = LLMConfigs.openai('test-key', 'gpt-3.5-turbo');
    const anthropicConfig = LLMConfigs.anthropic('test-key', 'claude-3-sonnet-20240229');
    const customConfig = LLMConfigs.custom('https://custom-endpoint.com', 'test-key');
    
    console.log('✅ All LLM config presets created successfully');
    
    return {
      success: true,
      message: 'Frontend configuration components working correctly!',
      details: {
        azureConfig: {
          endpoint: azureConfig.endpoint,
          model: azureConfig.model,
          hasApiKey: !!azureConfig.apiKey
        },
        openaiConfig: {
          endpoint: openaiConfig.endpoint,
          model: openaiConfig.model
        },
        anthropicConfig: {
          endpoint: anthropicConfig.endpoint,
          model: anthropicConfig.model
        },
        customConfig: {
          endpoint: customConfig.endpoint,
          hasApiKey: !!customConfig.apiKey
        }
      }
    };
    
  } catch (error) {
    console.error('❌ Frontend configuration test failed:', error);
    return {
      success: false,
      message: `Frontend configuration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error
    };
  }
}

export function testAzureOpenAIConfigCreation(): {
  success: boolean;
  message: string;
  details?: any;
} {
  try {
    console.log('🧪 Testing Azure OpenAI configuration creation...');
    
    // Test with your actual Azure OpenAI credentials
    const testCredentials = {
      apiKey: '***REMOVED***',
      endpoint: '***REMOVED***',
      deployment: 'gpt-4o',
      apiVersion: '2024-05-01-preview'
    };
    
    const config = LLMConfigs.azureOpenAI(
      testCredentials.apiKey,
      testCredentials.endpoint,
      testCredentials.deployment,
      testCredentials.apiVersion
    );
    
    console.log('✅ Azure OpenAI config created with your credentials');
    console.log('📋 Config details:', {
      endpoint: config.endpoint,
      model: config.model,
      hasApiKey: !!config.apiKey,
      maxTokens: config.maxTokens,
      temperature: config.temperature
    });
    
    // Validate the generated endpoint
    const expectedEndpoint = `${testCredentials.endpoint}openai/deployments/${testCredentials.deployment}/chat/completions?api-version=${testCredentials.apiVersion}`;
    
    if (config.endpoint !== expectedEndpoint) {
      return {
        success: false,
        message: 'Generated endpoint does not match expected format'
      };
    }
    
    console.log('✅ Generated endpoint matches expected format');
    
    return {
      success: true,
      message: 'Azure OpenAI configuration creation successful!',
      details: {
        config: {
          endpoint: config.endpoint,
          model: config.model,
          hasApiKey: !!config.apiKey,
          maxTokens: config.maxTokens,
          temperature: config.temperature
        },
        testCredentials: {
          endpoint: testCredentials.endpoint,
          deployment: testCredentials.deployment,
          apiVersion: testCredentials.apiVersion
        }
      }
    };
    
  } catch (error) {
    console.error('❌ Azure OpenAI config creation test failed:', error);
    return {
      success: false,
      message: `Azure OpenAI config creation test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error
    };
  }
}

// Run all frontend configuration tests
export function runAllFrontendConfigTests(): void {
  console.log('🚀 Starting frontend configuration tests...\n');
  
  // Test 1: General frontend configuration
  const generalTest = testFrontendConfiguration();
  console.log('\n📋 General Frontend Config Test Result:', generalTest);
  
  if (generalTest.success) {
    console.log('\n🎉 General frontend configuration test passed! Proceeding to Azure OpenAI test...\n');
    
    // Test 2: Azure OpenAI specific configuration
    const azureTest = testAzureOpenAIConfigCreation();
    console.log('\n📋 Azure OpenAI Config Test Result:', azureTest);
    
    if (azureTest.success) {
      console.log('\n🎉 All frontend configuration tests passed successfully!');
      console.log('✅ Your frontend configuration components are ready to use!');
      console.log('🚀 Users can now configure Azure OpenAI from the frontend!');
    } else {
      console.log('\n⚠️ Azure OpenAI configuration test failed.');
    }
  } else {
    console.log('\n❌ General frontend configuration test failed.');
  }
}

// Export for easy testing in browser console
(window as any).testFrontendConfig = {
  general: testFrontendConfiguration,
  azure: testAzureOpenAIConfigCreation,
  all: runAllFrontendConfigTests
};
