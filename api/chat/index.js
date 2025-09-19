module.exports = async function (context, req) {
  try {
    const body = req.body || {};
    const override = (body && body.azure) || {};

    const apiKey = override.apiKey || process.env.AZURE_OPENAI_KEY;
    const endpoint = override.endpoint || process.env.AZURE_OPENAI_ENDPOINT;
    const apiVersion = override.apiVersion || process.env.AZURE_API_VERSION || '2024-05-01-preview';
    const deployment = override.deployment || process.env.AZURE_GPT4O_DEPLOYMENT || 'gpt-4o';
    const fullUrlChat = override.fullUrlChat;

    if (!apiKey) {
      context.res = { status: 400, body: { error: 'Missing Azure OpenAI apiKey' } };
      return;
    }

    let url;
    if (fullUrlChat && typeof fullUrlChat === 'string') {
      url = fullUrlChat;
    } else if (endpoint) {
      const base = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
      url = `${base}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
    } else {
      context.res = { status: 400, body: { error: 'Missing Azure OpenAI endpoint' } };
      return;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    context.res = {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' },
      body: text,
    };
  } catch (e) {
    context.res = { status: 500, body: { error: 'Proxy error', detail: String(e) } };
  }
};
