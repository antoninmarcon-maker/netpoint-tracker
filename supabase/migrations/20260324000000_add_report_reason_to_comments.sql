-- Add report_reason column to spot_comments for spot deletion requests
ALTER TABLE spot_comments
ADD COLUMN IF NOT EXISTS report_reason text DEFAULT NULL;

COMMENT ON COLUMN spot_comments.report_reason IS 'Reason for reporting: gone, duplicate, wrong_location, wrong_info, other. NULL for normal comments.';
