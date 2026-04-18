(function (window, document) {
  'use strict';

  const ICONS = {
    info: 'fa-circle-info',
    success: 'fa-circle-check',
    warning: 'fa-triangle-exclamation',
    danger: 'fa-circle-xmark',
    primary: 'fa-bolt'
  };

  function ensureToastRoot() {
    let root = document.getElementById('ds-toast-root');
    if (root) return root;
    root = document.createElement('div');
    root.id = 'ds-toast-root';
    root.className = 'toast-container position-fixed top-0 end-0 p-3';
    root.style.zIndex = '1095';
    document.body.appendChild(root);
    return root;
  }

  function ensureModal() {
    let modal = document.getElementById('ds-feedback-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'ds-feedback-modal';
    modal.tabIndex = -1;
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = [
      '<div class="modal-dialog modal-dialog-centered">',
      '  <div class="modal-content ds-feedback-modal">',
      '    <div class="modal-header">',
      '      <h5 class="modal-title" id="ds-feedback-title"></h5>',
      '      <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>',
      '    </div>',
      '    <div class="modal-body">',
      '      <div class="ds-feedback-body d-flex gap-3 align-items-start">',
      '        <div class="ds-feedback-icon" id="ds-feedback-icon"><i class="fa-solid fa-circle-info"></i></div>',
      '        <div class="flex-grow-1">',
      '          <div class="ds-feedback-message" id="ds-feedback-message"></div>',
      '          <div id="ds-feedback-extra"></div>',
      '        </div>',
      '      </div>',
      '    </div>',
      '    <div class="modal-footer">',
      '      <button type="button" class="btn btn-outline-primary bg-surface" id="ds-feedback-cancel">Batal</button>',
      '      <button type="button" class="btn btn-primary" id="ds-feedback-confirm">OK</button>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');
    document.body.appendChild(modal);
    return modal;
  }

  function getModalInstance() {
    const modalEl = ensureModal();
    return window.bootstrap ? window.bootstrap.Modal.getOrCreateInstance(modalEl) : null;
  }

  function nl2br(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  }

  function toast(message, variant, options) {
    const type = variant || 'info';
    const root = ensureToastRoot();
    const toastEl = document.createElement('div');
    toastEl.className = 'toast align-items-center border-0 ds-toast ds-toast-' + type;
    toastEl.role = 'alert';
    toastEl.ariaLive = 'assertive';
    toastEl.ariaAtomic = 'true';
    toastEl.innerHTML = [
      '<div class="d-flex align-items-start">',
      '  <div class="toast-body">',
      '    <div class="d-flex gap-2 align-items-start">',
      '      <i class="fa-solid ' + (ICONS[type] || ICONS.info) + ' mt-1"></i>',
      '      <div>' + nl2br(message) + '</div>',
      '    </div>',
      '  </div>',
      '  <button type="button" class="btn-close btn-close-white me-2 mt-2" data-bs-dismiss="toast" aria-label="Close"></button>',
      '</div>'
    ].join('');
    root.appendChild(toastEl);
    const delay = Number(options?.delay || 3200);
    if (window.bootstrap?.Toast) {
      const instance = window.bootstrap.Toast.getOrCreateInstance(toastEl, { delay, autohide: options?.autohide !== false });
      toastEl.addEventListener('hidden.bs.toast', function () { toastEl.remove(); }, { once: true });
      instance.show();
    } else {
      setTimeout(function () { toastEl.remove(); }, delay);
    }
    return toastEl;
  }

  function showDialog(config) {
    return new Promise(function (resolve) {
      const modalEl = ensureModal();
      const modal = getModalInstance();
      const titleEl = modalEl.querySelector('#ds-feedback-title');
      const messageEl = modalEl.querySelector('#ds-feedback-message');
      const extraEl = modalEl.querySelector('#ds-feedback-extra');
      const iconEl = modalEl.querySelector('#ds-feedback-icon');
      const confirmBtn = modalEl.querySelector('#ds-feedback-confirm');
      const cancelBtn = modalEl.querySelector('#ds-feedback-cancel');
      const type = config?.variant || 'info';
      let settled = false;

      titleEl.textContent = config?.title || 'Informasi';
      messageEl.innerHTML = nl2br(config?.message || '');
      extraEl.innerHTML = '';
      iconEl.className = 'ds-feedback-icon text-' + (type === 'danger' ? 'danger' : type === 'warning' ? 'warning' : type === 'success' ? 'success' : 'primary');
      iconEl.innerHTML = '<i class="fa-solid ' + (ICONS[type] || ICONS.info) + '"></i>';

      if (config?.extraNode) extraEl.appendChild(config.extraNode);

      confirmBtn.textContent = config?.confirmText || 'OK';
      confirmBtn.className = 'btn btn-' + (config?.confirmClass || (type === 'danger' ? 'danger' : 'primary'));
      cancelBtn.textContent = config?.cancelText || 'Batal';
      cancelBtn.style.display = config?.showCancel ? '' : 'none';

      const cleanup = function (value) {
        if (settled) return;
        settled = true;
        confirmBtn.onclick = null;
        cancelBtn.onclick = null;
        modalEl.removeEventListener('hidden.bs.modal', onHidden);
        resolve(value);
      };

      const onHidden = function () { cleanup(config?.defaultValue ?? false); };
      modalEl.addEventListener('hidden.bs.modal', onHidden, { once: true });

      confirmBtn.onclick = function () {
        const value = typeof config?.onConfirm === 'function' ? config.onConfirm() : true;
        cleanup(value);
        modal?.hide();
      };
      cancelBtn.onclick = function () {
        cleanup(false);
        modal?.hide();
      };

      modal?.show();
    });
  }

  function alertDialog(message, options) {
    return showDialog({
      title: options?.title || 'Informasi',
      message,
      variant: options?.variant || 'info',
      confirmText: options?.confirmText || 'Tutup',
      confirmClass: options?.confirmClass || 'primary',
      showCancel: false,
      defaultValue: true,
    });
  }

  function confirmDialog(message, options) {
    return showDialog({
      title: options?.title || 'Konfirmasi',
      message,
      variant: options?.variant || 'warning',
      confirmText: options?.confirmText || 'Lanjutkan',
      cancelText: options?.cancelText || 'Batal',
      confirmClass: options?.confirmClass || 'primary',
      showCancel: true,
      defaultValue: false,
    });
  }

  function choose(message, options) {
    const select = document.createElement('select');
    select.className = 'form-select mt-3';
    (options?.choices || []).forEach(function (item) {
      const option = document.createElement('option');
      option.value = item.value;
      option.textContent = item.label;
      if (item.description) option.dataset.description = item.description;
      if (item.value === (options?.defaultValue || item.value)) option.selected = true;
      select.appendChild(option);
    });
    const help = document.createElement('div');
    help.className = 'small text-muted mt-2';
    const syncHelp = function () {
      const selected = options?.choices?.find(function (item) { return item.value === select.value; });
      help.textContent = selected?.description || '';
    };
    syncHelp();
    select.addEventListener('change', syncHelp);
    const wrapper = document.createElement('div');
    wrapper.appendChild(select);
    wrapper.appendChild(help);
    return showDialog({
      title: options?.title || 'Pilih Opsi',
      message,
      variant: options?.variant || 'primary',
      confirmText: options?.confirmText || 'Pilih',
      cancelText: options?.cancelText || 'Batal',
      confirmClass: options?.confirmClass || 'primary',
      showCancel: true,
      extraNode: wrapper,
      onConfirm: function () { return select.value; },
      defaultValue: '',
    });
  }

  window.DataSystemFeedback = {
    toast,
    alert: alertDialog,
    confirm: confirmDialog,
    choose,
  };

  window.alert = function (message) {
    alertDialog(message, { title: 'Informasi', variant: 'info' });
  };
})(window, document);
