import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList, Star, MessageCircle } from 'lucide-react';
import api, { imageUrl } from '../api';
import { useAuth } from '../context/AuthContext';

const FLOW = ['Pending', 'Confirmed', 'Shipped', 'Delivered'];

function OrderCard({ order, seller, onChange, onError }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [rating_open, setRatingOpen] = useState(false);
  const nav = useNavigate();
  const i = FLOW.indexOf(order.status);
  const cancelled = order.status === 'Cancelled';
  const tracking = ['Shipped', 'Delivered'].includes(order.status) ? `DEMO-${order.ref.slice(3)} (simulated, not live courier data)` : 'Not shipped yet';

  async function run(fn) { onError(''); try { await fn(); onChange(); } catch (e) { onError(e.response?.data?.message || 'Action failed.'); } }

  async function openChat() {
    onError('');
    try {
      const r = await api.post('/chat/start', { listingId: order.listingId, ...(seller ? { buyerId: order.buyerId } : {}) });
      nav(`/chat/${r.data._id}`);
    } catch (e) { onError(e.response?.data?.message || 'Could not open the chat.'); }
  }

  return (
    <div className="order-card">
      <div className="order-head">
        <div className="order-thumb">{order.image ? <img src={imageUrl(order.image)} alt="" /> : <ClipboardList size={22} />}</div>
        <div className="order-title"><b>{order.title}</b><small>Ref {order.ref} · ₹{Number(order.price).toLocaleString('en-IN')} · {order.deliveryMethod}</small></div>
        <span className={`status-pill ${cancelled ? 'status-cancelled' : order.status === 'Delivered' ? '' : 'status-active'}`}>{order.status}</span>
      </div>
      {!cancelled && <div className="order-steps" aria-label="Progress">{FLOW.map((s, j) => <i key={s} className={j <= i ? 'on' : ''} title={s} />)}</div>}
      <div className="order-meta">
        <span>Payment: <b>Successful (simulated)</b></span>
        <span>Tracking: {tracking}</span>
        <span>{seller ? 'Buyer' : 'Ordered'}: {seller ? `${order.fullName} · ${order.phone}` : new Date(order.createdAt).toLocaleDateString('en-IN')}</span>
        {seller && order.address && <span>{order.deliveryMethod === 'Local pickup' ? 'Note' : 'Ship to'}: {order.address}</span>}
      </div>
      <div className="order-actions">
        {seller && i > -1 && i < 3 && <button className="button button-small" onClick={() => run(() => api.put(`/orders/${order._id}/advance`))}>Mark {FLOW[i + 1]}</button>}
        {!seller && i > -1 && i < 2 && <button className="button button-small button-outline danger-outline" onClick={() => { if (confirm('Cancel this order?')) run(() => api.put(`/orders/${order._id}/cancel`)); }}>Cancel order</button>}
        {!seller && order.status === 'Delivered' && (order.reviewed
          ? <span className="status-pill">Rated {order.rating}★</span>
          : <button className="button button-small button-outline" onClick={() => setRatingOpen(o => !o)}><Star size={14} /> Rate seller</button>)}
        <button type="button" className="button button-small button-outline" onClick={openChat}><MessageCircle size={14} /> {seller ? 'Chat with buyer' : 'Chat with seller'}</button>
        <Link className="text-link small-link" to={`/listings/${order.listingId}`}>View listing</Link>
      </div>
      {rating_open && !order.reviewed && (
        <form className="rate-form" onSubmit={e => { e.preventDefault(); run(() => api.post(`/orders/${order._id}/review`, { rating, comment })); }}>
          <label>Your rating<select value={rating} onChange={e => setRating(Number(e.target.value))}>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} ★</option>)}</select></label>
          <label>Comment <span className="optional">optional</span><input maxLength={500} value={comment} onChange={e => setComment(e.target.value)} placeholder="How was the item and the seller?" /></label>
          <button className="button button-small">Submit rating</button>
        </form>
      )}
    </div>
  );
}

export default function Orders() {
  const { user } = useAuth();
  const [tab, setTab] = useState('buying');
  const [buying, setBuying] = useState([]);
  const [selling, setSelling] = useState([]);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const load = () => Promise.all([api.get('/orders/mine'), api.get('/orders/selling')])
    .then(([a, b]) => { setBuying(a.data); setSelling(b.data); })
    .catch(e => setError(e.response?.data?.message || 'Could not load orders.'))
    .finally(() => setLoaded(true));
  useEffect(() => { load(); }, []);

  const showSales = user?.role !== 'buyer' || selling.length > 0;
  const list = tab === 'buying' ? buying : selling;

  return (
    <main className="page-container">
      <div className="page-title-row"><div><span className="eyebrow">TRACK YOUR FINDS</span><h1>My <em>orders.</em></h1><p>Payments are simulated in this demo. Delivered orders mark the item as sold.</p></div></div>
      {showSales && <div className="tab-row"><button className={tab === 'buying' ? 'active' : ''} onClick={() => setTab('buying')}>My purchases ({buying.length})</button><button className={tab === 'selling' ? 'active' : ''} onClick={() => setTab('selling')}>Orders received ({selling.length})</button></div>}
      {error && <div className="error-message">{error}</div>}
      {!loaded ? <div className="page-state">Loading orders…</div>
        : list.length ? list.map(o => <OrderCard key={o._id} order={o} seller={tab === 'selling'} onChange={load} onError={setError} />)
        : <div className="empty-state"><div className="empty-icon"><ClipboardList size={27} /></div><h3>{tab === 'buying' ? 'No orders yet.' : 'No orders for your items yet.'}</h3><p>{tab === 'buying' ? 'When you buy something, you can follow it here.' : 'When a buyer orders one of your listings, it shows up here.'}</p>{tab === 'buying' && <Link className="button" to="/listings">Explore listings</Link>}</div>}
    </main>
  );
}
