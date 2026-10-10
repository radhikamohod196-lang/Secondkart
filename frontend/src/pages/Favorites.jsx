import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';

export default function Favorites() {
  const { favIds } = useAuth();
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get('/account/favorites').then(r => setItems(r.data)).catch(() => setItems([])).finally(() => setLoaded(true));
  }, []);

  // Unsaving a card removes it from this page straight away.
  const shown = items.filter(i => favIds.includes(i._id));

  return (
    <main className="page-container">
      <div className="page-title-row"><div><span className="eyebrow">SAVED FOR LATER</span><h1>Your <em>favorites.</em></h1><p>Finds you have your eye on.</p></div></div>
      {!loaded ? <div className="page-state">Loading favorites…</div>
        : shown.length ? <div className="product-grid">{shown.map(i => <ProductCard key={i._id} item={i} />)}</div>
        : <div className="empty-state"><div className="empty-icon"><Heart size={27} /></div><h3>No favorites yet.</h3><p>Tap the heart on any product to save it here.</p><Link className="button" to="/listings">Explore listings</Link></div>}
    </main>
  );
}
