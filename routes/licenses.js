const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', (req, res) => {
  const { role, district, division } = req.user;
  let licenses;

  if (role === 'surveyor') {
    licenses = db.find('licenses', l => l.surveyor_id === req.user.id);
  } else if (role === 'taluk') {
    const ids = db.find('users', u => u.taluk === req.user.taluk).map(u => u.id);
    licenses = db.find('licenses', l => ids.includes(l.surveyor_id));
  } else if (['district','district_president','district_tech'].includes(role)) {
    const ids = db.find('users', u => u.district === district).map(u => u.id);
    licenses = db.find('licenses', l => ids.includes(l.surveyor_id));
  } else if (['division','division_tech'].includes(role)) {
    const ids = db.find('users', u => u.division === division).map(u => u.id);
    licenses = db.find('licenses', l => ids.includes(l.surveyor_id));
  } else {
    licenses = db.all('licenses');
  }

  const enriched = licenses.map(l => {
    const u = db.get('users', u => u.id === l.surveyor_id);
    return { ...l, surveyor_name: u?.name, taluk: u?.taluk, district: u?.district, division: u?.division };
  });

  res.json(enriched);
});

router.get('/stats', (req, res) => {
  const licenses = db.all('licenses');
  const in90 = new Date(); in90.setDate(in90.getDate() + 90);
  res.json({
    active:          licenses.filter(l => l.status === 'active').length,
    expired:         licenses.filter(l => l.status === 'expired').length,
    renewal_pending: licenses.filter(l => l.status === 'renewal_pending').length,
    expiring_soon:   licenses.filter(l => l.status === 'active' && new Date(l.expiry_date) <= in90).length,
  });
});

router.post('/renew', (req, res) => {
  if (req.user.role !== 'surveyor') return res.status(403).json({ error: 'Only surveyors can request renewal' });
  const license = db.find('licenses', l => l.surveyor_id === req.user.id).sort((a,b) => b.id - a.id)[0];
  if (!license) return res.status(404).json({ error: 'No license found' });
  const existing = db.get('license_renewals', r => r.license_id === license.id && r.status === 'pending');
  if (existing) return res.status(400).json({ error: 'Renewal request already pending' });
  db.insert('license_renewals', { license_id: license.id, surveyor_id: req.user.id, requested_date: new Date().toISOString().split('T')[0], status: 'pending' });
  db.update('licenses', license.id, { status: 'renewal_pending' });
  db.insert('notifications', { user_id: req.user.id, title: 'Renewal Requested', message: `License ${license.license_no} renewal submitted`, type: 'info', is_read: 0 });
  res.json({ message: 'Renewal request submitted' });
});

module.exports = router;
