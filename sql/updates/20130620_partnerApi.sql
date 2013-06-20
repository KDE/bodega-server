INSERT INTO partnerContactServices (service, icon, baseUrl) VALUES ('website', null, null);
ALTER TABLE partners DROP COLUMN homepage;
ALTER TABLE partners RENAME COLUMN developer TO publisher;
