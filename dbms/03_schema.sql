-- ============================================================================
-- File:        03_schema.sql
-- Project:     Real-Time Land Acquisition & Management System
-- Purpose:     PostgreSQL-Only Database Schema Definition (DDL) & Seed Data
-- Database:    PostgreSQL (12.0+)
-- Level:       Basic Beginner / Newbie Friendly 🚀
-- Author:      Data Engineering Team
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 💡 BEGINNER GUIDE: HOW TO RUN THIS IN POSTGRESQL
-- ----------------------------------------------------------------------------
-- 1. Using the psql Command Line:
--      createdb -U postgres land_acquisition
--      psql -U postgres -d land_acquisition -f dbms/03_schema.sql
--
-- 2. From inside the psql interactive shell:
--      postgres=# \c land_acquisition
--      land_acquisition=# \i dbms/03_schema.sql
--
-- 3. Using Graphical Tools (pgAdmin 4, DBeaver, TablePlus):
--      - Create a database named 'land_acquisition'.
--      - Open the Query Tool (Ctrl+E or Cmd+E).
--      - Open and execute this entire file.
-- ----------------------------------------------------------------------------

-- ============================================================================
-- 🧹 SECTION 1: CLEANUP / RESET (SAFE RE-RUNNABLE SCRIPT)
-- ============================================================================
-- PostgreSQL's 'CASCADE' automatically drops dependent foreign keys, triggers,
-- and views so you can run this script repeatedly without errors!

DROP VIEW IF EXISTS view_active_acquisitions CASCADE;
DROP VIEW IF EXISTS view_landowner_compensations CASCADE;

DROP TABLE IF EXISTS status_history CASCADE;
DROP TABLE IF EXISTS objections CASCADE;
DROP TABLE IF EXISTS compensations CASCADE;
DROP TABLE IF EXISTS acquisitions CASCADE;
DROP TABLE IF EXISTS parcel_owners CASCADE;
DROP TABLE IF EXISTS parcels CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS owners CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TRIGGER IF EXISTS trg_acquisitions_updated_at ON acquisitions CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

DROP TYPE IF EXISTS objection_status CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS acquisition_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- ============================================================================
-- 🏷️ SECTION 2: POSTGRESQL CUSTOM ENUM TYPES
-- ============================================================================
-- Why ENUMs in PostgreSQL?
-- Instead of plain text strings, PostgreSQL ENUMs strictly restrict column
-- values to valid options only, preventing typos and saving disk storage.

CREATE TYPE user_role AS ENUM (
    'ADMIN',
    'OWNER'
);

CREATE TYPE acquisition_status AS ENUM (
    'PROPOSED',
    'NOTIFIED',
    'VALUATED',
    'COMPENSATED',
    'COMPLETED'
);

CREATE TYPE payment_status AS ENUM (
    'PENDING',
    'PROCESSING',
    'PAID',
    'FAILED'
);

CREATE TYPE objection_status AS ENUM (
    'OPEN',
    'UNDER_REVIEW',
    'RESOLVED',
    'REJECTED'
);

-- ============================================================================
-- ⚡ SECTION 3: AUTOMATED TIMESTAMP TRIGGER FUNCTION
-- ============================================================================
-- A classic PostgreSQL feature: Automatically updates the 'updated_at' column
-- whenever a row is modified, guaranteeing accurate audit timestamps.

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 📦 SECTION 4: TABLE DEFINITIONS (DDL)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table 1: users (System Logins & Staff Roles)
-- Purpose: Tracks administrators and landowners using the system.
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    user_id     SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    role        user_role    NOT NULL DEFAULT 'OWNER',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE users IS 'System accounts for administrators and landowners.';
COMMENT ON COLUMN users.user_id IS 'Auto-incrementing surrogate primary key.';
COMMENT ON COLUMN users.email IS 'Unique official login email address.';
COMMENT ON COLUMN users.role IS 'User role enum: ADMIN or OWNER.';

