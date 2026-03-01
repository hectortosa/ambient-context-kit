import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(import.meta.dir, ".env") });

const ATTIO_API_KEY = process.env.ATTIO_API_KEY;
const BASE_URL = "https://api.attio.com/v2";

if (!ATTIO_API_KEY) {
  console.error(JSON.stringify({
    error: true,
    message: "ATTIO_API_KEY not found"
  }));
  process.exit(1);
}

try {
  // Fetch all companies
  const response = await fetch(`${BASE_URL}/objects/companies/records/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ATTIO_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      limit: 100
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

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    totalCompanies: data.data?.length || 0,
    companies: data.data?.map((c: any) => ({
      id: c.id?.record_id,
      name: c.values?.name?.[0]?.value,
      domains: c.values?.domains?.[0]?.domain,
      website: c.values?.website?.[0]?.value,
      status: c.values?.status?.[0]?.value,
      created_at: c.created_at,
      updated_at: c.updated_at
    })) || []
  }, null, 2));

} catch (err) {
  console.error(JSON.stringify({
    error: true,
    message: "Request failed",
    details: err instanceof Error ? err.message : String(err)
  }));
  process.exit(1);
}
