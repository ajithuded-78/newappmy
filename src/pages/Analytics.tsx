import { useMemo, useState } from 'react';
import { getOrders, getConfig, daysAgoISO } from '@/utils/storage';
import {
  mean, stdDev, linearRegression, pearsonCorrelation, autocorrelation,
  zScore, coefficientOfVariation, additiveDecomposition, detectAnomalies,
  errorMetrics, movingAverage, exponentialMovingAverage, weightedMovingAverage,
  generateForecast, sensitivitySimulation, detectStructuralBreaks, rollingStats
} from '@/utils/math';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, AreaChart, Area, ScatterChart, Scatter, BarChart, Bar
} from 'recharts';

const TOOLTIP = {
  backgroundColor: 'hsl(220 18% 11%)',
  border: '1px solid hsl(220 15% 20%)',
  borderRadius: '8px',
  color: 'hsl(210 20% 90%)',
  fontSize: '12px',
};

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="stat-card">
      <p className="section-header mb-3">{title}</p>
      {children}
    </div>
  );
}

function StatRow({ label, value, unit = '', highlight = false }: { label: string; value: string | number; unit?: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b last:border-0" style={{ borderColor: 'hsl(var(--border))' }}>
      <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{label}</span>
      <span className={`font-mono text-sm ${highlight ? 'metric-value' : ''}`} style={!highlight ? { color: 'hsl(var(--foreground))' } : {}}>
        {typeof value === 'number' ? value.toFixed(3) : value}{unit}
      </span>
    </div>
  );
}

type AnalyticsTab = 'decomp' | 'forecast' | 'anomaly' | 'correlation' | 'sensitivity';

