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
  // Fetch all deals
  const response = await fetch(`${BASE_URL}/objects/deals/records/query`, {
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

  // Calculate date 9 days ago
  const today = new Date();
  const nineDaysAgo = new Date(today.getTime() - 9 * 24 * 60 * 60 * 1000);

  // Filter for recently updated deals
  const recentDeals = data.data?.filter((deal: any) => {
    const updatedAt = deal.updated_at;
    return updatedAt && new Date(updatedAt) > nineDaysAgo;
  }) || [];

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    nineDaysAgoThreshold: nineDaysAgo.toISOString(),
    totalDeals: data.data?.length || 0,
    recentCount: recentDeals.length,
    deals: recentDeals,
    allDeals: data.data || []
  }, null, 2));

} catch (err) {
  console.error(JSON.stringify({
    error: true,
    message: "Request failed",
    details: err instanceof Error ? err.message : String(err)
  }));
  process.exit(1);
}
