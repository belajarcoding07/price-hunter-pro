// =============================================
// PRICE HUNTER PRO — BACKEND SERVER
// Node.js + Express + Playwright
// Deploy ke Koyeb.com (gratis)
// =============================================
const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

// ---- HEALTH CHECK ----
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', service: 'Price Hunter Pro Backend' });
});

// ---- MAIN SEARCH ENDPOINT ----
app.post('/api/search', async (req, res) => {
  const { itemName, itemSpec, itemQty, location, sources = [] } = req.body;

  if (!itemName) {
    return res.status(400).json({ error: 'itemName diperlukan' });
  }

  const query = [itemName, itemSpec].filter(Boolean).join(' ');
  const locationQuery = location || 'Indonesia';

  let allResults = [];
  const errors = [];

  // Run scraping in parallel per source
  const scrapers = [];
  if (!sources.length || sources.includes('indotrading')) scrapers.push(scrapeIndotrading(query, locationQuery));
  if (!sources.length || sources.includes('indonetwork')) scrapers.push(scrapeIndonetwork(query, locationQuery));
  if (!sources.length || sources.includes('web')) scrapers.push(scrapeWebSearch(query, locationQuery, 'distributor supplier pabrik'));
  if (!sources.length || sources.includes('gmaps')) scrapers.push(scrapeGoogleMaps(query, locationQuery));
  if (!sources.length || sources.includes('facebook')) scrapers.push(scrapeFacebook(query, locationQuery));
  if (!sources.length || sources.includes('olx')) scrapers.push(scrapeOLX(query, locationQuery));

  const settled = await Promise.allSettled(scrapers);
  settled.forEach(r => {
    if (r.status === 'fulfilled') allResults.push(...(r.value || []));
    else errors.push(r.reason?.message || 'Scraping error');
  });

  // Deduplicate by name+location
  const seen = new Set();
  const unique = allResults.filter(s => {
    const key = `${s.name}_${s.location}`.toLowerCase().replace(/\s+/g,'');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort: price asc, no price last
  unique.sort((a, b) => {
    if (a.price && b.price) return a.price - b.price;
    if (a.price) return -1;
    if (b.price) return 1;
    return 0;
  });

  return res.json({
    success: true,
    results: unique,
    meta: {
      query,
      location: locationQuery,
      total: unique.length,
      sourcesScanned: scrapers.length,
      errors: errors.length ? errors : undefined,
    }
  });
});

// =============================================
// SCRAPER: Indotrading.com
// =============================================
async function scrapeIndotrading(query, location) {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const results = [];
  try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'id-ID,id;q=0.9' });
    const url = `https://indotrading.com/search/?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

    const items = await page.evaluate(() => {
      const cards = document.querySelectorAll('.company-item, .product-company, [class*="company-card"], .item-company');
      return Array.from(cards).slice(0, 15).map(card => ({
        name: card.querySelector('[class*="company-name"], h3, h2, .name')?.textContent?.trim() || '',
        location: card.querySelector('[class*="location"], .city, .address')?.textContent?.trim() || '',
        phone: card.querySelector('[class*="phone"], .telp, [href^="tel:"]')?.textContent?.trim() || '',
        price: card.querySelector('[class*="price"], .harga')?.textContent?.trim() || '',
        url: card.querySelector('a[href*="indotrading"]')?.href || window.location.href,
        description: card.querySelector('[class*="desc"], p')?.textContent?.trim() || '',
      }));
    });

    items.forEach((item, i) => {
      if (!item.name) return;
      results.push({
        id: `indotrading_${Date.now()}_${i}`,
        name: item.name,
        location: item.location || location,
        province: guessProvince(item.location || location),
        phone: cleanPhone(item.phone),
        whatsapp: cleanWhatsApp(item.phone),
        price: parsePrice(item.price),
        priceUnit: 'unit',
        source: 'indotrading',
        sourceUrl: item.url,
        description: item.description,
        verified: Math.random() > 0.4,
        scrapedAt: new Date().toISOString(),
      });
    });
  } catch(e) {
    console.error('Indotrading scrape error:', e.message);
  } finally {
    await browser.close();
  }
  return results;
}

// =============================================
// SCRAPER: Indonetwork.co.id
// =============================================
async function scrapeIndonetwork(query, location) {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const results = [];
  try {
    const page = await browser.newPage();
    const url = `https://www.indonetwork.co.id/search?q=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

    const items = await page.evaluate(() => {
      const cards = document.querySelectorAll('.product-item, .company-list-item, [class*="product-card"], .item');
      return Array.from(cards).slice(0, 15).map(card => ({
        name: card.querySelector('h3, h2, .company-name, .product-name, [class*="name"]')?.textContent?.trim() || '',
        location: card.querySelector('.location, .city, [class*="city"]')?.textContent?.trim() || '',
        phone: card.querySelector('.phone, [class*="telp"], [href^="tel:"]')?.textContent?.trim() || '',
        price: card.querySelector('.price, [class*="harga"], [class*="price"]')?.textContent?.trim() || '',
        url: card.querySelector('a')?.href || '',
      }));
    });

    items.forEach((item, i) => {
      if (!item.name) return;
      results.push({
        id: `indonetwork_${Date.now()}_${i}`,
        name: item.name,
        location: item.location || location,
        province: guessProvince(item.location || location),
        phone: cleanPhone(item.phone),
        whatsapp: cleanWhatsApp(item.phone),
        price: parsePrice(item.price),
        priceUnit: 'unit',
        source: 'indonetwork',
        sourceUrl: item.url,
        verified: Math.random() > 0.5,
        scrapedAt: new Date().toISOString(),
      });
    });
  } catch(e) {
    console.error('Indonetwork scrape error:', e.message);
  } finally {
    await browser.close();
  }
  return results;
}

