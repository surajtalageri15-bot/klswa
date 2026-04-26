const bcrypt = require('bcryptjs');
const db = require('./db');

const hash = (p) => bcrypt.hashSync(p, 10);

const users = [
  { name: 'Rajesh Kumar', email: 'surveyor@surveytech.in', password: hash('demo123'), role: 'surveyor', employee_id: 'SRV001', taluk: 'Mysuru', district: 'Mysuru', division: 'Mysuru Division', phone: '9876543210' },
  { name: 'Anitha Devi', email: 'surveyor2@surveytech.in', password: hash('demo123'), role: 'surveyor', employee_id: 'SRV002', taluk: 'Mysuru', district: 'Mysuru', division: 'Mysuru Division', phone: '9876543211' },
  { name: 'Suresh Babu', email: 'taluk@surveytech.in', password: hash('demo123'), role: 'taluk', employee_id: 'TAL001', taluk: 'Mysuru', district: 'Mysuru', division: 'Mysuru Division', phone: '9876543220' },
  { name: 'Kavitha Rao', email: 'district@surveytech.in', password: hash('demo123'), role: 'district', employee_id: 'DIS001', district: 'Mysuru', division: 'Mysuru Division', phone: '9876543230' },
  { name: 'Mohan Gowda', email: 'division@surveytech.in', password: hash('demo123'), role: 'division', employee_id: 'DIV001', division: 'Mysuru Division', phone: '9876543240' },
  { name: 'Padmavathi S', email: 'state@surveytech.in', password: hash('demo123'), role: 'state', employee_id: 'STA001', phone: '9876543250' },
  { name: 'Vikram Singh', email: 'union@surveytech.in', password: hash('demo123'), role: 'union', employee_id: 'UNI001', phone: '9876543260' },
  { name: 'demo@surveytech.in', email: 'demo@surveytech.in', password: hash('demo123'), role: 'surveyor', employee_id: 'DEMO01', taluk: 'Hunsur', district: 'Mysuru', division: 'Mysuru Division', phone: '9000000001' },
];

const insertUser = db.prepare(`INSERT OR IGNORE INTO users (name,email,password,role,employee_id,taluk,district,division,phone) VALUES (?,?,?,?,?,?,?,?,?)`);
users.forEach(u => insertUser.run(u.name, u.email, u.password, u.role, u.employee_id, u.taluk||null, u.district||null, u.division||null, u.phone));

// Licenses for surveyors
const insertLicense = db.prepare(`INSERT OR IGNORE INTO licenses (surveyor_id,license_no,category,issue_date,expiry_date,status) VALUES (?,?,?,?,?,?)`);
const srv1 = db.prepare('SELECT id FROM users WHERE email=?').get('surveyor@surveytech.in');
const srv2 = db.prepare('SELECT id FROM users WHERE email=?').get('surveyor2@surveytech.in');
const demo = db.prepare('SELECT id FROM users WHERE email=?').get('demo@surveytech.in');

if (srv1) insertLicense.run(srv1.id, 'KA-SRV-2021-001', 'Class A', '2021-04-01', '2026-03-31', 'active');
if (srv2) insertLicense.run(srv2.id, 'KA-SRV-2022-045', 'Class B', '2022-06-01', '2025-05-31', 'expired');
if (demo) insertLicense.run(demo.id, 'KA-SRV-2023-112', 'Class A', '2023-01-01', '2027-12-31', 'active');

// Surveys
const statuses = ['submitted','taluk_review','taluk_approved','district_review','district_approved','division_review','approved','in_progress','completed','rejected'];
const types = ['Cadastral','Topographical','Boundary Demarcation','Revenue','Forest','Urban Layout'];
const taluks = ['Mysuru','Hunsur','K.R.Nagar','Nanjangud','Periyapatna','T.Narasipur','H.D.Kote'];
const priorities = ['low','normal','high','urgent'];

