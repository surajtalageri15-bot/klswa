const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET, authenticate } = require('../middleware/auth');

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = db.get('users', u => u.email === email.toLowerCase().trim() && u.is_active);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name,
      taluk: user.taluk, district: user.district, division: user.division },
    JWT_SECRET, { expiresIn: '8h' }
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role,
      employee_id: user.employee_id, taluk: user.taluk, district: user.district,
      division: user.division, phone: user.phone }
  });
});

router.get('/me', authenticate, (req, res) => {
  const user = db.get('users', u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password: _, ...safe } = user;
  res.json(safe);
});

router.put('/change-password', authenticate, (req, res) => {
  const { current_password, new_password } = req.body || {};
  if (!current_password || !new_password) return res.status(400).json({ error: 'Both passwords required' });
  if (new_password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const user = db.get('users', u => u.id === req.user.id);
  if (!bcrypt.compareSync(current_password, user.password))
    return res.status(400).json({ error: 'Current password is incorrect' });

  db.update('users', req.user.id, { password: bcrypt.hashSync(new_password, 10) });
  res.json({ message: 'Password changed successfully' });
});

module.exports = router;
