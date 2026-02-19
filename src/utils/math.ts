// ============================================================
// LSRIS Mathematical Engine
// All models implemented manually — no external analytics libs
// ============================================================

// ─────────────────────────────────────────────────────────────
// 1. LINEAR REGRESSION (Ordinary Least Squares)
// Formula: y = β₀ + β₁x
// β₁ = Σ(xi-x̄)(yi-ȳ) / Σ(xi-x̄)²
// β₀ = ȳ - β₁x̄
// Assumption: Linear relationship, homoscedastic residuals
// Limitation: Sensitive to outliers; assumes stationarity
// ─────────────────────────────────────────────────────────────
export function linearRegression(values: number[]): {
  slope: number;
  intercept: number;
  predict: (x: number) => number;
  r_squared: number;
} {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] || 0, predict: () => values[0] || 0, r_squared: 0 };

  const xs = values.map((_, i) => i);
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = values.reduce((a, b) => a + b, 0) / n;

  let ssxy = 0, ssxx = 0, ssyy = 0;
  for (let i = 0; i < n; i++) {
    ssxy += (xs[i] - xMean) * (values[i] - yMean);
    ssxx += (xs[i] - xMean) ** 2;
    ssyy += (values[i] - yMean) ** 2;
  }

  const slope = ssxx === 0 ? 0 : ssxy / ssxx;
  const intercept = yMean - slope * xMean;
  const r_squared = ssyy === 0 ? 0 : (ssxy ** 2) / (ssxx * ssyy);

  return {
    slope,
    intercept,
    predict: (x: number) => slope * x + intercept,
    r_squared,
  };
}

