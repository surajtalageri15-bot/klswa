const bcrypt = require('bcryptjs');
const fs   = require('fs');
const path = require('path');

// Pre-computed bcrypt hash for 'demo123' (cost 10) — avoids hashing 4000+ times at startup
const DEMO_HASH = '$2a$10$BK3clYH6hOsLQj21C/m6E.4na5/Ad053Qs9Hryj0wn9j2OyXljysK';

let nextId = { users: 6000, surveys: 20, licenses: 20, approvals: 100, notifications: 200, license_renewals: 10 };
const newId = (t) => ++nextId[t];

// ─── KARNATAKA GEOGRAPHY ────────────────────────────────────────────────────
const DIVISIONS = {
  'Bengaluru Division': ['Bengaluru Urban','Bengaluru Rural','Chikkaballapur','Kolar','Ramanagara','Tumakuru','Chitradurga'],
  'Mysuru Division':    ['Mysuru','Mandya','Hassan','Chamarajanagar','Kodagu','Chikkamagaluru'],
  'Belagavi Division':  ['Belagavi','Vijayapura','Bagalkot','Gadag','Dharwad','Haveri','Uttara Kannada'],
  'Kalaburagi Division':['Kalaburagi','Bidar','Yadgir','Raichur','Koppal','Ballari','Davanagere','Shivamogga','Dakshina Kannada','Udupi','Vijayanagara'],
};
const ALL_DISTRICTS = Object.values(DIVISIONS).flat(); // 31 districts

function divisionOf(district) {
  for (const [div, dists] of Object.entries(DIVISIONS)) {
    if (dists.includes(district)) return div;
  }
  return null;
}

module.exports.DIVISIONS = DIVISIONS;
module.exports.ALL_DISTRICTS = ALL_DISTRICTS;
module.exports.divisionOf = divisionOf;

// ─── USER SEED ──────────────────────────────────────────────────────────────
function iso(daysOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString();
}

