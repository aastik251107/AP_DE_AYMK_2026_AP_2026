-- ============================================================================
-- File:        dbms/04_queries.sql
-- Project:     Real-Time Land Acquisition & Management System
-- Database:    PostgreSQL (12.0+)
-- Course:      Database Management Systems (B.Tech 2nd Year)
-- Level:       Basic Beginner / Newbie Friendly 🚀
-- Author:      Data Engineering Team (AYMK)
-- Repo:        https://github.com/aastik251107/AP_DE_AYMK_2026_AP_2026
--
-- WORKLOAD SPECIFICATION:
--   R01–R25 : Read queries  (25) - Lookups, JOINs, aggregations, workflows
--   W01–W05 : Write queries (5)  - Acquisitions, calculations, transitions, payouts
--   Total   : 30 benchmark queries matching the standard course workload
--
-- RULES & EXECUTION:
--   * Every query runs directly against the PostgreSQL schema in 03_schema.sql.
--   * Explicit JOINs are used wherever multiple tables are connected.
--   * Safe to run in psql/pgAdmin: the entire file is wrapped in BEGIN ... ROLLBACK.
--   * The "-- @R01" and "-- @W01" markers are fully compatible with run_benchmark.sh.
-- ============================================================================

-- Ensure standard search path to public schema
SET search_path TO public;

BEGIN;

-- ============================================================================
-- 📖 SECTION 1: READ QUERIES (R01 – R25)
-- ============================================================================

-- @R01
-- READ: User authentication and login lookup
-- Screen: Login Gateway
-- Finds user details by email address (case-insensitive) to verify credentials.
SELECT 
    user_id, 
    name, 
    email, 
    role, 
    created_at
FROM users
WHERE LOWER(email) = LOWER('admin@ap.gov.in');

-- @R02
-- READ: Citizen landowner verification by National ID
-- Screen: Citizen Verification Desk
-- Searches the registry for a landowner using their unique Aadhaar/PAN ID number.
SELECT 
    owner_id, 
    full_name, 
    phone, 
    id_number, 
    created_at
FROM owners
WHERE id_number = 'ID-901';

-- @R03
-- READ: Land parcel cadastral details and total valuation
-- Screen: Cadastral Registry Search
-- Looks up a parcel by survey number and computes total market value (area * circle rate).
SELECT 
    parcel_id, 
    survey_number, 
    village, 
    area_sqm, 
    market_rate_per_sqm,
    (area_sqm * market_rate_per_sqm) AS total_market_value
FROM parcels
WHERE survey_number = 'P-101';

-- @R04
-- READ: Parcel co-ownership breakdown with legal shares
-- Screen: Title Deed & Ownership Verification
-- Connects parcels, parcel_owners, and owners to show all co-owners and pro-rata land area.
SELECT 
    p.survey_number,
    p.village,
    o.owner_id,
    o.full_name AS landowner_name,
    o.phone,
    po.share_percent,
    ROUND(p.area_sqm * (po.share_percent / 100.0), 2) AS owned_area_sqm
FROM parcels p
JOIN parcel_owners po ON p.parcel_id = po.parcel_id
JOIN owners o        ON po.owner_id = o.owner_id
WHERE p.survey_number = 'P-101'
ORDER BY po.share_percent DESC;

-- @R05
-- READ: Citizen land portfolio ("My Land Holdings")
-- Screen: Citizen Self-Service Portal
-- Lists every parcel in which a specific citizen holds ownership, with pro-rata valuation.
SELECT 
    o.owner_id,
    o.full_name AS landowner_name,
    p.survey_number,
    p.village,
    p.area_sqm AS total_parcel_area_sqm,
    po.share_percent,
    p.market_rate_per_sqm,
    ROUND(p.area_sqm * p.market_rate_per_sqm * (po.share_percent / 100.0), 2) AS owner_share_valuation
FROM owners o
JOIN parcel_owners po ON o.owner_id = po.owner_id
JOIN parcels p        ON po.parcel_id = p.parcel_id
WHERE o.owner_id = 10
ORDER BY p.survey_number ASC;

