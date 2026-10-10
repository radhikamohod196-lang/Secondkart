import Notification from '../models/Notification.js';

// Fire-and-forget: a failed notification must never break the main action.
export function notify(userId, text, link = '') {
  return Notification.create({ userId, text, link }).catch(err => console.error('Notification failed:', err.message));
}
