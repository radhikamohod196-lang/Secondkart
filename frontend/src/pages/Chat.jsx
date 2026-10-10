import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Package, Send } from 'lucide-react';
import api, { imageUrl } from '../api';
import { useAuth } from '../context/AuthContext';

const LIST_POLL_MS = 6000;
const THREAD_POLL_MS = 3000;

// Adds new messages without duplicates and keeps them in send order (Mongo ids sort by creation time).
const mergeMessages = (prev, incoming) => {
  const seen = new Set(prev.map(m => m._id));
  const add = incoming.filter(m => !seen.has(m._id));
  return add.length ? [...prev, ...add].sort((a, b) => (a._id < b._id ? -1 : a._id > b._id ? 1 : 0)) : prev;
};

const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const timeOf = d => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
function dayLabel(d) {
  const date = new Date(d), now = new Date(), yest = new Date();
  yest.setDate(now.getDate() - 1);
  if (sameDay(date, now)) return 'Today';
  if (sameDay(date, yest)) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
const listTime = d => (!d ? '' : sameDay(d, new Date()) ? timeOf(d) : new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));

export default function Chat() {
  const { id } = useParams();
  const { user, refreshChatUnread } = useAuth();
  const [convs, setConvs] = useState([]);
  const [listLoaded, setListLoaded] = useState(false);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [threadReady, setThreadReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const boxRef = useRef(null);
  const stickRef = useRef(true);
  const lastIdRef = useRef(null);

  const loadList = useCallback(() => {
    api.get('/chat/conversations').then(r => setConvs(r.data)).catch(() => {}).finally(() => setListLoaded(true));
  }, []);

  // Inbox list: load now and keep it fresh.
  useEffect(() => {
    loadList();
    const t = setInterval(() => { if (!document.hidden) loadList(); }, LIST_POLL_MS);
    return () => clearInterval(t);
  }, [loadList]);

  // Open conversation: load details + messages, then poll for new ones.
  useEffect(() => {
    setMessages([]); setActive(null); setLoadError(''); setError(''); setText(''); setThreadReady(false);
    lastIdRef.current = null; stickRef.current = true;
    if (!id) return undefined;
    let alive = true;

    api.get(`/chat/conversations/${id}`)
      .then(r => { if (alive) setActive(r.data); })
      .catch(e => { if (alive) setLoadError(e.response?.data?.message || 'Could not open this chat.'); });

    const pull = async (initial) => {
      try {
        const params = lastIdRef.current ? { after: lastIdRef.current } : {};
        const r = await api.get(`/chat/conversations/${id}/messages`, { params });
        if (!alive) return;
        const incoming = r.data.messages;
        if (incoming.length) {
          lastIdRef.current = incoming[incoming.length - 1]._id;
          setMessages(prev => mergeMessages(prev, incoming));
        }
        if (initial || incoming.length) { refreshChatUnread(); loadList(); }
      } catch (e) {
        if (alive && initial) setLoadError(e.response?.data?.message || 'Could not load messages.');
      } finally {
        if (alive && initial) setThreadReady(true);
      }
    };
    pull(true);
    const t = setInterval(() => { if (!document.hidden) pull(false); }, THREAD_POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, [id, refreshChatUnread, loadList]);

  // Keep the newest message in view (unless the reader has scrolled up).
  useEffect(() => {
    const el = boxRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, threadReady]);

  const onScroll = () => {
    const el = boxRef.current;
    if (el) stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  async function send(e) {
    if (e) e.preventDefault();
    const body = text.trim();
    if (!body || sending || !id) return;
    setSending(true); setError('');
    try {
      const r = await api.post(`/chat/conversations/${id}/messages`, { text: body });
      stickRef.current = true;
      setMessages(prev => mergeMessages(prev, [r.data.message]));
      setText('');
      loadList();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send your message.');
    } finally { setSending(false); }
  }

  const onKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
  };

  const meId = String(user?._id);

  return (
    <main className="page-container chat-page">
      <div className="page-title-row">
        <div><span className="eyebrow">BUYERS &amp; SELLERS</span><h1>Your <em>chats.</em></h1><p>Talk directly with buyers and sellers about their items. Keep it respectful and meet in public places.</p></div>
      </div>

      <div className={`chat-shell ${id ? 'has-thread' : ''}`}>
        <aside className="chat-list" aria-label="Conversations">
          {!listLoaded ? <div className="chat-list-empty">Loading chats…</div>
            : convs.length ? convs.map(c => (
              <Link key={c._id} to={`/chat/${c._id}`} className={`chat-item ${c._id === id ? 'active' : ''}`}>
                <span className="chat-avatar">{c.other.name.charAt(0).toUpperCase()}</span>
                <span className="chat-item-body">
                  <span className="chat-item-top"><b>{c.other.name}</b><small>{listTime(c.lastMessageAt)}</small></span>
                  <span className="chat-item-item">{c.listing.title}</span>
                  <span className="chat-item-last">{String(c.lastSenderId) === meId ? 'You: ' : ''}{c.lastMessage}</span>
                </span>
                {c.unread > 0 && c._id !== id && <i className="chat-unread">{c.unread > 9 ? '9+' : c.unread}</i>}
              </Link>
            ))
            : <div className="chat-list-empty">
              <MessageCircle size={22} />
              <b>No chats yet</b>
              <span>Open a listing and tap “Chat with seller”, or reply to a buyer from your dashboard or orders.</span>
              <Link className="button button-small" to="/listings">Explore listings</Link>
            </div>}
        </aside>

        <section className="chat-thread">
          {!id ? (
            <div className="chat-placeholder"><div className="empty-icon"><MessageCircle size={27} /></div><h3>Select a conversation</h3><p>Pick a chat on the left to read and reply.</p></div>
          ) : loadError ? (
            <div className="chat-placeholder"><h3>{loadError}</h3><Link className="button button-small" to="/chat">Back to chats</Link></div>
          ) : !active ? (
            <div className="chat-placeholder">Loading chat…</div>
          ) : (
            <>
              <header className="chat-head">
                <Link className="chat-back" to="/chat" aria-label="Back to chats"><ArrowLeft size={18} /></Link>
                <span className="chat-avatar">{active.other.name.charAt(0).toUpperCase()}</span>
                <div className="chat-head-text"><b>{active.other.name}</b><small>{active.role === 'buyer' ? 'Seller' : 'Buyer'}</small></div>
                {active.listing._id ? (
                  <Link className="chat-listing" to={`/listings/${active.listing._id}`}>
                    <span className="chat-listing-thumb">{active.listing.image ? <img src={imageUrl(active.listing.image)} alt="" /> : <Package size={16} />}</span>
                    <span><b>{active.listing.title}</b>{active.listing.price !== null && <small>₹{Number(active.listing.price).toLocaleString('en-IN')}{active.listing.status === 'sold' ? ' · Sold' : active.listing.status === 'reserved' ? ' · Reserved' : ''}</small>}</span>
                  </Link>
                ) : (
                  <span className="chat-listing"><span className="chat-listing-thumb"><Package size={16} /></span><span><b>{active.listing.title}</b><small>Listing removed</small></span></span>
                )}
              </header>

              <div className="chat-messages" ref={boxRef} onScroll={onScroll}>
                {!threadReady ? <div className="chat-empty-note">Loading messages…</div>
                  : messages.length === 0 ? <div className="chat-empty-note">No messages yet. Say hello 👋</div>
                  : messages.map((m, i) => {
                    const mine = String(m.senderId) === meId;
                    const newDay = i === 0 || !sameDay(messages[i - 1].createdAt, m.createdAt);
                    return (
                      <div key={m._id}>
                        {newDay && <div className="chat-day"><span>{dayLabel(m.createdAt)}</span></div>}
                        <div className={`chat-row ${mine ? 'mine' : 'theirs'}`}>
                          <div className="chat-bubble"><p>{m.text}</p><small>{timeOf(m.createdAt)}</small></div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {error && <div className="error-message chat-error">{error}</div>}
              <form className="chat-compose" onSubmit={send}>
                <textarea value={text} onChange={e => setText(e.target.value)} onKeyDown={onKeyDown} maxLength={1000} rows={1} placeholder="Write a message… (Enter to send, Shift+Enter for a new line)" aria-label="Message" />
                <button className="button" disabled={sending || !text.trim()} aria-label="Send message"><Send size={16} /> Send</button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
