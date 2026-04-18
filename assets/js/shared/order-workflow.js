(function (window) {
  'use strict';

  function getDictionary() {
    return window.DataSystemDictionary || null;
  }

  function normalizeOrderStatus(value) {
    return getDictionary()?.normalizeOrderStatus?.(value) || value || 'Baru';
  }

  function normalizeShippingStatus(value) {
    return getDictionary()?.normalizeShippingStatus?.(value) || value || 'Belum Diproses';
  }

  function getTransitions() {
    return getDictionary()?.getStatusDictionary?.()?.orderTransitions || {
      'Baru': ['Baru', 'Validasi Data', 'Diproses', 'Bermasalah'],
      'Validasi Data': ['Validasi Data', 'Diproses', 'Bermasalah'],
      'Diproses': ['Diproses', 'Siap Kirim', 'Bermasalah'],
      'Siap Kirim': ['Siap Kirim', 'Dalam Pengiriman', 'Bermasalah'],
      'Dalam Pengiriman': ['Dalam Pengiriman', 'Selesai', 'Bermasalah'],
      'Bermasalah': ['Bermasalah', 'Diproses', 'Siap Kirim', 'Dalam Pengiriman', 'Selesai'],
      'Selesai': ['Selesai'],
    };
  }

  function isFilled(value) {
    return !(value === undefined || value === null || String(value).trim() === '' || String(value).trim() === '-');
  }

  function validateOrderWorkflow(order, previousStatus) {
    const nextStatus = normalizeOrderStatus(order?.status_pesanan || order?.status || 'Baru');
    const currentStatus = previousStatus ? normalizeOrderStatus(previousStatus) : null;
    const errors = [];
    const transitions = getTransitions();

    if (currentStatus && transitions[currentStatus] && !transitions[currentStatus].includes(nextStatus)) {
      errors.push(`Transisi status dari ${currentStatus} ke ${nextStatus} tidak diizinkan.`);
    }

    const mustHave = {
      'Baru': [['po_number', 'Nomor PO'], ['po_date', 'Tanggal PO'], ['nama_pengadaan', 'Nama pengadaan'], ['satker', 'Satuan kerja']],
      'Validasi Data': [['principal', 'Principal'], ['pemasok', 'Pemasok'], ['pelaksana', 'Pelaksana']],
      'Diproses': [['principal', 'Principal'], ['pemasok', 'Pemasok'], ['pelaksana', 'Pelaksana']],
      'Siap Kirim': [['principal', 'Principal'], ['pemasok', 'Pemasok'], ['pelaksana', 'Pelaksana']],
      'Dalam Pengiriman': [['resi', 'Nomor resi'], ['actual_sent', 'Tanggal aktual dikirim']],
      'Selesai': [['actual_received', 'Tanggal aktual diterima'], ['receiver', 'Nama penerima']],
    };

    (mustHave[nextStatus] || []).forEach(([key, label]) => {
      if (!isFilled(order?.[key])) errors.push(`${label} wajib diisi untuk status ${nextStatus}.`);
    });

    if (['Validasi Data', 'Diproses', 'Siap Kirim', 'Dalam Pengiriman', 'Selesai'].includes(nextStatus) && !(Array.isArray(order?.items) && order.items.length)) {
      errors.push(`Item pesanan wajib ada untuk status ${nextStatus}.`);
    }
    if (nextStatus === 'Siap Kirim') {
      ['doc_po_pel', 'doc_po_dis', 'doc_po_pem'].forEach((key) => {
        if (String(order?.[key] || '').trim() !== 'Sudah') {
          const labels = { doc_po_pel: 'PO Pelaksana → Distributor', doc_po_dis: 'PO Distributor → Pemasok', doc_po_pem: 'PO Pemasok → Principal' };
          errors.push(`${labels[key]} harus sudah tersedia untuk status Siap Kirim.`);
        }
      });
    }
    if (nextStatus === 'Dalam Pengiriman') {
      const shipping = normalizeShippingStatus(order?.status_pengiriman || '');
      if (!['Dalam Perjalanan', 'Tiba', 'BAST'].includes(shipping)) {
        errors.push('Status pengiriman harus minimal Dalam Perjalanan untuk status Dalam Pengiriman.');
      }
    }
    if (nextStatus === 'Selesai') {
      if (String(order?.doc_bast || '').trim() !== 'Sudah') errors.push('Dokumen BAST harus sudah tersedia untuk status Selesai.');
      const shipping = normalizeShippingStatus(order?.status_pengiriman || '');
      if (!['Tiba', 'BAST'].includes(shipping)) errors.push('Status pengiriman harus Tiba atau BAST untuk status Selesai.');
    }
    return { ok: errors.length === 0, errors, currentStatus, nextStatus };
  }

  function validateFunnelConversion(funnel, options) {
    return getDictionary()?.validateFunnelConversion?.(funnel, options) || { ok: true, errors: [], warnings: [] };
  }



  function validateOrderEntryStage(order, stage, options) {
    const currentStage = String(stage || order?.entry_stage || 'header').trim().toLowerCase();
    const opts = options || {};
    const errors = [];

    if (currentStage === 'header') {
      [['po_number', 'Nomor PO'], ['po_date', 'Tanggal PO'], ['nama_pengadaan', 'Nama pengadaan'], ['satker', 'Satuan kerja']].forEach(function (pair) {
        if (!isFilled(order?.[pair[0]])) errors.push(pair[1] + ' wajib diisi pada tahap Header.');
      });
    }

    if (currentStage === 'execution') {
      [['principal', 'Principal'], ['pemasok', 'Pemasok'], ['pelaksana', 'Pelaksana']].forEach(function (pair) {
        if (!isFilled(order?.[pair[0]])) errors.push(pair[1] + ' wajib diisi pada tahap Eksekusi.');
      });
      if (!(Array.isArray(order?.items) && order.items.length)) {
        errors.push('Minimal satu item produk wajib diisi pada tahap Eksekusi.');
      }
    }

    if (currentStage === 'closing') {
      const targetStatus = normalizeOrderStatus(order?.status_pesanan || 'Baru');
      const shipping = normalizeShippingStatus(order?.status_pengiriman || 'Belum Diproses');
      if (targetStatus === 'Dalam Pengiriman') {
        if (!isFilled(order?.resi)) errors.push('Nomor resi wajib diisi pada tahap Closing untuk status Dalam Pengiriman.');
        if (!isFilled(order?.actual_sent)) errors.push('Tanggal aktual dikirim wajib diisi pada tahap Closing untuk status Dalam Pengiriman.');
        if (!['Dalam Perjalanan', 'Tiba', 'BAST'].includes(shipping)) errors.push('Status pengiriman harus minimal Dalam Perjalanan pada tahap Closing.');
      }
      if (targetStatus === 'Selesai') {
        if (!isFilled(order?.actual_received)) errors.push('Tanggal aktual diterima wajib diisi untuk status Selesai.');
        if (!isFilled(order?.receiver)) errors.push('Nama penerima wajib diisi untuk status Selesai.');
        if (String(order?.doc_bast || '').trim() !== 'Sudah') errors.push('Dokumen BAST wajib sudah tersedia untuk status Selesai.');
      }
      if (!opts.relaxed && ['Siap Kirim', 'Dalam Pengiriman', 'Selesai'].includes(targetStatus) && !(Array.isArray(order?.items) && order.items.length)) {
        errors.push('Tahap Closing membutuhkan item produk yang sudah terisi.');
      }
    }

    return { ok: errors.length === 0, errors: errors, stage: currentStage };
  }

  function renderAuditList(logs) {
    const rows = Array.isArray(logs) ? logs : [];
    if (!rows.length) {
      return '<div class="text-muted small">Belum ada audit trail.</div>';
    }
    return '<ul class="list-group list-group-flush">' + rows.map((log) => {
      const date = log.created_at || log.createdAt || '-';
      const actor = log.actor_name || log.actorName || 'system';
      const action = log.action_type || log.actionType || '-';
      const summary = log.summary || '-';
      return `<li class="list-group-item bg-transparent px-0"><div class="d-flex justify-content-between gap-3"><div><div class="fw-semibold">${summary}</div><div class="small text-muted">${actor} • ${action}</div></div><div class="small text-muted text-nowrap">${new Date(date).toLocaleString('id-ID')}</div></div></li>`;
    }).join('') + '</ul>';
  }



  function normalizeIssueSeverity(value) {
    const text = String(value || '').trim().toLowerCase();
    if (/(krit|critical|block)/.test(text)) return 'Kritis';
    if (/(tinggi|high)/.test(text)) return 'Tinggi';
    if (/(sedang|medium)/.test(text)) return 'Sedang';
    return 'Rendah';
  }

  function getDocumentChecklist(order) {
    const row = order || {};
    const entries = [
      { id: 'doc_po_pel', label: 'PO Pelaksana → Distributor', status: row.doc_po_pel || 'Belum', requiredFor: 'Siap Kirim' },
      { id: 'doc_po_dis', label: 'PO Distributor → Pemasok', status: row.doc_po_dis || 'Belum', requiredFor: 'Siap Kirim' },
      { id: 'doc_po_pem', label: 'PO Pemasok → Principal', status: row.doc_po_pem || 'Belum', requiredFor: 'Siap Kirim' },
      { id: 'doc_sj', label: 'Surat Jalan', status: row.doc_sj || 'Belum', requiredFor: 'Dalam Pengiriman' },
      { id: 'doc_bast', label: 'BAST / Bukti Terima', status: row.doc_bast || 'Belum', requiredFor: 'Selesai' },
      { id: 'sales_number', label: 'Nomor Penjualan', status: isFilled(row.sales_number) ? 'Sudah' : 'Belum', requiredFor: 'Dalam Pengiriman' },
      { id: 'resi', label: 'Nomor Resi', status: isFilled(row.resi) ? 'Sudah' : 'Belum', requiredFor: 'Dalam Pengiriman' },
      { id: 'receiver', label: 'Nama Penerima', status: isFilled(row.receiver) ? 'Sudah' : 'Belum', requiredFor: 'Selesai' },
    ];
    return entries.map(function (item) {
      const required = ['Siap Kirim', 'Dalam Pengiriman', 'Selesai'].includes(normalizeOrderStatus(row.status_pesanan || 'Baru'))
        ? (item.requiredFor === 'Siap Kirim' || (item.requiredFor === 'Dalam Pengiriman' && ['Dalam Pengiriman', 'Selesai'].includes(normalizeOrderStatus(row.status_pesanan))) || (item.requiredFor === 'Selesai' && normalizeOrderStatus(row.status_pesanan) === 'Selesai'))
        : false;
      return { ...item, required };
    });
  }

  function getIssueEntries(order, externalIssues) {
    const inlineEntries = Array.isArray(order?.issue_entries) ? order.issue_entries : [];
    const merged = [...(Array.isArray(externalIssues) ? externalIssues : []), ...inlineEntries];
    const seen = new Set();
    return merged.filter(function (item, index) {
      const key = String(item?.id || item?.issue_id || item?.created_at || index).trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map(function (item, index) {
      return {
        id: item?.id || item?.issue_id || ('issue-' + index),
        order_id: item?.order_id || order?.id || null,
        order_no: item?.order_no || order?.po_number || null,
        issue_type: item?.issue_type || item?.type || 'Exception',
        severity: normalizeIssueSeverity(item?.severity),
        title: item?.title || item?.summary || item?.issue_type || 'Issue',
        description: item?.description || item?.note || item?.catatan || '-',
        owner_name: item?.owner_name || item?.ownerName || item?.owner || '-',
        due_date: item?.due_date || item?.target_resolution || null,
        status: item?.status || 'Open',
        resolved_at: item?.resolved_at || null,
        created_at: item?.created_at || item?.createdAt || new Date().toISOString(),
      };
    });
  }

  function renderDocumentChecklist(items) {
    const rows = Array.isArray(items) ? items : [];
    if (!rows.length) return '<div class="text-muted small">Belum ada checklist.</div>';
    return '<div class="list-group list-group-flush">' + rows.map(function (item) {
      const ready = String(item.status || '').trim() === 'Sudah';
      const icon = ready ? 'fa-circle-check text-success' : item.required ? 'fa-circle-exclamation text-warning' : 'fa-circle text-muted';
      const badge = ready ? '<span class="badge bg-success-subtle text-success border border-success-subtle">Sudah</span>' : (item.required ? '<span class="badge bg-warning-subtle text-warning border border-warning-subtle">Wajib</span>' : '<span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle">Opsional</span>');
      return '<div class="list-group-item bg-transparent px-0 py-2 d-flex justify-content-between align-items-start gap-3"><div><div class="fw-semibold"><i class="fa-solid ' + icon + ' me-2"></i>' + item.label + '</div><div class="small text-muted">Dibutuhkan mulai status ' + item.requiredFor + '</div></div><div>' + badge + '</div></div>';
    }).join('') + '</div>';
  }

  function renderIssueList(items) {
    const rows = Array.isArray(items) ? items : [];
    if (!rows.length) return '<div class="text-muted small">Belum ada blocker atau exception aktif.</div>';
    return '<div class="d-flex flex-column gap-2">' + rows.map(function (item) {
      const open = String(item.status || 'Open').toLowerCase() === 'open';
      const severity = normalizeIssueSeverity(item.severity);
      const badgeClass = severity === 'Kritis' ? 'bg-danger text-white border border-danger' : severity === 'Tinggi' ? 'bg-danger-subtle text-danger border border-danger-subtle' : severity === 'Sedang' ? 'bg-warning-subtle text-warning border border-warning-subtle' : 'bg-info-subtle text-info border border-info-subtle';
      const statusBadge = open ? '<span class="badge bg-warning-subtle text-warning border border-warning-subtle">Open</span>' : '<span class="badge bg-success-subtle text-success border border-success-subtle">Resolved</span>';
      const actionBtn = open ? '<button type="button" class="btn btn-sm btn-outline-success resolve-order-issue" data-issue-id="' + item.id + '"><i class="fa-solid fa-check me-1"></i>Resolve</button>' : '';
      return '<div class="detail-field-card py-2 px-3"><div class="d-flex justify-content-between align-items-start gap-3"><div><div class="d-flex flex-wrap align-items-center gap-2 mb-1"><span class="badge ' + badgeClass + '">' + severity + '</span><span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle">' + item.issue_type + '</span>' + statusBadge + '</div><div class="fw-semibold">' + item.title + '</div><div class="small text-muted">Owner: ' + (item.owner_name || '-') + ' • Target: ' + (item.due_date ? new Date(item.due_date).toLocaleDateString('id-ID') : '-') + '</div><div class="small mt-1">' + item.description + '</div></div><div class="d-flex flex-column gap-2">' + actionBtn + '<button type="button" class="btn btn-sm btn-outline-secondary delete-order-issue" data-issue-id="' + item.id + '"><i class="fa-regular fa-trash-can me-1"></i>Hapus</button></div></div></div>';
    }).join('') + '</div>';
  }

  function renderStatusHistory(logs) {
    const rows = Array.isArray(logs) ? logs : [];
    if (!rows.length) return '<div class="text-muted small">Belum ada riwayat status.</div>';
    return '<ul class="list-group list-group-flush">' + rows.map(function (log) {
      const snapshot = log.snapshot_json || log.snapshotJson || {};
      const prev = snapshot.previousStatus || snapshot.previous_status || null;
      const next = snapshot.nextStatus || snapshot.next_status || snapshot.status_pesanan || null;
      const ship = snapshot.shippingStatus || snapshot.shipping_status || null;
      const summary = prev && next ? ('Status: ' + prev + ' → ' + next) : (log.summary || '-');
      const shipText = ship ? '<div class="small text-muted">Pengiriman: ' + ship + '</div>' : '';
      return '<li class="list-group-item bg-transparent px-0"><div class="fw-semibold">' + summary + '</div>' + shipText + '<div class="small text-muted">' + (log.actor_name || log.actorName || 'system') + ' • ' + new Date(log.created_at || log.createdAt || Date.now()).toLocaleString('id-ID') + '</div></li>';
    }).join('') + '</ul>';
  }

  window.DataSystemWorkflow = {
    normalizeOrderStatus,
    normalizeShippingStatus,
    validateOrderWorkflow,
    validateFunnelConversion,
    validateOrderEntryStage,
    renderAuditList,
    getDocumentChecklist,
    getIssueEntries,
    renderDocumentChecklist,
    renderIssueList,
    renderStatusHistory,
    normalizeIssueSeverity,
  };
})(window);
