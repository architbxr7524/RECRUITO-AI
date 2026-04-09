/**
 * mock-parser.ts
 * ─────────────────────────────────────────────────────
 * Parses resumes using regex + heuristics — NO API KEY needed.
 * Extracts: name, email, phone, skills, experience, education.
 * Produces realistic scores so the full UI works immediately.
 *
 * When you get an Anthropic key later, the real parser
 * in ai-services/workers/parser/worker.py replaces this.
 */

// ── Skill dictionary ───────────────────────────────────
const KNOWN_SKILLS = [
  // Languages
  'JavaScript','TypeScript','Python','Java','C#','C++','Go','Rust','Ruby','PHP',
  'Swift','Kotlin','Scala','R','MATLAB','Bash','Shell','Perl','Lua','Dart',
  // Frontend
  'React','Vue.js','Angular','Next.js','Nuxt.js','Svelte','HTML','CSS','SASS',
  'Tailwind CSS','Bootstrap','jQuery','Redux','Zustand','GraphQL','REST APIs',
  // Backend
  'Node.js','Express','Fastify','Django','Flask','FastAPI','Spring Boot',
  'Laravel','Rails','ASP.NET','NestJS','Gin','Echo',
  // Databases
  'PostgreSQL','MySQL','MongoDB','Redis','SQLite','DynamoDB','Cassandra',
  'Elasticsearch','Neo4j','InfluxDB','Supabase','Firebase',
  // Cloud & DevOps
  'AWS','Google Cloud','Azure','Docker','Kubernetes','Terraform','Ansible',
  'Jenkins','GitHub Actions','CircleCI','Nginx','Linux','Ubuntu',
  // AI/ML
  'TensorFlow','PyTorch','Scikit-learn','Pandas','NumPy','OpenCV',
  'Machine Learning','Deep Learning','NLP','LangChain','Hugging Face',
  // Tools
  'Git','GitHub','GitLab','Jira','Figma','Postman','VS Code','Webpack','Vite',
  'Jest','Pytest','Cypress','Playwright','Storybook','Datadog','Sentry',
]

const SKILL_ALIASES: Record<string, string> = {
  'js': 'JavaScript', 'javascript': 'JavaScript', 'es6': 'JavaScript',
  'ts': 'TypeScript', 'typescript': 'TypeScript',
  'py': 'Python', 'python3': 'Python',
  'react.js': 'React', 'reactjs': 'React',
  'vue': 'Vue.js', 'vuejs': 'Vue.js',
  'node': 'Node.js', 'nodejs': 'Node.js', 'node.js': 'Node.js',
  'next': 'Next.js', 'nextjs': 'Next.js',
  'postgres': 'PostgreSQL', 'postgresql': 'PostgreSQL', 'pg': 'PostgreSQL',
  'mongo': 'MongoDB', 'mongodb': 'MongoDB',
  'k8s': 'Kubernetes', 'kube': 'Kubernetes',
  'gcp': 'Google Cloud', 'google cloud platform': 'Google Cloud',
  'ci/cd': 'CI/CD', 'cicd': 'CI/CD',
  'ml': 'Machine Learning', 'ai': 'Machine Learning',
  'tf': 'TensorFlow', 'tensorflow': 'TensorFlow',
  'tailwind': 'Tailwind CSS',
  'css3': 'CSS', 'html5': 'HTML',
  'rest': 'REST APIs', 'restful': 'REST APIs', 'api': 'REST APIs',
}

// ── Extractors ────────────────────────────────────────

function extractEmail(text: string): string | null {
  const match = text.match(/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/)
  return match ? match[0] : null
}

function extractPhone(text: string): string | null {
  const match = text.match(/(\+?\d[\d\s\-().]{7,15}\d)/)
  return match ? match[0].trim() : null
}

function extractName(text: string): string | null {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 1)
  for (const line of lines.slice(0, 8)) {
    if (/[@|http|www|\d{3}|\||resume|cv|curriculum|developer|engineer|manager|designer|analyst]/i.test(line)) continue
    if (line.split(' ').length >= 2 && line.split(' ').length <= 5) {
      if (/^[A-Za-z\s'\-\.]+$/.test(line) && line.length < 60) {
        if (line === line.toUpperCase() && line.length > 3) {
          return line.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())
        }
        return line
      }
    }
  }
  return null
}