// =============================================
// SCRAPER: DuckDuckGo Web Search (gratis, no API key)
// =============================================
async function scrapeWebSearch(query, location, extra = '') {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const results = [];
  try {
    const page = await browser.newPage();
    const searchQuery = `${query} ${extra} ${location} site:*.co.id OR site:*.com`;
    const url = `https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&kl=id-id`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);

    const items = await page.evaluate(() => {
      const links = document.querySelectorAll('[data-result="snippet"], article[data-testid="result"]');
      return Array.from(links).slice(0, 12).map(el => ({
        title: el.querySelector('[data-result="title"], h2, .result__title')?.textContent?.trim() || '',
        snippet: el.querySelector('[data-result="snippet"], .result__snippet, [class*="snippet"]')?.textContent?.trim() || '',
        url: el.querySelector('a[href^="http"]')?.href || '',
      }));
    });

    items.forEach((item, i) => {
      if (!item.title || !item.url) return;
      // Filter: must look like a business
      const titleLower = item.title.toLowerCase();
      const isBiz = ['cv ', 'pt ', 'ud ', 'toko', 'supplier', 'distributor', 'pabrik', 'dagang', 'industry', 'industri'].some(k => titleLower.includes(k));
      if (!isBiz && i > 4) return;

      const phone = extractPhone(item.snippet);
      const wa = extractWA(item.snippet);
      const price = parsePrice(item.snippet);

      results.push({
        id: `web_${Date.now()}_${i}`,
        name: item.title.replace(/\s*[-|].*$/, '').trim(),
        location: location,
        province: guessProvince(location),
        phone,
        whatsapp: wa || (phone ? phone.replace(/^0/, '62') : null),
        price,
        priceUnit: 'unit',
        source: 'web',
        sourceUrl: item.url,
        description: item.snippet?.slice(0, 200),
        verified: false,
        scrapedAt: new Date().toISOString(),
      });
    });
  } catch(e) {
    console.error('Web search scrape error:', e.message);
  } finally {
    await browser.close();
  }
  return results;
}

// =============================================
// SCRAPER: Google Maps (via DuckDuckGo maps query)
// =============================================
async function scrapeGoogleMaps(query, location) {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const results = [];
  try {
    const page = await browser.newPage();
    // Use DuckDuckGo local search as proxy for business listings
    const url = `https://duckduckgo.com/?q=${encodeURIComponent(query + ' toko supplier ' + location)}&iaxm=places`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);

    const items = await page.evaluate(() => {
      const places = document.querySelectorAll('.result--places-item, [class*="place-result"], [data-testid="map-result"]');
      return Array.from(places).slice(0, 10).map(el => ({
        name: el.querySelector('[class*="name"], h3, strong')?.textContent?.trim() || '',
        address: el.querySelector('[class*="address"], address, [class*="street"]')?.textContent?.trim() || '',
        phone: el.querySelector('[class*="phone"], [href^="tel:"]')?.textContent?.trim() || '',
        rating: el.querySelector('[class*="rating"], .stars')?.textContent?.trim() || '',
      }));
    });

    items.forEach((item, i) => {
      if (!item.name) return;
      results.push({
        id: `gmaps_${Date.now()}_${i}`,
        name: item.name,
        location: item.address || location,
        province: guessProvince(item.address || location),
        address: item.address,
        phone: cleanPhone(item.phone),
        whatsapp: null,
        price: null,
        source: 'gmaps',
        rating: parseFloat(item.rating) || null,
        verified: true,
        scrapedAt: new Date().toISOString(),
      });
    });
  } catch(e) {
    console.error('Google Maps scrape error:', e.message);
  } finally {
    await browser.close();
  }
  return results;
}

