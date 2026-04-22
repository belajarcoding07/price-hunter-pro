// =============================================
// PRICE HUNTER PRO — RENDER MODULE
// =============================================
window.Render = {

  renderResults(suppliers, meta) {
    const grid = document.getElementById('resultsGrid');
    const toolbar = document.getElementById('resultToolbar');
    const emptyState = document.getElementById('emptyState');
    const compareCard = document.getElementById('priceCompareCard');

    if (!suppliers.length) {
      grid.innerHTML = '';
      emptyState.style.display = '';
      toolbar.style.display = 'none';
      return;
    }

    emptyState.style.display = 'none';
    toolbar.style.display = 'flex';

    // Update toolbar info
    document.getElementById('resultCount').textContent = suppliers.length;
    const q = [meta.itemName, meta.itemSpec, meta.itemQty].filter(Boolean).join(' — ');
    document.getElementById('resultQuery').textContent = `untuk "${q}"`;

    // Populate province filter
    const provinces = [...new Set(suppliers.map(s => s.province).filter(Boolean))].sort();
    const provFilter = document.getElementById('filterProvince');
    provFilter.innerHTML = `<option value="">Semua Provinsi</option>` +
      provinces.map(p => `<option value="${p}">${p}</option>`).join('');

    // Price comparison
    const withPrice = suppliers.filter(s => s.price).slice(0, 8);
    if (withPrice.length >= 2) {
      this.renderPriceCompare(withPrice);
      compareCard.style.display = 'block';
    } else {
      compareCard.style.display = 'none';
    }

    // Render cards with stagger
    grid.innerHTML = suppliers.map((s, i) =>
      this.buildCard(s, i)
    ).join('');

    this._initFilters(suppliers);
    this._initCardEvents();
  },

  buildCard(supplier, index = 0) {
    const delay = Math.min(index * 60, 600);
    const isFav = Storage.isFavorite(supplier.id);
    const status = Storage.getStatus(supplier.id);
    const note = Storage.getNote(supplier.id);
    const statusColor = STATUS_OPTIONS.find(s => s.value === status)?.color || '#4a5b78';

    const waMsg = encodeURIComponent(
      `Selamat pagi ${supplier.name}, saya ingin menanyakan harga reseller dan ketersediaan stok untuk ${supplier.searchItem || 'barang yang Anda jual'}. Mohon informasinya. Terima kasih.`
    );
    const waLink = supplier.whatsapp
      ? `https://wa.me/${supplier.whatsapp}?text=${waMsg}`
      : `https://wa.me/?text=${waMsg}`;

    const badgeClass = `badge-${supplier.source}`;
    const srcName = SOURCES.find(s => s.id === supplier.source)?.name || supplier.source;

    const starRating = supplier.rating
      ? `<span class="stars">${'★'.repeat(Math.round(supplier.rating))}${'☆'.repeat(5-Math.round(supplier.rating))}</span> ${supplier.rating}`
      : '';

    return `
    <div class="supplier-card" data-id="${supplier.id}" data-province="${supplier.province || ''}" data-price="${supplier.price || 0}" data-source="${supplier.source}" style="animation-delay:${delay}ms">
      <div class="card-top">
        <span class="card-source-badge ${badgeClass}">${srcName}</span>
        <div class="card-actions-top">
          <button class="card-action-btn fav-btn ${isFav ? 'favorited' : ''}" data-id="${supplier.id}" title="${isFav ? 'Hapus favorit' : 'Simpan favorit'}">
            <i class="fas fa-star"></i>
          </button>
          <button class="card-action-btn detail-btn" data-id="${supplier.id}" title="Lihat detail">
            <i class="fas fa-external-link-alt"></i>
          </button>
        </div>
      </div>

      <div class="card-name">
        ${supplier.name}
        ${supplier.verified ? `<span class="verified-badge"><i class="fas fa-check-circle"></i> Terverifikasi</span>` : ''}
      </div>
      <div class="card-location"><i class="fas fa-map-marker-alt"></i> ${supplier.location || '-'}${supplier.province ? ', ' + supplier.province : ''}</div>

      ${supplier.price
        ? `<div class="card-price-row">
            <span class="card-price">Rp ${Number(supplier.price).toLocaleString('id-ID')}</span>
            <span class="card-price-note">/ ${supplier.priceUnit || 'unit'}</span>
           </div>`
        : `<div class="card-no-price"><i class="fas fa-info-circle"></i> Harga belum tersedia — tanya via WA</div>`
      }

      ${starRating ? `<div class="card-rating">${starRating}</div>` : ''}

      <div class="card-contact-row">
        ${supplier.phone ? `<span class="contact-chip"><i class="fas fa-phone"></i>${supplier.phone}</span>` : ''}
        ${supplier.whatsapp ? `<span class="contact-chip"><i class="fab fa-whatsapp"></i>${supplier.whatsapp}</span>` : ''}
        ${supplier.email ? `<span class="contact-chip"><i class="fas fa-envelope"></i>${supplier.email}</span>` : ''}
      </div>

      <div class="card-status-row">
        <select class="status-select" data-id="${supplier.id}" style="border-left: 3px solid ${statusColor}">
          ${STATUS_OPTIONS.map(s => `<option value="${s.value}" ${status === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
        </select>
      </div>

      <div class="card-notes">
        <textarea class="notes-input" data-id="${supplier.id}" placeholder="Catatan: harga deal, nama kontak, dll...">${note}</textarea>
      </div>

      <div class="card-footer">
        <a href="${waLink}" target="_blank" class="btn-wa" onclick="Render._trackWA('${supplier.id}')">
          <i class="fab fa-whatsapp"></i> Hubungi via WA
        </a>
        <button class="btn-detail detail-btn" data-id="${supplier.id}">
          <i class="fas fa-info"></i>
        </button>
      </div>
    </div>`;
  },

  renderPriceCompare(suppliers) {
    const max = Math.max(...suppliers.map(s => s.price));
    const min = Math.min(...suppliers.map(s => s.price));
    document.getElementById('compareSubtitle').textContent =
      `Harga terendah: Rp ${min.toLocaleString('id-ID')} — tertinggi: Rp ${max.toLocaleString('id-ID')}`;

    document.getElementById('priceBars').innerHTML = suppliers.map(s => {
      const pct = Math.round((s.price / max) * 100);
      const isLowest = s.price === min;
      return `
      <div class="price-bar-item">
        <span class="price-bar-label" title="${s.name}">${s.name.split(' ').slice(0,3).join(' ')}</span>
        <div class="price-bar-track">
          <div class="price-bar-fill ${isLowest ? 'lowest' : ''}" style="width:${pct}%">
            <span class="price-bar-val">Rp ${Number(s.price).toLocaleString('id-ID')}</span>
          </div>
        </div>
        ${isLowest ? '<span class="price-bar-badge">Termurah</span>' : ''}
      </div>`;
    }).join('');
  },

  renderFavorites() {
    const favs = Storage.getFavorites();
    const grid = document.getElementById('favoritesGrid');
    if (!favs.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon"><i class="fas fa-star"></i></div>
        <h3>Belum Ada Favorit</h3>
        <p>Klik ikon bintang pada kartu supplier untuk menyimpannya di sini</p>
      </div>`;
      return;
    }
    grid.innerHTML = favs.map((s, i) => this.buildCard(s, i)).join('');
    this._initCardEvents();
  },

  renderHistory() {
    const history = Storage.getHistory();
    const list = document.getElementById('historyList');
    document.getElementById('historyBadge').textContent = history.length;

    if (!history.length) {
      list.innerHTML = `<div class="empty-state">
        <div class="empty-icon"><i class="fas fa-clock"></i></div>
        <h3>Belum Ada Riwayat</h3>
        <p>Pencarian Anda akan tersimpan otomatis di sini</p>
      </div>`;
      return;
    }

    list.innerHTML = history.map(h => {
      const date = new Date(h.date).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
      return `
      <div class="history-item" onclick="Search.rerunSearch(${JSON.stringify(h).replace(/"/g, '&quot;')})">
        <div class="history-icon"><i class="fas fa-search"></i></div>
        <div class="history-info">
          <div class="history-item-name">${h.itemName}${h.itemSpec ? ' — ' + h.itemSpec : ''}</div>
          <div class="history-meta">
            <span><i class="fas fa-calendar"></i>${date}</span>
            ${h.itemQty ? `<span><i class="fas fa-cubes"></i>${h.itemQty}</span>` : ''}
            ${h.location ? `<span><i class="fas fa-map-marker-alt"></i>${h.location}</span>` : ''}
            ${h.lowestPrice ? `<span><i class="fas fa-tag"></i>Termurah: Rp ${h.lowestPrice.toLocaleString('id-ID')}</span>` : ''}
          </div>
        </div>
        <div class="history-count">${h.resultCount || 0}</div>
        <button class="history-rerun" onclick="event.stopPropagation(); Search.rerunSearch(${JSON.stringify(h).replace(/"/g, '&quot;')})">
          <i class="fas fa-redo"></i> Ulangi
        </button>
      </div>`;
    }).join('');
  },

  _initFilters(suppliers) {
    const filterProvince = document.getElementById('filterProvince');
    const filterPrice = document.getElementById('filterPrice');
    const filterSort = document.getElementById('filterSort');

    const applyFilters = () => {
      let filtered = [...suppliers];
      const prov = filterProvince.value;
      const price = filterPrice.value;
      const sort = filterSort.value;

      if (prov) filtered = filtered.filter(s => s.province === prov);
      if (price === 'with_price') filtered = filtered.filter(s => s.price);
      if (price === 'no_price') filtered = filtered.filter(s => !s.price);
      if (sort === 'price_asc') filtered.sort((a,b) => (a.price||999999) - (b.price||999999));
      if (sort === 'price_desc') filtered.sort((a,b) => (b.price||0) - (a.price||0));
      if (sort === 'rating') filtered.sort((a,b) => (b.rating||0) - (a.rating||0));

      document.getElementById('resultCount').textContent = filtered.length;
      document.getElementById('resultsGrid').innerHTML = filtered.map((s,i) => this.buildCard(s,i)).join('');
      this._initCardEvents();
    };

    [filterProvince, filterPrice, filterSort].forEach(el => {
      el.removeEventListener('change', applyFilters);
      el.addEventListener('change', applyFilters);
    });
  },

  _initCardEvents() {
    // Favorite buttons
    document.querySelectorAll('.fav-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const supplier = this._findSupplier(id);
        if (!supplier) return;

        if (Storage.isFavorite(id)) {
          Storage.removeFavorite(id);
          btn.classList.remove('favorited');
          App.toast('Dihapus dari favorit', 'info');
        } else {
          Storage.addFavorite(supplier);
          btn.classList.add('favorited');
          App.toast('Ditambahkan ke favorit ⭐', 'success');
        }
        App.updateBadges();
      });
    });

    // Status selects
    document.querySelectorAll('.status-select').forEach(sel => {
      sel.addEventListener('change', () => {
        const id = sel.dataset.id;
        const status = sel.value;
        Storage.setStatus(id, status);
        const color = STATUS_OPTIONS.find(s => s.value === status)?.color || '#4a5b78';
        sel.style.borderLeftColor = color;
        API.syncToSheets({ action: 'updateStatus', supplierId: id, status });
      });
    });

    // Notes
    document.querySelectorAll('.notes-input').forEach(ta => {
      ta.addEventListener('blur', () => {
        const id = ta.dataset.id;
        Storage.setNote(id, ta.value);
        API.syncToSheets({ action: 'updateNote', supplierId: id, note: ta.value });
      });
    });

    // Detail buttons
    document.querySelectorAll('.detail-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const supplier = this._findSupplier(id);
        if (supplier) this.showSupplierModal(supplier);
      });
    });
  },

  _findSupplier(id) {
    return Search.currentResults.find(s => s.id === id)
      || Storage.getFavorites().find(s => s.id === id)
      || null;
  },

  _trackWA(supplierId) {
    Storage.setStatus(supplierId, 'sudah');
  },

  showSupplierModal(supplier) {
    const modal = document.getElementById('supplierModal');
    const content = document.getElementById('modalContent');
    const status = Storage.getStatus(supplier.id);
    const note = Storage.getNote(supplier.id);

    const waMsg = encodeURIComponent(
      `Selamat pagi ${supplier.name}, saya ingin menanyakan harga reseller dan ketersediaan stok. Mohon informasinya. Terima kasih.`
    );

    content.innerHTML = `
      <div style="margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
          <div style="width:48px;height:48px;border-radius:10px;background:rgba(59,130,246,0.12);display:flex;align-items:center;justify-content:center;color:var(--blue);font-size:20px;flex-shrink:0">
            <i class="fas fa-store"></i>
          </div>
          <div>
            <h2 style="font-family:'Syne',sans-serif;font-size:18px;font-weight:700">${supplier.name}</h2>
            ${supplier.verified ? '<span style="font-size:11px;color:var(--emerald)"><i class="fas fa-check-circle"></i> Terverifikasi</span>' : ''}
          </div>
        </div>

        <div style="display:grid;gap:10px">
          ${this._modalRow('fas fa-map-marker-alt', 'Lokasi', `${supplier.address || supplier.location}${supplier.province ? ', '+supplier.province : ''}`)}
          ${supplier.price ? this._modalRow('fas fa-tag', 'Harga', `Rp ${Number(supplier.price).toLocaleString('id-ID')} / ${supplier.priceUnit||'unit'}`) : ''}
          ${supplier.phone ? this._modalRow('fas fa-phone', 'Telepon', `<a href="tel:${supplier.phone}" style="color:var(--blue-light)">${supplier.phone}</a>`) : ''}
          ${supplier.whatsapp ? this._modalRow('fab fa-whatsapp', 'WhatsApp', supplier.whatsapp) : ''}
          ${supplier.email ? this._modalRow('fas fa-envelope', 'Email', supplier.email) : ''}
          ${supplier.rating ? this._modalRow('fas fa-star', 'Rating', `${supplier.rating} / 5.0`) : ''}
          ${supplier.description ? this._modalRow('fas fa-info-circle', 'Deskripsi', supplier.description) : ''}
          ${supplier.sourceUrl ? this._modalRow('fas fa-link', 'Sumber', `<a href="${supplier.sourceUrl}" target="_blank" style="color:var(--blue-light)">Buka halaman asli ↗</a>`) : ''}
        </div>
      </div>

      <div style="margin-bottom:16px">
        <label style="font-size:12px;color:var(--text-muted);margin-bottom:6px;display:block">STATUS FOLLOW UP</label>
        <select id="modalStatusSel" class="status-select" data-id="${supplier.id}" style="width:100%">
          ${STATUS_OPTIONS.map(s => `<option value="${s.value}" ${status===s.value?'selected':''}>${s.label}</option>`).join('')}
        </select>
      </div>

      <div style="margin-bottom:16px">
        <label style="font-size:12px;color:var(--text-muted);margin-bottom:6px;display:block">CATATAN</label>
        <textarea id="modalNote" class="notes-input" placeholder="Catatan penting tentang supplier ini..." style="min-height:80px;width:100%">${note}</textarea>
      </div>

      <div style="display:flex;gap:10px">
        ${supplier.whatsapp
          ? `<a href="https://wa.me/${supplier.whatsapp}?text=${waMsg}" target="_blank" class="btn-wa" style="flex:1" onclick="Storage.setStatus('${supplier.id}','sudah')">
              <i class="fab fa-whatsapp"></i> Hubungi via WhatsApp
             </a>`
          : `<a href="https://wa.me/?text=${waMsg}" target="_blank" class="btn-wa" style="flex:1">
              <i class="fab fa-whatsapp"></i> Kirim WA
             </a>`
        }
      </div>
    `;

    document.getElementById('modalStatusSel')?.addEventListener('change', e => {
      Storage.setStatus(supplier.id, e.target.value);
    });
    document.getElementById('modalNote')?.addEventListener('blur', e => {
      Storage.setNote(supplier.id, e.target.value);
    });

    modal.style.display = 'flex';
  },

  _modalRow(icon, label, value) {
    return `<div style="display:flex;gap:10px;font-size:13px">
      <i class="${icon}" style="color:var(--blue);width:16px;text-align:center;margin-top:2px;flex-shrink:0"></i>
      <div>
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">${label}</div>
        <div style="color:var(--text-primary)">${value}</div>
      </div>
    </div>`;
  },
};
