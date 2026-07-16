const fs = require('fs');
const { execSync } = require('child_process');

const inputFile = process.argv[2];
const isProd = process.argv.includes('--prod');

if (!inputFile) {
  console.error('Usage: node scripts/push_old_names.cjs <input.json> [--prod]');
  process.exit(1);
}

// 1. Parse .env.local for STAFF_AUTH_SALT
let staffAuthSalt = 'dennan-secure-salt-2026';
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const match = envContent.match(/^STAFF_AUTH_SALT\s*=\s*['"]?([^'"\r\n]+)['"]?/m);
  if (match) {
    staffAuthSalt = match[1];
  }
}

// 2. Fetch Convex site URL
console.log(`Fetching Convex environment details for ${isProd ? 'production' : 'development'}...`);
let siteUrl = '';
try {
  const cmd = isProd ? 'npx convex run --prod inspect:getEnv' : 'npx convex run inspect:getEnv';
  const envOutput = execSync(cmd).toString().trim();
  const jsonStartIndex = envOutput.indexOf('{');
  const jsonEndIndex = envOutput.lastIndexOf('}');
  if (jsonStartIndex === -1 || jsonEndIndex === -1) {
    throw new Error(`Could not locate JSON in output: ${envOutput}`);
  }
  const envJsonStr = envOutput.substring(jsonStartIndex, jsonEndIndex + 1);
  const envObj = JSON.parse(envJsonStr);
  siteUrl = envObj.CONVEX_SITE_URL;
  if (!siteUrl) {
    throw new Error('CONVEX_SITE_URL is empty in the response.');
  }
  console.log(`Target Convex Site URL: ${siteUrl}`);
} catch (err) {
  console.error('Error fetching environment details from Convex:', err.message);
  process.exit(1);
}

// 3. Load products
console.log(`Loading ${inputFile}...`);
const products = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
console.log(`Loaded ${products.length} products. Starting batch uploads...`);

// 4. Send data in batches
const BATCH_SIZE = 100;
const totalBatches = Math.ceil(products.length / BATCH_SIZE);

async function uploadBatches() {
  let totalAdded = 0;
  let totalUpdated = 0;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const batchIndex = Math.floor(i / BATCH_SIZE) + 1;

    console.log(`Uploading batch ${batchIndex}/${totalBatches} (${batch.length} products)...`);

    try {
      const response = await fetch(`${siteUrl}/api/import-products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${staffAuthSalt}`
        },
        body: JSON.stringify({ products: batch })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const result = await response.json();
      totalAdded += result.added;
      totalUpdated += result.updated;
      console.log(`Batch ${batchIndex} uploaded successfully. Added: ${result.added}, Updated: ${result.updated}`);
    } catch (err) {
      console.error(`Error uploading batch ${batchIndex}:`, err.message);
      console.error('Upload aborted.');
      process.exit(1);
    }
  }

  console.log(`All products uploaded successfully! Total added: ${totalAdded}, Total updated: ${totalUpdated}`);
}

uploadBatches();
