// ============================================================
// LSRIS Storage Layer — localStorage persistence
// ============================================================

import type { Order, Item, CostEntry, Config } from '@/types';

const KEYS = {
  ORDERS: 'lsris_orders',
  ITEMS: 'lsris_items',
  COSTS: 'lsris_costs',
  CONFIG: 'lsris_config',
};

// ── DEFAULT DATA ────────────────────────────────────────────

const DEFAULT_ITEMS: Item[] = [
  { id: '1', name: 'Roti', default_price: 1.20 },
  { id: '2', name: 'Chapati', default_price: 1.50 },
  { id: '3', name: 'Katak Roti', default_price: 2.00 },
  { id: '4', name: 'Katak Chapati', default_price: 2.50 },
];

const DEFAULT_CONFIG: Config = {
  pin_hash: '',
  forecasting_window: 7,
  ema_alpha: 0.3,
  currency_symbol: 'RM',
};

// ── GENERIC ─────────────────────────────────────────────────

function get<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// ── ORDERS ──────────────────────────────────────────────────

export function getOrders(): Order[] {
  return get<Order[]>(KEYS.ORDERS, []);
}

export function saveOrder(order: Order): void {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === order.id);
  if (idx >= 0) orders[idx] = order;
  else orders.push(order);
  set(KEYS.ORDERS, orders);
}

export function deleteOrder(id: string): void {
  set(KEYS.ORDERS, getOrders().filter(o => o.id !== id));
}

export function getOrdersByDateRange(from: string, to: string): Order[] {
  return getOrders().filter(o => o.date >= from && o.date <= to);
}

// ── ITEMS ───────────────────────────────────────────────────

export function getItems(): Item[] {
  const stored = get<Item[]>(KEYS.ITEMS, []);
  if (stored.length === 0) {
    set(KEYS.ITEMS, DEFAULT_ITEMS);
    return DEFAULT_ITEMS;
  }
  return stored;
}

export function saveItem(item: Item): void {
  const items = getItems();
  const idx = items.findIndex(i => i.id === item.id);
  if (idx >= 0) items[idx] = item;
  else items.push(item);
  set(KEYS.ITEMS, items);
}

// ── COSTS ───────────────────────────────────────────────────

export function getCosts(): CostEntry[] {
  return get<CostEntry[]>(KEYS.COSTS, []);
}

export function saveCost(cost: CostEntry): void {
  const costs = getCosts();
  const idx = costs.findIndex(c => c.id === cost.id);
  if (idx >= 0) costs[idx] = cost;
  else costs.push(cost);
  set(KEYS.COSTS, costs);
}

export function getCostForMonth(month: string): CostEntry | null {
  return getCosts().find(c => c.month === month) || null;
}

// ── CONFIG ──────────────────────────────────────────────────

export function getConfig(): Config {
  return get<Config>(KEYS.CONFIG, DEFAULT_CONFIG);
}

export function saveConfig(config: Config): void {
  set(KEYS.CONFIG, config);
}

// ── PIN AUTH ────────────────────────────────────────────────

/** Simple hash — sufficient for local-only PIN protection */
export function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    hash = (hash * 31 + pin.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

export function isPinSet(): boolean {
  return !!getConfig().pin_hash;
}

export function setPin(pin: string): void {
  const config = getConfig();
  config.pin_hash = hashPin(pin);
  saveConfig(config);
}

export function verifyPin(pin: string): boolean {
  const config = getConfig();
  if (!config.pin_hash) return true; // first run
  return hashPin(pin) === config.pin_hash;
}

// ── CSV EXPORT / IMPORT ─────────────────────────────────────

export function exportOrdersCSV(): string {
  const orders = getOrders();
  const headers = ['id', 'date', 'item_name', 'quantity', 'unit_price', 'total_revenue', 'notes', 'created_at'];
  const rows = orders.map(o => [
    o.id, o.date, o.item_name, o.quantity, o.unit_price, o.total_revenue, o.notes || '', o.created_at
  ].join(','));
  return [headers.join(','), ...rows].join('\n');
}

export function importOrdersCSV(csv: string): { imported: number; errors: number } {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return { imported: 0, errors: 0 };
  const headers = lines[0].split(',');
  let imported = 0, errors = 0;

  for (let i = 1; i < lines.length; i++) {
    try {
      const values = lines[i].split(',');
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => { obj[h.trim()] = values[idx]?.trim() || ''; });
      const order: Order = {
        id: obj.id || crypto.randomUUID(),
        date: obj.date,
        item_id: '1',
        item_name: obj.item_name as Order['item_name'],
        quantity: Number(obj.quantity),
        unit_price: Number(obj.unit_price),
        total_revenue: Number(obj.total_revenue),
        notes: obj.notes,
        created_at: obj.created_at || new Date().toISOString(),
      };
      saveOrder(order);
      imported++;
    } catch {
      errors++;
    }
  }
  return { imported, errors };
}

// ── BACKUP / RESTORE ─────────────────────────────────────────

export function exportBackup(): string {
  return JSON.stringify({
    orders: getOrders(),
    costs: getCosts(),
    config: getConfig(),
    items: getItems(),
    exported_at: new Date().toISOString(),
  }, null, 2);
}

export function importBackup(json: string): boolean {
  try {
    const data = JSON.parse(json);
    if (data.orders) set(KEYS.ORDERS, data.orders);
    if (data.costs) set(KEYS.COSTS, data.costs);
    if (data.config) set(KEYS.CONFIG, data.config);
    if (data.items) set(KEYS.ITEMS, data.items);
    return true;
  } catch {
    return false;
  }
}

// ── DATE HELPERS ─────────────────────────────────────────────

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function monthISO(): string {
  return todayISO().slice(0, 7);
}

export function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}
