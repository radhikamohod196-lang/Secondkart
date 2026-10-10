import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ShoppingBag, PlusCircle, UserRound, LogOut, LayoutDashboard, Heart, Bell, ClipboardList, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, unread, favIds, chatUnread } = useAuth();
  const nav = useNavigate();
  return (
    <header className="navbar">
      <Link className="brand" to="/">
        <span className="brand-mark"><ShoppingBag size={22} /></span>
        <span>Second<span>Kart</span><small>GOOD THINGS, AGAIN.</small></span>
      </Link>
      <nav>
        <NavLink to="/listings">Explore</NavLink>
        {user && <NavLink to="/dashboard"><LayoutDashboard size={16} /> Dashboard</NavLink>}
        {user?.role === 'seller' && <NavLink to="/sell"><PlusCircle size={16} /> Sell an item</NavLink>}
      </nav>
      <div className="nav-actions">
        {user ? (
          <>
            <NavLink className="icon-button nav-icon" to="/favorites" aria-label="Favorites" title="Favorites">
              <Heart size={17} />{favIds.length > 0 && <i className="nav-badge nav-badge-soft">{favIds.length}</i>}
            </NavLink>
            <NavLink className="icon-button nav-icon" to="/chat" aria-label={`Chats (${chatUnread} unread)`} title="Chats">
              <MessageCircle size={17} />{chatUnread > 0 && <i className="nav-badge">{chatUnread > 9 ? '9+' : chatUnread}</i>}
            </NavLink>
            <NavLink className="icon-button nav-icon" to="/orders" aria-label="Orders" title="Orders"><ClipboardList size={17} /></NavLink>
            <NavLink className="icon-button nav-icon" to="/notifications" aria-label={`Notifications (${unread} unread)`} title="Notifications">
              <Bell size={17} />{unread > 0 && <i className="nav-badge">{unread > 9 ? '9+' : unread}</i>}
            </NavLink>
            <NavLink className="welcome welcome-link" to="/profile" title="Your profile">Hi, {user.name.split(' ')[0]}</NavLink>
            <NavLink className="icon-button nav-icon" to="/profile" aria-label="Profile" title="Profile"><UserRound size={17} /></NavLink>
            <button className="icon-button" aria-label="Log out" onClick={() => { logout(); nav('/'); }}><LogOut size={17} /></button>
          </>
        ) : (
          <>
            <Link className="login-link" to="/login">Log in</Link>
            <Link className="button button-small" to="/register">Get started <UserRound size={16} /></Link>
          </>
        )}
      </div>
    </header>
  );
}
