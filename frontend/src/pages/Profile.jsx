import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, BadgeCheck } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, setUser, logout, favIds } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: user.name, phone: user.phone || '', college: user.college || '', address: user.address || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [msg, setMsg] = useState({ profile: null, password: null });
  const [stats, setStats] = useState({ listings: 0, bought: 0, received: 0 });

  useEffect(() => {
    Promise.all([
      api.get('/listings/mine').catch(() => ({ data: [] })),
      api.get('/orders/mine').catch(() => ({ data: [] })),
      api.get('/orders/selling').catch(() => ({ data: [] }))
    ]).then(([l, b, s]) => setStats({ listings: l.data.length, bought: b.data.length, received: s.data.length }));
  }, []);

  const seller = user.role !== 'buyer';

  async function saveProfile(e) {
    e.preventDefault();
    try { const { data } = await api.put('/account/profile', form); setUser(data.user); setMsg(m => ({ ...m, profile: { ok: true, text: 'Profile saved.' } })); }
    catch (err) { setMsg(m => ({ ...m, profile: { ok: false, text: err.response?.data?.message || 'Could not save.' } })); }
  }

  async function changePassword(e) {
    e.preventDefault();
    try { await api.put('/account/password', pw); setPw({ currentPassword: '', newPassword: '' }); setMsg(m => ({ ...m, password: { ok: true, text: 'Password updated.' } })); }
    catch (err) { setMsg(m => ({ ...m, password: { ok: false, text: err.response?.data?.message || 'Could not update the password.' } })); }
  }

  const note = (m) => m && <div className={m.ok ? 'success-message' : 'error-message'}>{m.text}</div>;

  return (
    <main className="page-container profile-page">
      <div className="page-title-row">
        <div><span className="eyebrow">YOUR ACCOUNT</span><h1>My <em>profile.</em></h1></div>
        <button className="button button-outline" onClick={() => { logout(); nav('/'); }}><LogOut size={16} /> Log out</button>
      </div>
      <div className="profile-grid">
        <section className="form-card profile-summary">
          <div className="profile-id">
            <div className="profile-avatar">{user.name.charAt(0).toUpperCase()}</div>
            <div><b>{user.name}</b><small>{user.email}</small>
              <div className="chip-row"><span className="mini-chip">{user.role}</span><span className="mini-chip good"><BadgeCheck size={12} /> OTP verified sign-in</span></div></div>
          </div>
          <div className="profile-stats">
            <div><b>{seller ? stats.listings : stats.bought}</b><small>{seller ? 'Listings' : 'Orders'}</small></div>
            <div><b>{seller ? stats.received : favIds.length}</b><small>{seller ? 'Orders received' : 'Favorites'}</small></div>
          </div>
          <p className="profile-lines">Member since {new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}<br />Phone: {user.phone || 'Not added'}<br />College / city: {user.college || 'Not added'}<br />Address: {user.address || 'Not added'}</p>
        </section>

        <form className="form-card form-stack" onSubmit={saveProfile}>
          <h2 className="card-title">Edit details</h2>
          <label>Name<input required minLength={2} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
          <label>Email <span className="optional">cannot be changed</span><input value={user.email} disabled /></label>
          <label>Phone <span className="optional">10 digits</span><input pattern="[0-9]{10}" inputMode="numeric" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} /></label>
          <label>College / city<input value={form.college} onChange={e => setForm({ ...form, college: e.target.value })} /></label>
          <label>Delivery / pickup address<textarea className="plain-textarea" rows="3" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></label>
          {note(msg.profile)}
          <button className="button">Save profile</button>
        </form>
      </div>

      <form className="form-card form-stack password-card" onSubmit={changePassword}>
        <h2 className="card-title">Change password</h2>
        <label>Current password<input type="password" required autoComplete="current-password" value={pw.currentPassword} onChange={e => setPw({ ...pw, currentPassword: e.target.value })} /></label>
        <label>New password <span className="optional">min 8 characters</span><input type="password" required minLength={8} autoComplete="new-password" value={pw.newPassword} onChange={e => setPw({ ...pw, newPassword: e.target.value })} /></label>
        {note(msg.password)}
        <button className="button">Update password</button>
      </form>
    </main>
  );
}