// ─────────────────────────────────────────────────────────────
// 2. SIMPLE MOVING AVERAGE
// Formula: MA(t) = (1/w) Σ R(t-i) for i=0..w-1
// Assumption: Recent history representative of future
// Limitation: Lagging indicator; equal weights to all periods
// ─────────────────────────────────────────────────────────────
export function movingAverage(values: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < window - 1) {
      result.push(NaN);
    } else {
      const slice = values.slice(i - window + 1, i + 1);
      result.push(slice.reduce((a, b) => a + b, 0) / window);
    }
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// 3. EXPONENTIAL MOVING AVERAGE
// Formula: EMA(t) = α·R(t) + (1-α)·EMA(t-1)
// α ∈ (0,1): smoothing factor (higher = more reactive)
// Assumption: Geometric decay of past influence
// Limitation: Sensitive to α selection; initialization bias
// ─────────────────────────────────────────────────────────────
export function exponentialMovingAverage(values: number[], alpha: number = 0.3): number[] {
  if (values.length === 0) return [];
  const result: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// 4. WEIGHTED MOVING AVERAGE
// Formula: WMA(t) = Σ(w_i · R(t-i)) / Σw_i, w_i = i+1
// Assumption: More recent data has greater predictive weight
// Limitation: Arbitrary weight scheme; still a lagging indicator
// ─────────────────────────────────────────────────────────────
export function weightedMovingAverage(values: number[], window: number): number[] {
  const result: number[] = [];
  const weights = Array.from({ length: window }, (_, i) => i + 1);
  const weightSum = weights.reduce((a, b) => a + b, 0);

  for (let i = 0; i < values.length; i++) {
    if (i < window - 1) {
      result.push(NaN);
    } else {
      const slice = values.slice(i - window + 1, i + 1);
      const weighted = slice.reduce((sum, val, j) => sum + val * weights[j], 0);
      result.push(weighted / weightSum);
    }
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// 5. COMPOUND GROWTH RATE (CAGR)
// Formula: CAGR = (End/Start)^(1/n) - 1
// Assumption: Continuous compounding between periods
// Limitation: Hides volatility; misleading for high-variance series
// ─────────────────────────────────────────────────────────────
export function compoundGrowthRate(start: number, end: number, periods: number): number {
  if (start <= 0 || periods <= 0) return 0;
  return Math.pow(end / start, 1 / periods) - 1;
}

// ─────────────────────────────────────────────────────────────
// 6. Z-SCORE (Standardization)
// Formula: z = (x - μ) / σ
// Assumption: Approximately normal distribution
// Limitation: Sensitive to outliers in μ/σ estimation
// ─────────────────────────────────────────────────────────────
export function zScore(values: number[]): number[] {
  const mu = mean(values);
  const sigma = stdDev(values);
  if (sigma === 0) return values.map(() => 0);
  return values.map(v => (v - mu) / sigma);
}

// ─────────────────────────────────────────────────────────────
// 7. PEARSON CORRELATION COEFFICIENT
// Formula: r = Σ(xi-x̄)(yi-ȳ) / √[Σ(xi-x̄)² · Σ(yi-ȳ)²]
// Range: [-1, 1]. |r|>0.7 = strong correlation
// Assumption: Linear relationship; no repeated identical values
// ─────────────────────────────────────────────────────────────
export function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const xMean = mean(xs.slice(0, n));
  const yMean = mean(ys.slice(0, n));
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - xMean;
    const dy = ys[i] - yMean;
    num += dx * dy;
    dx2 += dx ** 2;
    dy2 += dy ** 2;
  }
  return (dx2 === 0 || dy2 === 0) ? 0 : num / Math.sqrt(dx2 * dy2);
}

// ─────────────────────────────────────────────────────────────
// 8. CONFIDENCE INTERVAL
// Formula: CI = x̄ ± 1.96 · (σ / √n) for 95% CI
// Assumption: Normal sampling distribution (CLT)
// Limitation: Assumes iid; not valid for autocorrelated series
// ─────────────────────────────────────────────────────────────
export function confidenceInterval(values: number[]): { lower: number; upper: number; margin: number } {
  const mu = mean(values);
  const sigma = stdDev(values);
  const n = values.length;
  const margin = n > 0 ? 1.96 * sigma / Math.sqrt(n) : 0;
  return { lower: mu - margin, upper: mu + margin, margin };
}

export function forecastCI(predicted: number, residuals: number[]): { lower: number; upper: number } {
  const se = stdDev(residuals);
  return { lower: predicted - 1.96 * se, upper: predicted + 1.96 * se };
}

// ─────────────────────────────────────────────────────────────
// 9. BREAK-EVEN ANALYSIS
// Break-even revenue = Total Fixed Costs (simplified)
// Profit = Revenue - Costs
// Margin = Profit / Revenue
// Assumption: All costs are fixed within the period
// ─────────────────────────────────────────────────────────────
export function breakEvenAnalysis(revenue: number, totalCost: number): {
  profit: number;
  profit_margin: number;
  surplus_deficit: number;
  break_even: number;
} {
  const profit = revenue - totalCost;
  const profit_margin = revenue > 0 ? profit / revenue : 0;
  return {
    profit,
    profit_margin,
    surplus_deficit: profit,
    break_even: totalCost,
  };
}

// ─────────────────────────────────────────────────────────────
// 10. PROFIT MARGIN
// Formula: PM = (Revenue - Cost) / Revenue × 100
// ─────────────────────────────────────────────────────────────
export function profitMargin(revenue: number, cost: number): number {
  if (revenue <= 0) return 0;
  return ((revenue - cost) / revenue) * 100;
}

// ─────────────────────────────────────────────────────────────
// 11. COEFFICIENT OF VARIATION
// Formula: CV = σ / μ (normalized measure of dispersion)
// Assumption: μ > 0; ratio scale measurement
// Limitation: Undefined/meaningless when μ ≈ 0
// ─────────────────────────────────────────────────────────────
export function coefficientOfVariation(values: number[]): number {
  const mu = mean(values);
  if (mu === 0) return 0;
  return stdDev(values) / mu;
}

// ─────────────────────────────────────────────────────────────
// 12. AUTOCORRELATION (ACF) at lag k
// Formula: ACF(k) = Σ(yt - ȳ)(yt-k - ȳ) / Σ(yt - ȳ)²
// Assumption: Stationary time series
// Limitation: Biased estimator for small samples
// ─────────────────────────────────────────────────────────────
export function autocorrelation(values: number[], maxLag: number = 7): AutocorrelationResult[] {
  const mu = mean(values);
  const n = values.length;
  const denom = values.reduce((sum, v) => sum + (v - mu) ** 2, 0);
  const results: AutocorrelationResult[] = [];

  for (let lag = 1; lag <= Math.min(maxLag, n - 1); lag++) {
    let num = 0;
    for (let i = lag; i < n; i++) {
      num += (values[i] - mu) * (values[i - lag] - mu);
    }
    results.push({ lag, correlation: denom === 0 ? 0 : num / denom });
  }
  return results;
}

interface AutocorrelationResult {
  lag: number;
  correlation: number;
}

// ─────────────────────────────────────────────────────────────
// 13. ROLLING WINDOW STATISTICS
// Formula: Rolling mean μ(t,w) = (1/w) Σ R(t-i)
//          Rolling σ(t,w) = √[(1/w) Σ (R(t-i) - μ)²]
// Assumption: Local stationarity within window
// ─────────────────────────────────────────────────────────────
export function rollingStats(values: number[], window: number): Array<{
  index: number;
  mean: number;
  std: number;
  cv: number;
}> {
  return values.map((_, i) => {
    if (i < window - 1) return { index: i, mean: NaN, std: NaN, cv: NaN };
    const slice = values.slice(i - window + 1, i + 1);
    const mu = mean(slice);
    const sigma = stdDev(slice);
    return { index: i, mean: mu, std: sigma, cv: mu > 0 ? sigma / mu : 0 };
  });
}

// ─────────────────────────────────────────────────────────────
// 14. SENSITIVITY SIMULATION
// Revenue = Price × Quantity
// Simulates ±5% price, ±10% quantity perturbations
// Assumption: Elastic demand; independent price/quantity
// ─────────────────────────────────────────────────────────────
export function sensitivitySimulation(
  baseRevenue: number,
  baseQuantity: number,
  basePrice: number,
  totalCost: number
): SensitivityResult[] {
  const scenarios = [
    { label: 'Base', priceΔ: 0, qtyΔ: 0 },
    { label: '+5% Price', priceΔ: 0.05, qtyΔ: 0 },
    { label: '-5% Price', priceΔ: -0.05, qtyΔ: 0 },
    { label: '+10% Qty', priceΔ: 0, qtyΔ: 0.10 },
    { label: '-10% Qty', priceΔ: 0, qtyΔ: -0.10 },
    { label: '+5% Price, +10% Qty', priceΔ: 0.05, qtyΔ: 0.10 },
    { label: '-5% Price, -10% Qty', priceΔ: -0.05, qtyΔ: -0.10 },
  ];

  return scenarios.map(s => {
    const newPrice = basePrice * (1 + s.priceΔ);
    const newQty = baseQuantity * (1 + s.qtyΔ);
    const rev = newPrice * newQty;
    return {
      scenario: s.label,
      price_change: s.priceΔ * 100,
      quantity_change: s.qtyΔ * 100,
      estimated_revenue: rev,
      estimated_profit: rev - totalCost,
    };
  });
}

interface SensitivityResult {
  scenario: string;
  price_change: number;
  quantity_change: number;
  estimated_revenue: number;
  estimated_profit: number;
}

// ─────────────────────────────────────────────────────────────
// FORECAST ERROR METRICS
// MAE = (1/n)Σ|actual - forecast|
// MSE = (1/n)Σ(actual - forecast)²
// RMSE = √MSE
// MAPE = (100/n)Σ|actual - forecast| / actual
// ─────────────────────────────────────────────────────────────
export function errorMetrics(actual: number[], forecast: number[]): {
  mae: number;
  mse: number;
  rmse: number;
  mape: number;
} {
  const n = Math.min(actual.length, forecast.length);
  if (n === 0) return { mae: 0, mse: 0, rmse: 0, mape: 0 };

  let maeSum = 0, mseSum = 0, mapeSum = 0, mapeCount = 0;
  for (let i = 0; i < n; i++) {
    if (isNaN(forecast[i])) continue;
    const err = actual[i] - forecast[i];
    maeSum += Math.abs(err);
    mseSum += err ** 2;
    if (actual[i] !== 0) {
      mapeSum += Math.abs(err / actual[i]);
      mapeCount++;
    }
  }

  const mae = maeSum / n;
  const mse = mseSum / n;
  return {
    mae,
    mse,
    rmse: Math.sqrt(mse),
    mape: mapeCount > 0 ? (mapeSum / mapeCount) * 100 : 0,
  };
}

// ─────────────────────────────────────────────────────────────
// ADDITIVE DECOMPOSITION: R(t) = T(t) + S(t) + E(t)
// T(t): Trend via OLS linear regression
// S(t): Seasonal index via weekday averaging (normalized)
// E(t): Residual = R(t) - T(t) - S(t)
// ─────────────────────────────────────────────────────────────
export function additiveDecomposition(
  dates: string[],
  revenues: number[]
): Array<{ date: string; revenue: number; trend: number; seasonal: number; residual: number }> {
  const n = revenues.length;
  const reg = linearRegression(revenues);
  const trends = revenues.map((_, i) => reg.predict(i));

  // Compute weekday seasonal indices
  const weekdayTotals: number[] = Array(7).fill(0);
  const weekdayCounts: number[] = Array(7).fill(0);
  for (let i = 0; i < n; i++) {
    const dow = new Date(dates[i]).getDay();
    weekdayTotals[dow] += revenues[i] - trends[i];
    weekdayCounts[dow]++;
  }
  const weekdayAvg = weekdayTotals.map((t, i) => weekdayCounts[i] > 0 ? t / weekdayCounts[i] : 0);
  const avgSeasonal = mean(weekdayAvg);
  const seasonalAdj = weekdayAvg.map(s => s - avgSeasonal);

  return dates.map((date, i) => {
    const dow = new Date(date).getDay();
    const seasonal = seasonalAdj[dow];
    const trend = trends[i];
    return { date, revenue: revenues[i], trend, seasonal, residual: revenues[i] - trend - seasonal };
  });
}

// ─────────────────────────────────────────────────────────────
// Z-SCORE ANOMALY DETECTION
// Flag |z| > threshold (default 2.0) as anomaly
// ─────────────────────────────────────────────────────────────
export function detectAnomalies(
  dates: string[],
  revenues: number[],
  threshold: number = 2.0
): Array<{ date: string; revenue: number; zscore: number; is_anomaly: boolean }> {
  const scores = zScore(revenues);
  return dates.map((date, i) => ({
    date,
    revenue: revenues[i],
    zscore: scores[i],
    is_anomaly: Math.abs(scores[i]) > threshold,
  }));
}

// ─────────────────────────────────────────────────────────────
// STRUCTURAL BREAK DETECTION (mean shift)
// Splits series at each point; flags if |μ₁ - μ₂| > k·σ
// ─────────────────────────────────────────────────────────────
export function detectStructuralBreaks(
  values: number[],
  sensitivity: number = 1.5
): number[] {
  const sigma = stdDev(values);
  const breakPoints: number[] = [];
  for (let i = 5; i < values.length - 5; i++) {
    const left = values.slice(Math.max(0, i - 5), i);
    const right = values.slice(i, Math.min(values.length, i + 5));
    if (Math.abs(mean(left) - mean(right)) > sensitivity * sigma) {
      breakPoints.push(i);
    }
  }
  return breakPoints;
}

// ─────────────────────────────────────────────────────────────
// ENTERPRISE HEALTH INDEX (0–100)
// Weighted: Growth(25%) + Stability(25%) + Profitability(25%) + ForecastReliability(25%)
// ─────────────────────────────────────────────────────────────
export function enterpriseHealthIndex(params: {
  cagr: number;
  cv: number;
  profit_margin: number;
  mape: number;
}): { score: number; components: Record<string, number> } {
  // Growth: CAGR mapped to 0-100 (0% = 50, 50%+ = 100, negative tapers)
  const growthScore = Math.min(100, Math.max(0, 50 + params.cagr * 100));

  // Stability: lower CV = higher score (CV=0 → 100, CV=1 → 0)
  const stabilityScore = Math.min(100, Math.max(0, (1 - params.cv) * 100));

  // Profitability: margin % mapped (0% = 0, 50%+ = 100)
  const profitScore = Math.min(100, Math.max(0, params.profit_margin * 2));

  // Forecast reliability: lower MAPE = higher (MAPE=0 → 100, MAPE=50% → 0)
  const forecastScore = Math.min(100, Math.max(0, 100 - params.mape * 2));

  const score = 0.25 * growthScore + 0.25 * stabilityScore + 0.25 * profitScore + 0.25 * forecastScore;

  return {
    score: Math.round(score),
    components: {
      growth: Math.round(growthScore),
      stability: Math.round(stabilityScore),
      profitability: Math.round(profitScore),
      forecast_reliability: Math.round(forecastScore),
    },
  };
}

// ─────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mu = mean(values);
  return Math.sqrt(values.reduce((sum, v) => sum + (v - mu) ** 2, 0) / values.length);
}

