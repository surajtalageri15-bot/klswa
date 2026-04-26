const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const surveyorsPath = path.join(root, 'data', 'surveyors.json');
const surveyors = JSON.parse(fs.readFileSync(surveyorsPath, 'utf8'));

const groups = new Map();

for (const surveyor of surveyors) {
  const division = String(surveyor.division || '').trim();
  const district = String(surveyor.district || '').trim();
  const taluk = String(surveyor.taluk || '').trim();
  const key = JSON.stringify([division, district, taluk]);

  if (!groups.has(key)) {
    groups.set(key, {
      division,
      district,
      taluk,
      count: 0,
      surveyors: [],
    });
  }

  const group = groups.get(key);
  group.count += 1;
  group.surveyors.push({
    id: surveyor.id,
    name: surveyor.name,
    email: surveyor.email,
    loginId: surveyor.loginId,
    lsNumber: surveyor.lsNumber,
    phone: surveyor.phone,
    gender: surveyor.gender,
    qualification: surveyor.qualification,
  });
}

const talukData = [...groups.values()].sort(
  (a, b) =>
    a.division.localeCompare(b.division) ||
    a.district.localeCompare(b.district) ||
    a.taluk.localeCompare(b.taluk)
);

const summary = talukData.map(({ division, district, taluk, count }) => ({
  division,
  district,
  taluk,
  count,
}));

const csvEscape = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
const csv = [
  'division,district,taluk,surveyor_count',
  ...summary.map(row =>
    [row.division, row.district, row.taluk, row.count].map(csvEscape).join(',')
  ),
].join('\n');

fs.writeFileSync(path.join(root, 'data', 'taluk-data.json'), JSON.stringify(talukData, null, 2));
fs.writeFileSync(path.join(root, 'data', 'taluk-summary.json'), JSON.stringify(summary, null, 2));
fs.writeFileSync(path.join(root, 'data', 'taluk-summary.csv'), csv);

console.log(`Extracted ${surveyors.length} surveyors into ${talukData.length} taluk groups.`);
console.log('Created data/taluk-data.json');
console.log('Created data/taluk-summary.json');
console.log('Created data/taluk-summary.csv');
