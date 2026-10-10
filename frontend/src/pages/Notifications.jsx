import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Notifications() {
  const { refreshUnread } = useAuth();
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get('/account/notifications')
      .then(async r => {
        setItems(r.data.items);
        if (r.data.unread) { await api.put('/account/notifications/read-all').catch(() => {}); refreshUnread(); }
      })
      .catch(() => setItems([]))
      .finally(() => setLoaded(true));
  }, []);

  return (
    <main className="page-container">
      <div className="page-title-row"><div><span className="eyebrow">WHAT'S NEW</span><h1>Notifi<em>cations.</em></h1><p>Orders, reports, photo requests and ratings.</p></div></div>
      {!loaded ? <div className="page-state">Loading…</div>
        : items.length ? <div className="notice-list">{items.map(n => {
          const body = <><span className={`notice-dot ${n.read ? '' : 'new'}`} /><div><p>{n.text}</p><small>{new Date(n.createdAt).toLocaleString()}</small></div></>;
          return n.link ? <Link key={n._id} className="notice-row" to={n.link}>{body}</Link> : <div key={n._id} className="notice-row">{body}</div>;
        })}</div>
        : <div className="empty-state"><div className="empty-icon"><Bell size={27} /></div><h3>You're all caught up.</h3><p>Notifications about your orders and listings will appear here.</p></div>}
    </main>
  );
}
