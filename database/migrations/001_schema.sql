-- ═══════════════════════════════════════════════════════════════
-- RECRUITO AI — FULL DATABASE SCHEMA
-- Run order: 001_schema.sql → 002_seed.sql
-- Compatible with PostgreSQL 16 + pgvector
-- ═══════════════════════════════════════════════════════════════

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ═══════════════════════════════════════════════════════════════
-- COMPANIES (Tenant root — every row belongs to a company)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS companies (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             VARCHAR(255) NOT NULL,
  slug             VARCHAR(100) UNIQUE NOT NULL,
  domain           VARCHAR(255),
  industry         VARCHAR(100),
  size             VARCHAR(50),
  logo_url         TEXT,
  website          TEXT,
  plan             VARCHAR(50) DEFAULT 'free',
  resume_credits   INTEGER DEFAULT 25,
  settings         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);

-- ═══════════════════════════════════════════════════════════════
-- USERS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email            VARCHAR(255) UNIQUE NOT NULL,
  email_verified   BOOLEAN DEFAULT FALSE,
  password_hash    TEXT,
  full_name        VARCHAR(255) NOT NULL,
  avatar_url       TEXT,
  role             VARCHAR(50) DEFAULT 'recruiter',
  last_login_at    TIMESTAMPTZ,
  invite_token     TEXT,
  invite_expires   TIMESTAMPTZ,
  preferences      JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ═══════════════════════════════════════════════════════════════
-- REFRESH TOKENS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- JOBS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS jobs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by       UUID NOT NULL REFERENCES users(id),
  title            VARCHAR(255) NOT NULL,
  department       VARCHAR(100),
  location         VARCHAR(255),
  remote_type      VARCHAR(50) DEFAULT 'onsite',
  employment_type  VARCHAR(50) DEFAULT 'full-time',
  experience_min   INTEGER DEFAULT 0,
  experience_max   INTEGER DEFAULT 20,
  salary_min       INTEGER,
  salary_max       INTEGER,
  salary_currency  VARCHAR(10) DEFAULT 'USD',
  description      TEXT NOT NULL,
  requirements     TEXT,
  benefits         TEXT,
  status           VARCHAR(50) DEFAULT 'draft',
  published_at     TIMESTAMPTZ,
  closes_at        TIMESTAMPTZ,
  parsed_skills    JSONB DEFAULT '[]',
  parsed_requirements JSONB DEFAULT '{}',
  embedding_status VARCHAR(50) DEFAULT 'pending',
  applicant_count  INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

