// =============================================
// PRICE HUNTER PRO — SEARCH MODULE
// =============================================
window.Search = {
  currentResults: [],
  isSearching: false,
  currentSearchId: null,

  init() {
    this._initAutocomplete();
    this._initSearchButton();
  },

  _initAutocomplete() {
    const input = document.getElementById('itemName');
    const dropdown = document.getElementById('autocompleteDropdown');
    if (!input || !dropdown) return;

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (q.length < 2) { dropdown.classList.remove('show'); return; }

      const matches = AUTOCOMPLETE_ITEMS.filter(item =>
        item.toLowerCase().includes(q)
      ).slice(0, 6);

      // Also check history
      const history = Storage.getHistory();
      const histMatches = [...new Set(history.map(h => h.itemName))]
        .filter(n => n.toLowerCase().includes(q) && !matches.includes(n))
        .slice(0, 3);

      const allMatches = [...matches, ...histMatches];
      if (!allMatches.length) { dropdown.classList.remove('show'); return; }

      dropdown.innerHTML = allMatches.map(item => `
        <div class="autocomplete-item" onclick="Search._selectAutocomplete('${item.replace(/'/g, "\\'")}')">
          <i class="fas fa-search"></i>
          <span>${item}</span>
        </div>
      `).join('');
      dropdown.classList.add('show');
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        dropdown.classList.remove('show');
        Search.run();
      }
      if (e.key === 'Escape') dropdown.classList.remove('show');
    });

    document.addEventListener('click', e => {
      if (!e.target.closest('.autocomplete-wrap')) {
        dropdown.classList.remove('show');
      }
    });
  },

  _selectAutocomplete(value) {
    document.getElementById('itemName').value = value;
    document.getElementById('autocompleteDropdown').classList.remove('show');
    document.getElementById('itemSpec').focus();
  },

  _initSearchButton() {
    document.getElementById('searchBtn')?.addEventListener('click', () => this.run());
    document.getElementById('clearBtn')?.addEventListener('click', () => this.clear());
  },

  getActiveSources() {
    const checked = document.querySelectorAll('.source-chip input:checked');
    return Array.from(checked).map(c => c.dataset.source);
  },

  async run() {
    if (this.isSearching) return;

    const itemName = document.getElementById('itemName')?.value.trim();
    const itemSpec = document.getElementById('itemSpec')?.value.trim();
    const itemQty = document.getElementById('itemQty')?.value.trim();
    const location = document.getElementById('itemLocation')?.value.trim();

    if (!itemName) {
      App.toast('Masukkan nama barang terlebih dahulu', 'warning');
      document.getElementById('itemName').focus();
      return;
    }

    const sources = this.getActiveSources();
    if (!sources.length) {
      App.toast('Pilih minimal satu sumber pencarian', 'warning');
      return;
    }

    this.isSearching = true;
    this.currentSearchId = Date.now().toString();

    // UI: show loading
    this._showProgress(sources);
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('resultToolbar').style.display = 'none';
    document.getElementById('resultsGrid').innerHTML = '';
    document.getElementById('priceCompareCard').style.display = 'none';

    const btn = document.getElementById('searchBtn');
    btn.classList.add('loading');
    btn.querySelector('span').textContent = 'Sedang mencari...';

    try {
      // Animate progress
      this._animateProgress(sources);

      const data = await API.search({ itemName, itemSpec, itemQty, location, sources });

      this.currentResults = data.results || [];
      this._hideProgress();

      // Save to history
      const lowestPrice = this.currentResults
        .filter(s => s.price)
        .sort((a,b) => a.price - b.price)[0]?.price || null;

      const histEntry = Storage.addHistory({
        itemName, itemSpec, itemQty, location,
        resultCount: this.currentResults.length,
        lowestPrice,
        suppliers: this.currentResults.map(s => ({
          id: s.id, name: s.name, location: s.location,
          source: s.source, price: s.price, phone: s.phone, whatsapp: s.whatsapp,
        })),
      });

      // Sync to GS
      API.syncToSheets({
        action: 'addSearch',
        searchId: this.currentSearchId,
        itemName, itemSpec, itemQty, location,
        resultCount: this.currentResults.length,
        lowestPrice,
        date: new Date().toISOString(),
        suppliers: this.currentResults,
      });

      // Send WA notification
      if (this.currentResults.length > 0) {
        const notifMsg = `🎯 Price Hunter Pro\nPencarian: ${itemName}${itemSpec ? ' '+itemSpec : ''}\n✅ ${this.currentResults.length} supplier ditemukan\n💰 Harga terendah: ${lowestPrice ? 'Rp ' + lowestPrice.toLocaleString('id-ID') : 'Belum tersedia'}`;
        API.sendWaNotif(notifMsg);
      }

      // Render
      Render.renderResults(this.currentResults, { itemName, itemSpec, itemQty, location });
      Dashboard.refresh();
      App.updateBadges();

      // Notification
      if (data.demo) {
        App.toast(`Demo: ${this.currentResults.length} supplier ditemukan. Hubungkan backend untuk data real.`, 'info');
      } else {
        App.toast(`${this.currentResults.length} supplier ditemukan untuk "${itemName}"`, 'success');
      }

    } catch (err) {
      console.error('Search error:', err);
      this._hideProgress();
      App.toast('Gagal mencari. Cek koneksi atau konfigurasi backend.', 'error');
    } finally {
      this.isSearching = false;
      btn.classList.remove('loading');
      btn.querySelector('span').textContent = 'Mulai Cari Supplier';
    }
  },

  _showProgress(sources) {
    const prog = document.getElementById('searchProgress');
    const progSources = document.getElementById('progressSources');
    prog.style.display = 'block';
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('progressCount').textContent = '0 supplier ditemukan';

    progSources.innerHTML = sources.map(s => {
      const src = SOURCES.find(x => x.id === s) || { name: s };
      return `<span class="source-tag" id="src_${s}"><i class="${src.icon || 'fas fa-circle'}"></i> ${src.name}</span>`;
    }).join('');
  },

  _animateProgress(sources) {
    let progress = 0;
    let found = 0;
    const step = 100 / (sources.length + 2);

    sources.forEach((src, i) => {
      setTimeout(() => {
        const tag = document.getElementById(`src_${src}`);
        if (tag) tag.className = 'source-tag scanning';
      }, i * 600);

      setTimeout(() => {
        progress = Math.min(progress + step, 90);
        document.getElementById('progressBar').style.width = progress + '%';
        found += 2 + Math.floor(Math.random() * 4);
        document.getElementById('progressCount').textContent = `~${found} supplier ditemukan`;
        const tag = document.getElementById(`src_${src}`);
        if (tag) tag.innerHTML = `<i class="fas fa-check"></i> ${SOURCES.find(x=>x.id===src)?.name || src}`;
        if (tag) tag.className = 'source-tag done';
      }, i * 600 + 400);
    });
  },

  _hideProgress() {
    document.getElementById('progressBar').style.width = '100%';
    setTimeout(() => {
      document.getElementById('searchProgress').style.display = 'none';
    }, 500);
  },

  clear() {
    document.getElementById('itemName').value = '';
    document.getElementById('itemSpec').value = '';
    document.getElementById('itemQty').value = '';
    document.getElementById('itemLocation').value = '';
    document.getElementById('resultsGrid').innerHTML = '';
    document.getElementById('resultToolbar').style.display = 'none';
    document.getElementById('priceCompareCard').style.display = 'none';
    document.getElementById('emptyState').style.display = '';
    this.currentResults = [];
  },

  rerunSearch(historyEntry) {
    document.getElementById('itemName').value = historyEntry.itemName || '';
    document.getElementById('itemSpec').value = historyEntry.itemSpec || '';
    document.getElementById('itemQty').value = historyEntry.itemQty || '';
    document.getElementById('itemLocation').value = historyEntry.location || '';
    App.navigateTo('search');
    setTimeout(() => this.run(), 100);
  },
};
