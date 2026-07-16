const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Setup mode and flags
const mode = process.argv[2]; // 'tommee' or 'store'
const isProd = process.argv.includes('--prod');

if (!mode || (mode !== 'tommee' && mode !== 'store')) {
  console.error('Usage: node scripts/push_data.cjs <tommee|store> [--prod]');
  process.exit(1);
}

// 2. Parse .env.local for STAFF_AUTH_SALT
let staffAuthSalt = 'dennan-secure-salt-2026';
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const match = envContent.match(/^STAFF_AUTH_SALT\s*=\s*['"]?([^'"\r\n]+)['"]?/m);
  if (match) {
    staffAuthSalt = match[1];
  }
}

// 3. Fetch Convex site URL
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

// Build a lookup map of barcode -> details (images, wasPrice, originalPrice, etc.) for Tommee Tippee products
const lookupMap = {};
const jsonFiles = [
  'convex_products.json',
  'products_store.json',
  'new_sample_product_data.json',
  'close_matches_with_details.json',
  'convex/storeOnlyProductsData.json'
];

for (const fileName of jsonFiles) {
  const filePath = path.resolve(fileName);
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.barcode) {
            lookupMap[item.barcode] = {
              ...lookupMap[item.barcode],
              ...item
            };
          }
        }
      }
    } catch (e) {
      console.warn(`Warning: failed to parse ${fileName}: ${e.message}`);
    }
  }
}

// 4. Load the target data and process it
let products = [];

if (mode === 'tommee') {
  console.log('Loading tommee_tippee_processed.json...');
  const rawData = JSON.parse(fs.readFileSync('tommee_tippee_processed.json', 'utf8'));
  
  for (const item of rawData) {
    const barcode = item.barcode;
    const lookup = lookupMap[barcode] || {};
    
    // We strictly use the price from tommee_tippee_processed.json if it exists,
    // otherwise fallback to lookup, and default to 0.
    const price = item.price !== undefined ? item.price : (lookup.price || 0);
    if (price === 0) {
      console.warn(`Warning: No price found for product ${item.new_name} (${barcode})`);
    }

    const name = item.new_name || item.old_name;
    const specifications = lookup.specifications || [];

    const mappedProduct = {
      name: name,
      old_name: item.old_name,
      brand: 'Tommee Tippee',
      slug: slugify(name),
      barcode: barcode,
      price: price,
      originalPrice: price, // Set originalPrice equal to price
      wasPrice: lookup.wasPrice,
      discountPrice: lookup.discountPrice,
      image: lookup.image,
      images: lookup.images,
      stage: item.stage,
      tier: lookup.tier || 'essentials',
      category: item.category,
      subCategory: item.subCategory,
      description: item.description || '',
      tags: (item.tags || []).map(t => ({ type: 'general', text: t })),
      specifications: specifications,
      isActive: true,
      actual_data: true,
      inventory: item.inventory || 0,
      size: item.size || lookup.size,
      color: item.color || lookup.color,
    };
    
    products.push(mappedProduct);
  }
} else if (mode === 'store') {
  console.log('Loading dennan_catalog_cleaned.json...');
  const rawData = JSON.parse(fs.readFileSync('dennan_catalog_cleaned.json', 'utf8'));

  for (const item of rawData) {
    const barcode = item.barcode;
    const name = item.new_name || item.old_name;
    const price = item.price || 0;

    // Preserving all existing specifications and appending { label: "for-store-only", value: "true" }
    const specifications = item.specifications ? [...item.specifications] : [];
    if (!specifications.some(s => s.label === 'for-store-only')) {
      specifications.push({ label: 'for-store-only', value: 'true' });
    }

    // Preserve existing tags and append the general "Store Only" tag
    const tags = (item.tags || []).map(t => ({ type: 'general', text: t }));
    if (!tags.some(t => t.text === 'Store Only')) {
      tags.push({ type: 'general', text: 'Store Only' });
    }

    const mappedProduct = {
      name: name,
      old_name: item.old_name,
      brand: 'Generic', // Forced to Generic
      slug: `${slugify(name)}-${barcode}`, // Unique slug using barcode suffix
      barcode: barcode,
      price: price,
      originalPrice: item.originalPrice || price,
      wasPrice: item.wasPrice,
      discountPrice: item.discountPrice,
      image: item.image,
      images: item.images,
      stage: item.stage,
      tier: item.tier || 'essentials',
      category: item.category,
      subCategory: item.subCategory,
      description: 'Physical store only product.', // Forced description
      tags: tags,
      specifications: specifications,
      isActive: true,
      actual_data: true,
      inventory: item.inventory || 0,
      size: item.size,
      color: item.color,
    };

    products.push(mappedProduct);
  }
}

console.log(`Loaded and processed ${products.length} products. Starting batch uploads...`);

// 5. Send data in batches
const BATCH_SIZE = 100;
const totalBatches = Math.ceil(products.length / BATCH_SIZE);

async function uploadBatches() {
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
      console.log(`Batch ${batchIndex} uploaded successfully. Added: ${result.added}, Updated: ${result.updated}`);
    } catch (err) {
      console.error(`Error uploading batch ${batchIndex}:`, err.message);
      console.error('Upload aborted.');
      process.exit(1);
    }
  }
  
  console.log('All products uploaded successfully!');
}

uploadBatches();
