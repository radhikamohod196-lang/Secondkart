import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { UploadCloud, ArrowRight, Trash2, Sparkles, Lightbulb } from 'lucide-react';
import api, { imageUrl } from '../api';

const MIN_PHOTOS = 3;
const MAX_PHOTOS = 8;
const PHOTO_RULES = [
  'Upload at least 3 clear photos: front, back, and a close-up of every defect.',
  'Photos must be of the real item you are selling. No stock, internet, edited or AI-generated images.',
  'Use good lighting and a plain background. Do not use filters or heavy editing.',
  'Show all accessories you list in at least one photo.',
  'Show the model or serial label where there is one (e.g. electronics, cycles).',
  'JPG, PNG or WebP only, 5 MB maximum per photo, up to 8 photos.',
  'Admin may reject a listing or ask for fresh photos from other angles.'
];
const EMPTY = { title: '', description: '', price: '', originalPrice: '', category: 'Electronics', condition: 'Very Good', location: '', age: '', defects: '', accessories: '' };

export default function Sell() {
  const { id } = useParams(); // present on /sell/:id/edit
  const editing = Boolean(id);
  const [form, setForm] = useState(EMPTY);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [kept, setKept] = useState([]); // existing photos (edit mode)
  const [confirm, setConfirm] = useState(false);
  const [advice, setAdvice] = useState(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const nav = useNavigate();

  useEffect(() => {
    if (!editing) return;
    api.get(`/listings/${id}`).then(({ data }) => {
      const l = data.listing;
      setForm({
        title: l.title || '', description: l.description || '', price: l.price ?? '', originalPrice: l.originalPrice ?? '',
        category: l.category, condition: l.condition, location: l.location || '', age: l.age || '', defects: l.defects || '', accessories: l.accessories || ''
      });
      setKept(l.images || []);
    }).catch(e => setError(e.response?.data?.message || 'Could not load this listing.'));
  }, [id, editing]);

  const total = kept.length + files.length;

  function change(k, v) { setForm(f => ({ ...f, [k]: v })); setAdvice(null); }

  function choose(e) {
    const picked = Array.from(e.target.files || []);
    e.target.value = '';
    const room = MAX_PHOTOS - kept.length - files.length;
    if (picked.length > room) setError(`You can add up to ${MAX_PHOTOS} photos in total.`);
    else setError('');
    const next = picked.slice(0, Math.max(0, room));
    setFiles(fs => [...fs, ...next]);
    setPreviews(ps => [...ps, ...next.map(f => URL.createObjectURL(f))]);
  }

  async function getAdvice() {
    setLoadingAdvice(true); setAdvice(null);
    try { const { data } = await api.post('/listings/price-advice', form); setAdvice(data); }
    catch (e) { setAdvice({ sufficient: false, message: e.response?.data?.message || 'Price advice needs the backend and database to be running.' }); }
    finally { setLoadingAdvice(false); }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (total < MIN_PHOTOS) return setError(`Please add at least ${MIN_PHOTOS} photos as per the photo instructions (you have ${total}).`);
    if (!confirm) return setError('Please confirm your photos follow the photo instructions.');
    setBusy(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([k, v]) => body.append(k, v));
      body.append('photoConfirm', 'true');
      if (editing) body.append('keepImages', JSON.stringify(kept));
      files.forEach(f => body.append('images', f));
      const { data } = editing ? await api.put(`/listings/${id}`, body) : await api.post('/listings', body);
      nav(`/listings/${data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || (editing ? 'Could not save your changes.' : 'Could not post item. Are you logged in as a seller?'));
    } finally { setBusy(false); }
  }

  return (
    <main className="page-container form-page">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">{editing ? 'KEEP IT FRESH' : 'PASS THE GOOD STUFF ON'}</span>
          <h1>{editing ? <>Edit your <em>listing.</em></> : <>List a little <em>lovely.</em></>}</h1>
          <p>{editing ? 'Update the details. New photos go back to review.' : 'Give your pre-loved find a fresh start with its next owner.'}</p>
        </div>
        <div className="form-title-icon"><Sparkles size={27} /></div>
      </div>
      <form className="listing-form" onSubmit={submit}>
        <div className="form-main">
          <section className="form-card">
            <div className="form-section-title"><span>01</span><div><h2>Tell us about your item</h2><p>A few details help the right buyer find it.</p></div></div>
            <label>Item title *<input required maxLength="100" value={form.title} onChange={e => change('title', e.target.value)} placeholder="e.g. Classic denim jacket" /></label>
            <label>Description *<textarea required maxLength="2000" rows="5" value={form.description} onChange={e => change('description', e.target.value)} placeholder="What makes it special? Mention its condition, size, or anything a buyer should know." /></label>
            <div className="form-two-col">
              <label>Category *<select value={form.category} onChange={e => change('category', e.target.value)}>{['Electronics', 'Fashion', 'Books', 'Home & Living', 'Sports', 'Beauty', 'Other'].map(c => <option key={c}>{c}</option>)}</select></label>
              <label>Condition *<select value={form.condition} onChange={e => change('condition', e.target.value)}>{['Like New', 'Very Good', 'Good', 'Fair'].map(c => <option key={c}>{c}</option>)}</select></label>
            </div>
            <div className="form-two-col">
              <label>Approx. age *<input required maxLength="60" value={form.age} onChange={e => change('age', e.target.value)} placeholder="e.g. 2 years" /></label>
              <label>Location *<input required value={form.location} onChange={e => change('location', e.target.value)} placeholder="e.g. Hyderabad, Telangana" /></label>
            </div>
            <label>Defects / scratches <span className="optional">be honest, buyers appreciate it</span><textarea maxLength="500" rows="3" value={form.defects} onChange={e => change('defects', e.target.value)} placeholder="e.g. Small crack on the top-left corner. Leave blank if none." /></label>
            <label>Accessories included <span className="optional">optional</span><input maxLength="300" value={form.accessories} onChange={e => change('accessories', e.target.value)} placeholder="e.g. Charger, original box" /></label>
          </section>

          <section className="form-card">
            <div className="form-section-title"><span>02</span><div><h2>Show it off</h2><p>Upload {MIN_PHOTOS}–{MAX_PHOTOS} clear photos. JPG, PNG or WebP, max 5 MB each.</p></div></div>
            <div className="photo-rules"><b>📋 Photo instructions</b><ol>{PHOTO_RULES.map(r => <li key={r}>{r}</li>)}</ol></div>
            <label className="upload-box"><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={choose} /><UploadCloud size={28} /><b>Drop your photos here, or browse</b><small>Real photos help buyers shop with confidence. New photos go to a metadata check and manual review.</small></label>
            {(kept.length > 0 || previews.length > 0) && <div className="preview-grid">
              {kept.map(p => <div key={p}><img src={imageUrl(p)} alt="Current photo" /><button type="button" onClick={() => setKept(k => k.filter(x => x !== p))} aria-label="Remove photo"><Trash2 size={15} /></button></div>)}
              {previews.map((p, i) => <div key={p}><img src={p} alt={`Preview ${i + 1}`} /><button type="button" onClick={() => { setFiles(fs => fs.filter((_, n) => n !== i)); setPreviews(ps => ps.filter((_, n) => n !== i)); }} aria-label="Remove image"><Trash2 size={15} /></button></div>)}
            </div>}
            <p className={`photo-count ${total >= MIN_PHOTOS ? 'ok' : ''}`}>{total} of {MAX_PHOTOS} photos · minimum {MIN_PHOTOS}</p>
            <label className="check-row"><input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)} /> <span>I confirm my photos follow the photo instructions above.</span></label>
          </section>
        </div>

        <aside className="form-side">
          <section className="form-card price-card">
            <div className="form-section-title"><span>03</span><div><h2>Set your price</h2><p>Fair prices find good homes.</p></div></div>
            <label>Your asking price (₹) *<div className="money-input"><span>₹</span><input type="number" min="1" required value={form.price} onChange={e => change('price', e.target.value)} placeholder="0" /></div></label>
            <label>Original price (₹) <span className="optional">optional</span><div className="money-input"><span>₹</span><input type="number" min="0" value={form.originalPrice} onChange={e => change('originalPrice', e.target.value)} placeholder="If you remember" /></div></label>
            <button type="button" className="advisor-button" onClick={getAdvice} disabled={loadingAdvice}><Lightbulb size={17} />{loadingAdvice ? 'Checking similar finds…' : 'Get smart price advice'}</button>
            {advice && <div className="advice-box"><span className="advice-icon"><Sparkles size={16} /></span><b>{advice.sufficient ? `Suggested: ₹${advice.suggestedRange.min.toLocaleString('en-IN')} – ₹${advice.suggestedRange.max.toLocaleString('en-IN')}` : 'A little more research'}</b>{advice.sufficient && <strong>Midpoint ₹{advice.midpoint.toLocaleString('en-IN')}</strong>}<p>{advice.message}</p><small>{advice.count || 0} comparable listing(s) checked</small></div>}
            <p className="advisor-disclaimer">Price advice is a simple estimate from current listings, not a guaranteed market value. You always choose the final price.</p>
          </section>
          <div className="listing-tip"><span>✳</span><div><b>A little honesty goes a long way.</b><p>Describe the condition accurately and use your own photos whenever possible.</p></div></div>
          {error && <div className="error-message">{error}</div>}
          <button className="button full-button" disabled={busy}>{busy ? (editing ? 'Saving…' : 'Publishing…') : (editing ? 'Save changes' : 'Publish listing')} <ArrowRight size={17} /></button>
          <small className="form-terms">By publishing, you confirm your listing is accurate and allowed.</small>
        </aside>
      </form>
    </main>
  );
}
