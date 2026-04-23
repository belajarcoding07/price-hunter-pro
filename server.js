const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;

app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: '3.1.0', 
    service: 'Price Hunter Pro Backend',
    google_api: GOOGLE_API_KEY ? 'Connected' : 'Missing!',
    google_cse: GOOGLE_CSE_ID ? 'Connected' : 'Missing!'
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

async function searchGoogle(query, location) {
  try {
    if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
      console.error('Google API credentials missing');
      return [];
    }
    const searchQuery = encodeURIComponent(`${query} supplier distributor ${location} Indonesia`);
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CSE_ID}&q=${searchQuery}&num=10&lr=lang_id`;
    
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const data = await response.json();
    
    if (!data.items) {
      console.log('No results from Google:', data.error?.message || JSON.stringify(data));
      return [];
    }
    
    return data.items.map((item, i) => {
      const phone = extractPhone(item.snippet);
      return {
        id: `google_${Date.now()}_${i}`,
        name: item.title.replace(/\s*[-|].*$/, '').trim(),
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
    console.error('Google search error:', e.message);
    return [];
  }
}

async function searchGoogleMaps(query, location) {
  try {
    if (!GOOGLE_API_KEY) return [];
    const searchQuery = encodeURIComponent(`${query} supplier ${location}`);
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${searchQuery}&key=${GOOGLE_API_KEY}&language=id&region=id`;
    
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const data = await response.json();
    
    if (!data.results) return [];
    
    return data.results.slice(0, 5).map((place, i) => ({
      id: `maps_${Date.now()}_${i}`,
      name: place.name,
      location: place.formatted_address || location,
      province: guessProvince(location),
      phone: null,
      whatsapp: null,
      price: null,
      priceUnit: 'unit',
      rating: place.rating,
      source: 'googlemaps',
      sourceUrl: `https://maps.google.com/?place_id=${place.place_id}`,
      scrapedAt: new Date().toISOString(),
    }));
  } catch (e) {
    console.error('Google Maps error:', e.message);
    return [];
  }
}

// Support both GET and POST untuk /api/search
async function handleSearch(req, res) {
  const { itemName, itemSpec, itemQty, location, sources = [] } = 
    req.method === 'GET' ? req.query : req.body;
  
  if (!itemName) return res.status(400).json({ error: 'itemName diperlukan' });
  
  const query = [itemName, itemSpec].filter(Boolean).join(' ');
  const locationQuery = location || 'Indonesia';
  console.log(`Searching: "${query}" in "${locationQuery}"`);
  
  try {
    const scrapers = [
      searchGoogle(query, locationQuery),
      searchGoogleMaps(query, locationQuery),
    ];
    
    const settled = await Promise.allSettled(scrapers);
    let allResults = [];
    settled.forEach(r => {
      if (r.status === 'fulfilled') allResults.push(...(r.value || []));
    });
    
    const seen = new Set();
    const unique = allResults.filter(s => {
      const key = `${s.name}`.toLowerCase().replace(/\s+/g, '');
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
  console.log(`Google API: ${GOOGLE_API_KEY ? 'Connected' : 'Missing!'}`);
  console.log(`Google CSE: ${GOOGLE_CSE_ID ? 'Connected' : 'Missing!'}`);
});