const users = [
  // ── Existing technical roles ──
  { id:1,  name:'Rajesh Kumar',       email:'surveyor@surveytech.in',    password:DEMO_HASH, role:'surveyor',          employee_id:'SRV001', taluk:'Mysuru',     district:'Mysuru',         division:'Mysuru Division',    phone:'9876543210', is_active:1 },
  { id:2,  name:'Anitha Devi',        email:'surveyor2@surveytech.in',   password:DEMO_HASH, role:'surveyor',          employee_id:'SRV002', taluk:'Nanjangud',  district:'Mysuru',         division:'Mysuru Division',    phone:'9876543211', is_active:1 },
  { id:3,  name:'Suresh Babu',        email:'taluk@surveytech.in',       password:DEMO_HASH, role:'taluk',             employee_id:'TAL001', taluk:'Mysuru',     district:'Mysuru',         division:'Mysuru Division',    phone:'9876543220', is_active:1 },
  { id:4,  name:'Kavitha Rao',        email:'district@surveytech.in',    password:DEMO_HASH, role:'district',          employee_id:'DIS001', taluk:null,         district:'Mysuru',         division:'Mysuru Division',    phone:'9876543230', is_active:1 },
  { id:5,  name:'Mohan Gowda',        email:'division@surveytech.in',    password:DEMO_HASH, role:'division',          employee_id:'DIV001', taluk:null,         district:null,             division:'Mysuru Division',    phone:'9876543240', is_active:1 },
  { id:6,  name:'Padmavathi S',       email:'state@surveytech.in',       password:DEMO_HASH, role:'state',             employee_id:'STA001', taluk:null,         district:null,             division:null,                 phone:'9876543250', is_active:1 },
  { id:7,  name:'Vikram Singh',       email:'union@surveytech.in',       password:DEMO_HASH, role:'union',             employee_id:'UNI001', taluk:null,         district:null,             division:null,                 phone:'9876543260', is_active:1 },
  { id:8,  name:'Demo User',          email:'demo@surveytech.in',        password:DEMO_HASH, role:'surveyor',          employee_id:'DEMO01', taluk:'Hunsur',     district:'Mysuru',         division:'Mysuru Division',    phone:'9000000001', is_active:1 },

  // ── ರಾಜ ಸಂಘ: State President ──
  { id:10, name:'B.S. Yathiraj',      email:'stpres@klswa.in',           password:DEMO_HASH, role:'state_president',   employee_id:'KLSWA-SP', taluk:null,       district:null,             division:null,                 phone:'9900000010', is_active:1 },

  // ── ರಾಜ ಸಂಘ: State Technical Team Head ──
  { id:11, name:'Dr. Ravi Shankar',   email:'sttech@klswa.in',           password:DEMO_HASH, role:'state_tech',        employee_id:'KLSWA-ST', taluk:null,       district:null,             division:null,                 phone:'9900000011', is_active:1 },

  // ── ರಾಜ ಸಂಘ: Division Technical Heads (4) ──
  { id:12, name:'Nagaraj H.K.',       email:'divtech.blr@klswa.in',      password:DEMO_HASH, role:'division_tech',     employee_id:'DIV-T-BLR', taluk:null,      district:null,             division:'Bengaluru Division', phone:'9900000012', is_active:1 },
  { id:13, name:'Shashikala B.R.',    email:'divtech.mys@klswa.in',      password:DEMO_HASH, role:'division_tech',     employee_id:'DIV-T-MYS', taluk:null,      district:null,             division:'Mysuru Division',    phone:'9900000013', is_active:1 },
  { id:14, name:'Basavaraj Patil',    email:'divtech.blg@klswa.in',      password:DEMO_HASH, role:'division_tech',     employee_id:'DIV-T-BLG', taluk:null,      district:null,             division:'Belagavi Division',  phone:'9900000014', is_active:1 },
  { id:15, name:'Mallikarjun Swamy',  email:'divtech.klg@klswa.in',      password:DEMO_HASH, role:'division_tech',     employee_id:'DIV-T-KLG', taluk:null,      district:null,             division:'Kalaburagi Division',phone:'9900000015', is_active:1 },

  // ── ರಾಜ ಸಂಘ: District Presidents (all 31 districts) ──
  { id:20, name:'H.R. Sathyanarayan', email:'pres.blrurban@klswa.in',    password:DEMO_HASH, role:'district_president',employee_id:'DP-BLRU',  taluk:null,       district:'Bengaluru Urban', division:'Bengaluru Division', phone:'9800000020', is_active:1 },
  { id:21, name:'K. Venkatesh',       email:'pres.blrrural@klswa.in',    password:DEMO_HASH, role:'district_president',employee_id:'DP-BLRR',  taluk:null,       district:'Bengaluru Rural', division:'Bengaluru Division', phone:'9800000021', is_active:1 },
  { id:22, name:'C.R. Manjunath',     email:'pres.chikkabal@klswa.in',   password:DEMO_HASH, role:'district_president',employee_id:'DP-CHKB',  taluk:null,       district:'Chikkaballapur',  division:'Bengaluru Division', phone:'9800000022', is_active:1 },
  { id:23, name:'S.K. Ramaiah',       email:'pres.kolar@klswa.in',       password:DEMO_HASH, role:'district_president',employee_id:'DP-KLR',   taluk:null,       district:'Kolar',           division:'Bengaluru Division', phone:'9800000023', is_active:1 },
  { id:24, name:'G.T. Prasad',        email:'pres.ramanagara@klswa.in',  password:DEMO_HASH, role:'district_president',employee_id:'DP-RMN',   taluk:null,       district:'Ramanagara',      division:'Bengaluru Division', phone:'9800000024', is_active:1 },
  { id:25, name:'B.N. Krishnamurthy', email:'pres.tumakuru@klswa.in',    password:DEMO_HASH, role:'district_president',employee_id:'DP-TMK',   taluk:null,       district:'Tumakuru',        division:'Bengaluru Division', phone:'9800000025', is_active:1 },
  { id:26, name:'V.H. Shivarudraiah', email:'pres.chitradurga@klswa.in', password:DEMO_HASH, role:'district_president',employee_id:'DP-CTG',   taluk:null,       district:'Chitradurga',     division:'Bengaluru Division', phone:'9800000026', is_active:1 },

  { id:30, name:'M.N. Devaraj',       email:'pres.mysuru@klswa.in',      password:DEMO_HASH, role:'district_president',employee_id:'DP-MYS',   taluk:null,       district:'Mysuru',          division:'Mysuru Division',    phone:'9800000030', is_active:1 },
  { id:31, name:'R.S. Channaiah',     email:'pres.mandya@klswa.in',      password:DEMO_HASH, role:'district_president',employee_id:'DP-MND',   taluk:null,       district:'Mandya',          division:'Mysuru Division',    phone:'9800000031', is_active:1 },
  { id:32, name:'K.H. Gangadhara',    email:'pres.hassan@klswa.in',      password:DEMO_HASH, role:'district_president',employee_id:'DP-HSN',   taluk:null,       district:'Hassan',          division:'Mysuru Division',    phone:'9800000032', is_active:1 },
  { id:33, name:'P.K. Siddaiah',      email:'pres.chamaraj@klswa.in',    password:DEMO_HASH, role:'district_president',employee_id:'DP-CMJ',   taluk:null,       district:'Chamarajanagar',  division:'Mysuru Division',    phone:'9800000033', is_active:1 },
  { id:34, name:'A.C. Thimmaiah',     email:'pres.kodagu@klswa.in',      password:DEMO_HASH, role:'district_president',employee_id:'DP-KDG',   taluk:null,       district:'Kodagu',          division:'Mysuru Division',    phone:'9800000034', is_active:1 },
  { id:35, name:'N.R. Veerendra',     email:'pres.chikkmag@klswa.in',    password:DEMO_HASH, role:'district_president',employee_id:'DP-CMG',   taluk:null,       district:'Chikkamagaluru',  division:'Mysuru Division',    phone:'9800000035', is_active:1 },

  { id:40, name:'S.B. Kenchappa',     email:'pres.belagavi@klswa.in',    password:DEMO_HASH, role:'district_president',employee_id:'DP-BLG',   taluk:null,       district:'Belagavi',        division:'Belagavi Division',  phone:'9800000040', is_active:1 },
  { id:41, name:'I.M. Inamdar',       email:'pres.vijayapura@klswa.in',  password:DEMO_HASH, role:'district_president',employee_id:'DP-VJP',   taluk:null,       district:'Vijayapura',      division:'Belagavi Division',  phone:'9800000041', is_active:1 },
  { id:42, name:'R.V. Patil',         email:'pres.bagalkot@klswa.in',    password:DEMO_HASH, role:'district_president',employee_id:'DP-BGK',   taluk:null,       district:'Bagalkot',        division:'Belagavi Division',  phone:'9800000042', is_active:1 },
  { id:43, name:'C.G. Kulkarni',      email:'pres.gadag@klswa.in',       password:DEMO_HASH, role:'district_president',employee_id:'DP-GDG',   taluk:null,       district:'Gadag',           division:'Belagavi Division',  phone:'9800000043', is_active:1 },
  { id:44, name:'H.P. Desai',         email:'pres.dharwad@klswa.in',     password:DEMO_HASH, role:'district_president',employee_id:'DP-DHR',   taluk:null,       district:'Dharwad',         division:'Belagavi Division',  phone:'9800000044', is_active:1 },
  { id:45, name:'T.N. Hiremath',      email:'pres.haveri@klswa.in',      password:DEMO_HASH, role:'district_president',employee_id:'DP-HVR',   taluk:null,       district:'Haveri',          division:'Belagavi Division',  phone:'9800000045', is_active:1 },
  { id:46, name:'B.K. Nayak',         email:'pres.uttarkannada@klswa.in',password:DEMO_HASH, role:'district_president',employee_id:'DP-UTK',   taluk:null,       district:'Uttara Kannada',  division:'Belagavi Division',  phone:'9800000046', is_active:1 },

  { id:50, name:'M.B. Kalashetty',    email:'pres.kalaburagi@klswa.in',  password:DEMO_HASH, role:'district_president',employee_id:'DP-KLB',   taluk:null,       district:'Kalaburagi',      division:'Kalaburagi Division',phone:'9800000050', is_active:1 },
  { id:51, name:'S.S. Bidar',         email:'pres.bidar@klswa.in',       password:DEMO_HASH, role:'district_president',employee_id:'DP-BDR',   taluk:null,       district:'Bidar',           division:'Kalaburagi Division',phone:'9800000051', is_active:1 },
  { id:52, name:'V.R. Yadagiri',      email:'pres.yadgir@klswa.in',      password:DEMO_HASH, role:'district_president',employee_id:'DP-YDG',   taluk:null,       district:'Yadgir',          division:'Kalaburagi Division',phone:'9800000052', is_active:1 },
  { id:53, name:'K.R. Raichur',       email:'pres.raichur@klswa.in',     password:DEMO_HASH, role:'district_president',employee_id:'DP-RCH',   taluk:null,       district:'Raichur',         division:'Kalaburagi Division',phone:'9800000053', is_active:1 },
  { id:54, name:'H.G. Koppal',        email:'pres.koppal@klswa.in',      password:DEMO_HASH, role:'district_president',employee_id:'DP-KPL',   taluk:null,       district:'Koppal',          division:'Kalaburagi Division',phone:'9800000054', is_active:1 },
  { id:55, name:'T.V. Ballari',       email:'pres.ballari@klswa.in',     password:DEMO_HASH, role:'district_president',employee_id:'DP-BLR',   taluk:null,       district:'Ballari',         division:'Kalaburagi Division',phone:'9800000055', is_active:1 },
  { id:56, name:'D.R. Davanagere',    email:'pres.davanagere@klswa.in',  password:DEMO_HASH, role:'district_president',employee_id:'DP-DVG',   taluk:null,       district:'Davanagere',      division:'Kalaburagi Division',phone:'9800000056', is_active:1 },
  { id:57, name:'S.K. Shivamogga',    email:'pres.shivamogga@klswa.in',  password:DEMO_HASH, role:'district_president',employee_id:'DP-SMG',   taluk:null,       district:'Shivamogga',      division:'Kalaburagi Division',phone:'9800000057', is_active:1 },
  { id:58, name:'U.N. Dakshinakannada',email:'pres.dakshinakannada@klswa.in',password:DEMO_HASH,role:'district_president',employee_id:'DP-DKN',taluk:null,       district:'Dakshina Kannada',division:'Kalaburagi Division',phone:'9800000058', is_active:1 },
  { id:59, name:'P.R. Udupi',         email:'pres.udupi@klswa.in',       password:DEMO_HASH, role:'district_president',employee_id:'DP-UDP',   taluk:null,       district:'Udupi',           division:'Kalaburagi Division',phone:'9800000059', is_active:1 },
  { id:60, name:'A.V. Vijayanagara',  email:'pres.vijayanagara@klswa.in',password:DEMO_HASH, role:'district_president',employee_id:'DP-VJN',   taluk:null,       district:'Vijayanagara',    division:'Kalaburagi Division',phone:'9800000060', is_active:1 },

  // ── ರಾಜ ಸಂಘ: District Technical Teams (demo: 6 districts) ──
  { id:70, name:'Tech Bengaluru Urban',email:'tech.blrurban@klswa.in',   password:DEMO_HASH, role:'district_tech',     employee_id:'DT-BLRU',  taluk:null,       district:'Bengaluru Urban', division:'Bengaluru Division', phone:'9700000070', is_active:1 },
  { id:71, name:'Tech Mysuru',         email:'tech.mysuru@klswa.in',      password:DEMO_HASH, role:'district_tech',     employee_id:'DT-MYS',   taluk:null,       district:'Mysuru',          division:'Mysuru Division',    phone:'9700000071', is_active:1 },
  { id:72, name:'Tech Belagavi',       email:'tech.belagavi@klswa.in',    password:DEMO_HASH, role:'district_tech',     employee_id:'DT-BLG',   taluk:null,       district:'Belagavi',        division:'Belagavi Division',  phone:'9700000072', is_active:1 },
  { id:73, name:'Tech Kalaburagi',     email:'tech.kalaburagi@klswa.in',  password:DEMO_HASH, role:'district_tech',     employee_id:'DT-KLB',   taluk:null,       district:'Kalaburagi',      division:'Kalaburagi Division',phone:'9700000073', is_active:1 },
  { id:74, name:'Tech Ballari',        email:'tech.ballari@klswa.in',     password:DEMO_HASH, role:'district_tech',     employee_id:'DT-BLR',   taluk:null,       district:'Ballari',         division:'Kalaburagi Division',phone:'9700000074', is_active:1 },
  { id:75, name:'Tech Dharwad',        email:'tech.dharwad@klswa.in',     password:DEMO_HASH, role:'district_tech',     employee_id:'DT-DHR',   taluk:null,       district:'Dharwad',         division:'Belagavi Division',  phone:'9700000075', is_active:1 },
];

