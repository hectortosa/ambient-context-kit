import { config } from "dotenv";
import { resolve } from "path";

// Load .env from script directory
config({ path: resolve(import.meta.dir, ".env") });

const ATTIO_API_KEY = process.env.ATTIO_API_KEY;
const BASE_URL = "https://api.attio.com/v2";

if (!ATTIO_API_KEY) {
  console.error(JSON.stringify({
    error: true,
    message: "ATTIO_API_KEY not found",
    suggestion: "Create agents/attio/.env with ATTIO_API_KEY=your_key"
  }));
  process.exit(1);
}

const objectType = process.argv[2]; // companies, deals
const recordId = process.argv[3];

if (!objectType || !recordId) {
  console.error(JSON.stringify({
    error: true,
    message: "Missing arguments",
    usage: "bun run get-record.ts <object_type> <record_id>",
    example: "bun run get-record.ts companies abc123"
  }));
  process.exit(1);
}

const validObjects = ["companies", "deals"];
if (!validObjects.includes(objectType)) {
  console.error(JSON.stringify({
    error: true,
    message: `Invalid object type: ${objectType}`,
    validTypes: validObjects
  }));
  process.exit(1);
}

try {
  const response = await fetch(`${BASE_URL}/objects/${objectType}/records/${recordId}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${ATTIO_API_KEY}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(JSON.stringify({
      error: true,
      message: `API error: ${response.status}`,
      details: error
    }));
    process.exit(1);
  }

  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));

} catch (err) {
  console.error(JSON.stringify({
    error: true,
    message: "Request failed",
    details: err instanceof Error ? err.message : String(err)
  }));
  process.exit(1);
}
