import { getStore } from "@netlify/blobs";

export default async (req) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });

  try {
    const store = getStore("evaluator");
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const key = url.searchParams.get("key");

    if (req.method === "GET" && action === "get" && key) {
      try {
        const value = await store.get(key);
        return new Response(JSON.stringify({ value }), { status: 200, headers });
      } catch {
        return new Response(JSON.stringify({ value: null }), { status: 200, headers });
      }
    }

    if (req.method === "POST" && action === "set" && key) {
      const body = await req.json();
      await store.set(key, body.value);
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
    }

    if (req.method === "POST" && action === "delete" && key) {
      await store.delete(key);
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
};

export const config = { path: "/api/storage" };