function extractLinkedIn(text: string): string | null {
  const match = text.match(/linkedin\.com\/in\/([A-Za-z0-9\-_]+)/i)
  return match ? `https://linkedin.com/in/${match[1]}` : null
}

function extractGitHub(text: string): string | null {
  const match = text.match(/github\.com\/([A-Za-z0-9\-_]+)/i)
  return match ? `https://github.com/${match[1]}` : null
}

function extractLocation(text: string): string | null {
  // Common city patterns
  const match = text.match(
    /\b(Nashville|New York|San Francisco|Los Angeles|Chicago|Austin|Seattle|Boston|Denver|Atlanta|Miami|London|Toronto|Bangalore|Mumbai|Delhi|Singapore|Berlin|Amsterdam|Paris|Sydney)\b/i
  )
  return match ? match[0] : null
}

function extractSkills(text: string): string[] {
  const lower = text.toLowerCase()
  const found = new Set<string>()

  // Check aliases first
  for (const [alias, canonical] of Object.entries(SKILL_ALIASES)) {
    if (lower.includes(alias.toLowerCase())) {
      found.add(canonical)
    }
  }

  // Check known skills
  for (const skill of KNOWN_SKILLS) {
    if (lower.includes(skill.toLowerCase())) {
      found.add(skill)
    }
  }

  return Array.from(found).slice(0, 25)
}

function extractYearsExperience(text: string): number {
  // "X years of experience" pattern
  const patterns = [
    /(\d+)\+?\s+years?\s+of\s+(?:professional\s+)?experience/i,
    /(\d+)\+?\s+years?\s+(?:of\s+)?(?:work|industry|software|engineering)/i,
    /experience(?:\s+of)?\s+(\d+)\+?\s+years?/i,
  ]
  for (const pat of patterns) {
    const m = text.match(pat)
    if (m) return Math.min(parseInt(m[1]), 40)
  }

  // Count job entries as a fallback
  const jobMatches = text.match(/(20\d\d)\s*[-–—]\s*(20\d\d|present|current)/gi)
  if (jobMatches && jobMatches.length > 0) {
    let totalYears = 0
    for (const match of jobMatches) {
      const years = match.match(/(20\d\d)/g)
      if (years && years.length === 2) {
        totalYears += parseInt(years[1]) - parseInt(years[0])
      } else if (years && years.length === 1) {
        totalYears += new Date().getFullYear() - parseInt(years[0])
      }
    }
    return Math.min(Math.max(totalYears, 0), 40)
  }

  return 2 // Default assumption
}

function extractCurrentTitle(text: string): string | null {
  const titles = [
    'Software Engineer','Senior Software Engineer','Staff Engineer','Principal Engineer',
    'Full Stack Developer','Frontend Developer','Backend Developer','Full-Stack Developer',
    'Engineering Manager','VP of Engineering','CTO','Tech Lead','Lead Engineer',
    'DevOps Engineer','Cloud Engineer','ML Engineer','Data Scientist','Data Engineer',
    'Product Manager','UX Designer','UI Designer','QA Engineer','Security Engineer',
    'iOS Developer','Android Developer','Mobile Developer','React Developer',
    'Python Developer','Node.js Developer','Java Developer',
  ]
  const lower = text.toLowerCase()
  for (const title of titles) {
    if (lower.includes(title.toLowerCase())) return title
  }
  return null
}

function extractEducationLevel(text: string): string {
  const lower = text.toLowerCase()
  if (/ph\.?d|doctor/i.test(lower)) return 'phd'
  if (/m\.?s\.?|master|mba/i.test(lower)) return 'master'
  if (/b\.?s\.?|b\.?e\.?|bachelor|b\.?tech|undergraduate/i.test(lower)) return 'bachelor'
  if (/associate/i.test(lower)) return 'associate'
  if (/bootcamp|coding school|self.?taught/i.test(lower)) return 'bootcamp'
  return 'bachelor' // safe default
}

