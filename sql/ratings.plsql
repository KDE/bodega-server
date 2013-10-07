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


CREATE OR REPLACE FUNCTION ct_checkTagForRating() RETURNS TRIGGER AS $$
DECLARE
    tagId INT;
BEGIN
    SELECT INTO tagID t.id from tags t INNER JOIN tagtypes ttype ON (t.type = ttype.id) WHERE ttype.type = 'assetType' AND t.id = NEW.assetType;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'The tag must have assetType as tagtype'
              USING ERRCODE = 'CTR02';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_ct_checkTagForRating ON assetRatingAttributes;
CREATE TRIGGER trg_ct_checkTagForRating BEFORE INSERT OR UPDATE ON assetRatingAttributes
FOR EACH ROW EXECUTE PROCEDURE ct_checkTagForRating();

CREATE OR REPLACE FUNCTION ct_checkAssociationOfRatingAttributeWithAsset() RETURNS TRIGGER AS $$
DECLARE
    assetId INT;
BEGIN
    SELECT INTO assetId asset FROM assettags at INNER JOIN tags t ON (t.id = at.tag) INNER JOIN assetRatingAttributes ra ON (ra.assettype = t.id) WHERE at.asset = NEW.asset and ra.id = NEW.attribute;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'The asset can not be associated with the rating attribute '
              USING ERRCODE = 'CTR01';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_ct_checkAssociationOfRatingAttributeWithAsset ON assetRatings;
CREATE TRIGGER trg_ct_checkAssociationOfRatingAttributeWithAsset BEFORE INSERT ON assetRatings
FOR EACH ROW EXECUTE PROCEDURE ct_checkAssociationOfRatingAttributeWithAsset();

CREATE OR REPLACE FUNCTION ct_sumForAssetRatings() RETURNS TRIGGER AS $$
DECLARE
    assetId INT;
    attributeId INT;
    average RECORD;
BEGIN
    IF TG_OP = 'DELETE' THEN
        assetId := OLD.asset;
        attributeId := OLD.attribute;
    ELSE
        assetId := NEW.asset;
        attributeId := NEW.attribute;
    END IF;

    DELETE FROM assetRatingAverages WHERE asset = assetId AND attribute = attributeId;

    -- we have to check if the table assetRatings has a rating for the specified asset and attribute.
    -- e.g. this query DELETE FROM assetRatings WHERE asset = 8; turns rating into NULL so if we try to
    -- to an INSERT INTO it will fail. This can happen only ON DELETE.
    SELECT INTO average round(avg(rating), 1) AS averageRating, count(rating) AS ratingsCount FROM assetRatings WHERE asset = assetId AND attribute = attributeId;
    IF average.averageRating IS NULL AND TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    INSERT INTO assetRatingAverages (asset, attribute, rating, ratingsCount) VALUES (assetId, attributeId, average.averageRating, average.ratingsCount);
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_ct_sumForAssetRatings ON assetRatings;
CREATE TRIGGER trg_ct_sumForAssetRatings AFTER INSERT OR DELETE ON assetRatings
FOR EACH ROW EXECUTE PROCEDURE ct_sumForAssetRatings();

CREATE OR REPLACE FUNCTION ct_blockSumForAssetRatings() RETURNS TRIGGER AS $$
DECLARE
BEGIN
    RAISE EXCEPTION 'You can''t update the rating of an asset.'
          USING ERRCODE = 'CTR03';
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_ct_blockSumForAssetRatings ON assetRatings;
CREATE TRIGGER trg_ct_blockSumForAssetRatings BEFORE UPDATE ON assetRatings
FOR EACH ROW EXECUTE PROCEDURE ct_blockSumForAssetRatings();

CREATE OR REPLACE FUNCTION ct_addAssetRating(personId int, assetId int, ratings int[][]) RETURNS VOID AS $$
DECLARE
    ratingElement  int[];
BEGIN
    FOREACH ratingElement SLICE 1 IN ARRAY ratings LOOP
        -- its safe to delete from the ratings without checking.
        -- Best case scenario the attribute id can be associated with the asset and
        -- it deletes it from the ratings, worst case scenario it doesn't delete anything
        -- because there is nothing in the table to delete, we can't have invalid entries
        -- in the ratings due to trg_ct_checkAssociationOfRatingAttributeWithAsset
        DELETE FROM assetRatings WHERE asset = assetId AND person = personId AND attribute = ratingElement[1];

        -- no check again. If the values are ok we are done, and if they don't trg_ct_checkAssociationOfRatingAttributeWithAsset
        -- will fix it for us.
        INSERT INTO assetRatings (asset, attribute, person, rating) VALUES (assetId, ratingElement[1], personId, ratingElement[2]);
    END LOOP;
END;
$$ LANGUAGE 'plpgsql';

