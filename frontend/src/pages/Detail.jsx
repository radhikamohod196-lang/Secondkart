import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, ChevronLeft, ChevronRight, ShieldCheck, CalendarDays, MessageCircle, ArrowLeft, Heart, Flag, Camera, ShoppingBag } from 'lucide-react';
import api, { imageUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import ReviewBadge from '../components/ReviewBadge';

export default function Detail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [idx, setIdx] = useState(0);
  const [message, setMessage] = useState('Hi! Is this item still available?');
  const [notice, setNotice] = useState('');
  const [ok, setOk] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState('');
  const { user, favIds, toggleFavorite } = useAuth();
  const nav = useNavigate();

  const load = () => api.get(`/listings/${id}`).then(r => setData(r.data)).catch(e => setNotice(e.response?.data?.message || 'Could not load this listing.'));
  useEffect(() => { load(); setIdx(0); }, [id]);

  const say = (text, good = false) => { setNotice(text); setOk(good); };

  async function enquire(e) {
    e.preventDefault();
    if (!user) return nav('/login');
    try {
      await api.post(`/listings/${id}/enquiries`, { message });
      say('Enquiry sent! The seller can reply to you in Chat (chat icon in the top bar).', true);
    } catch (err) { say(err.response?.data?.message || 'Could not send enquiry.'); }
  }

  async function startChat() {
    if (!user) return nav('/login');
    try {
      const r = await api.post('/chat/start', { listingId: id });
      nav(`/chat/${r.data._id}`);
    } catch (err) { say(err.response?.data?.message || 'Could not open the chat.'); }
  }

  async function save() {
    if (!user) return nav('/login');
    try { const added = await toggleFavorite(id); say(added ? 'Added to favorites.' : 'Removed from favorites.', true); }
    catch (err) { say(err.response?.data?.message || 'Could not update favorites.'); }
  }

  async function askPhoto() {
    if (!user) return nav('/login');
    try { const r = await api.post(`/listings/${id}/request-photo`); say(r.data.message, true); }
    catch (err) { say(err.response?.data?.message || 'Could not send the request.'); }
  }

  async function sendReport(e) {
    e.preventDefault();
    try {
      const r = await api.post(`/listings/${id}/report`, { reason });
      say(r.data.message, true); setReporting(false); setReason(''); load();
    } catch (err) { say(err.response?.data?.message || 'Could not submit the report.'); }
  }

  if (!data) return <div className="page-state">{notice || 'Loading listing…'}</div>;
  const { listing: item, trust } = data;
  const isOwner = user && String(user._id) === String(item.sellerId?._id);
  const saved = favIds.includes(item._id);
  const available = item.status === 'available';

  return (
    <main className="page-container detail-page">
      <Link className="back-link" to="/listings"><ArrowLeft size={16} /> Back to listings</Link>
      <div className="detail-layout">
        <div>
          <div className="detail-main-image">
            {item.images?.length ? <img src={imageUrl(item.images[idx])} alt={item.title} /> : <div className="image-placeholder detail-placeholder"><span>✳</span><b>A good thing, ready for a new home.</b></div>}
            {item.status === 'sold' && <span className="sold-badge detail-sold">SOLD</span>}
            {item.status === 'reserved' && <span className="sold-badge detail-sold reserved-badge">RESERVED</span>}
            {item.images?.length > 1 && <>
              <button className="slider-button slider-prev" onClick={() => setIdx((idx + item.images.length - 1) % item.images.length)} aria-label="Previous image"><ChevronLeft /></button>
              <button className="slider-button slider-next" onClick={() => setIdx((idx + 1) % item.images.length)} aria-label="Next image"><ChevronRight /></button>
              <span className="slider-count">{idx + 1} / {item.images.length}</span>
            </>}
          </div>
          {item.images?.length > 1 && <div className="thumbnail-row">{item.images.map((im, i) => <button className={idx === i ? 'selected' : ''} onClick={() => setIdx(i)} key={im}><img src={imageUrl(im)} alt={`Product view ${i + 1}`} /></button>)}</div>}
          <p className="photo-note">{item.images?.length ? `${item.images.length} seller photo(s). Not officially verified.` : 'No seller photos uploaded for this item.'}</p>
        </div>

        <div className="detail-copy">
          <span className="product-category">{item.category} <span>·</span> {item.condition}</span>
          <h1>{item.title}</h1>
          <div className="detail-price">₹{Number(item.price).toLocaleString('en-IN')}{item.originalPrice > item.price && <span>₹{Number(item.originalPrice).toLocaleString('en-IN')}</span>}</div>
          <div className="detail-location"><MapPin size={16} />{item.location}</div>
          <div className="detail-badges"><ReviewBadge status={item.reviewStatus} /></div>
          <div className="detail-divider" />
          <h3>About this find</h3>
          <p className="detail-description">{item.description}</p>

          {(item.age || item.defects || item.accessories) && (
            <div className="detail-facts">
              <b>Details</b>
              <dl>
                {item.age && <><dt>Age</dt><dd>{item.age}</dd></>}
                <dt>Defects</dt><dd>{item.defects || 'None stated'}</dd>
                <dt>Accessories</dt><dd>{item.accessories || 'None'}</dd>
              </dl>
            </div>
          )}

          <div className="photo-disclaimer">ℹ Automated AI-image detection is not enabled. Photos go through a metadata check and manual review; this is not an official verification.</div>

          <div className="detail-seller">
            <div className="seller-avatar">{item.sellerId?.name?.charAt(0) || 'S'}</div>
            <div className="seller-details"><b>{item.sellerId?.name || 'SecondKart seller'}</b><small><CalendarDays size={13} /> Member since {new Date(item.sellerId?.createdAt || Date.now()).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</small></div>
            <span className="seller-trust"><ShieldCheck size={16} />{trust?.score === null ? 'Building trust' : `${trust?.score ?? '—'}/100`}</span>
          </div>
          <div className="trust-explain"><b>{trust?.label || 'Seller trust'}</b><p>{trust?.score === null ? 'This seller is new or has limited history. Trust scores appear when there is enough genuine activity.' : trust?.formula}</p></div>

          {notice && <div className={ok || notice.startsWith('Enquiry sent') ? 'success-message' : 'error-message'}>{notice}</div>}

          {item.status === 'sold' ? <div className="sold-note">This item has found its next home. Enquiries are closed.</div>
            : isOwner ? <Link className="button full-button" to="/dashboard">Manage your listing</Link>
            : <>
              {available
                ? <button className="button full-button buy-button" onClick={() => user ? nav(`/checkout/${item._id}`) : nav('/login')}><ShoppingBag size={17} /> Buy now · ₹{Number(item.price).toLocaleString('en-IN')}</button>
                : <div className="sold-note">This item is reserved for an order in progress. If that order is cancelled it becomes available again.</div>}
              <button type="button" className="button button-outline full-button chat-seller-button" onClick={startChat}><MessageCircle size={17} /> Chat with seller</button>
              {available && <form className="enquiry-form" onSubmit={enquire}>
                <label>Or message the seller first<textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={1000} required rows="3" /></label>
                <button className="button button-outline full-button"><MessageCircle size={17} /> Send enquiry</button>
              </form>}
            </>}

          {!isOwner && <div className="action-row">
            <button type="button" className={`ghost-action ${saved ? 'on' : ''}`} onClick={save}><Heart size={15} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save'}</button>
            <button type="button" className="ghost-action" onClick={askPhoto}><Camera size={15} /> Request fresh photo</button>
            <button type="button" className="ghost-action" onClick={() => user ? setReporting(r => !r) : nav('/login')}><Flag size={15} /> Report</button>
          </div>}

          {reporting && <form className="report-form" onSubmit={sendReport}>
            <label>Why is this listing misleading or suspicious?<textarea required minLength={5} maxLength={500} rows="3" value={reason} onChange={e => setReason(e.target.value)} placeholder="Describe the problem (at least 5 characters)" /></label>
            <div className="row-gap"><button className="button button-small">Submit report</button><button type="button" className="button button-small button-outline" onClick={() => setReporting(false)}>Cancel</button></div>
          </form>}

          <small className="safe-note">✳ Keep conversations respectful and meet safely in public places.</small>
        </div>
      </div>
    </main>
  );
}
