import { logistikRows } from '../data/mock-data.js';
import { createManagedChart } from '../shared/charts.js';

export function initLogistikPage() {
  if (!document.getElementById('slaChart')) return;

  const renderCharts = () => {
    createManagedChart('logistik-sla', 'slaChart', (ctx, colors) => new Chart(ctx, {
      type: 'line',
      data: { labels: ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'], datasets: [
        { label: 'Tepat Waktu', data: [90, 92, 95, 93], borderColor: '#00d27a', backgroundColor: 'rgba(0, 210, 122, 0.1)', fill: true, tension: 0.4 },
        { label: 'Terlambat', data: [10, 8, 5, 7], borderColor: '#e63757', backgroundColor: 'transparent', borderDash: [5, 5], tension: 0.4 },
      ] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { color: colors.tick } } }, scales: { y: { grid: { color: colors.grid }, ticks: { color: colors.tick, callback: (v) => v + '%' } }, x: { grid: { display: false }, ticks: { color: colors.tick } } } },
    }));

    createManagedChart('logistik-doughnut', 'logistikDoughnutChart', (ctx) => new Chart(ctx, {
      type: 'doughnut',
      data: { labels: ['Perjalanan', 'Penyiapan', 'Tiba'], datasets: [{ data: [45, 12, 124], backgroundColor: ['#2c7be5', '#f5803e', '#00d27a'], borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false } } },
    }));
  };

  renderCharts();
  document.addEventListener('app:charts-refresh', renderCharts);

  if (typeof Tabulator !== 'undefined' && document.getElementById('logistik-grid')) {
    new Tabulator('#logistik-grid', {
      data: logistikRows,
      layout: 'fitColumns',
      columns: [
        { title: 'No. PO', field: 'po', width: 100, cssClass: 'fw-bold text-primary' },
        { title: 'Satuan Kerja', field: 'satker', minWidth: 200 },
        { title: 'Ekspedisi', field: 'ekspedisi', width: 150 },
        { title: 'Target Tiba', field: 'tgl', width: 120 },
        { title: 'Status', field: 'status', width: 150, formatter: (cell) => {
          const val = cell.getValue();
          const color = val === 'Rawan' ? 'danger' : (val === 'Tepat Waktu' ? 'success' : 'primary');
          return `<span class="badge bg-${color}-subtle text-${color} border border-${color}">${val}</span>`;
        } },
        { title: 'Progress (%)', field: 'prog', formatter: 'progress', formatterParams: { color: ['#e63757', '#f5803e', '#00d27a'] } },
      ],
    });
  }
}
