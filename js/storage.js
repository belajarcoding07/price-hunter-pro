// =============================================
// PRICE HUNTER PRO — STORAGE MODULE
// Handles localStorage persistence
// =============================================
window.Storage = {
  KEYS: {
    HISTORY: 'php_search_history',
    FAVORITES: 'php_favorites',
    SUPPLIERS: 'php_suppliers',
    FOLLOWUP: 'php_followup_status',
    NOTES: 'php_notes',
  },

  get(key) {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch(e) { console.warn('Storage full:', e); }
  },

  // ---- HISTORY ----
  addHistory(entry) {
    const history = this.getHistory();
    const item = {
      id: Date.now(),
      date: new Date().toISOString(),
      itemName: entry.itemName,
      itemSpec: entry.itemSpec,
      itemQty: entry.itemQty,
      location: entry.location,
      resultCount: entry.resultCount,
      lowestPrice: entry.lowestPrice,
      suppliers: entry.suppliers || [],
    };
    history.unshift(item);
    // Keep max 100 entries
    this.set(this.KEYS.HISTORY, history.slice(0, 100));
    return item;
  },

  getHistory() {
    return this.get(this.KEYS.HISTORY) || [];
  },

  clearHistory() {
    this.set(this.KEYS.HISTORY, []);
  },

  // ---- FAVORITES ----
  addFavorite(supplier) {
    const favs = this.getFavorites();
    if (!favs.find(f => f.id === supplier.id)) {
      favs.unshift(supplier);
      this.set(this.KEYS.FAVORITES, favs);
      return true;
    }
    return false;
  },

  removeFavorite(supplierId) {
    const favs = this.getFavorites().filter(f => f.id !== supplierId);
    this.set(this.KEYS.FAVORITES, favs);
  },

  isFavorite(supplierId) {
    return this.getFavorites().some(f => f.id === supplierId);
  },

  getFavorites() {
    return this.get(this.KEYS.FAVORITES) || [];
  },

  // ---- FOLLOW UP STATUS ----
  setStatus(supplierId, status) {
    const statuses = this.get(this.KEYS.FOLLOWUP) || {};
    statuses[supplierId] = status;
    this.set(this.KEYS.FOLLOWUP, statuses);
  },

  getStatus(supplierId) {
    const statuses = this.get(this.KEYS.FOLLOWUP) || {};
    return statuses[supplierId] || 'belum';
  },

  getAllStatuses() {
    return this.get(this.KEYS.FOLLOWUP) || {};
  },

  // ---- NOTES ----
  setNote(supplierId, note) {
    const notes = this.get(this.KEYS.NOTES) || {};
    notes[supplierId] = note;
    this.set(this.KEYS.NOTES, notes);
  },

  getNote(supplierId) {
    const notes = this.get(this.KEYS.NOTES) || {};
    return notes[supplierId] || '';
  },

  // ---- SUPPLIER CACHE ----
  saveSuppliers(searchId, suppliers) {
    const all = this.get(this.KEYS.SUPPLIERS) || {};
    all[searchId] = suppliers;
    // Keep max 20 search results
    const keys = Object.keys(all);
    if (keys.length > 20) {
      delete all[keys[0]];
    }
    this.set(this.KEYS.SUPPLIERS, all);
  },

  // ---- STATS ----
  getStats() {
    const history = this.getHistory();
    const favs = this.getFavorites();
    const statuses = this.getAllStatuses();
    const deals = Object.values(statuses).filter(s => s === 'deal').length;
    const totalSuppliers = history.reduce((a, h) => a + (h.resultCount || 0), 0);

    // Top items
    const itemCounts = {};
    history.forEach(h => {
      const key = h.itemName;
      itemCounts[key] = (itemCounts[key] || 0) + 1;
    });
    const topItems = Object.entries(itemCounts)
      .sort((a,b) => b[1]-a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    return {
      totalSearches: history.length,
      totalSuppliers,
      deals,
      favorites: favs.length,
      topItems,
    };
  },

  // ---- ALL TRACKED SUPPLIERS (for followup kanban) ----
  getAllTrackedSuppliers() {
    // Collect all suppliers from history
    const history = this.getHistory();
    const statuses = this.getAllStatuses();
    const notes = this.get(this.KEYS.NOTES) || {};
    const suppliers = [];
    const seen = new Set();

    history.forEach(h => {
      (h.suppliers || []).forEach(s => {
        if (!seen.has(s.id)) {
          seen.add(s.id);
          suppliers.push({
            ...s,
            status: statuses[s.id] || 'belum',
            note: notes[s.id] || '',
            searchItem: h.itemName,
          });
        }
      });
    });

    // Also include favorites
    const favs = this.getFavorites();
    favs.forEach(s => {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        suppliers.push({
          ...s,
          status: statuses[s.id] || 'belum',
          note: notes[s.id] || '',
        });
      }
    });

    return suppliers;
  }
};
