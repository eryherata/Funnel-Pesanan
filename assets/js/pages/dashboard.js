import { dashboardData } from '../data/mock-data.js';
import { createManagedChart } from '../shared/charts.js';

export function initDashboardPage() {
  if (!document.getElementById('trendComboChart')) return;

  const render = () => {
    createManagedChart('dashboard-trend', 'trendComboChart', (ctx, colors) => new Chart(ctx, {
      type: 'bar',
      data: { labels: dashboardData.trendLabels, datasets: [
        { type: 'line', label: 'Profit Bersih', data: dashboardData.trendProfit, borderColor: '#00d27a', backgroundColor: '#00d27a', borderWidth: 3, tension: 0.4, yAxisID: 'y1' },
        { type: 'bar', label: 'Total Kontrak', data: dashboardData.trendKontrak, backgroundColor: '#2c7be5', borderRadius: 4, barPercentage: 0.5, yAxisID: 'y' },
      ] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { color: colors.tick, usePointStyle: true } } }, scales: { x: { grid: { display: false }, ticks: { color: colors.tick } }, y: { type: 'linear', display: true, position: 'left', grid: { color: colors.grid }, ticks: { color: colors.tick, callback: (v) => 'Rp' + v + 'Jt' } }, y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#00d27a', callback: (v) => 'Rp' + v + 'Jt' } } } },
    }));

    createManagedChart('dashboard-margin', 'marginDoughnutChart', (ctx) => new Chart(ctx, {
      type: 'doughnut',
      data: { labels: ['Pelaksana', 'Distributor', 'Pemasok'], datasets: [{ data: dashboardData.marginShare, backgroundColor: ['#2c7be5', '#00d27a', '#f5803e'], borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { display: false } } },
    }));

    createManagedChart('dashboard-top-satker', 'topSatkerChart', (ctx, colors) => new Chart(ctx, {
      type: 'bar',
      data: { labels: dashboardData.topSatkerLabels, datasets: [{ label: 'Kontrak', data: dashboardData.topSatkerValues, backgroundColor: 'rgba(245, 128, 62, 0.8)', hoverBackgroundColor: '#f5803e', borderRadius: 4, barPercentage: 0.6 }] },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: colors.grid }, ticks: { color: colors.tick } }, y: { grid: { display: false }, ticks: { color: colors.tick } } } },
    }));
  };

  render();
  document.addEventListener('app:charts-refresh', render);
}