-- ═══════════════════════════════════════════════════════════════
-- HIRING STAGES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS hiring_stages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id       UUID REFERENCES jobs(id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL,
  slug         VARCHAR(100) NOT NULL,
  color        VARCHAR(20) DEFAULT '#6366f1',
  position     INTEGER NOT NULL,
  stage_type   VARCHAR(50) DEFAULT 'custom',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stages_company ON hiring_stages(company_id);

-- ═══════════════════════════════════════════════════════════════
-- CANDIDATES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS candidates (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id           UUID NOT NULL REFERENCES jobs(id),
  current_stage_id UUID REFERENCES hiring_stages(id),
  full_name        VARCHAR(255),
  email            VARCHAR(255),
  phone            VARCHAR(50),
  location         VARCHAR(255),
  linkedin_url     TEXT,
  github_url       TEXT,
  portfolio_url    TEXT,
  years_experience NUMERIC(4,1),
  current_title    VARCHAR(255),
  current_company  VARCHAR(255),
  education_level  VARCHAR(100),
  skills           JSONB DEFAULT '[]',
  skill_scores     JSONB DEFAULT '{}',
  status           VARCHAR(50) DEFAULT 'new',
  source           VARCHAR(100) DEFAULT 'upload',
  ai_summary       TEXT,
  assigned_to      UUID REFERENCES users(id),
  dedup_hash       VARCHAR(64),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_candidates_company ON candidates(company_id);
CREATE INDEX IF NOT EXISTS idx_candidates_job ON candidates(job_id);
CREATE INDEX IF NOT EXISTS idx_candidates_stage ON candidates(current_stage_id);
CREATE INDEX IF NOT EXISTS idx_candidates_skills ON candidates USING GIN(skills);

-- ═══════════════════════════════════════════════════════════════
-- RESUMES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS resumes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id     UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  company_id       UUID NOT NULL REFERENCES companies(id),
  s3_key           TEXT NOT NULL,
  s3_bucket        TEXT NOT NULL,
  original_filename VARCHAR(500),
  file_size        INTEGER,
  mime_type        VARCHAR(100),
  parse_status     VARCHAR(50) DEFAULT 'pending',
  parse_error      TEXT,
  parsed_at        TIMESTAMPTZ,
  raw_text         TEXT,
  parsed_data      JSONB,
  parser_version   VARCHAR(20),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resumes_candidate ON resumes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_resumes_status ON resumes(parse_status);

-- ═══════════════════════════════════════════════════════════════
-- RESUME EMBEDDINGS (pgvector)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS resume_embeddings (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resume_id        UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  candidate_id     UUID NOT NULL REFERENCES candidates(id),
  company_id       UUID NOT NULL REFERENCES companies(id),
  embedding        vector(1536),
  embedding_model  VARCHAR(100) DEFAULT 'text-embedding-3-small',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resume_emb_candidate ON resume_embeddings(candidate_id);
CREATE INDEX IF NOT EXISTS idx_resume_emb_vector
  ON resume_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- ═══════════════════════════════════════════════════════════════
-- JOB EMBEDDINGS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS job_embeddings (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id           UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  company_id       UUID NOT NULL REFERENCES companies(id),
  embedding        vector(1536),
  embedding_model  VARCHAR(100) DEFAULT 'text-embedding-3-small',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_emb_job ON job_embeddings(job_id);
CREATE INDEX IF NOT EXISTS idx_job_emb_vector
  ON job_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- ═══════════════════════════════════════════════════════════════
-- CANDIDATE SCORES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS candidate_scores (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id        UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_id              UUID NOT NULL REFERENCES jobs(id),
  company_id          UUID NOT NULL REFERENCES companies(id),
  total_score         NUMERIC(5,2),
  percentile_rank     NUMERIC(5,2),
  skill_match_score   NUMERIC(5,2),
  experience_score    NUMERIC(5,2),
  education_score     NUMERIC(5,2),
  semantic_score      NUMERIC(5,2),
  seniority_score     NUMERIC(5,2),
  weights_snapshot    JSONB DEFAULT '{}',
  score_explanation   TEXT,
  skill_gaps          JSONB DEFAULT '[]',
  skill_matches       JSONB DEFAULT '[]',
  strengths           JSONB DEFAULT '[]',
  concerns            JSONB DEFAULT '[]',
  recommendation      VARCHAR(50),
  scorer_version      VARCHAR(20) DEFAULT 'v1.0',
  scored_at           TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_scores_cand_job ON candidate_scores(candidate_id, job_id);
CREATE INDEX IF NOT EXISTS idx_scores_job ON candidate_scores(job_id, total_score DESC);

-- ═══════════════════════════════════════════════════════════════
-- CANDIDATE STAGE HISTORY
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS candidate_stage_history (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id  UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_id        UUID NOT NULL REFERENCES jobs(id),
  company_id    UUID NOT NULL REFERENCES companies(id),
  from_stage_id UUID REFERENCES hiring_stages(id),
  to_stage_id   UUID NOT NULL REFERENCES hiring_stages(id),
  moved_by      UUID REFERENCES users(id),
  reason        TEXT,
  moved_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stage_hist_candidate ON candidate_stage_history(candidate_id);

-- ═══════════════════════════════════════════════════════════════
-- RECRUITER NOTES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS recruiter_notes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id  UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  company_id    UUID NOT NULL REFERENCES companies(id),
  author_id     UUID NOT NULL REFERENCES users(id),
  content       TEXT NOT NULL,
  note_type     VARCHAR(50) DEFAULT 'note',
  rating        INTEGER CHECK (rating BETWEEN 1 AND 5),
  is_private    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notes_candidate ON recruiter_notes(candidate_id);

-- ═══════════════════════════════════════════════════════════════
-- SUBSCRIPTIONS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS subscriptions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id              UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  stripe_customer_id      TEXT UNIQUE,
  stripe_subscription_id  TEXT UNIQUE,
  plan                    VARCHAR(50) NOT NULL DEFAULT 'free',
  status                  VARCHAR(50) DEFAULT 'active',
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  resume_credits_total    INTEGER DEFAULT 25,
  resume_credits_used     INTEGER DEFAULT 0,
  seats_included          INTEGER DEFAULT 3,
  trial_ends_at           TIMESTAMPTZ,
  canceled_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- USAGE LOGS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS usage_logs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID NOT NULL REFERENCES companies(id),
  user_id          UUID REFERENCES users(id),
  event_type       VARCHAR(100) NOT NULL,
  resource_type    VARCHAR(50),
  resource_id      UUID,
  credits_consumed INTEGER DEFAULT 0,
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_company ON usage_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_usage_created ON usage_logs(created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════════════════════════

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON candidates
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