-- @R06
-- READ: Approved infrastructure schemes directory
-- Screen: Government Projects Overview
-- Retrieves all public infrastructure projects ordered by sanctioned budget.
SELECT 
    project_id, 
    name AS project_name, 
    department, 
    budget,
    created_at
FROM projects
ORDER BY budget DESC;

-- @R07
-- READ: Active land acquisition pipeline overview
-- Screen: Admin Operations Dashboard
-- Joins acquisitions, projects, parcels, and users to display full status of all cases.
SELECT 
    a.acquisition_id,
    pr.name AS project_name,
    pr.department,
    pa.survey_number,
    pa.village,
    pa.area_sqm,
    a.status AS current_stage,
    u.name AS managing_admin,
    a.created_at,
    a.updated_at
FROM acquisitions a
JOIN projects pr ON a.project_id = pr.project_id
JOIN parcels pa  ON a.parcel_id = pa.parcel_id
JOIN users u     ON a.created_by = u.user_id
ORDER BY a.updated_at DESC;

-- @R08
-- READ: Work queue filtered by acquisition stage
-- Screen: Department Stage Processing Queue
-- Filters ongoing acquisitions at a specific lifecycle stage (e.g. 'VALUATED').
SELECT 
    a.acquisition_id,
    pr.name AS project_name,
    pa.survey_number,
    pa.village,
    pa.area_sqm,
    a.status,
    a.created_at
FROM acquisitions a
JOIN projects pr ON a.project_id = pr.project_id
JOIN parcels pa  ON a.parcel_id = pa.parcel_id
WHERE a.status = 'VALUATED'
ORDER BY a.created_at ASC;

-- @R09
-- READ: Single acquisition case dossier
-- Screen: Acquisition Case File Detail View
-- Fetches complete details of a single case including parcel, project, and admin info.
SELECT 
    a.acquisition_id,
    a.status AS current_stage,
    pr.project_id,
    pr.name AS project_name,
    pr.department,
    pa.parcel_id,
    pa.survey_number,
    pa.village,
    pa.area_sqm,
    pa.market_rate_per_sqm,
    (pa.area_sqm * pa.market_rate_per_sqm) AS total_parcel_valuation,
    u.name AS managing_admin,
    u.email AS admin_email,
    a.created_at,
    a.updated_at
FROM acquisitions a
JOIN projects pr ON a.project_id = pr.project_id
JOIN parcels pa  ON a.parcel_id = pa.parcel_id
JOIN users u     ON a.created_by = u.user_id
WHERE a.acquisition_id = 501;

-- @R10
-- READ: Financial compensation ledger per co-owner
-- Screen: Compensation Disbursement Ledger
-- Displays calculated compensation money, share %, and payment status for each owner.
SELECT 
    c.compensation_id,
    a.acquisition_id,
    o.full_name AS landowner_name,
    o.phone,
    po.share_percent,
    c.amount AS compensation_amount,
    c.payment_status,
    c.payment_date
FROM compensations c
JOIN acquisitions a   ON c.acquisition_id = a.acquisition_id
JOIN owners o         ON c.owner_id = o.owner_id
JOIN parcel_owners po ON (a.parcel_id = po.parcel_id AND o.owner_id = po.owner_id)
WHERE a.acquisition_id = 501
ORDER BY po.share_percent DESC;

-- @R11
-- READ: Landowner compensation status inquiry
-- Screen: Citizen Compensation Tracker
-- Shows all compensation vouchers awarded to a specific citizen across projects.
SELECT 
    c.compensation_id,
    pr.name AS project_name,
    pa.survey_number,
    pa.village,
    c.amount AS compensation_amount,
    c.payment_status,
    c.payment_date
FROM compensations c
JOIN acquisitions a ON c.acquisition_id = a.acquisition_id
JOIN projects pr    ON a.project_id = pr.project_id
JOIN parcels pa     ON a.parcel_id = pa.parcel_id
WHERE c.owner_id = 10
ORDER BY c.created_at DESC;

