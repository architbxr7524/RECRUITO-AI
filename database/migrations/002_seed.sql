-- ═══════════════════════════════════════════════════════════════
-- RECRUITO AI — SEED DATA
-- Creates demo company, admin user, sample jobs & stages
-- Password for demo user: password123
-- ═══════════════════════════════════════════════════════════════

-- Demo Company
INSERT INTO companies (id, name, slug, industry, size, plan, resume_credits)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Acme Corp',
  'acme-corp',
  'Technology',
  '51-200',
  'pro',
  500
) ON CONFLICT DO NOTHING;

-- Demo Admin User (password: password123)
INSERT INTO users (id, company_id, email, email_verified, password_hash, full_name, role)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'admin@acme.com',
  TRUE,
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2NJONLmGxK',
  'Alex Johnson',
  'owner'
) ON CONFLICT DO NOTHING;

-- Demo Recruiter
INSERT INTO users (id, company_id, email, email_verified, password_hash, full_name, role)
VALUES (
  'b0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'recruiter@acme.com',
  TRUE,
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2NJONLmGxK',
  'Sam Rivera',
  'recruiter'
) ON CONFLICT DO NOTHING;

-- Default Hiring Stages
INSERT INTO hiring_stages (company_id, name, slug, color, position, stage_type) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Applied',       'applied',       '#64748b', 1, 'inbox'),
  ('a0000000-0000-0000-0000-000000000001', 'Phone Screen',  'phone_screen',  '#3b82f6', 2, 'screening'),
  ('a0000000-0000-0000-0000-000000000001', 'Technical',     'technical',     '#8b5cf6', 3, 'interview'),
  ('a0000000-0000-0000-0000-000000000001', 'Final Round',   'final_round',   '#f59e0b', 4, 'interview'),
  ('a0000000-0000-0000-0000-000000000001', 'Offer',         'offer',         '#10b981', 5, 'offer'),
  ('a0000000-0000-0000-0000-000000000001', 'Hired',         'hired',         '#22c55e', 6, 'hired'),
  ('a0000000-0000-0000-0000-000000000001', 'Rejected',      'rejected',      '#ef4444', 7, 'rejected')
ON CONFLICT DO NOTHING;

-- Sample Job 1
INSERT INTO jobs (
  id, company_id, created_by, title, department, location, remote_type,
  employment_type, experience_min, experience_max, salary_min, salary_max,
  description, requirements, status, published_at,
  parsed_skills, embedding_status
) VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'Senior Full-Stack Engineer',
  'Engineering',
  'San Francisco, CA',
  'hybrid',
  'full-time',
  4, 8,
  120000, 180000,
  'We are looking for a Senior Full-Stack Engineer to join our platform team. You will design and build scalable web applications, mentor junior engineers, and contribute to architectural decisions.',
  '5+ years experience with React and Node.js. Experience with PostgreSQL, Redis, AWS. Strong understanding of system design and distributed systems.',
  'active',
  NOW(),
  '["React","Node.js","TypeScript","PostgreSQL","Redis","AWS","Docker","GraphQL"]',
  'ready'
) ON CONFLICT DO NOTHING;

-- Sample Job 2
INSERT INTO jobs (
  id, company_id, created_by, title, department, location, remote_type,
  employment_type, experience_min, experience_max, salary_min, salary_max,
  description, requirements, status, published_at,
  parsed_skills, embedding_status
) VALUES (
  'c0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'ML Engineer',
  'AI Platform',
  'Remote',
  'remote',
  'full-time',
  3, 7,
  130000, 190000,
  'Join our AI team to build and deploy machine learning models at scale. You will work on NLP, recommendation systems, and MLOps infrastructure.',
  '3+ years ML experience. Strong Python skills. Experience with PyTorch or TensorFlow. Familiarity with MLOps tools and cloud deployment.',
  'active',
  NOW(),
  '["Python","PyTorch","TensorFlow","MLOps","AWS","Docker","Kubernetes","SQL"]',
  'ready'
) ON CONFLICT DO NOTHING;

-- Subscription for demo company
INSERT INTO subscriptions (company_id, plan, status, resume_credits_total, seats_included)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'pro', 'active', 500, 10
) ON CONFLICT DO NOTHING;