const licenses = [
  { id:1, surveyor_id:1, license_no:'KA-SRV-2021-001', category:'Class A', issue_date:'2021-04-01', expiry_date:'2026-03-31', status:'active',  created_at:iso() },
  { id:2, surveyor_id:2, license_no:'KA-SRV-2022-045', category:'Class B', issue_date:'2022-06-01', expiry_date:'2025-05-31', status:'expired', created_at:iso() },
  { id:3, surveyor_id:8, license_no:'KA-SRV-2023-112', category:'Class A', issue_date:'2023-01-01', expiry_date:'2027-12-31', status:'active',  created_at:iso() },
];

const surveys = [
  { id:1,  survey_no:'SRV-2024-001', surveyor_id:1, title:'Hebbal Layout Boundary Survey',   location:'Hebbal Village',  taluk:'Mysuru',       district:'Mysuru',         division:'Mysuru Division',    survey_type:'Boundary Demarcation', area_hectares:12.5, status:'completed',        priority:'high',   progress:100, due_date:'2024-03-15', start_date:'2024-01-10', completed_date:'2024-03-10', description:'Annual boundary demarcation for Hebbal village', remarks:null, created_at:iso(-200), updated_at:iso(-10) },
  { id:2,  survey_no:'SRV-2024-002', surveyor_id:1, title:'Chamundi Hills Cadastral Survey', location:'Chamundi Hills',  taluk:'Mysuru',       district:'Mysuru',         division:'Mysuru Division',    survey_type:'Cadastral',            area_hectares:45.0, status:'in_progress',      priority:'urgent', progress:65,  due_date:'2026-06-30', start_date:'2026-03-01', completed_date:null,         description:'Cadastral survey of government land',            remarks:null, created_at:iso(-90),  updated_at:iso(-2) },
  { id:3,  survey_no:'SRV-2024-003', surveyor_id:8, title:'Hunsur Revenue Land Survey',      location:'Hunsur Town',     taluk:'Hunsur',       district:'Mysuru',         division:'Mysuru Division',    survey_type:'Revenue',              area_hectares:8.2,  status:'district_approved',priority:'normal', progress:30,  due_date:'2026-07-20', start_date:null,         completed_date:null,         description:'Revenue land verification survey',               remarks:null, created_at:iso(-60),  updated_at:iso(-5) },
  { id:4,  survey_no:'SRV-2024-004', surveyor_id:8, title:'Periyapatna Forest Boundary',     location:'Periyapatna',     taluk:'Periyapatna',  district:'Mysuru',         division:'Mysuru Division',    survey_type:'Forest',               area_hectares:120.0,status:'taluk_review',     priority:'high',   progress:15,  due_date:'2026-08-10', start_date:null,         completed_date:null,         description:'Forest boundary demarcation',                    remarks:null, created_at:iso(-30),  updated_at:iso(-1) },
  { id:5,  survey_no:'SRV-2024-005', surveyor_id:2, title:'Nanjangud Urban Layout',          location:'Nanjangud City',  taluk:'Nanjangud',    district:'Mysuru',         division:'Mysuru Division',    survey_type:'Urban Layout',         area_hectares:22.0, status:'submitted',        priority:'normal', progress:5,   due_date:'2026-09-01', start_date:null,         completed_date:null,         description:'Urban planning layout survey',                   remarks:null, created_at:iso(-10),  updated_at:iso(-1) },
  { id:6,  survey_no:'SRV-2024-006', surveyor_id:1, title:'K.R.Nagar Topographical',         location:'K.R.Nagar',       taluk:'K.R.Nagar',    district:'Mysuru',         division:'Mysuru Division',    survey_type:'Topographical',        area_hectares:67.3, status:'approved',         priority:'low',    progress:45,  due_date:'2026-10-15', start_date:null,         completed_date:null,         description:'Topographic mapping for irrigation project',     remarks:null, created_at:iso(-20),  updated_at:iso(-3) },
  { id:7,  survey_no:'SRV-2024-007', surveyor_id:8, title:'T.Narasipur Irrigation Survey',   location:'T.Narasipur',     taluk:'T.Narasipur',  district:'Mysuru',         division:'Mysuru Division',    survey_type:'Cadastral',            area_hectares:33.8, status:'division_review',  priority:'urgent', progress:20,  due_date:'2026-07-05', start_date:null,         completed_date:null,         description:'Irrigation canal boundary survey',               remarks:null, created_at:iso(-25),  updated_at:iso(-2) },
  { id:8,  survey_no:'SRV-2024-008', surveyor_id:2, title:'H.D.Kote Wildlife Corridor',      location:'H.D.Kote',        taluk:'H.D.Kote',     district:'Mysuru',         division:'Mysuru Division',    survey_type:'Forest',               area_hectares:250.0,status:'rejected',         priority:'high',   progress:0,   due_date:'2024-06-01', start_date:null,         completed_date:null,         description:'Wildlife corridor boundary survey',              remarks:'Documents incomplete', created_at:iso(-100), updated_at:iso(-60) },
  { id:9,  survey_no:'SRV-2024-009', surveyor_id:1, title:'Mysuru Ring Road Survey',         location:'Mysuru Outskirts',taluk:'Mysuru',       district:'Mysuru',         division:'Mysuru Division',    survey_type:'Topographical',        area_hectares:18.5, status:'state_review',     priority:'urgent', progress:25,  due_date:'2026-06-25', start_date:null,         completed_date:null,         description:'Ring road alignment survey',                     remarks:null, created_at:iso(-15),  updated_at:iso(-1) },
  { id:10, survey_no:'SRV-2024-010', surveyor_id:8, title:'Chamrajanagar Boundary',           location:'Chamrajanagar',   taluk:'Mysuru',       district:'Mysuru',         division:'Mysuru Division',    survey_type:'Boundary Demarcation', area_hectares:9.1,  status:'taluk_approved',   priority:'normal', progress:10,  due_date:'2026-08-30', start_date:null,         completed_date:null,         description:'District boundary verification',                 remarks:null, created_at:iso(-8),   updated_at:iso(-2) },
  // Extra surveys for other divisions
  { id:11, survey_no:'SRV-2024-011', surveyor_id:1, title:'Bengaluru Outer Ring Survey',     location:'Bengaluru',       taluk:'Bengaluru',    district:'Bengaluru Urban',division:'Bengaluru Division', survey_type:'Topographical',        area_hectares:55.0, status:'approved',         priority:'urgent', progress:40,  due_date:'2026-07-30', start_date:null,         completed_date:null,         description:'Outer ring road boundary',                       remarks:null, created_at:iso(-12),  updated_at:iso(-3) },
  { id:12, survey_no:'SRV-2024-012', surveyor_id:2, title:'Belagavi Border Survey',          location:'Belagavi North',  taluk:'Belagavi',     district:'Belagavi',       division:'Belagavi Division',  survey_type:'Boundary Demarcation', area_hectares:88.0, status:'in_progress',      priority:'high',   progress:55,  due_date:'2026-08-15', start_date:'2026-02-01', completed_date:null,         description:'State border boundary survey',                   remarks:null, created_at:iso(-40),  updated_at:iso(-5) },
  { id:13, survey_no:'SRV-2024-013', surveyor_id:1, title:'Kalaburagi Revenue Survey',       location:'Kalaburagi',      taluk:'Kalaburagi',   district:'Kalaburagi',     division:'Kalaburagi Division',survey_type:'Revenue',              area_hectares:15.2, status:'completed',        priority:'normal', progress:100, due_date:'2026-03-31', start_date:'2026-01-15', completed_date:'2026-03-28', description:'Revenue demarcation Kalaburagi',                 remarks:null, created_at:iso(-80),  updated_at:iso(-5) },
  { id:14, survey_no:'SRV-2024-014', surveyor_id:2, title:'Ballari Mining Region Survey',    location:'Ballari',         taluk:'Ballari',      district:'Ballari',        division:'Kalaburagi Division',survey_type:'Cadastral',            area_hectares:200.0,status:'district_approved',priority:'urgent', progress:20,  due_date:'2026-09-30', start_date:null,         completed_date:null,         description:'Mining region cadastral survey',                 remarks:null, created_at:iso(-18),  updated_at:iso(-4) },
];

