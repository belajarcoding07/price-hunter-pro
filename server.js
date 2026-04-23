const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0', service: 'Price Hunter Pro Backend' });
});

function extractPhone(text) {
  if (!text) return null;
  const match = text.match(/(\+62|62|0)[0-9\-\s]{8,14}/);
  return match ? match[0].replace(/\s/g, '') : null;
}

function guessProvince(location) {
  const map = {
    'jakarta': 'DKI Jakarta', 'bandung': 'Jawa Barat', 'surabaya': 'Jawa Timur',
    'medan': 'Sumatera Utara', 'makassar': 'Sulawesi Selatan', 'semarang': 'Jawa Tengah',
    'yogyakarta': 'DIY', 'bali': 'Bali', 'denpasar': 'Bali', 'palembang': 'Sumatera Selatan',
    'balikpapan': 'Kalimantan Timur', 'pontianak': 'Kalimantan Barat',
  };
  const loc = (location || '').toLowerCase();
  for (const [key, val] of Object.entries(map)) {
    if (loc.includes(key)) return val;
  }
  return location || 'Indonesia';
}

async function searchDuckDuckGo(query, location) {
  try {
    const searchQuery = encodeURIComponent(`${query} supplier distributor ${location} Indonesia`);
    const url = `https://html.duckduckgo.com/html/?q=${searchQuery}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html' }
    });
    const html = await response.text();
    const results = [];
    const resultRegex = /<a class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g;
    const snippetRegex = /<a class="result__snippet"[^>]*>([^<]*)<\/a>/g;
    const links = [...html.matchAll(resultRegex)].slice(0, 10);
    const snippets = [...html.matchAll(snippetRegex)].map(m => m[1]);
    links.forEach((match, i) => {
      const url = match[1];
      const title = match[2].trim();
      const snippet = snippets[i] || '';
      if (!title || !url) return;
      const phone = extractPhone(snippet);
      results.push({
        id: `ddg_${Date.now()}_${i}`,
        name: title,
        location: location,
        province: guessProvince(location),
        phone: phone,
        whatsapp: phone ? phone.replace(/^0/, '62') : null,
        price: null,
        priceUnit: 'unit',
        source: 'web',
        sourceUrl: url,
        snippet: snippet,
        scrapedAt: new Date().toISOString(),
      });
    });
    return results;
  } catch (e) {
    console.error('DuckDuckGo error:', e.message);
    return [];
  }
}

async function searchIndotrading(query, location) {
  try {
    const searchQuery = encodeURIComponent(query);
    const url = `https://indotrading.com/search/?keywords=${searchQuery}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html' },
      signal: AbortSignal.timeout(10000)
    });
    const html = await response.text();
    const results = [];
    const companyRegex = /href="(https:\/\/www\.indotrading\.com\/[^"]+)"[^>]*>([^<]{5,60})<\/a>/g;
    const matches = [...html.matchAll(companyRegex)].slice(0, 8);
    matches.forEach((match, i) => {
      const companyUrl = match[1];
      const companyName = match[2].trim();
      if (!companyName || companyName.length < 3) return;
      if (companyName.toLowerCase().includes('indotrading')) return;
      results.push({
        id: `indo_${Date.now()}_${i}`,
        name: companyName,
        location: location,
        province: guessProvince(location),
        phone: null,
        whatsapp: null,
        price: null,
        priceUnit: 'unit',
        source: 'indotrading',
        sourceUrl: companyUrl,
        scrapedAt: new Date().toISOString(),
      });
    });
    return results;
  } catch (e) {
    console.error('Indotrading error:', e.message);
    return [];
  }
}

async function searchIndonetwork(query, location) {
  try {
    const searchQuery = encodeURIComponent(query);
    const url = `https://www.indonetwork.co.id/products/${searchQuery}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html' },
      signal: AbortSignal.timeout(10000)
    });
    const html = await response.text();
    const results = [];
    const nameRegex = /<h\d[^>]*class="[^"]*(?:product|company|title)[^"]*"[^>]*>([^<]{5,80})<\/h\d>/gi;
    const matches = [...html.matchAll(nameRegex)].slice(0, 8);
    matches.forEach((match, i) => {
      const name = match[1].trim();
      if (!name || name.length < 3) return;
      results.push({
        id: `idn_${Date.now()}_${i}`,
        name: name,
        location: location,
        province: guessProvince(location),
        phone: null,
        whatsapp: null,
        price: null,
        priceUnit: 'unit',
        source: 'indonetwork',
        sourceUrl: url,
        scrapedAt: new Date().toISOString(),
      });
    });
    return results;
  } catch (e) {
    console.error('Indonetwork error:', e.message);
    return [];
  }
}

app.post('/api/search', async (req, res) => {
  const { itemName, itemSpec, itemQty, location, sources = [] } = req.body;
  if (!itemName) return res.status(400).json({ error: 'itemName diperlukan' });
  const query = [itemName, itemSpec].filter(Boolean).join(' ');
  const locationQuery = location || 'Indonesia';
  console.log(`Searching: "${query}" in "${locationQuery}"`);
  try {
    const scrapers = [];
    if (!sources.length || sources.includes('web')) scrapers.push(searchDuckDuckGo(query, locationQuery));
    if (!sources.length || sources.includes('indotrading')) scrapers.push(searchIndotrading(query, locationQuery));
    if (!sources.length || sources.includes('indonetwork')) scrapers.push(searchIndonetwork(query, locationQuery));
    const settled = await Promise.allSettled(scrapers);
    let allResults = [];
    settled.forEach(r => { if (r.status === 'fulfilled') allResults.push(...(r.value || [])); });
    const seen = new Set();
    const unique = allResults.filter(s => {
      const key = `${s.name}_${s.location}`.toLowerCase().replace(/\s+/g, '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    console.log(`Found ${unique.length} results`);
    res.json({ success: true, query, location: locationQuery, total: unique.length, results: unique });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Gagal melakukan pencarian', detail: error.message });
  }
});

app.post('/api/sync-sheets', async (req, res) => {
  const { scriptUrl, data } = req.body;
  if (!scriptUrl) return res.status(400).json({ error: 'scriptUrl diperlukan' });
  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.text();
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ error: 'Gagal sync ke Google Sheets', detail: e.message });
  }
});

app.get('/api/sheets-data', async (req, res) => {
  const { scriptUrl } = req.query;
  if (!scriptUrl) return res.status(400).json({ error: 'scriptUrl diperlukan' });
  try {
    const response = await fetch(scriptUrl);
    const data = await response.json();
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ error: 'Gagal ambil data dari Sheets', detail: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Price Hunter Pro Backend running on port ${PORT}`);
  console.log(`Mode: Lightweight - no Chromium`);
});
