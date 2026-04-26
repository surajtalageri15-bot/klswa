const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', (req, res) => {
  const notifications = db.find('notifications', n => n.user_id === req.user.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 50);
  const unread = notifications.filter(n => !n.is_read).length;
  res.json({ notifications, unread });
});

router.put('/read-all', (req, res) => {
  db.find('notifications', n => n.user_id === req.user.id).forEach(n => {
    db.update('notifications', n.id, { is_read: 1 });
  });
  res.json({ message: 'All marked as read' });
});

router.put('/:id/read', (req, res) => {
  db.update('notifications', Number(req.params.id), { is_read: 1 });
  res.json({ message: 'Marked as read' });
});

module.exports = router;
