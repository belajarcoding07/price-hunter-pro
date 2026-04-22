// =============================================
// PRICE HUNTER PRO — DASHBOARD MODULE
// =============================================
window.Dashboard = {
  refresh() {
    const stats = Storage.getStats();
    document.getElementById('statSearches').textContent = stats.totalSearches;
    document.getElementById('statSuppliers').textContent = stats.totalSuppliers;
    document.getElementById('statDeals').textContent = stats.deals;
    document.getElementById('statFavorites').textContent = stats.favorites;

    // Top items
    const topList = document.getElementById('topItemsList');
    if (!stats.topItems.length) {
      topList.innerHTML = '<p class="no-data">Belum ada data pencarian</p>';
    } else {
      topList.innerHTML = stats.topItems.map((item, i) => `
        <div class="top-item-row">
          <span class="top-item-rank">#${i+1}</span>
          <span class="top-item-name">${item.name}</span>
          <span class="top-item-count">${item.count}x</span>
        </div>
      `).join('');
    }

    // City distribution
    const history = Storage.getHistory();
    const cityCounts = {};
    history.forEach(h => {
      (h.suppliers || []).forEach(s => {
        if (s.location) cityCounts[s.location] = (cityCounts[s.location] || 0) + 1;
      });
    });
    const cities = Object.entries(cityCounts).sort((a,b) => b[1]-a[1]).slice(0, 10);
    const maxCity = cities[0]?.[1] || 1;

    const cityList = document.getElementById('cityList');
    if (!cities.length) {
      cityList.innerHTML = '<p class="no-data">Belum ada data</p>';
    } else {
      cityList.innerHTML = cities.map(([city, count]) => `
        <div class="city-row">
          <span class="city-name">${city}</span>
          <div class="city-bar"><div class="city-bar-fill" style="width:${Math.round(count/maxCity*100)}%"></div></div>
          <span class="city-count">${count}</span>
        </div>
      `).join('');
    }
  }
};