const insertSurvey = db.prepare(`INSERT OR IGNORE INTO surveys (survey_no,surveyor_id,title,location,taluk,district,division,survey_type,area_hectares,status,priority,progress,due_date,description) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

const sampleSurveys = [
  { no:'SRV-2024-001', sid:srv1?.id, title:'Hebbal Layout Boundary Survey', loc:'Hebbal Village', taluk:'Mysuru', status:'completed', progress:100, type:'Boundary Demarcation', area:12.5, priority:'high', due:'2024-03-15', desc:'Annual boundary demarcation for Hebbal village' },
  { no:'SRV-2024-002', sid:srv1?.id, title:'Chamundi Hills Cadastral Survey', loc:'Chamundi Hills', taluk:'Mysuru', status:'in_progress', progress:65, type:'Cadastral', area:45.0, priority:'urgent', due:'2024-06-30', desc:'Cadastral survey of government land' },
  { no:'SRV-2024-003', sid:demo?.id, title:'Hunsur Revenue Land Survey', loc:'Hunsur Town', taluk:'Hunsur', status:'district_approved', progress:30, type:'Revenue', area:8.2, priority:'normal', due:'2024-07-20', desc:'Revenue land verification survey' },
  { no:'SRV-2024-004', sid:demo?.id, title:'Periyapatna Forest Boundary', loc:'Periyapatna', taluk:'Periyapatna', status:'taluk_review', progress:15, type:'Forest', area:120.0, priority:'high', due:'2024-08-10', desc:'Forest boundary demarcation' },
  { no:'SRV-2024-005', sid:srv2?.id, title:'Nanjangud Urban Layout', loc:'Nanjangud City', taluk:'Nanjangud', status:'submitted', progress:5, type:'Urban Layout', area:22.0, priority:'normal', due:'2024-09-01', desc:'Urban planning layout survey' },
  { no:'SRV-2024-006', sid:srv1?.id, title:'K.R.Nagar Topographical', loc:'K.R.Nagar', taluk:'K.R.Nagar', status:'approved', progress:45, type:'Topographical', area:67.3, priority:'low', due:'2024-10-15', desc:'Topographic mapping for irrigation project' },
  { no:'SRV-2024-007', sid:demo?.id, title:'T.Narasipur Irrigation Survey', loc:'T.Narasipur', taluk:'T.Narasipur', status:'division_review', progress:20, type:'Cadastral', area:33.8, priority:'urgent', due:'2024-07-05', desc:'Irrigation canal boundary survey' },
  { no:'SRV-2024-008', sid:srv2?.id, title:'H.D.Kote Wildlife Corridor', loc:'H.D.Kote', taluk:'H.D.Kote', status:'rejected', progress:0, type:'Forest', area:250.0, priority:'high', due:'2024-06-01', desc:'Wildlife corridor boundary survey' },
  { no:'SRV-2024-009', sid:srv1?.id, title:'Mysuru Ring Road Survey', loc:'Mysuru Outskirts', taluk:'Mysuru', status:'state_review', progress:25, type:'Topographical', area:18.5, priority:'urgent', due:'2024-06-25', desc:'Ring road alignment survey' },
  { no:'SRV-2024-010', sid:demo?.id, title:'Chamrajanagar Boundary', loc:'Chamrajanagar', taluk:'Mysuru', status:'taluk_approved', progress:10, type:'Boundary Demarcation', area:9.1, priority:'normal', due:'2024-08-30', desc:'District boundary verification' },
];

sampleSurveys.forEach(s => {
  if (s.sid) insertSurvey.run(s.no, s.sid, s.title, s.loc, s.taluk, 'Mysuru', 'Mysuru Division', s.type, s.area, s.status, s.priority, s.progress, s.due, s.desc);
});

// Notifications
const insertNotif = db.prepare(`INSERT INTO notifications (user_id,title,message,type) VALUES (?,?,?,?)`);
if (srv1) {
  insertNotif.run(srv1.id, 'Survey Approved', 'SRV-2024-001 has been approved by Division Head', 'success');
  insertNotif.run(srv1.id, 'Due Date Reminder', 'SRV-2024-002 is due in 5 days', 'warning');
  insertNotif.run(srv1.id, 'License Valid', 'Your license KA-SRV-2021-001 is valid till 31 Mar 2026', 'info');
}
if (demo) {
  insertNotif.run(demo.id, 'Survey Under Review', 'SRV-2024-003 is under District review', 'info');
  insertNotif.run(demo.id, 'Action Required', 'SRV-2024-004 needs additional documents', 'warning');
}

console.log('✅ Database seeded successfully!');
console.log('\n📋 Demo Credentials:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Role             | Email                      | Password');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Surveyor         | surveyor@surveytech.in     | demo123');
console.log('Demo User        | demo@surveytech.in         | demo123');
console.log('Taluk            | taluk@surveytech.in        | demo123');
console.log('District         | district@surveytech.in     | demo123');
console.log('Division         | division@surveytech.in     | demo123');
console.log('State Admin      | state@surveytech.in        | demo123');
console.log('Union Rep        | union@surveytech.in        | demo123');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