export default function Analytics() {
  const orders = getOrders();
  const config = getConfig();
  const symbol = config.currency_symbol;
  const [tab, setTab] = useState<AnalyticsTab>('decomp');

  const { dailyDates, dailyRevenues, weekdayNums, quantityArr } = useMemo(() => {
    const dailyMap: Record<string, { rev: number; qty: number }> = {};
    orders.forEach(o => {
      if (!dailyMap[o.date]) dailyMap[o.date] = { rev: 0, qty: 0 };
      dailyMap[o.date].rev += o.total_revenue;
      dailyMap[o.date].qty += o.quantity;
    });
    const sorted = Object.keys(dailyMap).sort();
    return {
      dailyDates: sorted,
      dailyRevenues: sorted.map(d => dailyMap[d].rev),
      weekdayNums: sorted.map(d => new Date(d).getDay()),
      quantityArr: sorted.map(d => dailyMap[d].qty),
    };
  }, [orders]);

  const hasData = dailyRevenues.length >= 3;

  const decomp = useMemo(() => hasData ? additiveDecomposition(dailyDates, dailyRevenues) : [], [dailyDates, dailyRevenues]);
  const anomalies = useMemo(() => hasData ? detectAnomalies(dailyDates, dailyRevenues) : [], [dailyDates, dailyRevenues]);
  const reg = useMemo(() => hasData ? linearRegression(dailyRevenues) : null, [dailyRevenues]);
  const maVals = useMemo(() => hasData ? movingAverage(dailyRevenues, Math.min(7, dailyRevenues.length)) : [], [dailyRevenues]);
  const emaVals = useMemo(() => hasData ? exponentialMovingAverage(dailyRevenues, config.ema_alpha) : [], [dailyRevenues]);
  const wmaVals = useMemo(() => hasData ? weightedMovingAverage(dailyRevenues, Math.min(7, dailyRevenues.length)) : [], [dailyRevenues]);
  const acf = useMemo(() => hasData ? autocorrelation(dailyRevenues, 7) : [], [dailyRevenues]);
  const rollingS = useMemo(() => hasData ? rollingStats(dailyRevenues, Math.min(7, dailyRevenues.length)) : [], [dailyRevenues]);
  const cv = coefficientOfVariation(dailyRevenues);
  const weekdayCorr = hasData ? pearsonCorrelation(weekdayNums, dailyRevenues) : 0;
  const qtyCorr = hasData ? pearsonCorrelation(quantityArr, dailyRevenues) : 0;
  const forecast = dailyRevenues.length >= 7 ? generateForecast(dailyRevenues, 14, config.forecasting_window, config.ema_alpha) : [];
  const breakPoints = hasData ? detectStructuralBreaks(dailyRevenues) : [];

  // Error metrics (use in-sample)
  const maForecast = maVals.filter(v => !isNaN(v));
  const actualForMA = dailyRevenues.slice(dailyRevenues.length - maForecast.length);
  const metrics = maForecast.length >= 2 ? errorMetrics(actualForMA, maForecast) : { mae: 0, mse: 0, rmse: 0, mape: 0 };

  // Sensitivity
  const baseRev = mean(dailyRevenues);
  const baseQty = mean(quantityArr);
  const basePrice = baseQty > 0 ? baseRev / baseQty : 1;
  const sensitivity = sensitivitySimulation(baseRev, baseQty, basePrice, 0);

  const tabs: { id: AnalyticsTab; label: string }[] = [
    { id: 'decomp', label: 'Decomp' },
    { id: 'forecast', label: 'Forecast' },
    { id: 'anomaly', label: 'Anomaly' },
    { id: 'correlation', label: 'Corr' },
    { id: 'sensitivity', label: 'Sensitivity' },
  ];

  if (!hasData) {
    return (
      <div className="px-4 py-4">
        <div className="stat-card text-center py-12">
          <p className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>Insufficient data</p>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
            At least 3 days of sales data required for analytics
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <p className="section-header">Quantitative Analytics Engine</p>

      {/* Tab Bar */}
      <div className="flex gap-1 overflow-x-auto scrollbar-thin pb-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: tab === t.id ? 'hsl(var(--cyan) / 0.15)' : 'hsl(var(--secondary))',
              color: tab === t.id ? 'hsl(var(--cyan))' : 'hsl(var(--muted-foreground))',
              border: `1px solid ${tab === t.id ? 'hsl(var(--cyan) / 0.4)' : 'hsl(var(--border))'}`,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Descriptive Stats — always visible */}
      <SectionCard title="Descriptive Statistics">
        <StatRow label="Mean Daily Revenue" value={`${symbol} ${mean(dailyRevenues).toFixed(2)}`} highlight />
        <StatRow label="Std Deviation" value={`${symbol} ${stdDev(dailyRevenues).toFixed(2)}`} />
        <StatRow label="Coefficient of Variation" value={(cv * 100).toFixed(1)} unit="%" />
        <StatRow label="Regression Slope" value={reg?.slope || 0} />
        <StatRow label="R² (fit quality)" value={reg?.r_squared || 0} />
        <StatRow label="Structural Breaks" value={breakPoints.length} />
        <StatRow label="Data Points" value={dailyRevenues.length} />
      </SectionCard>

      {/* Forecast Error Metrics */}
      <SectionCard title="Forecast Error Metrics (MA)">
        <StatRow label="MAE" value={`${symbol} ${metrics.mae.toFixed(2)}`} />
        <StatRow label="MSE" value={`${symbol}² ${metrics.mse.toFixed(2)}`} />
        <StatRow label="RMSE" value={`${symbol} ${metrics.rmse.toFixed(2)}`} highlight />
        <StatRow label="MAPE" value={metrics.mape.toFixed(1)} unit="%" />
      </SectionCard>

      {/* Autocorrelation */}
      <SectionCard title="Autocorrelation (Lag 1–7)">
        <div className="flex gap-1 flex-wrap mt-1">
          {acf.map(a => (
            <div key={a.lag} className="text-center" style={{ minWidth: '36px' }}>
              <div className="w-8 mx-auto rounded-t" style={{
                height: `${Math.abs(a.correlation) * 60}px`,
                background: a.correlation > 0 ? 'hsl(var(--cyan))' : 'hsl(var(--danger))',
                minHeight: '2px'
              }} />
              <p className="text-xs mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>L{a.lag}</p>
              <p className="font-mono text-xs" style={{ color: 'hsl(var(--foreground))' }}>{a.correlation.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* DECOMPOSITION */}
      {tab === 'decomp' && (
        <>
          <SectionCard title="Additive Decomposition R(t) = T(t) + S(t) + E(t)">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={decomp.map(d => ({ ...d, date: d.date.slice(5) }))} margin={{ left: -20, right: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,18%)" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(215,12%,48%)' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(215,12%,48%)' }} />
                <Tooltip contentStyle={TOOLTIP} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(185,85%,48%)" dot={false} strokeWidth={2} name="Actual" />
                <Line type="monotone" dataKey="trend" stroke="hsl(38,92%,50%)" dot={false} strokeWidth={2} strokeDasharray="5 3" name="Trend" />
                <Line type="monotone" dataKey="seasonal" stroke="hsl(280,70%,60%)" dot={false} strokeWidth={1.5} name="Seasonal" />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-3 flex-wrap mt-2">
              {[['Revenue','185,85%,48%'],['Trend','38,92%,50%'],['Seasonal','280,70%,60%']].map(([l,c]) => (
                <div key={l} className="flex items-center gap-1">
                  <div className="w-3 h-0.5 rounded" style={{ background: `hsl(${c})` }} />
                  <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{l}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Rolling Volatility (7-day window)">
            <ResponsiveContainer width="100%" height={130}>
              <AreaChart data={rollingS.filter(r => !isNaN(r.std)).map((r, i) => ({ date: dailyDates[r.index]?.slice(5), std: r.std, cv: r.cv * 100 }))} margin={{ left: -20, right: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,18%)" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(215,12%,48%)' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(215,12%,48%)' }} />
                <Tooltip contentStyle={TOOLTIP} />
                <Area type="monotone" dataKey="std" stroke="hsl(38,92%,50%)" fill="hsl(38,92%,50%,0.15)" strokeWidth={1.5} name="Std Dev" />
              </AreaChart>
            </ResponsiveContainer>
          </SectionCard>
        </>
      )}

      {/* FORECAST */}
      {tab === 'forecast' && (
        <SectionCard title="14-Day Multi-Model Forecast">
          {forecast.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={forecast.map((f, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() + i + 1);
                  return { date: d.toISOString().slice(5,10), linear: +f.linear.toFixed(2), ma: +f.ma.toFixed(2), ema: +f.ema.toFixed(2), wma: +f.wma.toFixed(2), lower: +f.lower.toFixed(2), upper: +f.upper.toFixed(2) };
                })} margin={{ left: -20, right: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,18%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(215,12%,48%)' }} />
                  <YAxis tick={{ fontSize: 9, fill: 'hsl(215,12%,48%)' }} />
                  <Tooltip contentStyle={TOOLTIP} />
                  <Line type="monotone" dataKey="linear" stroke="hsl(185,85%,48%)" dot={false} strokeWidth={2} name="Linear" />
                  <Line type="monotone" dataKey="ma" stroke="hsl(38,92%,50%)" dot={false} strokeWidth={1.5} strokeDasharray="4 2" name="MA" />
                  <Line type="monotone" dataKey="ema" stroke="hsl(280,70%,60%)" dot={false} strokeWidth={1.5} name="EMA" />
                  <Line type="monotone" dataKey="wma" stroke="hsl(145,65%,42%)" dot={false} strokeWidth={1.5} strokeDasharray="3 3" name="WMA" />
                  <Line type="monotone" dataKey="upper" stroke="hsl(215,12%,40%)" dot={false} strokeWidth={1} strokeDasharray="2 4" name="95% CI Upper" />
                  <Line type="monotone" dataKey="lower" stroke="hsl(215,12%,40%)" dot={false} strokeWidth={1} strokeDasharray="2 4" name="95% CI Lower" />
                </LineChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {[['Linear','185,85%,48%'],['MA','38,92%,50%'],['EMA','280,70%,60%'],['WMA','145,65%,42%']].map(([l,c]) => (
                  <div key={l} className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 rounded" style={{ background: `hsl(${c})` }} />
                    <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{l} Regression</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-center py-4" style={{ color: 'hsl(var(--muted-foreground))' }}>Need 7+ days of data for multi-model forecast</p>
          )}
        </SectionCard>
      )}

      {/* ANOMALY */}
      {tab === 'anomaly' && (
        <SectionCard title="Z-Score Anomaly Detection (|z| > 2.0)">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={anomalies.map(a => ({ date: a.date.slice(5), revenue: a.revenue, zscore: +a.zscore.toFixed(2), anomaly: a.is_anomaly ? a.revenue : null }))} margin={{ left: -20, right: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,18%)" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(215,12%,48%)' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9, fill: 'hsl(215,12%,48%)' }} />
              <Tooltip contentStyle={TOOLTIP} />
              <Line type="monotone" dataKey="revenue" stroke="hsl(185,85%,48%)" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="anomaly" stroke="hsl(var(--danger))" dot={{ fill: 'hsl(0,72%,55%)', r: 5 }} strokeWidth={0} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1.5">
            {anomalies.filter(a => a.is_anomaly).map(a => (
              <div key={a.date} className="flex justify-between text-xs rounded px-2 py-1.5" style={{ background: 'hsl(var(--danger) / 0.1)', border: '1px solid hsl(var(--danger) / 0.3)' }}>
                <span style={{ color: 'hsl(var(--danger))' }}>{a.date}</span>
                <span style={{ color: 'hsl(var(--foreground))' }}>{symbol} {a.revenue.toFixed(2)} (z={a.zscore.toFixed(2)})</span>
              </div>
            ))}
            {anomalies.filter(a => a.is_anomaly).length === 0 && (
              <p className="text-xs text-center py-2" style={{ color: 'hsl(var(--muted-foreground))' }}>No anomalies detected</p>
            )}
          </div>
        </SectionCard>
      )}

      {/* CORRELATION */}
      {tab === 'correlation' && (
        <>
          <SectionCard title="Pearson Correlation Matrix">
            <div className="space-y-3">
              {[
                { label: 'Weekday vs Revenue', value: weekdayCorr, desc: 'Does day of week predict revenue?' },
                { label: 'Quantity vs Revenue', value: qtyCorr, desc: 'Higher sales volume → higher revenue?' },
              ].map(({ label, value, desc }) => (
                <div key={label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs" style={{ color: 'hsl(var(--foreground))' }}>{label}</span>
                    <span className="font-mono text-sm metric-value">{value.toFixed(3)}</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: 'hsl(var(--border))' }}>
                    <div className="h-2 rounded-full" style={{
                      width: `${Math.abs(value) * 100}%`,
                      background: value > 0 ? 'hsl(var(--success))' : 'hsl(var(--danger))',
                      marginLeft: value < 0 ? `${(1 + value) * 50}%` : '0',
                    }} />
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t text-xs" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}>
              r ∈ [-1,1] · |r| &gt; 0.7 strong · 0.3–0.7 moderate · &lt; 0.3 weak
            </div>
          </SectionCard>
        </>
      )}

      {/* SENSITIVITY */}
      {tab === 'sensitivity' && (
        <SectionCard title="Sensitivity Analysis (Price & Quantity Simulation)">
          <div className="space-y-2">
            {sensitivity.map(s => (
              <div key={s.scenario} className="rounded-lg px-3 py-2.5" style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}>
                <div className="flex justify-between items-center">
                  <p className="text-xs font-medium" style={{ color: 'hsl(var(--foreground))' }}>{s.scenario}</p>
                  <span className="metric-value text-sm">{symbol} {s.estimated_revenue.toFixed(2)}</span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  Δ Price: {s.price_change > 0 ? '+' : ''}{s.price_change}% · Δ Qty: {s.quantity_change > 0 ? '+' : ''}{s.quantity_change}%
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs mt-3" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Base: {symbol} {basePrice.toFixed(2)}/unit · {Math.round(baseQty)} units/day avg
          </p>
        </SectionCard>
      )}
    </div>
  );
}
