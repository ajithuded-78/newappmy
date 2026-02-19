import { useMemo, useEffect, useState } from 'react';
import { getOrders, getCostForMonth, getConfig, todayISO, monthISO, daysAgoISO } from '@/utils/storage';
import { loadRevenueEntries } from '../services/firestoreService';
import {
  mean, stdDev, linearRegression, coefficientOfVariation,
  compoundGrowthRate, enterpriseHealthIndex, errorMetrics,
  movingAverage, exponentialMovingAverage, detectAnomalies,
  generateForecast, sensitivitySimulation
} from '@/utils/math';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, AreaChart, Area, BarChart, Bar
} from 'recharts';
import { get } from 'http';

function MetricCard({ label, value, sub, trend }: { label: string; value: string; sub?: string; trend?: 'up' | 'down' | 'neutral' }) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'hsl(var(--success))' : trend === 'down' ? 'hsl(var(--danger))' : 'hsl(var(--muted-foreground))';
  return (
    <div className="stat-card">
      <p className="section-header mb-1">{label}</p>
      <p className="metric-value text-2xl">{value}</p>
      {sub && (
        <div className="flex items-center gap-1 mt-1">
          <TrendIcon className="w-3 h-3" style={{ color: trendColor }} />
          <span className="text-xs" style={{ color: trendColor }}>{sub}</span>
        </div>
      )}
    </div>
  );
}

