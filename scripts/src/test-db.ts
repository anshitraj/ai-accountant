const baseUrl = process.env.API_BASE_URL || "http://localhost:8080";
const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/health`);

if (!response.ok && response.status !== 503) {
  throw new Error(`Health check failed with HTTP ${response.status}`);
}

const body = await response.json() as { db?: string };
if (body.db !== "ok") throw new Error("Database health check returned error");
console.log("Database health: ok");

export {};
