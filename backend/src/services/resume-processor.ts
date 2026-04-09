/**
 * resume-processor.ts
 * Extracts text from PDF/DOCX in Node.js, then runs mock AI parser.
 * No Python, no API keys required.
 */
import { sql } from '../db/client'
import { parseResume, scoreResume } from './mock-parser'

// ── Text extractors (pure Node.js) ───────────────────

async function extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'text/plain') {
    return buffer.toString('utf-8')
  }

  if (mimeType === 'application/pdf' || mimeType.includes('pdf')) {
    return extractTextFromPDF(buffer)
  }

  if (mimeType.includes('wordprocessingml') || mimeType.includes('docx')) {
    return extractTextFromDOCX(buffer)
  }

  // Fallback — try UTF-8
  return buffer.toString('utf-8')
}

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import of pdf-parse (install separately if needed)
    const pdfParse = await import('pdf-parse').then(m => m.default).catch(() => null)
    if (pdfParse) {
      const data = await pdfParse(buffer)
      return data.text
    }
  } catch {}

  // Fallback: basic PDF text extraction (reads raw text objects from PDF)
  const str = buffer.toString('latin1')
  const textParts: string[] = []
  const regex = /BT[\s\S]*?ET/g
  let match
  while ((match = regex.exec(str)) !== null) {
    const btBlock = match[0]
    const tjMatches = btBlock.match(/\(([^)]+)\)\s*Tj/g)
    if (tjMatches) {
      for (const tj of tjMatches) {
        const text = tj.match(/\(([^)]+)\)/)
        if (text) textParts.push(text[1])
      }
    }
  }

  if (textParts.length > 0) return textParts.join(' ')

  // Last resort: extract all printable ASCII from PDF
  return str.replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ').trim()
}

async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import('mammoth').then(m => m).catch(() => null)
    if (mammoth) {
      const result = await mammoth.extractRawText({ buffer })
      return result.value
    }
  } catch {}

  // Fallback: read XML inside DOCX (DOCX is a ZIP)
  try {
    const JSZip = await import('jszip').then(m => m.default)
    const zip = await JSZip.loadAsync(buffer)
    const docXml = zip.files['word/document.xml']
    if (docXml) {
      const xml = await docXml.async('text')
      // Strip XML tags, keep text
      return xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    }
  } catch {}

  return ''
}

// ── Main processing function ──────────────────────────

export async function processResume(
  resumeId: string,
  candidateId: string,
  jobId: string,
  companyId: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<void> {
  try {
    // 1. Extract text
    const rawText = await extractTextFromBuffer(fileBuffer, mimeType)

    if (!rawText || rawText.trim().length < 30) {
      await sql`
        UPDATE resumes SET parse_status = 'failed',
          parse_error = 'Could not extract text from file. Please upload a text-based PDF or DOCX.'
        WHERE id = ${resumeId}
      `
      return
      
    }

        // Update job candidate count
    await sql`
      UPDATE jobs SET applicant_count = (
        SELECT COUNT(*) FROM candidates 
        WHERE job_id = ${jobId} AND deleted_at IS NULL
      ) WHERE id = ${jobId}
    `

    // 2. Parse with mock AI
    const parsed = parseResume(rawText)

    // 3. Get job requirements for scoring
    const jobs = await sql`
      SELECT parsed_skills, experience_min, experience_max
      FROM jobs WHERE id = ${jobId}
    `
    const job = jobs[0]
    const requiredSkills: string[] = job?.parsedSkills
      ? (typeof job.parsedSkills === 'string' ? JSON.parse(job.parsedSkills) : job.parsedSkills)
      : []

    // 4. Score candidate
    const score = scoreResume(
      parsed,
      requiredSkills,
      job?.experienceMin ?? 0,
      job?.experienceMax ?? 10
    )

    // 5. Extract skills for job if none exist yet
    if (requiredSkills.length === 0 && parsed.skills.length > 0) {
      await sql`
        UPDATE jobs SET parsed_skills = ${JSON.stringify(parsed.skills.slice(0, 10))}
        WHERE id = ${jobId} AND (parsed_skills IS NULL OR parsed_skills = '[]')
      `
    }

    // 6. Save parsed resume data
    await sql`
      UPDATE resumes SET
        parse_status   = 'success',
        raw_text       = ${rawText},
        parsed_data    = ${JSON.stringify({
          contact:              parsed.contact,
          skills:               parsed.skills,
          total_years_experience: parsed.yearsExperience,
          seniority_level:      parsed.seniority,
          education_level:      parsed.educationLevel,
          ai_summary:           parsed.aiSummary,
        })},
        parsed_at      = NOW(),
        parser_version = 'mock-v1.0'
      WHERE id = ${resumeId}
    `

    // 7. Update candidate with extracted info
    await sql`
      UPDATE candidates SET
        full_name        = COALESCE(${parsed.contact.fullName}, full_name),
        email            = COALESCE(${parsed.contact.email}, email),
        phone            = ${parsed.contact.phone},
        location         = ${parsed.contact.location},
        linkedin_url     = ${parsed.contact.linkedin},
        github_url       = ${parsed.contact.github},
        years_experience = ${parsed.yearsExperience},
        current_title    = ${parsed.currentTitle},
        education_level  = ${parsed.educationLevel},
        skills           = ${JSON.stringify(parsed.skills)}::jsonb,
        ai_summary       = ${parsed.aiSummary},
        updated_at       = NOW()
      WHERE id = ${candidateId}
    `

    // 8. Save AI score
    await sql`
      INSERT INTO candidate_scores (
        candidate_id, job_id, company_id,
        total_score, semantic_score, skill_match_score,
        experience_score, education_score, seniority_score,
        weights_snapshot, score_explanation,
        skill_gaps, skill_matches, strengths, concerns,
        recommendation, scorer_version, scored_at
      ) VALUES (
        ${candidateId}, ${jobId}, ${companyId},
        ${score.totalScore}, ${score.semanticScore}, ${score.skillMatchScore},
        ${score.experienceScore}, ${score.educationScore}, ${score.seniorityScore},
        ${'{"semantic":0.35,"skill":0.30,"experience":0.20,"education":0.10,"seniority":0.05}'},
        ${score.scoreExplanation},
        ${JSON.stringify(score.skillGaps)},
        ${JSON.stringify(score.skillMatches)},
        ${JSON.stringify(score.strengths)},
        ${JSON.stringify(score.concerns)},
        ${score.recommendation},
        'mock-v1.0', NOW()
      )
      ON CONFLICT (candidate_id, job_id) DO UPDATE SET
        total_score       = EXCLUDED.total_score,
        score_explanation = EXCLUDED.score_explanation,
        skill_gaps        = EXCLUDED.skill_gaps,
        skill_matches     = EXCLUDED.skill_matches,
        strengths         = EXCLUDED.strengths,
        concerns          = EXCLUDED.concerns,
        recommendation    = EXCLUDED.recommendation,
        scored_at         = NOW()
    `

  } catch (err: any) {
    await sql`
      UPDATE resumes SET parse_status = 'failed', parse_error = ${String(err?.message || err)}
      WHERE id = ${resumeId}
    `
    throw err
  }
}
