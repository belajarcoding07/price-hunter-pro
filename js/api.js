// =============================================
// PRICE HUNTER PRO — API MODULE
// =============================================
window.API = {

  // ---- SEARCH SUPPLIERS via backend ----
  async search({ itemName, itemSpec, itemQty, location, sources }) {
    const backendUrl = APP_CONFIG.BACKEND_URL;
    if (!backendUrl) {
      // Demo mode: return mock data
      return this._mockSearch(itemName, itemSpec, itemQty, location);
    }

    const resp = await fetch(`${backendUrl}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemName, itemSpec, itemQty, location, sources }),
    });
    if (!resp.ok) throw new Error(`Backend error: ${resp.status}`);
    return resp.json();
  },

  // ---- SYNC TO GOOGLE SHEETS ----
  async syncToSheets(data) {
    const gsUrl = APP_CONFIG.GS_URL;
    if (!gsUrl) return false;

    try {
      await fetch(gsUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return true;
    } catch(e) {
      console.warn('GS sync failed:', e);
      return false;
    }
  },

  // ---- SEND WA NOTIFICATION (Callmebot) ----
  async sendWaNotif(message) {
    const number = APP_CONFIG.WA_NUMBER;
    const apiKey = APP_CONFIG.WA_API_KEY;
    if (!number || !apiKey) return false;

    const encoded = encodeURIComponent(message);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${number}&text=${encoded}&apikey=${apiKey}`;
    try {
      await fetch(url, { mode: 'no-cors' });
      return true;
    } catch(e) {
      console.warn('WA notif failed:', e);
      return false;
    }
  },

  // ---- TEST BACKEND ----
  async testBackend(url) {
    try {
      const resp = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(5000) });
      return resp.ok;
    } catch { return false; }
  },

  // ---- TEST GS ----
  async testGS(url) {
    try {
      await fetch(url, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'ping' }) });
      return true;
    } catch { return false; }
  },

  // ---- MOCK DATA (when no backend configured) ----
  _mockSearch(itemName, itemSpec, itemQty, location) {
    const cities = ['Surabaya', 'Jakarta', 'Bandung', 'Semarang', 'Medan', 'Makassar', 'Bekasi', 'Tangerang', 'Sidoarjo', 'Gresik'];
    const sources = ['indotrading', 'indonetwork', 'gmaps', 'web', 'facebook', 'olx'];
    const suffixes = ['Jaya', 'Mandiri', 'Sukses', 'Abadi', 'Maju', 'Sentosa', 'Prima', 'Utama', 'Bersama', 'Makmur'];
    const prefixes = ['CV', 'PT', 'UD', 'Toko'];

    const count = 8 + Math.floor(Math.random() * 12);
    const results = [];

    for (let i = 0; i < count; i++) {
      const city = location || cities[Math.floor(Math.random() * cities.length)];
      const src = sources[Math.floor(Math.random() * sources.length)];
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
      const hasPrice = Math.random() > 0.35;
      const basePrice = 50000 + Math.floor(Math.random() * 950000);
      const hasPhone = Math.random() > 0.2;
      const hasWa = Math.random() > 0.35;
      const hasRating = Math.random() > 0.4;

      results.push({
        id: `supplier_${Date.now()}_${i}`,
        name: `${prefix} ${itemName.split(' ')[0]} ${suffix}`,
        location: city,
        province: this._cityToProvince(city),
        address: `Jl. Industri No. ${Math.floor(Math.random()*200)+1}, ${city}`,
        source: src,
        sourceUrl: `https://${src === 'indotrading' ? 'indotrading.com' : src === 'indonetwork' ? 'indonetwork.co.id' : 'google.com'}/supplier-${i}`,
        price: hasPrice ? basePrice : null,
        priceUnit: hasPrice ? (Math.random() > 0.5 ? 'pcs' : 'unit') : null,
        phone: hasPhone ? `08${Math.floor(Math.random()*9+1)}${this._randDigits(9)}` : null,
        whatsapp: hasWa ? `62${Math.floor(Math.random()*9+1)}${this._randDigits(9)}` : null,
        email: Math.random() > 0.6 ? `info@${suffix.toLowerCase()}.com` : null,
        rating: hasRating ? (3.5 + Math.random() * 1.5).toFixed(1) : null,
        verified: Math.random() > 0.5,
        description: `Supplier dan distributor ${itemName}${itemSpec ? ' ' + itemSpec : ''} di ${city}. Melayani pembelian partai kecil maupun besar.`,
        scrapedAt: new Date().toISOString(),
      });
    }

    // Sort: with price first
    results.sort((a, b) => {
      if (a.price && b.price) return a.price - b.price;
      if (a.price) return -1;
      if (b.price) return 1;
      return 0;
    });

    return {
      success: true,
      demo: true,
      results,
      meta: {
        query: itemName,
        spec: itemSpec,
        qty: itemQty,
        location,
        sourcesScanned: sources.length,
        duration: (1.5 + Math.random() * 2).toFixed(1),
      }
    };
  },

  _randDigits(n) {
    return Array.from({length: n}, () => Math.floor(Math.random()*10)).join('');
  },

  _cityToProvince(city) {
    const map = {
      'Surabaya': 'Jawa Timur', 'Sidoarjo': 'Jawa Timur', 'Gresik': 'Jawa Timur', 'Malang': 'Jawa Timur',
      'Jakarta': 'DKI Jakarta', 'Bekasi': 'Jawa Barat', 'Tangerang': 'Banten',
      'Bandung': 'Jawa Barat', 'Semarang': 'Jawa Tengah',
      'Medan': 'Sumatera Utara', 'Makassar': 'Sulawesi Selatan',
    };
    return map[city] || 'Indonesia';
  }
};