// =============================================
// PRICE HUNTER PRO — EXPORT MODULE
// =============================================
window.Export = {
  toPDF() {
    const results = Search.currentResults;
    if (!results.length) {
      App.toast('Tidak ada hasil untuk diekspor', 'warning');
      return;
    }

    const itemName = document.getElementById('itemName')?.value || 'Barang';
    const itemSpec = document.getElementById('itemSpec')?.value || '';
    const itemQty = document.getElementById('itemQty')?.value || '';
    const date = new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
    const brokerName = APP_CONFIG.BROKER_NAME;

    const rows = results.map(s => `
      <tr>
        <td>${s.name}</td>
        <td>${s.location || '-'}${s.province ? ', '+s.province : ''}</td>
        <td>${s.price ? 'Rp ' + Number(s.price).toLocaleString('id-ID') + '/' + (s.priceUnit||'unit') : 'Hubungi'}</td>
        <td>${s.phone || s.whatsapp || '-'}</td>
        <td>${SOURCES.find(x=>x.id===s.source)?.name || s.source}</td>
        <td>${Storage.getStatus(s.id) === 'belum' ? 'Belum' : STATUS_OPTIONS.find(x=>x.value===Storage.getStatus(s.id))?.label || '-'}</td>
        <td>${Storage.getNote(s.id) || '-'}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Price Hunter Pro - Laporan Supplier</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a2e; margin: 0; }
  .header { background: linear-gradient(135deg, #1d4ed8, #10b981); color: white; padding: 24px 32px; }
  .header h1 { font-size: 22px; font-weight: 800; margin: 0 0 4px; }
  .header p { margin: 0; opacity: 0.85; font-size: 13px; }
  .meta { padding: 16px 32px; background: #f5f8ff; border-bottom: 1px solid #e0e7ff; display: flex; gap: 32px; flex-wrap: wrap; }
  .meta-item label { font-size: 10px; text-transform: uppercase; color: #6b7280; display: block; }
  .meta-item span { font-weight: 600; font-size: 13px; }
  .content { padding: 20px 32px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #1d4ed8; color: white; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  tr:nth-child(even) td { background: #f9fafb; }
  .footer { padding: 16px 32px; text-align: right; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
  .summary { display: flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap; }
  .sum-box { background: #f0f4ff; border: 1px solid #e0e7ff; border-radius: 8px; padding: 12px 18px; }
  .sum-box .num { font-size: 22px; font-weight: 800; color: #1d4ed8; }
  .sum-box .lbl { font-size: 10px; color: #6b7280; text-transform: uppercase; }
</style>
</head>
<body>
<div class="header">
  <h1>🎯 Price Hunter Pro</h1>
  <p>Laporan Hasil Pencarian Supplier</p>
</div>
<div class="meta">
  <div class="meta-item"><label>Barang Dicari</label><span>${itemName}${itemSpec?' — '+itemSpec:''}</span></div>
  <div class="meta-item"><label>Jumlah</label><span>${itemQty||'-'}</span></div>
  <div class="meta-item"><label>Tanggal</label><span>${date}</span></div>
  <div class="meta-item"><label>Broker</label><span>${brokerName}</span></div>
</div>
<div class="content">
  <div class="summary">
    <div class="sum-box"><div class="num">${results.length}</div><div class="lbl">Total Supplier</div></div>
    <div class="sum-box"><div class="num">${results.filter(s=>s.price).length}</div><div class="lbl">Ada Harga</div></div>
    ${results.filter(s=>s.price).length
      ? `<div class="sum-box"><div class="num">Rp ${Math.min(...results.filter(s=>s.price).map(s=>s.price)).toLocaleString('id-ID')}</div><div class="lbl">Harga Terendah</div></div>`
      : ''
    }
  </div>
  <table>
    <thead>
      <tr><th>Nama Supplier</th><th>Lokasi</th><th>Harga</th><th>Kontak</th><th>Sumber</th><th>Status</th><th>Catatan</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</div>
<div class="footer">Dibuat oleh Price Hunter Pro • ${date} • ${brokerName}</div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supplier_${itemName.replace(/\s+/g,'_')}_${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    App.toast('Laporan berhasil diunduh', 'success');
  }
};

// =============================================
// PRICE HUNTER PRO — SETTINGS MODULE
// =============================================
window.Settings = {
  init() {
    this.load();

    document.getElementById('testBackendBtn')?.addEventListener('click', async () => {
      const url = document.getElementById('settingBackendUrl')?.value.trim();
      if (!url) { App.toast('Masukkan URL backend dulu', 'warning'); return; }
      const statusEl = document.getElementById('backendStatus');
      statusEl.textContent = 'Mengetes...';
      statusEl.className = 'conn-status';
      const ok = await API.testBackend(url);
      statusEl.textContent = ok ? '✓ Terhubung' : '✗ Gagal terhubung';
      statusEl.className = ok ? 'conn-status ok' : 'conn-status error';
    });

    document.getElementById('testGsBtn')?.addEventListener('click', async () => {
      const url = document.getElementById('settingGsUrl')?.value.trim();
      if (!url) { App.toast('Masukkan URL Apps Script dulu', 'warning'); return; }
      const statusEl = document.getElementById('gsStatus');
      statusEl.textContent = 'Mengetes...';
      const ok = await API.testGS(url);
      statusEl.textContent = ok ? '✓ Terkoneksi' : '✓ Permintaan terkirim (cek Sheets)';
      statusEl.className = 'conn-status ok';
    });

    document.getElementById('testWaBtn')?.addEventListener('click', () => {
      const num = document.getElementById('settingWaNumber')?.value.trim();
      const key = document.getElementById('settingWaApiKey')?.value.trim();
      if (!num || !key) { App.toast('Masukkan nomor WA dan API Key Callmebot', 'warning'); return; }
      APP_CONFIG.WA_NUMBER = num;
      APP_CONFIG.WA_API_KEY = key;
      API.sendWaNotif('🎯 Price Hunter Pro — Test notifikasi berhasil! Sistem siap digunakan.');
      App.toast('Pesan test dikirim ke WhatsApp Anda', 'success');
    });

    document.getElementById('saveSettingsBtn')?.addEventListener('click', () => this.save());
  },

  load() {
    const fields = {
      'settingBackendUrl': 'php_backend_url',
      'settingGsUrl': 'php_gs_url',
      'settingWaNumber': 'php_wa_number',
      'settingWaApiKey': 'php_wa_api_key',
      'settingBrokerName': 'php_broker_name',
      'settingBrokerWa': 'php_broker_wa',
    };
    Object.entries(fields).forEach(([elId, storKey]) => {
      const el = document.getElementById(elId);
      if (el) el.value = localStorage.getItem(storKey) || '';
    });
  },

  save() {
    const fields = {
      'settingBackendUrl': 'php_backend_url',
      'settingGsUrl': 'php_gs_url',
      'settingWaNumber': 'php_wa_number',
      'settingWaApiKey': 'php_wa_api_key',
      'settingBrokerName': 'php_broker_name',
      'settingBrokerWa': 'php_broker_wa',
    };
    Object.entries(fields).forEach(([elId, storKey]) => {
      const el = document.getElementById(elId);
      if (el) localStorage.setItem(storKey, el.value.trim());
    });
    // Update APP_CONFIG
    APP_CONFIG.BACKEND_URL = localStorage.getItem('php_backend_url') || '';
    APP_CONFIG.GS_URL = localStorage.getItem('php_gs_url') || '';
    APP_CONFIG.WA_NUMBER = localStorage.getItem('php_wa_number') || '';
    APP_CONFIG.WA_API_KEY = localStorage.getItem('php_wa_api_key') || '';
    APP_CONFIG.BROKER_NAME = localStorage.getItem('php_broker_name') || 'Broker';
    APP_CONFIG.BROKER_WA = localStorage.getItem('php_broker_wa') || '';

    App.toast('Pengaturan tersimpan!', 'success');
  }
};