const approvals = [
  { id:1, survey_id:3, approver_id:3, level:'taluk',    action:'approved', comments:'Documents verified. Forwarding to district.', created_at:iso(-40) },
  { id:2, survey_id:3, approver_id:4, level:'district', action:'approved', comments:'District check passed.',                      created_at:iso(-20) },
  { id:3, survey_id:7, approver_id:3, level:'taluk',    action:'approved', comments:'OK',                                          created_at:iso(-18) },
  { id:4, survey_id:7, approver_id:4, level:'district', action:'approved', comments:'Approved',                                    created_at:iso(-10) },
  { id:5, survey_id:8, approver_id:3, level:'taluk',    action:'rejected', comments:'Incomplete boundary documents.',               created_at:iso(-90) },
  { id:6, survey_id:9, approver_id:3, level:'taluk',    action:'approved', comments:'All docs present',                            created_at:iso(-12) },
  { id:7, survey_id:9, approver_id:4, level:'district', action:'approved', comments:'Approved by district',                        created_at:iso(-9) },
  { id:8, survey_id:9, approver_id:5, level:'division', action:'approved', comments:'Division clearance granted',                  created_at:iso(-5) },
];

const notifications = [
  { id:1,  user_id:1,  title:'Survey Approved',         message:'SRV-2024-001 approved by Division Head',                  type:'success', is_read:0, created_at:iso(-2) },
  { id:2,  user_id:1,  title:'Due Date Reminder',       message:'SRV-2024-002 is due in 5 days',                           type:'warning', is_read:0, created_at:iso(-1) },
  { id:3,  user_id:8,  title:'Survey Under Review',     message:'SRV-2024-003 is under District review',                   type:'info',    is_read:0, created_at:iso(-5) },
  { id:4,  user_id:8,  title:'Action Required',         message:'SRV-2024-004 needs additional documents',                 type:'warning', is_read:0, created_at:iso(-3) },
  { id:5,  user_id:3,  title:'New Survey Submitted',    message:'SRV-2024-005 submitted for Taluk review',                 type:'info',    is_read:0, created_at:iso(-1) },
  { id:6,  user_id:10, title:'ಸ್ವಾಗತ - KLSWA Portal',  message:'ರಾಜ ಸಂಘ ಪೋರ್ಟಲ್‌ಗೆ ಸ್ವಾಗತ. 14 surveys pending state review.', type:'info', is_read:0, created_at:iso(-1) },
  { id:7,  user_id:11, title:'Technical Alert',         message:'SRV-2024-009 awaiting State President review',            type:'warning', is_read:0, created_at:iso(-1) },
  { id:8,  user_id:13, title:'Division Report Ready',   message:'Mysuru Division: 10 surveys, 1 completed this month',     type:'info',    is_read:0, created_at:iso(-2) },
  { id:9,  user_id:30, title:'ಜಿಲ್ಲಾ ಅಧ್ಯಕ್ಷರಿಗೆ',      message:'Mysuru ಜಿಲ್ಲೆಯಲ್ಲಿ 10 surveys progress ನಲ್ಲಿ ಇವೆ',      type:'info',    is_read:0, created_at:iso(-1) },
  { id:10, user_id:71, title:'Technical Update',        message:'Mysuru district: 2 surveys need technical clearance',     type:'warning', is_read:0, created_at:iso(-1) },
];

