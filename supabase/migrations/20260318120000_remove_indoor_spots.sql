-- Remove all indoor/gymnasium spots from the database
-- These spots are no longer supported in the app filter/form
DELETE FROM spots WHERE type = 'indoor';
