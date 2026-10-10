import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favIds, setFavIds] = useState([]);
  const [unread, setUnread] = useState(0);
  const [chatUnread, setChatUnread] = useState(0);

  useEffect(() => {
    if (localStorage.getItem('secondkart-token')) {
      api.get('/auth/me')
        .then(r => setUser(r.data.user))
        .catch(() => localStorage.removeItem('secondkart-token'))
        .finally(() => setLoading(false));
    } else setLoading(false);
  }, []);

  const refreshUnread = useCallback(() => {
    api.get('/account/notifications/count').then(r => setUnread(r.data.unread)).catch(() => {});
  }, []);

  const refreshChatUnread = useCallback(() => {
    api.get('/chat/unread-count').then(r => setChatUnread(r.data.unread)).catch(() => {});
  }, []);

  // Poll the unread-chat count while signed in.
  useEffect(() => {
    if (!user) { setChatUnread(0); return; }
    refreshChatUnread();
    const timer = setInterval(() => { if (!document.hidden) refreshChatUnread(); }, 10000);
    return () => clearInterval(timer);
  }, [user?._id, refreshChatUnread]);

  // Load favorites and poll the unread-notification count while signed in.
  useEffect(() => {
    if (!user) { setFavIds([]); setUnread(0); return; }
    api.get('/account/favorites/ids').then(r => setFavIds(r.data.ids)).catch(() => {});
    refreshUnread();
    const timer = setInterval(refreshUnread, 30000);
    return () => clearInterval(timer);
  }, [user?._id, refreshUnread]);

  const finishAuth = (data) => {
    localStorage.setItem('secondkart-token', data.token);
    setUser(data.user);
    return data.user;
  };

  // Login/register return { otpRequired, challengeId, devCode? } when a one-time code is needed, otherwise the signed-in user.
  const login = async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    return data.otpRequired ? data : finishAuth(data);
  };
  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    return data.otpRequired ? data : finishAuth(data);
  };
  const verifyOtp = async (challengeId, code) => {
    const { data } = await api.post('/auth/verify-otp', { challengeId, code });
    return finishAuth(data);
  };
  const resendOtp = async (challengeId) => (await api.post('/auth/resend-otp', { challengeId })).data;

  const logout = () => { localStorage.removeItem('secondkart-token'); setUser(null); };

  const toggleFavorite = async (listingId) => {
    const { data } = await api.put(`/account/favorites/${listingId}`);
    setFavIds(data.ids);
    return data.favorited;
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, verifyOtp, resendOtp, logout, favIds, toggleFavorite, unread, refreshUnread, chatUnread, refreshChatUnread }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
