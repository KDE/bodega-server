-- Search tags
ALTER TABLE tags ADD COLUMN en_index tsvector;
-- Trigger to update indices for the full text search
CREATE OR REPLACE FUNCTION ct_tagsIndexTrigger() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.title != OLD.title THEN
    NEW.en_index := setweight(to_tsvector('pg_catalog.english', coalesce(NEW.title)), 'A');
  END IF;
  return NEW;
END
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS tsvectorupdate_tags ON tags;
CREATE TRIGGER tsvectorupdate_tags BEFORE INSERT OR UPDATE
ON tags FOR EACH ROW EXECUTE PROCEDURE ct_tagsIndexTrigger();
CREATE INDEX tags_idx ON tags USING gin(en_index);
UPDATE tags SET en_index = setweight(to_tsvector('pg_catalog.english', coalesce(title)), 'A');

-- Search assets
ALTER TABLE assets ADD COLUMN en_index tsvector;
-- Trigger to update indices for the full text search
CREATE FUNCTION ct_assetsIndexTrigger() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR NEW.title != OLD.title OR NEW.description != OLD.description THEN
        NEW.en_index :=
            setweight(to_tsvector('pg_catalog.english', coalesce(NEW.name,'')), 'A') ||
            setweight(to_tsvector('pg_catalog.english', coalesce(NEW.description,'')), 'C');
    END IF;
    return NEW;
END
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS tsvectorupdate_assets ON assets;
CREATE TRIGGER tsvectorupdate_assets BEFORE INSERT OR UPDATE
ON assets FOR EACH ROW EXECUTE PROCEDURE ct_assetsIndexTrigger();
CREATE INDEX assets_idx ON assets USING gin(en_index);

-- Search channels
ALTER TABLE channels ADD COLUMN en_index tsvector;
-- Trigger to update indices for the full text search
CREATE FUNCTION ct_channelsIndexTrigger() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR NEW.title != OLD.title OR NEW.description != OLD.description THEN
        NEW.en_index :=
            setweight(to_tsvector('pg_catalog.english', coalesce(NEW.name,'')), 'A') ||
            setweight(to_tsvector('pg_catalog.english', coalesce(NEW.description,'')), 'C');
    END IF;
    return NEW;
END
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS tsvectorupdate_channels ON channels;
CREATE TRIGGER tsvectorupdate_channels BEFORE INSERT OR UPDATE
ON channels FOR EACH ROW EXECUTE PROCEDURE ct_channelsIndexTrigger();
CREATE INDEX channels_idx ON channels USING gin(en_index);


-- Search partners
ALTER TABLE partners ADD COLUMN en_index tsvector;
-- Trigger to update indices for the full text search
CREATE FUNCTION ct_partnersIndexTrigger() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR NEW.name != OLD.name THEN
        NEW.en_index := setweight(to_tsvector('pg_catalog.english', coalesce(NEW.name,'')), 'B');
    END IF;
    return NEW;
END
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS tsvectorupdate_partners ON partners;
CREATE TRIGGER tsvectorupdate_partners BEFORE INSERT OR UPDATE
ON partners FOR EACH ROW EXECUTE PROCEDURE ct_partnersIndexTrigger();
CREATE INDEX partners_idx ON partners USING gin(en_index);