const license_renewals = [];

// ─── LOAD REAL SURVEYORS FROM EXCEL IMPORT ──────────────────────────────────
try {
  const raw = fs.readFileSync(path.join(__dirname, 'data', 'surveyors.json'), 'utf8');
  const imported = JSON.parse(raw);
  imported.forEach(s => {
    users.push({
      id:           s.id,
      name:         s.name,
      email:        s.email,
      password:     DEMO_HASH,
      role:         'surveyor',
      employee_id:  s.lsNumber || s.loginId,
      login_id:     s.loginId,
      taluk:        s.taluk   || null,
      district:     s.district,
      division:     s.division,
      phone:        s.phone   || null,
      gender:       s.gender  || null,
      dob:          s.dob     || null,
      age:          s.age     || null,
      qualification:s.qualification || null,
      is_active:    1,
    });
  });
  // Ensure nextId stays above all imported IDs
  nextId.users = Math.max(nextId.users, ...imported.map(s => s.id)) + 1;
  console.log(`✅ Loaded ${imported.length} real surveyors from Excel import`);
} catch (e) {
  console.warn('⚠️  data/surveyors.json not found — using demo surveyors only');
}

const tables = { users, licenses, surveys, approvals, notifications, license_renewals };

// ─── QUERY HELPERS ──────────────────────────────────────────────────────────
const db = {
  all(table) { return [...(tables[table] || [])]; },
  find(table, predicate) { return tables[table].filter(predicate); },
  get(table, predicate) { return tables[table].find(predicate) || null; },
  insert(table, row) {
    const id = newId(table);
    const record = { ...row, id, created_at: iso(), updated_at: iso() };
    tables[table].push(record);
    return record;
  },
  update(table, id, changes) {
    const idx = tables[table].findIndex(r => r.id === id);
    if (idx === -1) return null;
    tables[table][idx] = { ...tables[table][idx], ...changes, updated_at: iso() };
    return tables[table][idx];
  },
  delete(table, id) {
    const idx = tables[table].findIndex(r => r.id === id);
    if (idx !== -1) tables[table].splice(idx, 1);
  },
  count(table, predicate) { return predicate ? tables[table].filter(predicate).length : tables[table].length; },
};

module.exports = db;
module.exports.DIVISIONS = DIVISIONS;
module.exports.ALL_DISTRICTS = ALL_DISTRICTS;
module.exports.divisionOf = divisionOf;
