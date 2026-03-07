import { getStore } from "@netlify/blobs";

export default async (req) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });

  const store = getStore("evaluator");
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const key = url.searchParams.get("key");

  console.log(`Storage request: ${req.method} action=${action} key=${key}`);

  if (req.method === "GET" && action === "get" && key) {
    try {
      const value = await store.get(key, { type: "json" });
      console.log(`GET ${key}: ${value !== null ? "found" : "not found"}`);
      return new Response(JSON.stringify({ value: value ?? null }), { status: 200, headers });
    } catch (err) {
      console.error(`GET ${key} error:`, err.message);
      return new Response(JSON.stringify({ value: null }), { status: 200, headers });
    }
  }

  if (req.method === "POST" && action === "set" && key) {
    try {
      const body = await req.json();
      await store.setJSON(key, body.value);
      console.log(`SET ${key}: ok`);
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
    } catch (err) {
      console.error(`SET ${key} error:`, err.message);
      return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers });
    }
  }

  if (req.method === "POST" && action === "delete" && key) {
    try {
      await store.delete(key);
      console.log(`DELETE ${key}: ok`);
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
    } catch (err) {
      console.error(`DELETE ${key} error:`, err.message);
      return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers });
    }
  }

  return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers });
};

export const config = { path: "/api/storage" };
