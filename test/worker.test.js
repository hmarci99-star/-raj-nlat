import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/ai-javaslat.js';

const env = { ANTHROPIC_API_KEY: 'sk-teszt', APP_JELSZO: 'titok' };
const keres = (origin, body) => new Request('https://x.workers.dev/', {
  method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

test('worker: idegen oldalról és rossz jelszóval nem hívja az AI-t', async () => {
  const eredeti = globalThis.fetch;
  let hivas = 0;
  globalThis.fetch = async () => { hivas += 1; return new Response('{}'); };
  try {
    assert.equal((await worker.fetch(keres('https://gonosz.example', { jelszo: 'titok' }), env)).status, 403);
    assert.equal((await worker.fetch(keres('https://hmarci99-star.github.io', { jelszo: 'rossz' }), env)).status, 401);
    assert.equal(hivas, 0);
  } finally { globalThis.fetch = eredeti; }
});

test('worker: csak engedett modellt hív, strukturált kimenettel', async () => {
  const eredeti = globalThis.fetch;
  let kuldott;
  globalThis.fetch = async (url, opt) => {
    kuldott = JSON.parse(opt.body);
    return new Response(JSON.stringify({ model: 'claude-opus-5-5', stop_reason: 'end_turn', usage: {},
      content: [{ type: 'text', text: '{"javaslatok":[],"megjegyzes":""}' }] }));
  };
  try {
    const v = await worker.fetch(keres('https://hmarci99-star.github.io', { jelszo: 'titok', modell: 'valami-drága', projekt: ['WC-tartály: 1'] }), env);
    assert.equal(v.status, 200);
    assert.equal(kuldott.model, 'claude-opus-5-5');
    assert.equal(kuldott.output_config.format.type, 'json_schema');
    assert.deepEqual(await v.json(), { javaslatok: [], megjegyzes: '', modell: 'claude-opus-5-5', tokenek: {} });
  } finally { globalThis.fetch = eredeti; }
});

test('worker: a böngésző előkérésére (OPTIONS) CORS-fejlécekkel válaszol', async () => {
  const v = await worker.fetch(new Request('https://x.workers.dev/', { method: 'OPTIONS', headers: { Origin: 'https://hmarci99-star.github.io' } }), env);
  assert.equal(v.status, 204);
  assert.equal(v.headers.get('Access-Control-Allow-Origin'), 'https://hmarci99-star.github.io');
  assert.match(v.headers.get('Access-Control-Allow-Headers'), /Content-Type/);
});
