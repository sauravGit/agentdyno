// Fixtures below are captured VERBATIM from a real local Ollama 0.x daemon
// (see BUILD_LOG.md D-018) after `ollama pull qwen2.5-coder:3b` — not invented.
import { test } from "node:test";
import assert from "node:assert";
import { showOllamaModel, listOllamaModels, ollamaModelToCatalogEntry } from "../dist/src/ollama.js";

const REAL_TAGS_RESPONSE = {
  models: [
    {
      name: "qwen2.5-coder:3b",
      model: "qwen2.5-coder:3b",
      modified_at: "2026-07-27T14:48:29.537715629-04:00",
      size: 1929912626,
      digest: "f72c60cabf6237b07f6e632b2c48d533cef25eda2efbd34bed21c5e9c01e6225",
      details: {
        parent_model: "",
        format: "gguf",
        family: "qwen2",
        families: ["qwen2"],
        parameter_size: "3.1B",
        quantization_level: "Q4_K_M",
        context_length: 32768,
        embedding_length: 2048,
      },
      capabilities: ["completion", "tools", "insert"],
    },
  ],
};

const REAL_SHOW_RESPONSE = {
  details: {
    parent_model: "",
    format: "gguf",
    family: "qwen2",
    families: ["qwen2"],
    parameter_size: "3.1B",
    quantization_level: "Q4_K_M",
  },
  model_info: {
    "qwen2.attention.head_count": 16,
    "qwen2.attention.head_count_kv": 2,
    "qwen2.block_count": 36,
    "qwen2.context_length": 32768,
    "qwen2.embedding_length": 2048,
  },
};

function mockFetch(byUrl) {
  const orig = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    const key = String(url);
    for (const [match, body] of Object.entries(byUrl)) {
      if (key.includes(match)) {
        return { ok: true, json: async () => body };
      }
    }
    throw new Error("unmocked url: " + key);
  };
  return () => { globalThis.fetch = orig; };
}

test("showOllamaModel derives head_dim from embedding_length/head_count when rope key is absent", async () => {
  const restore = mockFetch({ "/api/show": REAL_SHOW_RESPONSE });
  try {
    const geo = await showOllamaModel("qwen2.5-coder:3b");
    assert.equal(geo.layers, 36);
    assert.equal(geo.kvHeads, 2);
    assert.equal(geo.headDim, 128); // 2048 / 16
    assert.equal(geo.contextLength, 32768);
    assert.equal(geo.paramsB, 3.1);
  } finally {
    restore();
  }
});

test("showOllamaModel fails loudly rather than inventing geometry when keys are missing", async () => {
  const restore = mockFetch({ "/api/show": { details: { family: "mystery", parameter_size: "7B", quantization_level: "Q4" }, model_info: {} } });
  try {
    await assert.rejects(() => showOllamaModel("mystery-model"), /incomplete geometry/);
  } finally {
    restore();
  }
});

test("listOllamaModels parses the real /api/tags shape including capabilities", async () => {
  const restore = mockFetch({ "/api/tags": REAL_TAGS_RESPONSE });
  try {
    const models = await listOllamaModels();
    assert.equal(models.length, 1);
    assert.deepEqual(models[0].capabilities, ["completion", "tools", "insert"]);
  } finally {
    restore();
  }
});

test("ollamaModelToCatalogEntry produces a fit.ts-compatible CatalogModel with real size+digest", async () => {
  const restore = mockFetch({ "/api/tags": REAL_TAGS_RESPONSE, "/api/show": REAL_SHOW_RESPONSE });
  try {
    const m = await ollamaModelToCatalogEntry("qwen2.5-coder:3b");
    assert.equal(m.id, "ollama:qwen2.5-coder:3b");
    assert.equal(m.quants[0].sizeBytes, 1929912626);
    assert.equal(m.quants[0].sha256, REAL_TAGS_RESPONSE.models[0].digest);
    // "tools" capability present -> catalog prior is B, not silently A (still unverified until doctor runs)
    assert.equal(m.toolCallGrade, "B");
  } finally {
    restore();
  }
});

test("a model without the tools capability gets a conservative C prior, not A", async () => {
  const noTools = JSON.parse(JSON.stringify(REAL_TAGS_RESPONSE));
  noTools.models[0].capabilities = ["completion"];
  const restore = mockFetch({ "/api/tags": noTools, "/api/show": REAL_SHOW_RESPONSE });
  try {
    const m = await ollamaModelToCatalogEntry("qwen2.5-coder:3b");
    assert.equal(m.toolCallGrade, "C");
  } finally {
    restore();
  }
});