-- ----------------------------------------------------------------------------
-- Table 2: owners (Landowner Citizen Registry)
-- Purpose: Stores legal identity and contact details of citizens owning land.
-- ----------------------------------------------------------------------------
CREATE TABLE owners (
    owner_id    SERIAL PRIMARY KEY,
    full_name   VARCHAR(100) NOT NULL,
    phone       VARCHAR(15)  NOT NULL,
    id_number   VARCHAR(50)  NOT NULL UNIQUE,  -- Aadhaar, PAN, or National ID
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE owners IS 'Registry of citizens holding legal land rights.';
COMMENT ON COLUMN owners.id_number IS 'Unique national identification (Aadhaar/PAN).';

-- ----------------------------------------------------------------------------
-- Table 3: projects (Government Schemes & Public Works)
-- Purpose: Infrastructure schemes (e.g., Highway NH-167) that need land.
-- ----------------------------------------------------------------------------
CREATE TABLE projects (
    project_id  SERIAL PRIMARY KEY,
    name        VARCHAR(150)   NOT NULL,
    department  VARCHAR(100)   NOT NULL,
    budget      NUMERIC(15,2)  NOT NULL CHECK (budget >= 0),
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE projects IS 'Government public infrastructure schemes.';
COMMENT ON COLUMN projects.budget IS 'Total allocated budget in INR (must be non-negative).';

-- ----------------------------------------------------------------------------
-- Table 4: parcels (Land Cadastral Registry)
-- Purpose: Registered land plots with official survey numbers and market valuation.
-- ----------------------------------------------------------------------------
CREATE TABLE parcels (
    parcel_id           SERIAL PRIMARY KEY,
    survey_number       VARCHAR(50)    NOT NULL UNIQUE,
    village             VARCHAR(100)   NOT NULL,
    area_sqm            NUMERIC(12,2)  NOT NULL CHECK (area_sqm > 0),
    market_rate_per_sqm NUMERIC(12,2)  NOT NULL CHECK (market_rate_per_sqm > 0),
    created_at          TIMESTAMPTZ    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE parcels IS 'Cadastral registry of surveyed land parcels.';
COMMENT ON COLUMN parcels.survey_number IS 'Unique official land survey number.';
COMMENT ON COLUMN parcels.area_sqm IS 'Total parcel area in square meters (> 0).';
COMMENT ON COLUMN parcels.market_rate_per_sqm IS 'Official circle rate per square meter (> 0).';

-- ----------------------------------------------------------------------------
-- Table 5: parcel_owners (Many-to-Many Bridge Table)
-- Purpose: Resolves Many-to-Many relationship between parcels and owners.
--          Stores the exact percentage share owned by each citizen.
-- ----------------------------------------------------------------------------
CREATE TABLE parcel_owners (
    parcel_id      INTEGER       NOT NULL REFERENCES parcels(parcel_id) ON DELETE CASCADE,
    owner_id       INTEGER       NOT NULL REFERENCES owners(owner_id)   ON DELETE CASCADE,
    share_percent  NUMERIC(5,2)  NOT NULL CHECK (share_percent > 0 AND share_percent <= 100),
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Composite Primary Key: Guarantees one record per parcel-owner pair
    PRIMARY KEY (parcel_id, owner_id)
);

COMMENT ON TABLE parcel_owners IS 'Many-to-Many junction table mapping owners to parcels with share %.';
COMMENT ON COLUMN parcel_owners.share_percent IS 'Ownership percentage share (0.01 to 100.00).';

-- ----------------------------------------------------------------------------
-- Table 6: acquisitions (Core Workflow Engine)
-- Purpose: Earmarks a land parcel for a project and advances through the 5 stages:
--          PROPOSED -> NOTIFIED -> VALUATED -> COMPENSATED -> COMPLETED
-- ----------------------------------------------------------------------------
CREATE TABLE acquisitions (
    acquisition_id  SERIAL PRIMARY KEY,
    parcel_id       INTEGER            NOT NULL REFERENCES parcels(parcel_id)   ON DELETE RESTRICT,
    project_id      INTEGER            NOT NULL REFERENCES projects(project_id) ON DELETE RESTRICT,
    status          acquisition_status NOT NULL DEFAULT 'PROPOSED',
    created_by      INTEGER            NOT NULL REFERENCES users(user_id)       ON DELETE RESTRICT,
    created_at      TIMESTAMPTZ        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Prevents acquiring the same parcel twice for the same project
    CONSTRAINT uq_parcel_project UNIQUE (parcel_id, project_id)
);

COMMENT ON TABLE acquisitions IS 'Central workflow engine coordinating land acquisition.';
COMMENT ON COLUMN acquisitions.status IS 'Current lifecycle stage enum.';

-- Attach the PostgreSQL trigger to keep 'updated_at' current
CREATE TRIGGER trg_acquisitions_updated_at
BEFORE UPDATE ON acquisitions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Table 7: compensations (Calculated Payout per Landowner)
-- Purpose: Stores calculated compensation money for each owner.
-- Formula: area_sqm * market_rate_per_sqm * (share_percent / 100)
-- ----------------------------------------------------------------------------
CREATE TABLE compensations (
    compensation_id SERIAL PRIMARY KEY,
    acquisition_id  INTEGER        NOT NULL REFERENCES acquisitions(acquisition_id) ON DELETE CASCADE,
    owner_id        INTEGER        NOT NULL REFERENCES owners(owner_id)             ON DELETE CASCADE,
    amount          NUMERIC(15,2)  NOT NULL CHECK (amount >= 0),
    payment_status  payment_status NOT NULL DEFAULT 'PENDING',
    payment_date    TIMESTAMPTZ    NULL,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Ensures exactly one compensation voucher per owner per acquisition
    CONSTRAINT uq_acquisition_owner UNIQUE (acquisition_id, owner_id)
);

COMMENT ON TABLE compensations IS 'Financial compensation ledger per landowner.';
COMMENT ON COLUMN compensations.amount IS 'Calculated compensation payout in INR.';

-- ----------------------------------------------------------------------------
-- Table 8: objections (Landowner Disputes & Grievance Redressal)
-- Purpose: Allows landowners to formally challenge an acquisition (e.g. low rate).
-- ----------------------------------------------------------------------------
CREATE TABLE objections (
    objection_id    SERIAL PRIMARY KEY,
    acquisition_id  INTEGER          NOT NULL REFERENCES acquisitions(acquisition_id) ON DELETE CASCADE,
    owner_id        INTEGER          NOT NULL REFERENCES owners(owner_id)             ON DELETE CASCADE,
    reason          TEXT             NOT NULL,
    status          objection_status NOT NULL DEFAULT 'OPEN',
    filed_at        TIMESTAMPTZ      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at     TIMESTAMPTZ      NULL
);

COMMENT ON TABLE objections IS 'Disputes and grievances filed by landowners.';
COMMENT ON COLUMN objections.status IS 'Grievance status enum: OPEN, UNDER_REVIEW, RESOLVED, REJECTED.';

-- ----------------------------------------------------------------------------
-- Table 9: status_history (Immutable Real-Time Audit Log)
-- Purpose: Records every lifecycle state transition for legal transparency.
-- ----------------------------------------------------------------------------
CREATE TABLE status_history (
    history_id      SERIAL PRIMARY KEY,
    acquisition_id  INTEGER            NOT NULL REFERENCES acquisitions(acquisition_id) ON DELETE CASCADE,
    old_status      acquisition_status NULL,
    new_status      acquisition_status NOT NULL,
    changed_by      INTEGER            NOT NULL REFERENCES users(user_id)               ON DELETE RESTRICT,
    changed_at      TIMESTAMPTZ        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE status_history IS 'Tamper-evident audit trail of all workflow stage transitions.';

-- ============================================================================
-- ⚡ SECTION 5: PERFORMANCE INDEXES (POSTGRESQL B-TREE)
-- ============================================================================
-- These indexes accelerate joins and filter queries across large datasets.

CREATE INDEX idx_parcels_survey_number   ON parcels(survey_number);
CREATE INDEX idx_owners_id_number       ON owners(id_number);
CREATE INDEX idx_users_email            ON users(email);
CREATE INDEX idx_acquisitions_status    ON acquisitions(status);
CREATE INDEX idx_compensations_status   ON compensations(payment_status);
CREATE INDEX idx_objections_status      ON objections(status);
CREATE INDEX idx_status_history_acq     ON status_history(acquisition_id);

-- ============================================================================
-- 🌱 SECTION 6: INITIAL SEED DATA (FROM 01_NORMALIZATION.MD)
-- ============================================================================

-- 1. Insert Administrator Account
INSERT INTO users (user_id, name, email, role) VALUES
(1, 'Admin Sharma', 'admin@ap.gov.in', 'ADMIN');

-- 2. Insert Landowners
INSERT INTO owners (owner_id, full_name, phone, id_number) VALUES
(10, 'Suresh Reddy',   '9848011111', 'ID-901'),
(11, 'Ramesh Reddy',   '9848022222', 'ID-902'),
(12, 'Venkatesh Rao',  '9848033333', 'ID-903');

-- 3. Insert Land Parcels
-- Parcel 1: Nandyal (10,000 sqm @ Rs 500 = Rs 50,00,000 Total Value)
-- Parcel 2: Allagadda (4,000 sqm @ Rs 1,200 = Rs 48,00,000 Total Value)
INSERT INTO parcels (parcel_id, survey_number, village, area_sqm, market_rate_per_sqm) VALUES
(1, 'P-101', 'Nandyal',   10000.00,  500.00),
(2, 'P-102', 'Allagadda',  4000.00, 1200.00);

-- 4. Assign Parcel Ownership Shares (Total per parcel = 100%)
-- P-101 is co-owned: Suresh (60%) and Ramesh (40%)
-- P-102 is sole-owned: Venkatesh (100%)
INSERT INTO parcel_owners (parcel_id, owner_id, share_percent) VALUES
(1, 10,  60.00),
(1, 11,  40.00),
(2, 12, 100.00);

-- 5. Insert Government Infrastructure Project
INSERT INTO projects (project_id, name, department, budget) VALUES
(100, 'Highway NH-167', 'NHAI', 50000000.00); -- Rs 5 Crore budget

-- 6. Initiate Acquisition of Parcel P-101 for Highway NH-167
INSERT INTO acquisitions (acquisition_id, parcel_id, project_id, status, created_by) VALUES
(501, 1, 100, 'VALUATED', 1);

-- 7. Calculate Compensations for Acquisition 501
-- Suresh (60% of 50 Lakh) = Rs 30,00,000 (Pending)
-- Ramesh (40% of 50 Lakh) = Rs 20,00,000 (Paid)
INSERT INTO compensations (compensation_id, acquisition_id, owner_id, amount, payment_status, payment_date) VALUES
(1, 501, 10, 3000000.00, 'PENDING', NULL),
(2, 501, 11, 2000000.00, 'PAID',    CURRENT_TIMESTAMP);

-- 8. Record Landowner Objection
-- Suresh Reddy raises an objection citing low compensation valuation
INSERT INTO objections (objection_id, acquisition_id, owner_id, reason, status) VALUES
(1, 501, 10, 'Compensation rate too low compared to market value', 'OPEN');

-- 9. Audit History for Acquisition 501
INSERT INTO status_history (history_id, acquisition_id, old_status, new_status, changed_by) VALUES
(1, 501, 'PROPOSED', 'NOTIFIED', 1),
(2, 501, 'NOTIFIED', 'VALUATED', 1);

-- Synchronize PostgreSQL auto-increment sequences after explicit ID inserts
SELECT setval('users_user_id_seq',           COALESCE((SELECT MAX(user_id)        FROM users), 1));
SELECT setval('owners_owner_id_seq',         COALESCE((SELECT MAX(owner_id)       FROM owners), 1));
SELECT setval('parcels_parcel_id_seq',       COALESCE((SELECT MAX(parcel_id)      FROM parcels), 1));
SELECT setval('projects_project_id_seq',     COALESCE((SELECT MAX(project_id)    FROM projects), 1));
SELECT setval('acquisitions_acquisition_id_seq', COALESCE((SELECT MAX(acquisition_id) FROM acquisitions), 1));
SELECT setval('compensations_compensation_id_seq', COALESCE((SELECT MAX(compensation_id) FROM compensations), 1));
SELECT setval('objections_objection_id_seq', COALESCE((SELECT MAX(objection_id)   FROM objections), 1));
SELECT setval('status_history_history_id_seq', COALESCE((SELECT MAX(history_id)   FROM status_history), 1));

-- ============================================================================
-- 👓 SECTION 7: CONVENIENT POSTGRESQL VIEWS
-- ============================================================================

-- View 1: Active Acquisition Pipeline
CREATE OR REPLACE VIEW view_active_acquisitions AS
SELECT
    a.acquisition_id,
    pr.name AS project_name,
    pr.department,
    pa.survey_number,
    pa.village,
    pa.area_sqm,
    a.status AS workflow_status,
    u.name AS managing_admin,
    a.updated_at AS last_updated
FROM acquisitions a
JOIN projects pr ON a.project_id = pr.project_id
JOIN parcels pa  ON a.parcel_id = pa.parcel_id
JOIN users u     ON a.created_by = u.user_id;

-- View 2: Landowner Compensation Summary
CREATE OR REPLACE VIEW view_landowner_compensations AS
SELECT
    c.compensation_id,
    a.acquisition_id,
    pr.name AS project_name,
    pa.survey_number,
    o.full_name AS landowner_name,
    o.phone,
    po.share_percent,
    c.amount AS compensation_amount,
    c.payment_status,
    c.payment_date
FROM compensations c
JOIN acquisitions a  ON c.acquisition_id = a.acquisition_id
JOIN projects pr     ON a.project_id = pr.project_id
JOIN parcels pa      ON a.parcel_id = pa.parcel_id
JOIN owners o        ON c.owner_id = o.owner_id
JOIN parcel_owners po ON (pa.parcel_id = po.parcel_id AND o.owner_id = po.owner_id);

-- ============================================================================
-- 🔍 SECTION 8: BEGINNER VERIFICATION & REPORTING QUERIES
-- ============================================================================
-- Run these in psql or pgAdmin to inspect your data!

-- Query 1: Land Registry Breakdown
SELECT
    p.survey_number,
    p.village,
    p.area_sqm,
    o.full_name AS owner_name,
    o.phone,
    po.share_percent || '%' AS ownership_share
FROM parcels p
JOIN parcel_owners po ON p.parcel_id = po.parcel_id
JOIN owners o        ON po.owner_id = o.owner_id
ORDER BY p.survey_number, po.share_percent DESC;

-- Query 2: Active Pipeline from View
SELECT * FROM view_active_acquisitions;

-- Query 3: Formatted Financial Compensation Ledger (INR Currency Format)
SELECT
    landowner_name,
    phone,
    survey_number,
    share_percent || '%' AS share,
    '₹ ' || TO_CHAR(compensation_amount, 'FM99,99,99,990.00') AS formatted_compensation,
    payment_status,
    COALESCE(TO_CHAR(payment_date, 'YYYY-MM-DD HH24:MI:SS'), 'PENDING DISBURSEMENT') AS disbursement_time
FROM view_landowner_compensations;

-- Query 4: Open Landowner Queries Requiring Admin Review
SELECT
    ob.objection_id,
    a.acquisition_id,
    pa.survey_number,
    o.full_name AS complainant,
    ob.reason,
    ob.status AS grievance_status,
    TO_CHAR(ob.filed_at, 'YYYY-MM-DD HH24:MI:SS') AS filed_on
FROM objections ob
JOIN acquisitions a ON ob.acquisition_id = a.acquisition_id
JOIN parcels pa     ON a.parcel_id = pa.parcel_id
JOIN owners o       ON ob.owner_id = o.owner_id
WHERE ob.status = 'OPEN';

-- Query 5: Full Audit History of State Transitions
SELECT
    sh.history_id,
    sh.acquisition_id,
    COALESCE(sh.old_status::TEXT, 'INITIATED') AS from_stage,
    sh.new_status::TEXT AS to_stage,
    u.name AS authorized_by,
    TO_CHAR(sh.changed_at, 'YYYY-MM-DD HH24:MI:SS') AS timestamp
FROM status_history sh
JOIN users u ON sh.changed_by = u.user_id
WHERE sh.acquisition_id = 501
ORDER BY sh.history_id ASC;
