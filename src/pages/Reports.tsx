import { useState } from 'react';
import {
  getOrders, exportOrdersCSV, importOrdersCSV, exportBackup, importBackup,
  getConfig, getCostForMonth, monthISO, daysAgoISO, deleteOrder
} from '@/utils/storage';
import {
  mean, stdDev, linearRegression, compoundGrowthRate,
  coefficientOfVariation, enterpriseHealthIndex, errorMetrics,
  movingAverage, exponentialMovingAverage, breakEvenAnalysis
} from '@/utils/math';
import { Download, Upload, FileText, Database, Trash2 } from 'lucide-react';
import jsPDF from 'jspdf';

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const config = getConfig();
  const symbol = config.currency_symbol;
  const [msg, setMsg] = useState('');
  const [fileRef, setFileRef] = useState<HTMLInputElement | null>(null);

  const showMsg = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 3000);
  };

  const handleExportCSV = () => {
    const csv = exportOrdersCSV();
    downloadFile(csv, `lsris_sales_${monthISO()}.csv`, 'text/csv');
    showMsg('CSV exported successfully');
  };

  const handleExportBackup = () => {
    const json = exportBackup();
    downloadFile(json, `lsris_backup_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
    showMsg('Backup exported successfully');
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = importOrdersCSV(ev.target?.result as string);
      showMsg(`Imported ${result.imported} records (${result.errors} errors)`);
    };
    reader.readAsText(file);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const ok = importBackup(ev.target?.result as string);
      showMsg(ok ? 'Backup restored successfully' : 'Restore failed — invalid backup file');
    };
    reader.readAsText(file);
  };

  const generatePDFReport = () => {
    const orders = getOrders();
    const month = monthISO();
    const monthOrders = orders.filter(o => o.date.startsWith(month));
    const allRevenues = Object.values(
      orders.reduce((acc: Record<string, number>, o) => {
        acc[o.date] = (acc[o.date] || 0) + o.total_revenue;
        return acc;
      }, {})
    );

    const monthRev = monthOrders.reduce((s, o) => s + o.total_revenue, 0);
    const cost = getCostForMonth(month);
    const totalCost = cost ? cost.flour_cost + cost.gas_cost + cost.electricity_cost + cost.labor_cost + cost.misc_cost : 0;
    const profit = monthRev - totalCost;
    const mu = mean(allRevenues);
    const cv = coefficientOfVariation(allRevenues);
    const reg = linearRegression(allRevenues);
    const cagr = allRevenues.length >= 2
      ? compoundGrowthRate(allRevenues[0] || 1, allRevenues[allRevenues.length - 1] || 1, allRevenues.length)
      : 0;
    const ema = exponentialMovingAverage(allRevenues, 0.3);
    const metrics = allRevenues.length >= 2
      ? errorMetrics(allRevenues.slice(1), ema.slice(0, -1))
      : { mae: 0, mse: 0, rmse: 0, mape: 0 };
    const health = enterpriseHealthIndex({
      cagr, cv,
      profit_margin: monthRev > 0 ? profit / monthRev : 0,
      mape: metrics.mape,
    });

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210;
    let y = 20;

    const section = (title: string) => {
      doc.setFontSize(11);
      doc.setTextColor(34, 211, 211);
      doc.text(title, 15, y);
      doc.setDrawColor(34, 211, 211);
      doc.line(15, y + 2, W - 15, y + 2);
      y += 8;
      doc.setTextColor(30, 30, 30);
    };

    const row = (label: string, value: string) => {
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(label, 20, y);
      doc.setTextColor(20, 20, 20);
      doc.text(value, 130, y);
      y += 5.5;
    };

    // Header
    doc.setFillColor(13, 17, 23);
    doc.rect(0, 0, W, 18, 'F');
    doc.setFontSize(14);
    doc.setTextColor(34, 211, 211);
    doc.text('LSRIS — Monthly Revenue Intelligence Report', 15, 12);
    doc.setFontSize(9);
    doc.setTextColor(140, 140, 140);
    doc.text(`Generated: ${new Date().toLocaleString()}  ·  Period: ${month}`, 15, 17);
    y = 26;

    section('EXECUTIVE SUMMARY');
    const healthLabel = health.score >= 75 ? 'EXCELLENT' : health.score >= 60 ? 'GOOD' : health.score >= 45 ? 'MODERATE' : 'AT RISK';
    const summaryText = `This ${month} report covers ${monthOrders.length} transactions generating ${symbol} ${monthRev.toFixed(2)} in revenue. ` +
      `Net profit stands at ${symbol} ${profit.toFixed(2)} against total operating costs of ${symbol} ${totalCost.toFixed(2)}. ` +
      `The Enterprise Health Index is ${health.score}/100 (${healthLabel}), driven by a ` +
      `${(cagr * 100).toFixed(1)}% compound growth rate, ${(cv * 100).toFixed(1)}% revenue volatility (CV), ` +
      `and a forecast MAPE of ${metrics.mape.toFixed(1)}%. ` +
      `Linear trend slope: ${reg.slope.toFixed(2)} ${symbol}/day.`;
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    const lines = doc.splitTextToSize(summaryText, W - 30);
    doc.text(lines, 15, y);
    y += lines.length * 5 + 6;

    section('REVENUE METRICS');
    row('Monthly Revenue', `${symbol} ${monthRev.toFixed(2)}`);
    row('Total Orders', `${monthOrders.length}`);
    row('Average Daily Revenue', `${symbol} ${mu.toFixed(2)}`);
    row('Std Deviation', `${symbol} ${stdDev(allRevenues).toFixed(2)}`);
    row('Revenue Trend (slope)', `${reg.slope.toFixed(3)} ${symbol}/day`);
    row('R² (fit quality)', reg.r_squared.toFixed(4));
    y += 3;

    section('COST & PROFITABILITY');
    row('Total Operating Cost', `${symbol} ${totalCost.toFixed(2)}`);
    row('Net Profit', `${symbol} ${profit.toFixed(2)}`);
    row('Profit Margin', `${monthRev > 0 ? ((profit / monthRev) * 100).toFixed(1) : 0}%`);
    row('Break-even Revenue', `${symbol} ${totalCost.toFixed(2)}`);
    row('Surplus / Deficit', `${symbol} ${(monthRev - totalCost).toFixed(2)}`);
    y += 3;

    section('STATISTICAL ANALYTICS');
    row('Coefficient of Variation (CV)', `${(cv * 100).toFixed(1)}%`);
    row('CAGR', `${(cagr * 100).toFixed(2)}%`);
    row('MAE', `${symbol} ${metrics.mae.toFixed(2)}`);
    row('RMSE', `${symbol} ${metrics.rmse.toFixed(2)}`);
    row('MAPE', `${metrics.mape.toFixed(1)}%`);
    y += 3;

    section('ENTERPRISE HEALTH INDEX');
    row('Overall Score', `${health.score} / 100 (${healthLabel})`);
    row('Growth Component', `${health.components.growth} / 100`);
    row('Stability Component', `${health.components.stability} / 100`);
    row('Profitability Component', `${health.components.profitability} / 100`);
    row('Forecast Reliability', `${health.components.forecast_reliability} / 100`);
    y += 3;

    section('METHODOLOGY & ASSUMPTIONS');
    const methodText = [
      '• Additive decomposition: R(t) = T(t) + S(t) + E(t)',
      '• Trend via OLS linear regression; Seasonal via weekday averaging',
      '• Forecast error: MAPE computed on EMA in-sample predictions',
      '• Anomaly detection: Z-score threshold |z| > 2.0',
      '• Health Index: equally weighted composite (Growth 25%, Stability 25%,',
      '  Profitability 25%, Forecast Reliability 25%)',
      '• All computations local — no external analytics engines used',
      '• Limitations: Small sample sizes increase estimation uncertainty',
    ];
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    methodText.forEach(line => { doc.text(line, 15, y); y += 5; });

    // Footer
    doc.setFillColor(240, 240, 240);
    doc.rect(0, 285, W, 12, 'F');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('LSRIS — Local Sales & Revenue Intelligence System · Private Owner Report · Confidential', 15, 292);

    doc.save(`LSRIS_Report_${month}.pdf`);
    showMsg('PDF report generated');
  };

  const handleClearAll = () => {
    if (confirm('Delete ALL sales data? This cannot be undone.')) {
      getOrders().forEach(o => deleteOrder(o.id));
      showMsg('All data cleared');
    }
  };

  const orders = getOrders();

  return (
    <div className="px-4 py-4 space-y-4">
      <p className="section-header">Reports & Data Management</p>

      {msg && (
        <div className="rounded-lg px-3 py-2.5 text-sm" style={{ background: 'hsl(var(--cyan) / 0.1)', border: '1px solid hsl(var(--cyan) / 0.3)', color: 'hsl(var(--cyan))' }}>
          {msg}
        </div>
      )}

      {/* Stats summary */}
      <div className="stat-card">
        <p className="section-header mb-3">Data Summary</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Total Records', value: orders.length },
            { label: 'Date Range', value: orders.length > 0 ? `${orders[0]?.date.slice(5)} – ${orders[orders.length - 1]?.date.slice(5)}` : 'No data' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg px-3 py-2.5" style={{ background: 'hsl(var(--muted))' }}>
              <p className="section-header text-xs mb-1">{label}</p>
              <p className="font-mono text-sm" style={{ color: 'hsl(var(--foreground))' }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* PDF Report */}
      <div className="stat-card space-y-3">
        <p className="section-header">Monthly Intelligence Report</p>
        <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Generates a research-grade PDF with executive summary, revenue metrics, statistical analysis, and health index.
        </p>
        <button onClick={generatePDFReport} className="btn-primary w-full flex items-center justify-center gap-2">
          <FileText className="w-4 h-4" />
          Download PDF Report
        </button>
      </div>

      {/* CSV */}
      <div className="stat-card space-y-3">
        <p className="section-header">CSV Export / Import</p>
        <button onClick={handleExportCSV} className="btn-secondary w-full flex items-center justify-center gap-2">
          <Download className="w-4 h-4" />
          Export Sales CSV
        </button>
        <label className="btn-secondary w-full flex items-center justify-center gap-2 cursor-pointer">
          <Upload className="w-4 h-4" />
          Import Sales CSV
          <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
        </label>
        <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
          CSV columns: id, date, item_name, quantity, unit_price, total_revenue, notes, created_at
        </p>
      </div>

      {/* Backup */}
      <div className="stat-card space-y-3">
        <p className="section-header flex items-center gap-2">
          <Database className="w-4 h-4" style={{ color: 'hsl(var(--cyan))' }} />
          Backup & Restore
        </p>
        <button onClick={handleExportBackup} className="btn-secondary w-full flex items-center justify-center gap-2">
          <Download className="w-4 h-4" />
          Export Full Backup (.json)
        </button>
        <label className="btn-secondary w-full flex items-center justify-center gap-2 cursor-pointer">
          <Upload className="w-4 h-4" />
          Restore from Backup
          <input type="file" accept=".json" className="hidden" onChange={handleImportBackup} />
        </label>
        <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Full backup includes orders, costs, items, and configuration.
        </p>
      </div>

      {/* Danger zone */}
      <div className="stat-card space-y-3" style={{ borderColor: 'hsl(var(--danger) / 0.3)' }}>
        <p className="section-header" style={{ color: 'hsl(var(--danger))' }}>Danger Zone</p>
        <button
          onClick={handleClearAll}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all"
          style={{ background: 'hsl(var(--danger) / 0.1)', border: '1px solid hsl(var(--danger) / 0.3)', color: 'hsl(var(--danger))' }}
        >
          <Trash2 className="w-4 h-4" />
          Clear All Sales Data
        </button>
        <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Export a backup before clearing. This action is irreversible.
        </p>
      </div>
    </div>
  );
}