export function formatCurrency(value: number, symbol: string = 'RM'): string {
  return `${symbol} ${value.toFixed(2)}`;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function generateForecast(
  revenues: number[],
  periods: number = 7,
  maWindow: number = 7,
  emaAlpha: number = 0.3
): Array<{ linear: number; ma: number; ema: number; wma: number; lower: number; upper: number }> {
  const reg = linearRegression(revenues);
  const emaVals = exponentialMovingAverage(revenues, emaAlpha);
  const residuals = revenues.map((v, i) => v - reg.predict(i));
  const se = stdDev(residuals.filter(r => !isNaN(r)));

  const lastMA = movingAverage(revenues, maWindow).filter(v => !isNaN(v)).at(-1) || 0;
  const lastEMA = emaVals.at(-1) || 0;
  const wmaVals = weightedMovingAverage(revenues, maWindow);
  const lastWMA = wmaVals.filter(v => !isNaN(v)).at(-1) || 0;
  const n = revenues.length;

  return Array.from({ length: periods }, (_, i) => {
    const x = n + i;
    const linear = reg.predict(x);
    return {
      linear,
      ma: lastMA,
      ema: lastEMA,
      wma: lastWMA,
      lower: linear - 1.96 * se,
      upper: linear + 1.96 * se,
    };
  });
}
