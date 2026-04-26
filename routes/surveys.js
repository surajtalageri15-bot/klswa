const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Read-only roles (governance view — no approve/reject)
const READ_ONLY_ROLES = ['state_president', 'district_president'];

function scopeSurveys(user) {
  const { role, district, division } = user;
  if (role === 'surveyor')
    return s => s.surveyor_id === user.id;
  if (role === 'taluk')
    return s => s.taluk === user.taluk && s.status !== 'submitted';
  if (role === 'district' || role === 'district_president' || role === 'district_tech')
    return s => s.district === district;
  if (role === 'division' || role === 'division_tech')
    return s => s.division === division;
  // state, state_president, state_tech, union — see all
  return () => true;
}

router.get('/', (req, res) => {
  const { status, priority, search, page = 1, limit = 15 } = req.query;
  let surveys = db.find('surveys', scopeSurveys(req.user));

  if (status) surveys = surveys.filter(s => s.status === status);
  if (priority) surveys = surveys.filter(s => s.priority === priority);
  if (search) {
    const q = search.toLowerCase();
    surveys = surveys.filter(s =>
      s.survey_no.toLowerCase().includes(q) ||
      s.title.toLowerCase().includes(q) ||
      s.location.toLowerCase().includes(q) ||
      s.district?.toLowerCase().includes(q)
    );
  }

  surveys.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  const total = surveys.length;
  const pg = Number(page), lim = Number(limit);
  const paginated = surveys.slice((pg - 1) * lim, pg * lim);

  const enriched = paginated.map(s => {
    const u = db.get('users', u => u.id === s.surveyor_id);
    return { ...s, surveyor_name: u?.name, surveyor_emp_id: u?.employee_id };
  });

  res.json({ surveys: enriched, total, page: pg, pages: Math.ceil(total / lim) });
});

router.get('/stats', (req, res) => {
  const surveys = db.find('surveys', scopeSurveys(req.user));
  const cnt = fn => surveys.filter(fn).length;

  const byStatus = {}, byType = {}, byPriority = {}, byDistrict = {}, byDivision = {};
  surveys.forEach(s => {
    byStatus[s.status] = (byStatus[s.status] || 0) + 1;
    byType[s.survey_type] = (byType[s.survey_type] || 0) + 1;
    byPriority[s.priority] = (byPriority[s.priority] || 0) + 1;
    if (s.district) byDistrict[s.district] = (byDistrict[s.district] || 0) + 1;
    if (s.division) byDivision[s.division] = (byDivision[s.division] || 0) + 1;
  });

  res.json({
    total: surveys.length,
    completed: cnt(s => s.status === 'completed'),
    in_progress: cnt(s => s.status === 'in_progress'),
    pending: cnt(s => ['submitted','taluk_review','district_review','division_review','state_review'].includes(s.status)),
    approved: cnt(s => s.status === 'approved'),
    byStatus: Object.entries(byStatus).map(([status, cnt]) => ({ status, cnt })),
    byType:   Object.entries(byType).map(([survey_type, cnt]) => ({ survey_type, cnt })),
    byPriority: Object.entries(byPriority).map(([priority, cnt]) => ({ priority, cnt })),
    byDistrict: Object.entries(byDistrict).sort((a,b) => b[1]-a[1]).map(([district, cnt]) => ({ district, cnt })),
    byDivision: Object.entries(byDivision).map(([division, cnt]) => ({ division, cnt })),
  });
});

router.get('/:id', (req, res) => {
  const survey = db.get('surveys', s => s.id === Number(req.params.id));
  if (!survey) return res.status(404).json({ error: 'Survey not found' });
  const u = db.get('users', u => u.id === survey.surveyor_id);
  const approvals = db.find('approvals', a => a.survey_id === survey.id)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map(a => {
      const approver = db.get('users', u => u.id === a.approver_id);
      return { ...a, approver_name: approver?.name, approver_role: approver?.role };
    });
  res.json({ ...survey, surveyor_name: u?.name, surveyor_emp_id: u?.employee_id, surveyor_phone: u?.phone, approvals });
});

