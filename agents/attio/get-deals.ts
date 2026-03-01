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

const companyRecordId = process.argv[2];

if (!companyRecordId) {
  console.error(JSON.stringify({
    error: true,
    message: "Missing company record ID",
    usage: "bun run get-deals.ts <company_record_id>",
    example: "bun run get-deals.ts abc123"
  }));
  process.exit(1);
}

try {
  // Query deals that are linked to this company
  const response = await fetch(`${BASE_URL}/objects/deals/records/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ATTIO_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      filter: {
        "associated_company": {
          "target_record_id": {
            "$eq": companyRecordId
          }
        }
      },
      limit: 50
    })
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
