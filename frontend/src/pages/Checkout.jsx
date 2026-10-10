import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, FlaskConical } from 'lucide-react';
import api, { imageUrl } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Checkout() {
  const { id } = useParams();
  const { user, refreshUnread } = useAuth();
  const nav = useNavigate();
  const [item, setItem] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ fullName: user?.name || '', phone: user?.phone || '', deliveryMethod: 'Courier (demo)', address: user?.address || '' });

  useEffect(() => {
    api.get(`/listings/${id}`).then(r => setItem(r.data.listing)).catch(e => setError(e.response?.data?.message || 'Could not load this product.'));
  }, [id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const pickup = form.deliveryMethod === 'Local pickup';

  async function pay(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await api.post('/orders', { listingId: id, ...form });
      refreshUnread();
      nav('/orders');
    } catch (err) { setError(err.response?.data?.message || 'Could not place the order.'); }
    finally { setBusy(false); }
  }

  if (!item) return <div className="page-state">{error || 'Loading checkout…'}</div>;
  if (String(item.sellerId?._id) === String(user._id)) return <main className="page-container"><div className="empty-state"><h3>You cannot buy your own listing.</h3><Link className="button" to={`/listings/${id}`}>Back to listing</Link></div></main>;
  if (item.status !== 'available') return <main className="page-container"><div className="empty-state"><h3>This product is no longer available.</h3><Link className="button" to="/listings">Browse other finds</Link></div></main>;

  return (
    <main className="page-container checkout-page">
      <Link className="back-link" to={`/listings/${id}`}><ArrowLeft size={16} /> Back to listing</Link>
      <div className="page-title-row"><div><span className="eyebrow">ALMOST YOURS</span><h1>Check<em>out.</em></h1></div></div>
      <div className="checkout-layout">
        <form className="form-card form-stack" onSubmit={pay}>
          <h2 className="card-title">Delivery</h2>
          <label>Full name<input required minLength={2} value={form.fullName} onChange={e => set('fullName', e.target.value)} /></label>
          <label>Phone <span className="optional">10 digits</span><input required pattern="[0-9]{10}" title="10 digit number" inputMode="numeric" value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} /></label>
          <label>Delivery method<select value={form.deliveryMethod} onChange={e => set('deliveryMethod', e.target.value)}><option>Courier (demo)</option><option>Local pickup</option></select></label>
          <label>{pickup ? 'Pickup note (optional)' : 'Address'}<textarea className="plain-textarea" rows="3" required={!pickup} minLength={pickup ? undefined : 8} value={form.address} onChange={e => set('address', e.target.value)} placeholder={pickup ? 'Preferred time or place to meet' : 'House / street / area / city / PIN'} /></label>
          {error && <div className="error-message">{error}</div>}
          <button className="button full-button" disabled={busy}>{busy ? 'Placing order…' : `Pay ₹${Number(item.price).toLocaleString('en-IN')} (simulated)`} <ArrowRight size={17} /></button>
        </form>
        <aside className="form-card summary-card">
          <div className="summary-thumb">{item.images?.[0] ? <img src={imageUrl(item.images[0])} alt="" /> : <span>✳</span>}</div>
          <h3>{item.title}</h3>
          <div className="detail-price">₹{Number(item.price).toLocaleString('en-IN')}</div>
          <p className="summary-meta">{item.category} · {item.condition} · {item.location}</p>
          <div className="demo-note"><FlaskConical size={15} /> Payment is SIMULATED. No money moves, no card details are collected, and no escrow is provided. The server re-checks availability and price when you place the order.</div>
        </aside>
      </div>
    </main>
  );
}