-- @R12
-- READ: Open landowner grievances and objections queue
-- Screen: Grievance Redressal Desk
-- Lists unresolved disputes filed by landowners awaiting administrative action.
SELECT 
    ob.objection_id,
    a.acquisition_id,
    pr.name AS project_name,
    pa.survey_number,
    o.full_name AS complainant,
    o.phone,
    ob.reason,
    ob.status AS grievance_status,
    ob.filed_at
FROM objections ob
JOIN acquisitions a ON ob.acquisition_id = a.acquisition_id
JOIN projects pr    ON a.project_id = pr.project_id
JOIN parcels pa     ON a.parcel_id = pa.parcel_id
JOIN owners o       ON ob.owner_id = o.owner_id
WHERE ob.status = 'OPEN'
ORDER BY ob.filed_at ASC;

-- @R13
-- READ: Completion governance and integrity gatekeeper
-- Screen: Pre-Completion Verification Checkpoint
-- Verifies zero open objections and zero unpaid compensation vouchers before closure.
SELECT 
    a.acquisition_id,
    a.status AS current_status,
    (SELECT COUNT(*) FROM objections ob WHERE ob.acquisition_id = a.acquisition_id AND ob.status = 'OPEN') AS open_objections_count,
    (SELECT COUNT(*) FROM compensations c WHERE c.acquisition_id = a.acquisition_id AND c.payment_status != 'PAID') AS unpaid_compensations_count
FROM acquisitions a
WHERE a.acquisition_id = 501;

-- @R14
-- READ: Immutable audit trail of lifecycle stage transitions
-- Screen: Legal Compliance & RTI Audit History
-- Chronological log of every status transition for a case file with authorized admin.
SELECT 
    sh.history_id,
    sh.acquisition_id,
    COALESCE(sh.old_status::TEXT, 'INITIATED') AS previous_stage,
    sh.new_status AS new_stage,
    u.name AS authorized_by_admin,
    sh.changed_at
FROM status_history sh
JOIN users u ON sh.changed_by = u.user_id
WHERE sh.acquisition_id = 501
ORDER BY sh.history_id ASC;

-- @R15
-- READ: Project financial summary (Sanctioned budget vs Awarded compensation)
-- Screen: Ministry Financial Monitoring Dashboard
-- Aggregates total compensation awarded per project against sanctioned public budget.
SELECT 
    pr.project_id,
    pr.name AS project_name,
    pr.department,
    pr.budget AS sanctioned_budget,
    COUNT(DISTINCT a.acquisition_id) AS total_acquisitions,
    COALESCE(SUM(c.amount), 0.00) AS total_compensation_awarded,
    (pr.budget - COALESCE(SUM(c.amount), 0.00)) AS remaining_budget
FROM projects pr
LEFT JOIN acquisitions a ON pr.project_id = a.project_id
LEFT JOIN compensations c ON a.acquisition_id = c.acquisition_id
GROUP BY pr.project_id, pr.name, pr.department, pr.budget
ORDER BY pr.budget DESC;

-- @R16
-- READ: Village-level land acquisition impact analysis
-- Screen: Regional Planning & Survey Report
-- Aggregates acquired land area, parcel counts, and average circle rates per village.
SELECT 
    pa.village,
    COUNT(DISTINCT pa.parcel_id) AS total_parcels,
    SUM(pa.area_sqm) AS total_area_sqm,
    ROUND(AVG(pa.market_rate_per_sqm), 2) AS avg_circle_rate_sqm,
    SUM(pa.area_sqm * pa.market_rate_per_sqm) AS estimated_total_value
FROM parcels pa
JOIN acquisitions a ON pa.parcel_id = a.parcel_id
GROUP BY pa.village
ORDER BY total_area_sqm DESC;

-- @R17
-- READ: Compensation disbursement summary by payment status
-- Screen: Treasury Liquidity Report
-- Summarizes compensation voucher counts and monetary totals by payment status.
SELECT 
    payment_status,
    COUNT(*) AS voucher_count,
    SUM(amount) AS total_amount,
    ROUND(AVG(amount), 2) AS avg_payout_amount
FROM compensations
GROUP BY payment_status
ORDER BY total_amount DESC;

