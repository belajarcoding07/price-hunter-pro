const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const SERP_API_KEY = process.env.SERP_API_KEY;

app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: '4.0.0', 
    service: 'Price Hunter Pro Backend',
    serp_api: SERP_API_KEY ? 'Connected' : 'Missing!'
  });
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

async function searchWithSerp(query, location) {
  try {
    if (!SERP_API_KEY) return [];
    const q = encodeURIComponent(`${query} supplier distributor ${location} Indonesia`);
    const url = `https://serpapi.com/search.json?q=${q}&location=Indonesia&hl=id&gl=id&api_key=${SERP_API_KEY}&num=10`;
    
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const data = await response.json();
    
    if (!data.organic_results) return [];
    
    return data.organic_results.map((item, i) => {
      const phone = extractPhone(item.snippet || '');
      return {
        id: `serp_${Date.now()}_${i}`,
        name: (item.title || '').replace(/\s*[-|].*$/, '').trim(),
        location: location,
        province: guessProvince(location),
        phone: phone,
        whatsapp: phone ? phone.replace(/^0/, '62') : null,
        price: null,
        priceUnit: 'unit',
        source: 'google',
        sourceUrl: item.link,
        snippet: item.snippet,
        scrapedAt: new Date().toISOString(),
      };
    });
  } catch (e) {
    console.error('SerpAPI error:', e.message);
    return [];
  }
}

async function handleSearch(req, res) {
  const { itemName, itemSpec, itemQty, location } = 
    req.method === 'GET' ? req.query : req.body;
  
  if (!itemName) return res.status(400).json({ error: 'itemName diperlukan' });
  
  const query = [itemName, itemSpec].filter(Boolean).join(' ');
  const locationQuery = location || 'Indonesia';
  console.log(`Searching: "${query}" in "${locationQuery}"`);
  
  try {
    const results = await searchWithSerp(query, locationQuery);
    
    const seen = new Set();
    const unique = results.filter(s => {
      const key = s.name.toLowerCase().replace(/\s+/g, '');
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
}

app.get('/api/search', handleSearch);
app.post('/api/search', handleSearch);

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
  console.log(`SerpAPI: ${SERP_API_KEY ? 'Connected' : 'Missing!'}`);
});
