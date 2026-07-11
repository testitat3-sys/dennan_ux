const fs = require('fs');
const { execSync } = require('child_process');

const isProd = process.argv.includes('--prod');

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

// Helper to slugify product names
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start
    .replace(/-+$/, '');            // Trim - from end
}

// 3. Load and map more_tommee_tippee.json
console.log('Loading more_tommee_tippee.json...');
const rawData = JSON.parse(fs.readFileSync('more_tommee_tippee.json', 'utf8'));

const usedSlugs = new Set();
const products = rawData.map((item) => {
  const name = item.new_name || item.old_name;
  let slug = slugify(name);
  if (usedSlugs.has(slug)) {
    slug = `${slug}-${item.barcode}`;
  }
  usedSlugs.add(slug);

  return {
    name,
    brand: 'Tommee Tippee',
    slug,
    barcode: item.barcode,
    price: item.price,
    originalPrice: item.price,
    stage: item.stage,
    category: item.category,
    subCategory: item.subCategory,
    description: item.description || '',
    tags: (item.tags || []).map((t) => ({ type: 'general', text: t })),
    specifications: [],
    isActive: true,
    actual_data: true,
    inventory: item.inventory || 0,
    size: item.size,
    minMonth: item.minMonth,
  };
});

console.log(`Loaded and processed ${products.length} products. Uploading...`);

// 4. Send data
async function uploadBatch() {
  try {
    const response = await fetch(`${siteUrl}/api/import-products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${staffAuthSalt}`
      },
      body: JSON.stringify({ products })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const result = await response.json();
    console.log(`Upload successful. Added: ${result.added}, Updated: ${result.updated}`);
  } catch (err) {
    console.error('Error uploading products:', err.message);
    process.exit(1);
  }
}

uploadBatch();