-- @R18
-- READ: Disputed acquisitions blocked by open objections
-- Screen: Legal Review & Escalation Dashboard
-- Identifies all acquisitions currently contested by at least one unresolved grievance.
SELECT 
    a.acquisition_id,
    pr.name AS project_name,
    pa.survey_number,
    pa.village,
    a.status AS acquisition_status,
    COUNT(ob.objection_id) AS total_objections,
    COUNT(CASE WHEN ob.status = 'OPEN' THEN 1 END) AS open_objections
FROM acquisitions a
JOIN projects pr   ON a.project_id = pr.project_id
JOIN parcels pa    ON a.parcel_id = pa.parcel_id
JOIN objections ob ON a.acquisition_id = ob.acquisition_id
GROUP BY a.acquisition_id, pr.name, pa.survey_number, pa.village, a.status
HAVING COUNT(CASE WHEN ob.status = 'OPEN' THEN 1 END) > 0;

-- @R19
-- READ: Cadastral land bank (Parcels not yet acquired)
-- Screen: Land Bank Corridor Planning
-- Lists registered land parcels that have not been earmarked for any government project.
SELECT 
    p.parcel_id,
    p.survey_number,
    p.village,
    p.area_sqm,
    p.market_rate_per_sqm
FROM parcels p
LEFT JOIN acquisitions a ON p.parcel_id = a.parcel_id
WHERE a.acquisition_id IS NULL
ORDER BY p.village, p.survey_number;

-- @R20
-- READ: Top beneficiary landowners by total compensation
-- Screen: High-Value Financial Compliance Audit
-- Ranks landowners receiving highest cumulative compensation awards across all schemes.
SELECT 
    o.owner_id,
    o.full_name AS landowner_name,
    o.phone,
    o.id_number,
    COUNT(c.compensation_id) AS compensation_count,
    SUM(c.amount) AS total_compensation_entitled
FROM owners o
JOIN compensations c ON o.owner_id = c.owner_id
GROUP BY o.owner_id, o.full_name, o.phone, o.id_number
ORDER BY total_compensation_entitled DESC
LIMIT 5;

-- @R21
-- READ: Acquisition casework handled by administrators
-- Screen: Administrative Workload Balancing
-- Counts total active acquisition cases managed by each administrator.
SELECT 
    u.user_id,
    u.name AS admin_name,
    u.email,
    COUNT(a.acquisition_id) AS total_cases_handled
FROM users u
LEFT JOIN acquisitions a ON u.user_id = a.created_by
WHERE u.role = 'ADMIN'
GROUP BY u.user_id, u.name, u.email
ORDER BY total_cases_handled DESC;

-- @R22
-- READ: Land title integrity check (Share percentage audit)
-- Screen: Database Integrity Verification
-- Flags any land parcel where the sum of ownership shares does not equal exactly 100%.
SELECT 
    p.parcel_id,
    p.survey_number,
    p.village,
    SUM(po.share_percent) AS total_share_percent,
    COUNT(po.owner_id) AS co_owner_count
FROM parcels p
JOIN parcel_owners po ON p.parcel_id = po.parcel_id
GROUP BY p.parcel_id, p.survey_number, p.village
HAVING SUM(po.share_percent) != 100.00;

-- @R23
-- READ: High-value land parcel acquisitions
-- Screen: Special Asset Oversight
-- Filters acquisitions whose total land market valuation exceeds ₹40,00,000 (₹40 Lakhs).
SELECT 
    a.acquisition_id,
    pr.name AS project_name,
    pa.survey_number,
    pa.village,
    pa.area_sqm,
    pa.market_rate_per_sqm,
    (pa.area_sqm * pa.market_rate_per_sqm) AS parcel_valuation
FROM acquisitions a
JOIN projects pr ON a.project_id = pr.project_id
JOIN parcels pa  ON a.parcel_id = pa.parcel_id
WHERE (pa.area_sqm * pa.market_rate_per_sqm) >= 4000000.00
ORDER BY parcel_valuation DESC;

