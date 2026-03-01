import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(import.meta.dir, ".env") });

const ATTIO_API_KEY = process.env.ATTIO_API_KEY;
const BASE_URL = "https://api.attio.com/v2";

console.log("API Key set:", !!ATTIO_API_KEY);
console.log("API Key length:", ATTIO_API_KEY?.length);

try {
  // Test basic connectivity
  const response = await fetch(`${BASE_URL}/workspaces`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${ATTIO_API_KEY}`,
      "Content-Type": "application/json"
    }
  });

  console.log("Response status:", response.status);
  console.log("Response headers:", Object.fromEntries(response.headers));
  
  const data = await response.json();
  console.log("Response data:", JSON.stringify(data, null, 2));

} catch (err) {
  console.error("Error:", err instanceof Error ? err.message : String(err));
}