function detectSeniority(years: number, title: string | null, text: string): string {
  const lower = (text + ' ' + (title || '')).toLowerCase()
  if (/\b(cto|vp|director|principal|distinguished|fellow)\b/.test(lower)) return 'principal'
  if (/\bstaff\b/.test(lower)) return 'staff'
  if (/\bsenior|sr\.\b/.test(lower) || years >= 5) return 'senior'
  if (/\bjunior|jr\.\b/.test(lower) || years <= 1) return 'junior'
  if (/\bintern\b/.test(lower) || years === 0) return 'intern'
  if (years >= 3) return 'mid'
  return 'mid'
}

function generateSummary(name: string | null, title: string | null, years: number, skills: string[]): string {
  const n = name || 'This candidate'
  const t = title || 'software professional'
  const topSkills = skills.slice(0, 3).join(', ') || 'various technologies'
  return `${n} is a ${t} with ${years}+ years of experience specializing in ${topSkills}. They bring hands-on expertise across the full development lifecycle and have demonstrated strong technical skills across their career.`
}

// ── Scoring ───────────────────────────────────────────

function scoreCandidate(
  candidateSkills: string[],
  requiredSkills: string[],
  candidateYears: number,
  minYears: number,
  maxYears: number,
  educationLevel: string,
  seniority: string
): {
  totalScore: number
  skillScore: number
  expScore: number
  eduScore: number
  senScore: number
  semanticScore: number
  matched: string[]
  gaps: string[]
} {
  // Skill matching
  const candidateSet = new Set(candidateSkills.map(s => s.toLowerCase()))
  const matched: string[] = []
  const gaps: string[] = []

  for (const req of requiredSkills) {
    const reqL = req.toLowerCase()
    if (candidateSet.has(reqL) || [...candidateSet].some(c => c.includes(reqL) || reqL.includes(c))) {
      matched.push(req)
    } else {
      gaps.push(req)
    }
  }

  const skillScore = requiredSkills.length > 0
    ? Math.min(100, (matched.length / requiredSkills.length) * 100)
    : 70

  // Experience scoring
  let expScore = 70
  if (candidateYears >= maxYears) expScore = 100
  else if (candidateYears >= minYears) expScore = 75 + ((candidateYears - minYears) / Math.max(maxYears - minYears, 1)) * 25
  else if (candidateYears >= minYears - 1) expScore = 55
  else expScore = Math.max(10, (candidateYears / Math.max(minYears, 1)) * 55)

  // Education
  const eduMap: Record<string, number> = {
    phd: 100, master: 90, bachelor: 80, associate: 65, bootcamp: 60, self_taught: 55
  }
  const eduScore = eduMap[educationLevel] || 70

  // Seniority
  const senMap: Record<string, number> = {
    principal: 95, staff: 88, senior: 82, mid: 70, junior: 50, intern: 30
  }
  const senScore = senMap[seniority] || 70

  // Semantic (simulated — based on skill overlap percentage with some noise)
  const overlapRatio = requiredSkills.length > 0 ? matched.length / requiredSkills.length : 0.6
  const semanticScore = Math.min(100, 45 + overlapRatio * 45 + Math.random() * 10)

  const totalScore =
    semanticScore * 0.35 +
    skillScore    * 0.30 +
    expScore      * 0.20 +
    eduScore      * 0.10 +
    senScore      * 0.05

  return {
    totalScore:    Math.round(Math.min(100, totalScore) * 10) / 10,
    skillScore:    Math.round(skillScore * 10) / 10,
    expScore:      Math.round(expScore * 10) / 10,
    eduScore:      Math.round(eduScore * 10) / 10,
    senScore:      Math.round(senScore * 10) / 10,
    semanticScore: Math.round(semanticScore * 10) / 10,
    matched,
    gaps,
  }
}

function getRecommendation(score: number): string {
  if (score >= 80) return 'strong_yes'
  if (score >= 65) return 'yes'
  if (score >= 45) return 'maybe'
  return 'no'
}

