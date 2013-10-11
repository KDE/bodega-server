/*
    Copyright 2013 Coherent Theory LLC

    This program is free software; you can redistribute it and/or
    modify it under the terms of the GNU General Public License as
    published by the Free Software Foundation; either version 2 of
    the License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>
*/


CREATE OR REPLACE FUNCTION tsv_add(tsv1 tsvector, tsv2 tsvector) RETURNS tsvector AS $$
BEGIN
    IF tsv1 IS NULL THEN
        RETURN tsv2;
    END IF;

    IF tsv2 IS NULL THEN
        RETURN tsv1;
    END IF;

    RETURN tsv1 || tsv2;
END;
$$ LANGUAGE plpgsql;

DROP AGGREGATE IF EXISTS concat_tsvectors(tsvector);
CREATE AGGREGATE concat_tsvectors (
    BASETYPE = tsvector,
    SFUNC = tsv_add,
    STYPE = tsvector,
    INITCOND = ''
);

CREATE OR REPLACE FUNCTION ct_updateAssetTagSearchIndex() RETURNS TRIGGER AS $$
DECLARE
    altered record;
    indicies record;
BEGIN
    IF TG_OP = 'DELETE' THEN
        altered := OLD;
    ELSE
        altered := NEW;
    END IF;

    SELECT INTO indicies at.asset as id, concat_tsvectors(t.en_index) as tags, concat_tsvectors(ee.en_index) as eggs
        FROM assettags at
            left join tags t on
            (t.id = at.tag and t.type in
                (select id from tagtypes where type in ('category', 'descriptive', 'author', 'contributor'))
            )
            left join tags ee on (ee.id = at.tag and ee.type in (select id from tagtypes where type = 'easter eggs'))
        where at.asset = altered.asset group by at.asset;
    UPDATE assets SET en_tagsIndex = indicies.tags, en_eggsIndex = indicies.eggs WHERE assets.id = indicies.id;

    RETURN altered;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ct_updateAssetTagSearchIndexes ON assetTags;
CREATE TRIGGER trg_ct_updateAssetTagSearchIndexes AFTER INSERT OR UPDATE OR DELETE ON assetTags
FOR EACH ROW EXECUTE PROCEDURE ct_updateAssetTagSearchIndex();


-- Search tags
ALTER TABLE tags ADD COLUMN en_index tsvector;
-- Trigger to update indices for the full text search
CREATE OR REPLACE FUNCTION ct_tagsIndexTrigger() RETURNS TRIGGER AS $$
BEGIN
  NEW.en_index := setweight(to_tsvector('pg_catalog.english', coalesce(NEW.title)), 'A');
  return NEW;
END
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS tsvectorupdate_tags ON tags;
CREATE TRIGGER tsvectorupdate_tags BEFORE INSERT OR UPDATE OF title
ON tags FOR EACH ROW EXECUTE PROCEDURE ct_tagsIndexTrigger();
CREATE INDEX tags_idx ON tags USING gin(en_index);
UPDATE tags SET en_index = setweight(to_tsvector('pg_catalog.english', coalesce(title)), 'A');

-- Search assets
ALTER TABLE assets ADD COLUMN en_index tsvector;
ALTER TABLE assets ADD COLUMN en_tagsIndex tsvector;
ALTER TABLE assets ADD COLUMN en_eggsIndex tsvector;
-- Trigger to update indices for the full text search
CREATE FUNCTION ct_assetsIndexTrigger() RETURNS TRIGGER AS $$
BEGIN
    NEW.en_index :=
            setweight(to_tsvector('pg_catalog.english', coalesce(NEW.name,'')), 'A') ||
            setweight(to_tsvector('pg_catalog.english', coalesce(NEW.description,'')), 'C');
    return NEW;
END
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS tsvectorupdate_assets ON assets;
CREATE TRIGGER tsvectorupdate_assets BEFORE INSERT OR UPDATE OF name 
ON assets FOR EACH ROW EXECUTE PROCEDURE ct_assetsIndexTrigger();
CREATE INDEX assets_idx ON assets USING gin(en_index);
CREATE INDEX assets_tagsidx ON assets USING gin(en_tagsIndex);
CREATE INDEX assets_eggsidx ON assets USING gin(en_eggsIndex);

-- Search channels
ALTER TABLE channels ADD COLUMN en_index tsvector;
-- Trigger to update indices for the full text search
CREATE FUNCTION ct_channelsIndexTrigger() RETURNS TRIGGER AS $$
BEGIN
    NEW.en_index :=
            setweight(to_tsvector('pg_catalog.english', coalesce(NEW.name,'')), 'A') ||
            setweight(to_tsvector('pg_catalog.english', coalesce(NEW.description,'')), 'C');
    return NEW;
END
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS tsvectorupdate_channels ON channels;
CREATE TRIGGER tsvectorupdate_channels BEFORE INSERT OR UPDATE OF name
ON channels FOR EACH ROW EXECUTE PROCEDURE ct_channelsIndexTrigger();
CREATE INDEX channels_idx ON channels USING gin(en_index);


-- Search partners
ALTER TABLE partners ADD COLUMN en_index tsvector;
-- Trigger to update indices for the full text search
CREATE FUNCTION ct_partnersIndexTrigger() RETURNS TRIGGER AS $$
BEGIN
    NEW.en_index := setweight(to_tsvector('pg_catalog.english', coalesce(NEW.name,'')), 'B');
    return NEW;
END
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS tsvectorupdate_partners ON partners;
CREATE TRIGGER tsvectorupdate_partners BEFORE INSERT OR UPDATE OF name
ON partners FOR EACH ROW EXECUTE PROCEDURE ct_partnersIndexTrigger();
CREATE INDEX partners_idx ON partners USING gin(en_index);


-- Search incomingassets
ALTER TABLE incomingassets ADD COLUMN en_index tsvector;
-- Trigger to update indices for the full text search
CREATE FUNCTION ct_incomingassetsIndexTrigger() RETURNS TRIGGER AS $$
BEGIN
    NEW.en_index :=
            setweight(to_tsvector('pg_catalog.english', coalesce(NEW.name,'')), 'A') ||
            setweight(to_tsvector('pg_catalog.english', coalesce(NEW.description,'')), 'C');
    return NEW;
END
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS tsvectorupdate_incomingassets ON incomingassets;
CREATE TRIGGER tsvectorupdate_incomingassets BEFORE INSERT OR UPDATE OF name 
ON incomingassets FOR EACH ROW EXECUTE PROCEDURE ct_incomingassetsIndexTrigger();
CREATE INDEX incomingassets_idx ON incomingassets USING gin(en_index);
