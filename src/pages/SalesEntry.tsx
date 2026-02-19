import { loadRevenueEntries } from "../services/firestoreService";
import { useState, useEffect } from 'react';
import { getItems, saveOrder, getOrders, todayISO, getConfig } from '@/utils/storage';
import { PlusCircle, Trash2, CheckCircle } from 'lucide-react';
import type { Order, ProductName } from '@/types';
import { saveRevenueEntry } from "../services/firestoreService";
import { trashRevenueEntry } from "../services/firestoreService";

export default function SalesEntry() {
  const [undoOrder , setUndoOrder] = useState<any>(null);
  const [, forceUpdate] = useState(0);
  const [cloudOrders, setCloudOrders] = useState<any[]>([]);
  useEffect(()=>{

    const load=async()=>{

      const data=
      await loadRevenueEntries();

      if(data.length>0){

        setCloudOrders(data);

      }

    };

    load();

  },[]);  
  const items = getItems();
  const config = getConfig();
  const symbol = config.currency_symbol;

  const [date, setDate] = useState(todayISO());
  const [itemId, setItemId] = useState(items[0]?.id || '1');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState(() => String(items[0]?.default_price || ''));
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const selectedItem = items.find(i => i.id === itemId);

  const total =
    (Number(quantity) || 0) *
    (Number(price) || 0);

  const handleItemChange = (id: string) => {

    setItemId(id);

    const item = items.find(i => i.id === id);

    if (item) setPrice(String(item.default_price));

  };

  const handleSubmit = async () => {

    setError('');

    const qty = Number(quantity);
    const prc = Number(price);

    if (!date) return setError('Please select a date');

    if (!qty || qty <= 0)
      return setError('Quantity must be positive');

    if (!prc || prc <= 0)
      return setError('Price must be positive');

    if (qty > 10000)
      return setError('Quantity too large');

    if (prc > 10000)
      return setError('Price too large');

    const order: Order = {

      id: crypto.randomUUID(),
      locked:false,
      date,

      item_id: itemId,

      item_name: selectedItem?.name as ProductName,

      quantity: qty,

      unit_price: prc,

      total_revenue: qty * prc,

      notes: notes.trim().slice(0, 200),

      created_at: new Date().toISOString(),

    };

    // LOCAL SAVE
    saveOrder(order);

    // FIRESTORE CLOUD SAVE
    await saveRevenueEntry(order);

    setSaved(true);

    setQuantity('');

    setNotes('');

    setTimeout(() => setSaved(false), 2000);

  };

  // Recent Orders

  const allOrders =
  cloudOrders.length>0
  ? cloudOrders
  : getOrders();

  const recent =
  [...allOrders]
  .sort((a,b)=>
  b.created_at.localeCompare(a.created_at)
  )
  .slice(0,10);

  
    const toggleLock=async (id:string)=>{
      const { getOrders }=
      await import('@/utils/storage');

      const orders=getOrders();

      const updated=orders.map((o:any)=>{
        if(o.id===id){
          return {
            ...o,
            locked:!o.locked
          };
        }
        return o;
      });

      localStorage.setItem(
        "orders",
        JSON.stringify(updated)
      );
      
      forceUpdate(n=>n+1);
    };

  const handleDelete =
  async(id:string)=>{

    const allOrders =
    cloudOrders.length>0
    ? cloudOrders
    : getOrders();

    const order=
    allOrders.find(
      (o:any)=>o.id===id
    );


    if(order?.locked){
    alert("Entry is locked and cannot be deleted.");
    return;
    }

    const { deleteOrder }=
    await import('@/utils/storage');

    deleteOrder(id);

    if(order?.firestoreId){

      await trashRevenueEntry(

        order.firestoreId

      );

    }

    setUndoOrder(order);

    setTimeout(()=>{

      setUndoOrder(null);

    },5000);

   forceUpdate(n=>n+1);

  };
  
  return (
  <>

    <div className="px-4 py-4 space-y-5">

      <div>

        <p className="section-header mb-3">
          Daily Sales Entry
        </p>

        {saved && (

          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2.5 mb-3"
            style={{
              background: 'hsl(var(--success) / 0.1)',
              border:
                '1px solid hsl(var(--success) / 0.3)'
            }}
          >

            <CheckCircle
              className="w-4 h-4"
              style={{
                color: 'hsl(var(--success))'
              }}
            />

            <span
              className="text-sm"
              style={{
                color: 'hsl(var(--success))'
              }}
            >

              Sale recorded successfully

            </span>

          </div>

        )}

        {error && (

          <div
            className="rounded-lg px-3 py-2.5 mb-3 text-sm"
            style={{
              background:
                'hsl(var(--destructive) / 0.1)',
              border:
                '1px solid hsl(var(--destructive) / 0.3)',
              color:
                'hsl(var(--destructive))'
            }}
          >

            {error}

          </div>

        )}

        <div className="stat-card space-y-4">

          <div>

            <label className="section-header block mb-1.5">
              Date
            </label>

            <input
              type="date"
              value={date}
              onChange={e =>
                setDate(e.target.value)}
              className="form-input"
              max={todayISO()}
            />

          </div>

          <div>

            <label className="section-header block mb-1.5">
              Product
            </label>

            <select
              value={itemId}
              onChange={e =>
                handleItemChange(
                  e.target.value)}
              className="form-input"
            >

              {items.map(item => (

                <option
                  key={item.id}
                  value={item.id}
                >

                  {item.name}

                </option>

              ))}

            </select>

          </div>

          <div className="grid grid-cols-2 gap-3">

            <div>

              <label className="section-header block mb-1.5">
                Quantity
              </label>

              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={e =>
                  setQuantity(
                    e.target.value)}
                placeholder="0"
                className="form-input"
              />

            </div>

            <div>

              <label className="section-header block mb-1.5">
                Unit Price ({symbol})
              </label>

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={price}
                onChange={e =>
                  setPrice(
                    e.target.value)}
                placeholder="0.00"
                className="form-input"
              />

            </div>

          </div>

          <div
            className="rounded-lg px-3 py-2.5 flex items-center justify-between"
            style={{
              background:
                'hsl(var(--muted))'
            }}
          >

            <span
              className="text-sm"
              style={{
                color:
                  'hsl(var(--muted-foreground))'
              }}
            >

              Total Revenue

            </span>

            <span className="metric-value text-lg">

              {symbol} {total.toFixed(2)}

            </span>

          </div>

          <div>

            <label className="section-header block mb-1.5">
              Notes (optional)
            </label>

            <textarea
              value={notes}
              onChange={e =>
                setNotes(
                  e.target.value)}
              placeholder="Add notes..."
              rows={2}
              maxLength={200}
              className="form-input resize-none"
            />

          </div>

          <button
            onClick={handleSubmit}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >

            <PlusCircle className="w-4 h-4" />

            Record Sale

          </button>

        </div>

      </div>

      {recent.length > 0 && (

        <div>

          <p className="section-header mb-3">
            Recent Sales
          </p>

          <div className="space-y-2">

            {recent.map(order => (

              <div
                key={order.id}
                className="stat-card flex items-center justify-between py-3"
              >

                <div>

                  <p
                    className="text-sm font-medium"
                    style={{
                      color:
                        'hsl(var(--foreground))'
                    }}
                  >

                    {order.item_name}

                  </p>

                  <p
                    className="text-xs mt-0.5"
                    style={{
                      color:
                        'hsl(var(--muted-foreground))'
                    }}
                  >

                    {order.date} · {order.quantity}
                    × {symbol}
                    {order.unit_price}

                  </p>

                </div>

                <div className="flex items-center gap-3">

                  <span className="metric-value text-base">

                    {symbol}
                    {order.total_revenue.toFixed(
                      2)}

                  </span>

                  <button
                  onClick={() =>toggleLock(order.id)}
                      
                  className="p-1 rounded"

                  title="Lock Entry"
                  >
                    {order.locked ? "🔒" : "🔓"}
                  </button>
                  <button
                    disabled={order.locked}
                    onClick={() =>
                      handleDelete(order.id)}
                    className="p-1 rounded transition-colors"
                    style={{
                      color:
                      order.locked
                      ? "gray"
                      : "hsl(var(--muted-foreground))"
                    }}
                    >
                      <Trash2 className="w-4 h-4" />
                  </button>
                  
                </div>

              </div>

            ))}

          </div>

        </div>

      )}

    </div>
    {
      undoOrder && 
      (

        <div
        className="fixed bottom-6 left-1/2
        -translate-x-1/2
      bg-black text-white
        px-6 py-3 rounded-xl
        shadow-lg flex gap-4 items-center">

          <span>

            Sale Deleted

           </span>

          <button
          className="font-bold text-green-400"
          onClick={async()=>{
          await saveRevenueEntry(
          undoOrder
          );
          setUndoOrder(null);
          }}
          >

           UNDO

          </button>

       </div>

      )
    }
  </>
  );

}