-- Run this query in pgAdmin Query Tool to list all tables
SELECT 
    table_schema,
    table_name,
    table_type
FROM 
    information_schema.tables
WHERE 
    table_schema = 'public'
    AND table_type = 'BASE TABLE'
ORDER BY 
    table_name;

-- Expected tables:
-- - users
-- - attendances
-- - daily_order_submissions
-- - deductions
-- - warnings
-- - coupons
-- - refund_requests
-- - team_assignments
-- - data_purge_logs
-- - audit_logs

