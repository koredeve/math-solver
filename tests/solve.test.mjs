import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/solve.js';

function makeRequest(method, body) {
  return new Request('https://mathsolverbot.vercel.app/api/solve', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

test('rejects non-POST requests with 405', async () => {
  const res = await handler(makeRequest('GET'));
  assert.equal(res.status, 405);
  const data = await res.json();
  assert.equal(data.error, 'Method Not Allowed');
});

test('rejects empty payload with 400', async () => {
  const res = await handler(makeRequest('POST', {}));
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.error, 'Problem or image is required');
});

test('returns 500 when OPENROUTER_API_KEY is missing', async () => {
  const prevKey = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  try {
    const res = await handler(makeRequest('POST', { problem: '2 + 2 = ?' }));
    assert.equal(res.status, 500);
    const data = await res.json();
    assert.match(data.error, /OPENROUTER_API_KEY/);
  } finally {
    if (prevKey !== undefined) process.env.OPENROUTER_API_KEY = prevKey;
  }
});

test('streams 200 SSE response for text problem and enforces temperature 0.1', async () => {
  const prevKey = process.env.OPENROUTER_API_KEY;
  const prevFetch = globalThis.fetch;
  process.env.OPENROUTER_API_KEY = 'test-key';

  let capturedBody = null;
  globalThis.fetch = async (_url, init) => {
    capturedBody = JSON.parse(init.body);
    return new Response('data: {"choices":[{"delta":{"content":"ok"}}]}\n\n', {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  };

  try {
    const res = await handler(makeRequest('POST', { problem: 'Solve x + 1 = 2' }));
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Content-Type'), 'text/event-stream');
    assert.equal(capturedBody.temperature, 0.1);
    assert.equal(capturedBody.stream, true);
    assert.equal(capturedBody.model, 'openrouter/free');
    assert.equal(capturedBody.messages[1].content[0].text, 'Solve x + 1 = 2');
  } finally {
    globalThis.fetch = prevFetch;
    if (prevKey !== undefined) process.env.OPENROUTER_API_KEY = prevKey;
    else delete process.env.OPENROUTER_API_KEY;
  }
});

test('routes image requests to vision model chain with image_url payload', async () => {
  const prevKey = process.env.OPENROUTER_API_KEY;
  const prevFetch = globalThis.fetch;
  process.env.OPENROUTER_API_KEY = 'test-key';

  const triedModels = [];
  let capturedContent = null;
  globalThis.fetch = async (_url, init) => {
    const parsed = JSON.parse(init.body);
    triedModels.push(parsed.model);
    capturedContent = parsed.messages[1].content;
    if (triedModels.length === 1) {
      return new Response('rate limited', { status: 429 });
    }
    return new Response('data: ok\n\n', { status: 200 });
  };

  try {
    const res = await handler(makeRequest('POST', { image: 'data:image/jpeg;base64,abc' }));
    assert.equal(res.status, 200);
    assert.deepEqual(triedModels, ['openrouter/free', 'nvidia/nemotron-3.5-super-vl:free']);
    assert.equal(capturedContent.some((c) => c.type === 'image_url'), true);
  } finally {
    globalThis.fetch = prevFetch;
    if (prevKey !== undefined) process.env.OPENROUTER_API_KEY = prevKey;
    else delete process.env.OPENROUTER_API_KEY;
  }
});

test('fails over across network errors and returns 502 when all models fail', async () => {
  const prevKey = process.env.OPENROUTER_API_KEY;
  const prevFetch = globalThis.fetch;
  process.env.OPENROUTER_API_KEY = 'test-key';

  let attempts = 0;
  globalThis.fetch = async () => {
    attempts += 1;
    if (attempts === 1) throw new Error('network timeout');
    return new Response('upstream error', { status: 503 });
  };

  try {
    const res = await handler(makeRequest('POST', { problem: 'Prove 1=1' }));
    assert.equal(res.status, 502);
    assert.equal(attempts, 6);
    const data = await res.json();
    assert.match(data.error, /Free routing failed/);
  } finally {
    globalThis.fetch = prevFetch;
    if (prevKey !== undefined) process.env.OPENROUTER_API_KEY = prevKey;
    else delete process.env.OPENROUTER_API_KEY;
  }
});
