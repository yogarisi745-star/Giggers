/*
# Add company_name column to jobs table

1. Modified Tables
- `jobs`
  - Added `company_name` (text, nullable) — Stores the company name when posting_type is 'company'

2. Important Notes
- The column is nullable to allow existing jobs without company names.
- Only used when posting_type is 'company'; for 'freelancer' it remains null.
*/

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company_name text;