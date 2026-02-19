import { useState, useEffect } from 'react';
import { getCosts, saveCost, getCostForMonth, getConfig, monthISO } from '@/utils/storage';
import { getOrders } from '@/utils/storage';
import { breakEvenAnalysis, profitMargin } from '@/utils/math';
import { SaveIcon, TrendingUp } from 'lucide-react';
import type { CostEntry } from '@/types';

export default function Costs() {
  const config = getConfig();
  const symbol = config.currency_symbol;
  const currentMonth = monthISO();

  const [month, setMonth] = useState(currentMonth);
  const [flour, setFlour] = useState('');
  const [gas, setGas] = useState('');
  const [electricity, setElectricity] = useState('');
  const [labor, setLabor] = useState('');
  const [misc, setMisc] = useState('');
  const [saved, setSaved] = useState(false);

  // Load existing
  useEffect(() => {
    const existing = getCostForMonth(month);
    if (existing) {
      setFlour(String(existing.flour_cost));
      setGas(String(existing.gas_cost));
      setElectricity(String(existing.electricity_cost));
      setLabor(String(existing.labor_cost));
      setMisc(String(existing.misc_cost));
    } else {
      setFlour(''); setGas(''); setElectricity(''); setLabor(''); setMisc('');
    }
  }, [month]);

  const total = [flour, gas, electricity, labor, misc].reduce((s, v) => s + (Number(v) || 0), 0);

  const monthRevenue = getOrders()
    .filter(o => o.date.startsWith(month))
    .reduce((s, o) => s + o.total_revenue, 0);

  const analysis = breakEvenAnalysis(monthRevenue, total);
  const margin = profitMargin(monthRevenue, total);

  const handleSave = () => {
    const entry: CostEntry = {
      id: `cost_${month}`,
      month,
      flour_cost: Number(flour) || 0,
      gas_cost: Number(gas) || 0,
      electricity_cost: Number(electricity) || 0,
      labor_cost: Number(labor) || 0,
      misc_cost: Number(misc) || 0,
    };
    saveCost(entry);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const costItems = [
    { label: 'Flour', value: flour, set: setFlour, icon: '🌾' },
    { label: 'Gas / Fuel', value: gas, set: setGas, icon: '🔥' },
    { label: 'Electricity', value: electricity, set: setElectricity, icon: '⚡' },
    { label: 'Labor', value: labor, set: setLabor, icon: '👷' },
    { label: 'Miscellaneous', value: misc, set: setMisc, icon: '📦' },
  ];

  return (
    <div className="px-4 py-4 space-y-4">
      <p className="section-header">Cost Configuration</p>

      {/* Month selector */}
      <div className="stat-card">
        <label className="section-header block mb-1.5">Month</label>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="form-input" max={currentMonth} />
      </div>

      {/* Cost inputs */}
      <div className="stat-card space-y-3">
        <p className="section-header">Operating Costs</p>
        {costItems.map(({ label, value, set, icon }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="text-xl w-7 flex-shrink-0">{icon}</span>
            <div className="flex-1">
              <label className="text-xs block mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{label} ({symbol})</label>
              <input
                type="number" min="0" step="0.01" value={value}
                onChange={e => set(e.target.value)}
                placeholder="0.00" className="form-input"
              />
            </div>
          </div>
        ))}

        <div className="pt-3 border-t flex justify-between items-center" style={{ borderColor: 'hsl(var(--border))' }}>
          <span className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>Total Cost</span>
          <span className="metric-value text-lg">{symbol} {total.toFixed(2)}</span>
        </div>

        {saved && (
          <div className="text-sm rounded-lg px-3 py-2 text-center" style={{ background: 'hsl(var(--success) / 0.1)', color: 'hsl(var(--success))' }}>
            ✓ Costs saved
          </div>
        )}

        <button onClick={handleSave} className="btn-primary w-full flex items-center justify-center gap-2">
          <SaveIcon className="w-4 h-4" />
          Save Costs for {month}
        </button>
      </div>

      {/* Analysis */}
      {total > 0 && (
        <div className="stat-card space-y-3">
          <p className="section-header flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: 'hsl(var(--cyan))' }} />
            Break-Even Analysis
          </p>

          {[
            { label: 'Revenue This Month', value: `${symbol} ${monthRevenue.toFixed(2)}`, highlight: true },
            { label: 'Total Costs', value: `${symbol} ${total.toFixed(2)}` },
            { label: 'Break-Even Point', value: `${symbol} ${analysis.break_even.toFixed(2)}` },
            { label: 'Net Profit / Loss', value: `${symbol} ${analysis.profit.toFixed(2)}`, highlight: true },
            { label: 'Profit Margin', value: `${margin.toFixed(1)}%` },
          ].map(({ label, value, highlight }) => (
            <div key={label} className="flex justify-between py-1.5 border-b last:border-0" style={{ borderColor: 'hsl(var(--border))' }}>
              <span className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>{label}</span>
              <span className={`font-mono text-sm ${highlight ? 'metric-value' : ''}`} style={!highlight ? { color: 'hsl(var(--foreground))' } : {}}>
                {value}
              </span>
            </div>
          ))}

          {/* Visual bar */}
          <div className="mt-2">
            <p className="text-xs mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Revenue vs Break-even</p>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: 'hsl(var(--border))' }}>
              <div
                className="h-3 rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, total > 0 ? (monthRevenue / total) * 100 : 0)}%`,
                  background: monthRevenue >= total ? 'hsl(var(--success))' : 'hsl(var(--danger))',
                }}
              />
            </div>
            <p className="text-xs mt-1 text-right" style={{ color: monthRevenue >= total ? 'hsl(var(--success))' : 'hsl(var(--danger))' }}>
              {total > 0 ? ((monthRevenue / total) * 100).toFixed(0) : 0}% of break-even
            </p>
          </div>
        </div>
      )}

      {/* Breakdown donut-style */}
      {total > 0 && (
        <div className="stat-card">
          <p className="section-header mb-3">Cost Breakdown</p>
          {costItems.map(({ label, value, icon }) => {
            const pct = total > 0 ? ((Number(value) || 0) / total) * 100 : 0;
            return (
              <div key={label} className="mb-2.5">
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: 'hsl(var(--foreground))' }}>{icon} {label}</span>
                  <span className="font-mono" style={{ color: 'hsl(var(--muted-foreground))' }}>{pct.toFixed(1)}% · {symbol} {Number(value || 0).toFixed(2)}</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: 'hsl(var(--border))' }}>
                  <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: 'hsl(var(--cyan))' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
