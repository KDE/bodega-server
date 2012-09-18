-- Search tags
ALTER TABLE tags ADD COLUMN en_index tsvector;
-- Trigger to update indices for the full text search
CREATE OR REPLACE FUNCTION ct_tagsIndexTrigger() RETURNS TRIGGER AS $$
BEGIN
  new.en_index := setweight(to_tsvector('pg_catalog.english', coalesce(new.title)), 'A');
  return new;
END
$$ LANGUAGE plpgsql;
CREATE TRIGGER tsvectorupdate_tags BEFORE INSERT OR UPDATE
ON tags FOR EACH ROW EXECUTE PROCEDURE ct_tagsIndexTrigger();
CREATE INDEX tags_idx ON tags USING gin(en_index);
UPDATE tags SET en_index = setweight(to_tsvector('pg_catalog.english', coalesce(title)), 'A');

-- Search assets
ALTER TABLE assets ADD COLUMN en_index tsvector;
-- Trigger to update indices for the full text search
CREATE FUNCTION ct_assetsIndexTrigger() RETURNS TRIGGER AS $$
BEGIN
  new.en_index :=
    setweight(to_tsvector('pg_catalog.english', coalesce(new.name,'')), 'A') ||
    setweight(to_tsvector('pg_catalog.english', coalesce(new.description,'')), 'C');
  return new;
END
$$ LANGUAGE plpgsql;
CREATE TRIGGER tsvectorupdate_assets BEFORE INSERT OR UPDATE
ON assets FOR EACH ROW EXECUTE PROCEDURE ct_assetsIndexTrigger();
CREATE INDEX assets_idx ON assets USING gin(en_index);

-- Search channels
ALTER TABLE channels ADD COLUMN en_index tsvector;
-- Trigger to update indices for the full text search
CREATE FUNCTION ct_channelsIndexTrigger() RETURNS TRIGGER AS $$
BEGIN
  new.en_index :=
    setweight(to_tsvector('pg_catalog.english', coalesce(new.name,'')), 'A') ||
    setweight(to_tsvector('pg_catalog.english', coalesce(new.description,'')), 'C');
  return new;
END
$$ LANGUAGE plpgsql;
CREATE TRIGGER tsvectorupdate_channels BEFORE INSERT OR UPDATE
ON channels FOR EACH ROW EXECUTE PROCEDURE ct_channelsIndexTrigger();
CREATE INDEX channels_idx ON channels USING gin(en_index);


-- Search partners
ALTER TABLE partners ADD COLUMN en_index tsvector;
-- Trigger to update indices for the full text search
CREATE FUNCTION ct_partnersIndexTrigger() RETURNS TRIGGER AS $$
BEGIN
  new.en_index :=
    setweight(to_tsvector('pg_catalog.english', coalesce(new.name,'')), 'B');
  return new;
END
$$ LANGUAGE plpgsql;
CREATE TRIGGER tsvectorupdate_partners BEFORE INSERT OR UPDATE
ON partners FOR EACH ROW EXECUTE PROCEDURE ct_partnersIndexTrigger();
CREATE INDEX partners_idx ON partners USING gin(en_index);
