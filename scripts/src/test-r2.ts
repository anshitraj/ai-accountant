const baseUrl = process.env.API_BASE_URL || "http://localhost:8080";
const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/health`);

if (!response.ok && response.status !== 503) {
  throw new Error(`Health check failed with HTTP ${response.status}`);
}

const body = await response.json() as { r2?: string };
if (body.r2 !== "ok") throw new Error("R2 health check returned error");
console.log("R2 health: ok");

export {};