router.post('/', (req, res) => {
  if (req.user.role !== 'surveyor') return res.status(403).json({ error: 'Only surveyors can submit surveys' });
  const { title, location, taluk, district, division, survey_type, area_hectares, due_date, description, priority } = req.body || {};
  if (!title || !location || !taluk || !district || !division || !survey_type)
    return res.status(400).json({ error: 'Required fields missing' });

  const survey_no = `SRV-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
  const record = db.insert('surveys', {
    survey_no, surveyor_id: req.user.id, title, location, taluk, district, division,
    survey_type, area_hectares: area_hectares ? Number(area_hectares) : null,
    due_date: due_date || null, description: description || null,
    priority: priority || 'normal', status: 'submitted', progress: 0,
    start_date: null, completed_date: null, remarks: null,
  });

  const talukUser = db.get('users', u => u.role === 'taluk' && u.taluk === taluk);
  if (talukUser) db.insert('notifications', { user_id: talukUser.id, title: 'New Survey Submitted', message: `${title} (${survey_no}) submitted for review`, type: 'info', is_read: 0 });

  res.status(201).json({ id: record.id, survey_no, message: 'Survey submitted successfully' });
});

const TRANSITIONS = {
  taluk:    { from: ['submitted','taluk_review'],          approve: 'taluk_approved',    reject: 'taluk_rejected' },
  district: { from: ['taluk_approved','district_review'],  approve: 'district_approved', reject: 'district_rejected' },
  division: { from: ['district_approved','division_review'],approve: 'division_approved', reject: 'division_rejected' },
  state:    { from: ['division_approved','state_review'],  approve: 'approved',          reject: 'rejected' },
};

router.put('/:id/action', (req, res) => {
  const { action, comments } = req.body || {};
  if (!['approve','reject','start','complete'].includes(action))
    return res.status(400).json({ error: 'Invalid action' });

  const survey = db.get('surveys', s => s.id === Number(req.params.id));
  if (!survey) return res.status(404).json({ error: 'Survey not found' });

  const role = req.user.role;

  if (READ_ONLY_ROLES.includes(role))
    return res.status(403).json({ error: 'Your role has read-only access' });

  let newStatus = survey.status;
  let changes = {};

  if (action === 'start' && role === 'surveyor' && survey.status === 'approved') {
    newStatus = 'in_progress'; changes.start_date = new Date().toISOString().split('T')[0];
  } else if (action === 'complete' && role === 'surveyor' && survey.status === 'in_progress') {
    newStatus = 'completed'; changes.completed_date = new Date().toISOString().split('T')[0]; changes.progress = 100;
  } else if (TRANSITIONS[role]) {
    const t = TRANSITIONS[role];
    if (!t.from.includes(survey.status))
      return res.status(400).json({ error: `Cannot ${action} survey with current status: ${survey.status}` });
    newStatus = action === 'approve' ? t.approve : t.reject;
    db.insert('approvals', { survey_id: survey.id, approver_id: req.user.id, level: role, action: action === 'approve' ? 'approved' : 'rejected', comments: comments || null });
  } else {
    return res.status(403).json({ error: 'Not authorized for this action' });
  }

  db.update('surveys', survey.id, { status: newStatus, ...changes });
  db.insert('notifications', {
    user_id: survey.surveyor_id,
    title: `Survey ${newStatus.replace(/_/g,' ')}`,
    message: `${survey.survey_no} — status changed to ${newStatus.replace(/_/g,' ')}`,
    type: action === 'reject' ? 'error' : 'info', is_read: 0,
  });

  res.json({ message: 'Survey updated', new_status: newStatus });
});

router.put('/:id/progress', (req, res) => {
  if (req.user.role !== 'surveyor') return res.status(403).json({ error: 'Only surveyors can update progress' });
  const { progress } = req.body || {};
  if (progress === undefined || progress < 0 || progress > 100) return res.status(400).json({ error: 'Progress must be 0-100' });
  const survey = db.get('surveys', s => s.id === Number(req.params.id) && s.surveyor_id === req.user.id);
  if (!survey) return res.status(404).json({ error: 'Survey not found' });
  db.update('surveys', survey.id, { progress: Number(progress) });
  res.json({ message: 'Progress updated' });
});

module.exports = router;
