module.exports = async function (context, req) {
  try {
    const apiKey = process.env.AZURE_OPENAI_KEY;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiVersion = process.env.AZURE_API_VERSION || '2024-05-01-preview';
    const deployment = process.env.AZURE_GPT4O_DEPLOYMENT || 'gpt-4o';

    if (!apiKey || !endpoint) {
      context.res = { status: 500, body: { error: 'Server configuration missing' } };
      return;
    }

    const base = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
    const url = `${base}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(req.body || {}),
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
