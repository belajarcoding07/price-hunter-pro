// =============================================
// PRICE HUNTER PRO — MAIN APP
// =============================================
window.App = {
  currentPage: 'search',

  init() {
    this._initLoadingScreen();
    this._initNav();
    this._initSidebar();
    this._initModal();
    this._initExport();
    this._initHistory();
    this._initTheme();
    Settings.init();
    Search.init();
    Dashboard.refresh();
    this.updateBadges();
    this._checkOnlineStatus();
    this._initSync();
  },

  _initLoadingScreen() {
    setTimeout(() => {
      const ls = document.getElementById('loadingScreen');
      if (ls) ls.classList.add('hidden');
    }, 2200);
  },

  _initNav() {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        this.navigateTo(item.dataset.page);
        // Close mobile sidebar
        document.getElementById('sidebar')?.classList.remove('mobile-open');
        document.getElementById('sidebarOverlay')?.classList.remove('show');
      });
    });
  },

  navigateTo(page) {
    this.currentPage = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) pageEl.classList.add('active');

    const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navEl) navEl.classList.add('active');

    const titles = {
      search: 'Cari Supplier',
      history: 'Riwayat Pencarian',
      favorites: 'Supplier Favorit',
      followup: 'Follow Up Supplier',
      dashboard: 'Dashboard Statistik',
      settings: 'Pengaturan',
    };
    document.getElementById('topbarTitle').textContent = titles[page] || '';

    // Refresh page-specific data
    if (page === 'history') Render.renderHistory();
    if (page === 'favorites') Render.renderFavorites();
    if (page === 'followup') FollowUp.render();
    if (page === 'dashboard') Dashboard.refresh();
  },

  _initSidebar() {
    // Desktop toggle
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('collapsed');
    });

    // Mobile
    document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('mobile-open');
      document.getElementById('sidebarOverlay')?.classList.toggle('show');
    });
    document.getElementById('sidebarOverlay')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.remove('mobile-open');
      document.getElementById('sidebarOverlay')?.classList.remove('show');
    });
  },

  _initModal() {
    document.getElementById('modalClose')?.addEventListener('click', () => {
      document.getElementById('supplierModal').style.display = 'none';
    });
    document.getElementById('supplierModal')?.addEventListener('click', e => {
      if (e.target === document.getElementById('supplierModal')) {
        document.getElementById('supplierModal').style.display = 'none';
      }
    });
  },

  _initExport() {
    document.getElementById('exportBtn')?.addEventListener('click', () => Export.toPDF());
  },

  _initHistory() {
    document.getElementById('clearHistoryBtn')?.addEventListener('click', () => {
      if (confirm('Hapus semua riwayat pencarian?')) {
        Storage.clearHistory();
        Render.renderHistory();
        this.updateBadges();
        this.toast('Riwayat dihapus', 'info');
      }
    });
  },

  _initTheme() {
    const saved = localStorage.getItem('php_theme') || 'dark';
    document.documentElement.dataset.theme = saved;
    this._updateThemeUI(saved);

    document.getElementById('themeToggle')?.addEventListener('click', () => {
      const current = document.documentElement.dataset.theme;
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      localStorage.setItem('php_theme', next);
      this._updateThemeUI(next);
    });
  },

  _updateThemeUI(theme) {
    const icon = document.getElementById('themeIcon');
    const label = document.getElementById('themeLabel');
    if (icon) icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    if (label) label.textContent = theme === 'dark' ? 'Dark Mode' : 'Light Mode';
  },

  _checkOnlineStatus() {
    const update = () => {
      const dot = document.querySelector('.status-dot');
      const text = document.querySelector('.status-text');
      if (navigator.onLine) {
        dot?.classList.remove('offline'); dot?.classList.add('online');
        if (text) text.textContent = 'Online';
      } else {
        dot?.classList.remove('online'); dot?.classList.add('offline');
        if (text) text.textContent = 'Offline';
      }
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
  },

  _initSync() {
    document.getElementById('syncBtn')?.addEventListener('click', async () => {
      const icon = document.getElementById('syncIcon');
      icon?.classList.add('spin');
      const gsUrl = APP_CONFIG.GS_URL;
      if (!gsUrl) {
        this.toast('Belum ada Google Sheets terhubung. Buka Pengaturan.', 'warning');
        icon?.classList.remove('spin');
        return;
      }
      const ok = await API.syncToSheets({ action: 'ping' });
      icon?.classList.remove('spin');
      this.toast(ok ? 'Sync Google Sheets berhasil' : 'Sync gagal — cek koneksi', ok ? 'success' : 'error');
    });
  },

  updateBadges() {
    const h = Storage.getHistory().length;
    const f = Storage.getFavorites().length;
    document.getElementById('historyBadge').textContent = h;
    document.getElementById('favBadge').textContent = f;
  },

  toast(message, type = 'info', duration = 3500) {
    const icons = {
      success: 'fas fa-check',
      error: 'fas fa-times',
      warning: 'fas fa-exclamation',
      info: 'fas fa-info',
    };
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-icon"><i class="${icons[type] || icons.info}"></i></div>
      <span class="toast-msg">${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};

// ============ BOOTSTRAP ============
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
