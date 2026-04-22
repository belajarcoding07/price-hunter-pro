// =============================================
// PRICE HUNTER PRO — FOLLOW UP MODULE
// =============================================
window.FollowUp = {
  render() {
    const suppliers = Storage.getAllTrackedSuppliers();
    const groups = {
      belum: [], sudah: [], menunggu: [], deal: [], tidak_deal: []
    };

    suppliers.forEach(s => {
      const status = s.status || 'belum';
      if (groups[status]) groups[status].push(s);
      else groups['belum'].push(s);
    });

    STATUS_OPTIONS.forEach(opt => {
      const col = document.getElementById(`kanban-${opt.value}`);
      const countEl = document.getElementById(`count-${opt.value}`);
      const list = groups[opt.value] || [];
      if (countEl) countEl.textContent = list.length;

      if (!col) return;
      if (!list.length) {
        col.innerHTML = `<div style="padding:12px;text-align:center;font-size:12px;color:var(--text-muted)">Tidak ada</div>`;
        return;
      }

      col.innerHTML = list.map(s => {
        const waMsg = encodeURIComponent(`Selamat pagi ${s.name}, melanjutkan konfirmasi mengenai ${s.searchItem || 'barang'} yang kami tanyakan sebelumnya. Sudah ada info?`);
        const waLink = s.whatsapp ? `https://wa.me/${s.whatsapp}?text=${waMsg}` : `#`;
        return `
        <div class="kanban-card">
          <div class="kanban-card-name">${s.name}</div>
          ${s.searchItem ? `<div class="kanban-card-item"><i class="fas fa-box" style="margin-right:4px;color:var(--blue)"></i>${s.searchItem}</div>` : ''}
          ${s.location ? `<div class="kanban-card-item"><i class="fas fa-map-marker-alt" style="margin-right:4px;color:var(--text-muted)"></i>${s.location}</div>` : ''}
          ${s.note ? `<div class="kanban-card-item" style="font-style:italic">"${s.note}"</div>` : ''}
          ${s.whatsapp
            ? `<a href="${waLink}" target="_blank" class="kanban-wa-btn" onclick="Storage.setStatus('${s.id}','menunggu')">
                <i class="fab fa-whatsapp"></i> Follow Up WA
               </a>`
            : ''
          }
        </div>`;
      }).join('');
    });
  }
};