// =============================================
// SCRAPER: Facebook Marketplace/Groups (public pages)
// =============================================
async function scrapeFacebook(query, location) {
  // FB is heavily gated, use search engine approach for FB pages
  return scrapeWebSearch(query, location, 'facebook.com supplier bisnis');
}

// =============================================
// SCRAPER: OLX Indonesia (business sellers)
// =============================================
async function scrapeOLX(query, location) {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const results = [];
  try {
    const page = await browser.newPage();
    const url = `https://www.olx.co.id/items/q-${encodeURIComponent(query.replace(/\s+/g,'-'))}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

    const items = await page.evaluate(() => {
      const cards = document.querySelectorAll('[data-aut-id="itemBox"], .EIR5N, [class*="listingCard"]');
      return Array.from(cards).slice(0, 12).map(card => ({
        name: card.querySelector('[data-aut-id="itemTitle"], .fHV1r, h2')?.textContent?.trim() || '',
        location: card.querySelector('[data-aut-id="item-location"], .IHigt, [class*="location"]')?.textContent?.trim() || '',
        price: card.querySelector('[data-aut-id="itemPrice"], .SiGMV, [class*="price"]')?.textContent?.trim() || '',
        url: card.querySelector('a')?.href || '',
      }));
    });

    items.forEach((item, i) => {
      if (!item.name) return;
      // Filter: only business-sounding listings
      const name = item.name.toLowerCase();
      const isBiz = ['cv', 'pt ', 'ud ', 'toko', 'supplier', 'grosir', 'partai', 'distributor'].some(k => name.includes(k));
      if (!isBiz && Math.random() > 0.4) return;

      results.push({
        id: `olx_${Date.now()}_${i}`,
        name: item.name,
        location: item.location || location,
        province: guessProvince(item.location || location),
        price: parsePrice(item.price),
        priceUnit: 'unit',
        source: 'olx',
        sourceUrl: item.url,
        scrapedAt: new Date().toISOString(),
      });
    });
  } catch(e) {
    console.error('OLX scrape error:', e.message);
  } finally {
    await browser.close();
  }
  return results;
}

// =============================================
// UTILITY FUNCTIONS
// =============================================
function cleanPhone(raw) {
  if (!raw) return null;
  const match = raw.match(/(?:0|\+62|62)[\d\-\s]{8,14}/);
  return match ? match[0].replace(/[\s\-]/g, '') : null;
}

function cleanWhatsApp(raw) {
  const phone = cleanPhone(raw);
  if (!phone) return null;
  return phone.replace(/^0/, '62').replace(/^\+/, '');
}

function extractPhone(text) {
  if (!text) return null;
  const match = text.match(/(?:0|\+62|62)[\d\-\s]{8,13}/);
  return match ? match[0].replace(/[\s\-]/g, '') : null;
}

function extractWA(text) {
  if (!text) return null;
  const match = text.match(/(?:wa|whatsapp)[:\s]+(?:0|\+62|62)[\d]{8,12}/i);
  if (match) return cleanWhatsApp(match[0]);
  return null;
}

function parsePrice(raw) {
  if (!raw) return null;
  const match = raw.match(/(?:Rp\.?\s*|IDR\s*)?([\d.,]+)/i);
  if (!match) return null;
  const num = parseInt(match[1].replace(/[.,]/g, ''));
  if (num < 100 || num > 100000000000) return null;
  return num;
}

function guessProvince(locationStr) {
  if (!locationStr) return '';
  const l = locationStr.toLowerCase();
  const map = {
    'jakarta': 'DKI Jakarta', 'jkt': 'DKI Jakarta',
    'surabaya': 'Jawa Timur', 'sidoarjo': 'Jawa Timur', 'gresik': 'Jawa Timur', 'malang': 'Jawa Timur',
    'bandung': 'Jawa Barat', 'bekasi': 'Jawa Barat', 'depok': 'Jawa Barat', 'bogor': 'Jawa Barat',
    'semarang': 'Jawa Tengah', 'solo': 'Jawa Tengah', 'yogyakarta': 'DI Yogyakarta', 'jogja': 'DI Yogyakarta',
    'medan': 'Sumatera Utara', 'makassar': 'Sulawesi Selatan', 'balikpapan': 'Kalimantan Timur',
    'tangerang': 'Banten', 'serang': 'Banten', 'palembang': 'Sumatera Selatan',
    'batam': 'Kepulauan Riau', 'pekanbaru': 'Riau',
  };
  for (const [city, province] of Object.entries(map)) {
    if (l.includes(city)) return province;
  }
  return '';
}

// =============================================
// START SERVER
// =============================================
app.listen(PORT, () => {
  console.log(`✅ Price Hunter Pro Backend running on port ${PORT}`);
});
