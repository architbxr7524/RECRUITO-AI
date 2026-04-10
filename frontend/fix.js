const fs = require('fs');
const files = [
  'app/dashboard/page.tsx',
  'app/dashboard/jobs/page.tsx',
  'app/dashboard/candidates/page.tsx',
  'app/dashboard/candidates/[id]/page.tsx',
  'app/dashboard/pipeline/[jobId]/page.tsx',
  'app/check-resume/page.tsx',
];
const BACKEND = 'https://recruito-ai-production.up.railway.app/api/v1';
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  const orig = c;
  c = c.replace(/https?:\/\/\$\{process\.env\.NEXT_PUBLIC_API_URL\}\/api\/v1/g, BACKEND);
  c = c.replace(/\$\{process\.env\.NEXT_PUBLIC_API_URL\}\/api\/v1/g, BACKEND);
  if (c !== orig) { fs.writeFileSync(f, c); console.log('Fixed: ' + f); }
  else { console.log('Skipped (no match): ' + f); }
});
console.log('Done.');