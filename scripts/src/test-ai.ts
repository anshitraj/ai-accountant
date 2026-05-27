const baseUrl = process.env.API_BASE_URL || "http://localhost:8080";

const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/dev/test-ai`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({}),
});

if (!response.ok) {
  throw new Error(`AI test failed with HTTP ${response.status}`);
}

const body = await response.json() as { jsonValidation?: string; fallbackChain?: string };
console.log(`AI test: ${body.jsonValidation ?? "unknown"} (${body.fallbackChain ?? "unknown"})`);

export {};
