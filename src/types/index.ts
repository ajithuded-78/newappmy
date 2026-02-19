// ============================================================
// LSRIS - Local Sales & Revenue Intelligence System
// Type Definitions
// ============================================================

export type ProductName = 'Roti' | 'Chapati' | 'Katak Roti' | 'Katak Chapati';

export interface Item {
  id: string;
  name: ProductName;
  default_price: number;
}

export interface Order {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  item_id: string;
  item_name: ProductName;
  quantity: number;
  unit_price: number;
  total_revenue: number;
  notes?: string;
  created_at: string;
}

export interface CostEntry {
  id: string;
  month: string; // YYYY-MM
  flour_cost: number;
  gas_cost: number;
  electricity_cost: number;
  labor_cost: number;
  misc_cost: number;
}

export interface Config {
  pin_hash: string;
  forecasting_window: number; // days for MA
  ema_alpha: number;
  currency_symbol: string;
}

export interface ForecastResult {
  date: string;
  linear: number;
  ma: number;
  ema: number;
  wma: number;
  lower_ci: number;
  upper_ci: number;
}

export interface ErrorMetrics {
  mae: number;
  mse: number;
  rmse: number;
  mape: number;
}

export interface DecompositionPoint {
  date: string;
  revenue: number;
  trend: number;
  seasonal: number;
  residual: number;
}

export interface AnomalyPoint {
  date: string;
  revenue: number;
  zscore: number;
  is_anomaly: boolean;
}

export interface VolatilityPoint {
  date: string;
  rolling_std: number;
  cv: number;
}

export interface EnterpriseHealth {
  overall: number; // 0-100
  growth: number;
  stability: number;
  profitability: number;
  forecast_reliability: number;
  classification: 'Excellent' | 'Good' | 'Moderate' | 'At Risk' | 'Critical';
  summary: string;
}

export interface DailySummary {
  date: string;
  total_revenue: number;
  total_quantity: number;
  orders: Order[];
}

export interface SensitivityResult {
  scenario: string;
  price_change: number;
  quantity_change: number;
  estimated_revenue: number;
  estimated_profit: number;
}

export interface BreakEvenAnalysis {
  total_cost: number;
  break_even_revenue: number;
  current_revenue: number;
  profit: number;
  profit_margin: number;
  surplus_deficit: number;
}

export interface CorrelationMatrix {
  weekday_revenue: number;
  quantity_revenue: number;
}

export interface AutocorrelationResult {
  lag: number;
  correlation: number;
}

export interface AppState {
  is_authenticated: boolean;
  active_page: string;
}