-- @R24
-- READ: Acquisition pipeline SLA tracking and delay detection
-- Screen: Departmental SLA Monitoring
-- Lists uncompleted acquisitions sorted by oldest update time to detect stalled files.
SELECT 
    a.acquisition_id,
    pr.name AS project_name,
    pa.survey_number,
    a.status,
    u.name AS managing_admin,
    a.updated_at
FROM acquisitions a
JOIN projects pr ON a.project_id = pr.project_id
JOIN parcels pa  ON a.parcel_id = pa.parcel_id
JOIN users u     ON a.created_by = u.user_id
WHERE a.status != 'COMPLETED'
ORDER BY a.updated_at ASC;

-- @R25
-- READ: Grievance redressal resolution rate per project
-- Screen: Public Accountability & Citizen Redressal Report
-- Calculates percentage of filed objections resolved or rejected per infrastructure project.
SELECT 
    pr.project_id,
    pr.name AS project_name,
    COUNT(ob.objection_id) AS total_objections,
    COUNT(CASE WHEN ob.status IN ('RESOLVED', 'REJECTED') THEN 1 END) AS settled_objections,
    COUNT(CASE WHEN ob.status = 'OPEN' THEN 1 END) AS pending_objections,
    ROUND(
        COUNT(CASE WHEN ob.status IN ('RESOLVED', 'REJECTED') THEN 1 END)::NUMERIC / 
        NULLIF(COUNT(ob.objection_id), 0) * 100.0, 
        1
    ) AS resolution_rate_pct
FROM projects pr
JOIN acquisitions a  ON pr.project_id = a.project_id
JOIN objections ob   ON a.acquisition_id = ob.acquisition_id
GROUP BY pr.project_id, pr.name
ORDER BY total_objections DESC;

-- ============================================================================
-- ✍️ SECTION 2: WRITE QUERIES (W01 – W05)
-- ============================================================================

-- @W01
-- WRITE: Initiate a new land parcel acquisition case
-- Screen: Acquisition Initiation Form
-- Earmarks parcel P-102 (parcel_id=2) for Highway NH-167 (project_id=100) with status 'PROPOSED'.
INSERT INTO acquisitions (parcel_id, project_id, status, created_by)
VALUES (2, 100, 'PROPOSED', 1);

-- @W02
-- WRITE: Automated compensation computation and voucher generation
-- Screen: Valuation Engine
-- Computes pro-rata compensation (area * circle_rate * share%) for all co-owners of an acquisition.
INSERT INTO compensations (acquisition_id, owner_id, amount, payment_status)
SELECT 
    a.acquisition_id,
    po.owner_id,
    ROUND(pa.area_sqm * pa.market_rate_per_sqm * (po.share_percent / 100.0), 2) AS calculated_amount,
    'PENDING'::payment_status
FROM acquisitions a
JOIN parcels pa       ON a.parcel_id = pa.parcel_id
JOIN parcel_owners po ON pa.parcel_id = po.parcel_id
WHERE a.acquisition_id = 501
ON CONFLICT (acquisition_id, owner_id)
DO UPDATE SET amount = EXCLUDED.amount;

-- @W03
-- WRITE: Advance acquisition lifecycle stage
-- Screen: Admin Workflow State Transition
-- Advances acquisition status from VALUATED to COMPENSATED (trigger updates updated_at).
UPDATE acquisitions
SET status = 'COMPENSATED'
WHERE acquisition_id = 501;

-- @W04
-- WRITE: Landowner files formal grievance / objection
-- Screen: Citizen Dispute Submission Form
-- Submits a formal dispute challenging the boundary demarcation and valuation rate.
INSERT INTO objections (acquisition_id, owner_id, reason, status)
VALUES (501, 11, 'Demarcation survey encroaches on agricultural borewell infrastructure', 'OPEN');

-- @W05
-- WRITE: Disburse compensation payout to landowner
-- Screen: Treasury Payment Gateway
-- Updates compensation voucher to 'PAID' and records current timestamp.
UPDATE compensations
SET payment_status = 'PAID',
    payment_date = CURRENT_TIMESTAMP
WHERE acquisition_id = 501
  AND owner_id = 10;

-- @END
ROLLBACK;
-- Script safely rolled back; no test rows permanently committed to the database.
