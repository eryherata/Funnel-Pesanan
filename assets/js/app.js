import { initTheme } from './core/theme.js';
import { initSidebar } from './core/sidebar.js';
import { initPlugins } from './core/plugins.js';
import { initDashboardPage } from './pages/dashboard.js';
import { initLogistikPage } from './pages/logistik-sla.js';
import { initDataPesananPage } from './pages/data-pesanan.js';
import { initDatabaseMasterPage } from './pages/database-master.js';
import { initInputPesananPage } from './pages/input-pesanan.js';
import { initKalkulatorB2BPage } from './pages/kalkulator-b2b.js';
import { initKalkulatorDistributorPage } from './pages/kalkulator-distributor.js';

function initApp() {
  initTheme();
  initSidebar();
  initPlugins();
  initDashboardPage();
  initLogistikPage();
  initDataPesananPage();
  initDatabaseMasterPage();
  initInputPesananPage();
  initKalkulatorB2BPage();
  initKalkulatorDistributorPage();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
