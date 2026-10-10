import { Link, useNavigate } from 'react-router-dom';
import { MapPin, ArrowUpRight, Tag, Heart } from 'lucide-react';
import { imageUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import ReviewBadge from './ReviewBadge';

export default function ProductCard({ item }) {
  const { user, favIds, toggleFavorite } = useAuth();
  const nav = useNavigate();
  const saved = favIds.includes(item._id);

  async function fav(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return nav('/login');
    try { await toggleFavorite(item._id); } catch { /* ignore */ }
  }

  return (
    <Link className="product-card" to={`/listings/${item._id}`}>
      <div className="product-image">
        {item.images?.length ? <img src={imageUrl(item.images[0])} alt={item.title} /> : <div className="image-placeholder"><Tag size={34} /><span>Ready for a new home</span></div>}
        {item.status === 'sold' && <span className="sold-badge">SOLD</span>}
        {item.status === 'reserved' && <span className="sold-badge reserved-badge">RESERVED</span>}
        <span className="condition-badge">{item.condition}</span>
        <span className="card-arrow"><ArrowUpRight size={18} /></span>
        <button type="button" className={`fav-button ${saved ? 'saved' : ''}`} onClick={fav} aria-label={saved ? 'Remove from favorites' : 'Save to favorites'} aria-pressed={saved}>
          <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="product-info">
        <span className="product-category">{item.category}</span>
        <h3>{item.title}</h3>
        <div className="product-bottom"><strong>₹{Number(item.price).toLocaleString('en-IN')}</strong><span><MapPin size={13} />{item.location}</span></div>
        <ReviewBadge status={item.reviewStatus} className="card-chip" />
      </div>
    </Link>
  );
}