function generateExplanation(score: number, matched: string[], gaps: string[], name: string | null): string {
  const rec = getRecommendation(score)
  if (rec === 'strong_yes') return `${name || 'Candidate'} is an excellent match with strong alignment on key requirements.`
  if (rec === 'yes') return `${name || 'Candidate'} meets most requirements and shows good potential for this role.`
  if (rec === 'maybe') return `${name || 'Candidate'} partially matches. ${gaps.length > 0 ? `Missing: ${gaps.slice(0,3).join(', ')}.` : ''}`
  return `${name || 'Candidate'} has limited match with the job requirements. Significant skill gaps exist.`
}

// ── Main export ───────────────────────────────────────

export interface ParsedResume {
  contact: {
    fullName: string | null
    email: string | null
    phone: string | null
    location: string | null
    linkedin: string | null
    github: string | null
  }
  skills: string[]
  yearsExperience: number
  currentTitle: string | null
  educationLevel: string
  seniority: string
  aiSummary: string
}

export interface AIScore {
  totalScore: number
  skillMatchScore: number
  experienceScore: number
  educationScore: number
  seniorityScore: number
  semanticScore: number
  scoreExplanation: string
  skillGaps: string[]
  skillMatches: string[]
  strengths: string[]
  concerns: string[]
  recommendation: string
}

export function parseResume(rawText: string): ParsedResume {
  const email    = extractEmail(rawText)
  const phone    = extractPhone(rawText)
  const name     = extractName(rawText)
  const linkedin = extractLinkedIn(rawText)
  const github   = extractGitHub(rawText)
  const location = extractLocation(rawText)
  const skills   = extractSkills(rawText)
  const years    = extractYearsExperience(rawText)
  const title    = extractCurrentTitle(rawText)
  const edu      = extractEducationLevel(rawText)
  const seniority = detectSeniority(years, title, rawText)
  const summary  = generateSummary(name, title, years, skills)

  return {
    contact: { fullName: name, email, phone, location, linkedin, github },
    skills,
    yearsExperience: years,
    currentTitle: title,
    educationLevel: edu,
    seniority,
    aiSummary: summary,
  }
}

export function scoreResume(
  parsed: ParsedResume,
  requiredSkills: string[],
  minYears: number,
  maxYears: number
): AIScore {
  const { totalScore, skillScore, expScore, eduScore, senScore, semanticScore, matched, gaps } = scoreCandidate(
    parsed.skills,
    requiredSkills,
    parsed.yearsExperience,
    minYears,
    maxYears,
    parsed.educationLevel,
    parsed.seniority
  )

  const strengths: string[] = []
  const concerns: string[] = []

  if (skillScore >= 70) strengths.push(`Strong skill match (${matched.length}/${requiredSkills.length} required skills)`)
  if (parsed.yearsExperience >= minYears) strengths.push(`Meets experience requirement (${parsed.yearsExperience} years)`)
  if (['senior','staff','principal'].includes(parsed.seniority)) strengths.push(`Senior-level candidate`)
  if (parsed.educationLevel === 'master' || parsed.educationLevel === 'phd') strengths.push(`Advanced degree`)

  if (gaps.length > 0) concerns.push(`Missing skills: ${gaps.slice(0, 3).join(', ')}`)
  if (parsed.yearsExperience < minYears) concerns.push(`Below minimum experience (${parsed.yearsExperience} vs ${minYears} required)`)
  if (skillScore < 40) concerns.push('Low overall skill alignment with this role')

  return {
    totalScore,
    skillMatchScore:  skillScore,
    experienceScore:  expScore,
    educationScore:   eduScore,
    seniorityScore:   senScore,
    semanticScore,
    scoreExplanation: generateExplanation(totalScore, matched, gaps, parsed.contact.fullName),
    skillGaps:        gaps,
    skillMatches:     matched,
    strengths:        strengths.length > 0 ? strengths : ['Has relevant background for this type of role'],
    concerns:         concerns.length > 0 ? concerns : ['No major concerns identified'],
    recommendation:   getRecommendation(totalScore),
  }
}
