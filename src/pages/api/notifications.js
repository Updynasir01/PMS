import { authenticate } from '../../lib/auth';
import { withErrorHandler } from '../../lib/api';
import {
  listNotifications,
  countUnread,
  markRead,
  ensureDailyAlerts,
} from '../../lib/notifications';

export default withErrorHandler(async function handler(req, res) {
  const user = await authenticate(req);

  if (req.method === 'GET') {
    await ensureDailyAlerts(user);
    const [items, unreadCount] = await Promise.all([
      listNotifications(user.id),
      countUnread(user.id),
    ]);
    return res.json({ notifications: items, unreadCount });
  }

  if (req.method === 'PATCH') {
    const { id, all } = req.body || {};
    await markRead(user.id, { id, all });
    const unreadCount = await countUnread(user.id);
    return res.json({ success: true, unreadCount });
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
