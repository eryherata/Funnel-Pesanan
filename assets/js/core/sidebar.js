function setTriggerExpanded(trigger, expanded) {
  if (!trigger) return;
  trigger.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  const wrapper = trigger.closest('.sidebar-item-wrapper');
  if (wrapper) wrapper.classList.toggle('sidebar-item-open', expanded);
}

function syncSidebarActiveState() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.sidebar-sub-item').forEach((link) => link.classList.remove('active'));

  const activeLink = document.querySelector(`.sidebar-sub-item[href="${currentPage}"]`);
  if (!activeLink) return;

  activeLink.classList.add('active');
  const parentCollapse = activeLink.closest('.collapse');
  if (!parentCollapse) return;

  const trigger = document.querySelector(`.sidebar-nav-item[href="#${parentCollapse.id}"]`);
  setTriggerExpanded(trigger, true);

  if (typeof bootstrap !== 'undefined' && bootstrap.Collapse) {
    let instance = bootstrap.Collapse.getInstance(parentCollapse);
    if (!instance) instance = new bootstrap.Collapse(parentCollapse, { toggle: false });
    instance.show();
  } else {
    parentCollapse.classList.add('show');
  }

  const sidebarTop = document.querySelector('.sidebar-top');
  if (sidebarTop && !document.body.classList.contains('sidebar-collapsed')) {
    requestAnimationFrame(() => {
      activeLink.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }
}

function bindCollapsedSidebarPopupHandlers() {
  document.querySelectorAll('.sidebar-item-wrapper').forEach((wrapper) => {
    const panel = wrapper.querySelector('.collapse');
    if (!panel || wrapper.dataset.popupBound === 'true') return;

    wrapper.dataset.popupBound = 'true';
    let closeTimer = null;

    const openPopup = () => {
      if (!document.body.classList.contains('sidebar-collapsed')) return;
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
      wrapper.classList.add('sidebar-popup-open');
    };

    const scheduleClose = () => {
      if (!document.body.classList.contains('sidebar-collapsed')) {
        wrapper.classList.remove('sidebar-popup-open');
        return;
      }
      if (closeTimer) clearTimeout(closeTimer);
      closeTimer = setTimeout(() => {
        wrapper.classList.remove('sidebar-popup-open');
      }, 180);
    };

    wrapper.addEventListener('mouseenter', openPopup);
    wrapper.addEventListener('mouseleave', scheduleClose);
    wrapper.addEventListener('focusin', openPopup);
    wrapper.addEventListener('focusout', () => {
      setTimeout(() => {
        if (!wrapper.contains(document.activeElement)) scheduleClose();
      }, 0);
    });

    panel.addEventListener('mouseenter', openPopup);
    panel.addEventListener('mouseleave', scheduleClose);
    panel.addEventListener('focusin', openPopup);
    panel.addEventListener('focusout', () => {
      setTimeout(() => {
        if (!wrapper.contains(document.activeElement)) scheduleClose();
      }, 0);
    });
  });
}

function bindCollapseStateHandlers() {
  document.querySelectorAll('.sidebar-item-wrapper').forEach((wrapper) => {
    const trigger = wrapper.querySelector('.sidebar-nav-item');
    const panel = wrapper.querySelector('.collapse');
    if (!trigger || !panel || panel.dataset.bound === 'true') return;

    panel.dataset.bound = 'true';
    const updateFromState = () => {
      const expanded = panel.classList.contains('show');
      setTriggerExpanded(trigger, expanded);
    };

    panel.addEventListener('show.bs.collapse', () => setTriggerExpanded(trigger, true));
    panel.addEventListener('shown.bs.collapse', updateFromState);
    panel.addEventListener('hide.bs.collapse', () => setTriggerExpanded(trigger, false));
    panel.addEventListener('hidden.bs.collapse', updateFromState);
    updateFromState();
  });
}

export function initSidebar() {
  bindCollapseStateHandlers();
  bindCollapsedSidebarPopupHandlers();
  syncSidebarActiveState();

  const savedSidebar = localStorage.getItem('sidebar') || 'expanded';
  if (savedSidebar === 'collapsed') {
    document.body.classList.add('sidebar-collapsed');
    const toggleText = document.getElementById('toggleText');
    if (toggleText) toggleText.innerText = 'Besarkan Tampilan';
  }

  const sidebarToggleBtn = document.getElementById('sidebarToggle');
  if (!sidebarToggleBtn || sidebarToggleBtn.dataset.bound === 'true') return;
  sidebarToggleBtn.dataset.bound = 'true';
  sidebarToggleBtn.addEventListener('click', () => {
    const isCollapsed = document.body.classList.toggle('sidebar-collapsed');
    const toggleText = document.getElementById('toggleText');
    if (toggleText) toggleText.innerText = isCollapsed ? 'Besarkan Tampilan' : 'Kecilkan Tampilan';
    localStorage.setItem('sidebar', isCollapsed ? 'collapsed' : 'expanded');
    document.dispatchEvent(new CustomEvent('app:sidebar-changed', { detail: { collapsed: isCollapsed } }));
  });
}
