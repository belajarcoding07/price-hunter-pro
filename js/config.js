// =============================================
// PRICE HUNTER PRO — CONFIG
// =============================================
window.APP_CONFIG = {
  // Ganti dengan URL backend Koyeb Anda setelah deploy
  BACKEND_URL: localStorage.getItem('php_backend_url') || '',
  
  // Google Apps Script Web App URL
  GS_URL: localStorage.getItem('php_gs_url') || '',
  
  // Callmebot
  WA_NUMBER: localStorage.getItem('php_wa_number') || '',
  WA_API_KEY: localStorage.getItem('php_wa_api_key') || '',
  
  // Profil Broker
  BROKER_NAME: localStorage.getItem('php_broker_name') || 'Broker',
  BROKER_WA: localStorage.getItem('php_broker_wa') || '',
};

// Autocomplete suggestions (historical + common items)
window.AUTOCOMPLETE_ITEMS = [
  'Besi hollow', 'Besi beton', 'Besi siku', 'Besi plat',
  'Pipa galvanis', 'Pipa besi', 'Pipa PVC', 'Pipa stainless',
  'Semen', 'Bata merah', 'Bata ringan', 'Genteng',
  'Triplek', 'Kayu meranti', 'Kayu jati', 'Multipleks',
  'Cat tembok', 'Cat besi', 'Dempul', 'Plamir',
  'Oli mesin', 'Oli transmisi', 'Oli hidrolik',
  'Bearing SKF', 'V-belt', 'Conveyor belt',
  'Kabel NYM', 'Kabel NYY', 'Kabel NYYHY',
  'MCB', 'Contactor', 'Timer', 'Relay',
  'Pompa air', 'Pompa submersible', 'Pompa centrifugal',
  'Kompresor udara', 'Mesin las', 'Gerinda',
  'Plastik PE', 'Karton box', 'Bubble wrap',
  'Botol plastik', 'Jerigen', 'Drum besi',
  'Tepung terigu', 'Gula pasir', 'Minyak goreng',
  'Kertas HVS', 'Tinta printer', 'Cartridge',
];

// Source configuration
window.SOURCES = [
  { id: 'indotrading', name: 'Indotrading', icon: 'fas fa-industry' },
  { id: 'indonetwork', name: 'Indonetwork', icon: 'fas fa-network-wired' },
  { id: 'gmaps', name: 'Google Maps', icon: 'fas fa-map-marker-alt' },
  { id: 'web', name: 'Web Resmi', icon: 'fas fa-globe' },
  { id: 'facebook', name: 'Facebook', icon: 'fab fa-facebook' },
  { id: 'olx', name: 'OLX Bisnis', icon: 'fas fa-tag' },
];

// Status options for follow-up
window.STATUS_OPTIONS = [
  { value: 'belum', label: 'Belum Dihubungi', color: '#4a5b78' },
  { value: 'sudah', label: 'Sudah Dihubungi', color: '#3b82f6' },
  { value: 'menunggu', label: 'Menunggu Balasan', color: '#f59e0b' },
  { value: 'deal', label: 'Deal ✓', color: '#10b981' },
  { value: 'tidak_deal', label: 'Tidak Deal', color: '#ef4444' },
];

// Indonesian provinces for filter
window.PROVINCES = [
  'Aceh','Sumatera Utara','Sumatera Barat','Riau','Kepulauan Riau',
  'Jambi','Sumatera Selatan','Bangka Belitung','Bengkulu','Lampung',
  'DKI Jakarta','Jawa Barat','Banten','Jawa Tengah','DI Yogyakarta',
  'Jawa Timur','Bali','Nusa Tenggara Barat','Nusa Tenggara Timur',
  'Kalimantan Barat','Kalimantan Tengah','Kalimantan Selatan',
  'Kalimantan Timur','Kalimantan Utara',
  'Sulawesi Utara','Gorontalo','Sulawesi Tengah','Sulawesi Barat',
  'Sulawesi Selatan','Sulawesi Tenggara',
  'Maluku','Maluku Utara','Papua Barat','Papua',
];
