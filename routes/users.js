const router = require('express').Router();
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

const ADMIN_ROLES = ['state','state_president','state_tech','division','division_tech','district','district_president','district_tech','taluk'];

router.get('/', authorize(...ADMIN_ROLES), (req, res) => {
  const { role, district, division } = req.user;
  let users;

  if (role === 'taluk') {
    users = db.find('users', u => u.taluk === req.user.taluk && u.role === 'surveyor');
  } else if (['district','district_president','district_tech'].includes(role)) {
    users = db.find('users', u => u.district === district && ['surveyor','taluk'].includes(u.role));
  } else if (['division','division_tech'].includes(role)) {
    users = db.find('users', u => u.division === division && ['surveyor','taluk','district','district_president','district_tech'].includes(u.role));
  } else {
    // state*, state_president — see everyone
    users = db.all('users').sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));
  }

  res.json(users.map(({ password: _, ...u }) => u));
});

// District presidents list — useful for state_president / state_tech dashboards
router.get('/district-presidents', (req, res) => {
  const allowed = ['state','state_president','state_tech','union'];
  if (!allowed.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });

  const presidents = db.find('users', u => u.role === 'district_president')
    .map(({ password: _, ...u }) => u)
    .sort((a, b) => a.district?.localeCompare(b.district));

  const withStats = presidents.map(p => {
    const surveys = db.find('surveys', s => s.district === p.district);
    return {
      ...p,
      total_surveys: surveys.length,
      completed: surveys.filter(s => s.status === 'completed').length,
      in_progress: surveys.filter(s => s.status === 'in_progress').length,
      pending: surveys.filter(s => ['submitted','taluk_review','district_review','division_review','state_review'].includes(s.status)).length,
    };
  });

  res.json(withStats);
});

router.get('/performance', (req, res) => {
  const surveyors = db.find('users', u => u.role === 'surveyor');
  const result = surveyors.map(u => {
    const surveys = db.find('surveys', s => s.surveyor_id === u.id);
    const completed = surveys.filter(s => s.status === 'completed').length;
    const in_progress = surveys.filter(s => s.status === 'in_progress').length;
    const avg = surveys.length ? Math.round(surveys.reduce((s,v) => s + v.progress, 0) / surveys.length * 10) / 10 : 0;
    return { id: u.id, name: u.name, employee_id: u.employee_id, taluk: u.taluk, district: u.district, division: u.division,
             total_surveys: surveys.length, completed, in_progress, avg_progress: avg };
  }).sort((a, b) => b.completed - a.completed);
  res.json(result);
});

module.exports = router;