function HealthGauge({ score, components }: { score: number; components: Record<string, number> }) {
  const color = score >= 75 ? 'hsl(var(--success))' : score >= 50 ? 'hsl(var(--warning))' : 'hsl(var(--danger))';
  const label = score >= 75 ? 'Excellent' : score >= 60 ? 'Good' : score >= 45 ? 'Moderate' : 'At Risk';

  return (
    <div className="stat-card">
      <p className="section-header mb-3">Enterprise Health Index</p>
      <div className="flex items-center gap-4">
        {/* Gauge */}
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--border))" strokeWidth="10" />
            <circle
              cx="50" cy="50" r="40" fill="none"
              stroke={color} strokeWidth="10"
              strokeDasharray={`${score * 2.513} 251.3`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 1s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
            <span className="font-mono font-bold text-lg" style={{ color }}>{score}</span>
            <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>/ 100</span>
          </div>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm mb-2" style={{ color }}>{label}</p>
          {Object.entries(components).map(([k, v]) => (
            <div key={k} className="mb-1">
              <div className="flex justify-between text-xs mb-0.5">
                <span style={{ color: 'hsl(var(--muted-foreground))' }}>{k.replace('_', ' ')}</span>
                <span className="font-mono" style={{ color: 'hsl(var(--foreground))' }}>{v}</span>
              </div>
              <div className="h-1 rounded-full" style={{ background: 'hsl(var(--border))' }}>
                <div className="h-1 rounded-full transition-all" style={{ width: `${v}%`, background: color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const CUSTOM_TOOLTIP_STYLE = {
  backgroundColor: 'hsl(220 18% 11%)',
  border: '1px solid hsl(220 15% 20%)',
  borderRadius: '8px',
  color: 'hsl(210 20% 90%)',
  fontSize: '12px',
};

export default function Dashboard() {
  const [cloudOrders, setCloudOrders] = useState<any[]>([]);

  useEffect(() => {

    const loadCloud = async () => {

      const data = await loadRevenueEntries();

      if (data.length > 0) {

        setCloudOrders(data);

      }

    };

    loadCloud();

  }, []);

  const localOrders = getOrders();

  const orders =
    cloudOrders.length > 0
      ? cloudOrders
      : localOrders;
  const config = getConfig();
  const symbol = config.currency_symbol;
  const today = todayISO();
  const month = monthISO();
  const week7 = daysAgoISO(7);
  const week30 = daysAgoISO(30);

  // Aggregations
  const todayOrders = orders.filter(o => o.date === today);
  const weekOrders = orders.filter(o => o.date >= week7);
  const monthOrders = orders.filter(o => o.date.startsWith(month));
  const totalRevenue = orders.reduce((s, o) => s + o.total_revenue, 0);
  const todayRev = todayOrders.reduce((s, o) => s + o.total_revenue, 0);
  const weekRev = weekOrders.reduce((s, o) => s + o.total_revenue, 0);
  const monthRev = monthOrders.reduce((s, o) => s + o.total_revenue, 0);

  // Daily timeseries (last 30 days)
  const dailyMap: Record<string, number> = {};
  orders.filter(o => o.date >= week30).forEach(o => {
    dailyMap[o.date] = (dailyMap[o.date] || 0) + o.total_revenue;
  });
  const dailyDates = Object.keys(dailyMap).sort();
  const dailyRevenues = dailyDates.map(d => dailyMap[d]);

  // Costs
  const costEntry = getCostForMonth(month);
  const totalCost = costEntry
    ? costEntry.flour_cost + costEntry.gas_cost + costEntry.electricity_cost + costEntry.labor_cost + costEntry.misc_cost
    : 0;
  const profit = monthRev - totalCost;
  const profitMarginPct = monthRev > 0 ? (profit / monthRev) * 100 : 0;
  const avgDaily = dailyRevenues.length > 0 ? mean(dailyRevenues) : 0;

  // Analytics
  const reg = dailyRevenues.length >= 2 ? linearRegression(dailyRevenues) : null;
  const cv = coefficientOfVariation(dailyRevenues);
  const maPred = dailyRevenues.length >= 7 ? (movingAverage(dailyRevenues, 7).filter(v => !isNaN(v)).at(-1) || 0) : avgDaily;

  // MAPE for health
  const emaPred = exponentialMovingAverage(dailyRevenues, 0.3);
  const mapeMetric = dailyRevenues.length >= 2
    ? errorMetrics(dailyRevenues.slice(1), emaPred.slice(0, -1)).mape
    : 20;

  const cagr = dailyRevenues.length >= 2
    ? compoundGrowthRate(dailyRevenues[0] || 1, dailyRevenues[dailyRevenues.length - 1] || 1, dailyRevenues.length)
    : 0;

  const health = enterpriseHealthIndex({
    cagr,
    cv,
    profit_margin: profitMarginPct / 100,
    mape: mapeMetric,
  });

  // Anomalies
  const anomalies = dailyRevenues.length >= 3 ? detectAnomalies(dailyDates, dailyRevenues) : [];
  const anomalyCount = anomalies.filter(a => a.is_anomaly).length;

  // 7-day forecast
  const forecast = dailyRevenues.length >= 7 ? generateForecast(dailyRevenues, 7) : [];

  // Chart data
  const chartData = dailyDates.map((date, i) => ({
    date: date.slice(5), // MM-DD
    revenue: dailyRevenues[i],
    ma: movingAverage(dailyRevenues, Math.min(7, dailyRevenues.length))[i] || null,
  }));

  const forecastChartData = forecast.map((f, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return {
      date: d.toISOString().slice(5, 10),
      linear: Math.max(0, f.linear),
      lower: Math.max(0, f.lower),
      upper: Math.max(0, f.upper),
    };
  });

  // Item breakdown
  const itemMap: Record<string, number> = {};
  monthOrders.forEach(o => {
    itemMap[o.item_name] = (itemMap[o.item_name] || 0) + o.total_revenue;
  });
  const itemData = Object.entries(itemMap).map(([name, revenue]) => ({ name: name.split(' ').pop(), revenue }));

  const trendDir = reg && reg.slope > 0.5 ? 'up' : reg && reg.slope < -0.5 ? 'down' : 'neutral';
  const breakEven = totalCost > 0 ? totalCost : null;

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Revenue Cards */}
      <div>
        <p className="section-header mb-3">Revenue Overview</p>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Today" value={`${symbol} ${todayRev.toFixed(2)}`} trend={todayRev > avgDaily ? 'up' : 'down'} sub={todayRev > avgDaily ? 'Above avg' : 'Below avg'} />
          <MetricCard label="This Week" value={`${symbol} ${weekRev.toFixed(2)}`} trend="neutral" sub={`${weekOrders.length} orders`} />
          <MetricCard label="This Month" value={`${symbol} ${monthRev.toFixed(2)}`} trend={trendDir} sub={`${profitMarginPct.toFixed(1)}% margin`} />
          <MetricCard label="Net Profit" value={`${symbol} ${profit.toFixed(2)}`} trend={profit >= 0 ? 'up' : 'down'} sub={totalCost > 0 ? `Cost: ${symbol} ${totalCost.toFixed(0)}` : 'Set costs'} />
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="stat-card text-center py-3">
          <p className="section-header text-xs mb-1">Avg/Day</p>
          <p className="metric-value text-base">{symbol} {avgDaily.toFixed(0)}</p>
        </div>
        <div className="stat-card text-center py-3">
          <p className="section-header text-xs mb-1">Total</p>
          <p className="metric-value text-base">{symbol} {totalRevenue.toFixed(0)}</p>
        </div>
        <div className="stat-card text-center py-3">
          <p className="section-header text-xs mb-1">Volatility</p>
          <p className="metric-value text-base">{(cv * 100).toFixed(0)}%</p>
        </div>
      </div>

      {/* Anomaly banner */}
      {anomalyCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg px-3 py-2.5" style={{ background: 'hsl(var(--warning) / 0.1)', border: '1px solid hsl(var(--warning) / 0.3)' }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: 'hsl(var(--warning))' }} />
          <p className="text-xs" style={{ color: 'hsl(var(--warning))' }}>
            {anomalyCount} revenue anomal{anomalyCount === 1 ? 'y' : 'ies'} detected in last 30 days
          </p>
        </div>
      )}

      {breakEven && (
        <div className="flex items-center gap-2 rounded-lg px-3 py-2.5" style={{
          background: monthRev >= breakEven ? 'hsl(var(--success) / 0.1)' : 'hsl(var(--danger) / 0.1)',
          border: `1px solid hsl(var(--${monthRev >= breakEven ? 'success' : 'danger'}) / 0.3)`
        }}>
          <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: `hsl(var(--${monthRev >= breakEven ? 'success' : 'danger'}))` }} />
          <p className="text-xs" style={{ color: `hsl(var(--${monthRev >= breakEven ? 'success' : 'danger'}))` }}>
            Break-even: {symbol} {breakEven.toFixed(2)} — {monthRev >= breakEven ? `Surplus ${symbol} ${(monthRev - breakEven).toFixed(2)}` : `Deficit ${symbol} ${(breakEven - monthRev).toFixed(2)}`}
          </p>
        </div>
      )}

      {/* Revenue Chart */}
      {chartData.length > 1 && (
        <div className="stat-card">
          <p className="section-header mb-3">30-Day Revenue Trend</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(185,85%,48%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(185,85%,48%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,18%)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(215,12%,48%)' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(215,12%,48%)' }} />
              <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(185,85%,48%)" fill="url(#revGrad)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ma" stroke="hsl(38,92%,50%)" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded" style={{ background: 'hsl(185,85%,48%)' }} />
              <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>Revenue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded border-dashed border" style={{ borderColor: 'hsl(38,92%,50%)' }} />
              <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>7-day MA</span>
            </div>
          </div>
        </div>
      )}

      {/* Forecast Chart */}
      {forecastChartData.length > 0 && (
        <div className="stat-card">
          <p className="section-header mb-3">7-Day Forecast (95% CI)</p>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={forecastChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(200,80%,40%)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(200,80%,40%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,18%)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(215,12%,48%)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(215,12%,48%)' }} />
              <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="upper" stroke="none" fill="url(#forecastGrad)" />
              <Area type="monotone" dataKey="lower" stroke="none" fill="hsl(220,18%,11%)" />
              <Line type="monotone" dataKey="linear" stroke="hsl(200,80%,60%)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-xs mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Next 7 days · Linear regression · Shaded = 95% confidence interval
          </p>
        </div>
      )}

      {/* Item Breakdown */}
      {itemData.length > 0 && (
        <div className="stat-card">
          <p className="section-header mb-3">Product Revenue Share (Month)</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={itemData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,18%)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(215,12%,48%)' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'hsl(215,12%,48%)' }} width={60} />
              <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} formatter={(v: number) => [`${symbol} ${v.toFixed(2)}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="hsl(185,85%,48%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Enterprise Health */}
      <HealthGauge score={health.score} components={health.components} />

      {orders.length === 0 && (
        <div className="stat-card text-center py-8">
          <Activity className="w-10 h-10 mx-auto mb-3" style={{ color: 'hsl(var(--muted-foreground))' }} />
          <p className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>No sales data yet</p>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Go to Entry to add your first sale</p>
        </div>
      )}
    </div>
  );
}