create sequence seq_ratingsIds;

create table ratingAttributes
(
    id               int            primary key default nextval('seq_ratingsIds'),
    name             text           not null, -- e.g. 'Usability'
    lowDesc          text           not null, -- e.g. 'Very hard to use'
    highDesc         text           not null, -- e.g. 'Wonderfully designed'
    assetType        int            not null references tags(id) on delete cascade
);

create table ratings
(
    asset     int        not null references assets(id) on delete cascade,
    attribute int        not null references ratingAttributes(id) on delete cascade,
    person    int        not null references people(id) on delete cascade,
    rating    int        check (rating > 0 AND rating < 6),
    created   timestamp  not null default current_timestamp
);

create index ratings_asset on ratings(asset);

create table assetRatingAverages
(
    asset     int        not null references assets(id) on delete cascade,
    attribute int        not null references ratingAttributes(id) on delete cascade,
    rating    float      not null check (rating > 0 AND rating < 6),
    ratingsCount int     not null
);

create index assetRatingAverages_asset on assetRatingAverages(asset);

CREATE OR REPLACE FUNCTION ct_checkTagForRating() RETURNS TRIGGER AS $$
DECLARE
    tagId INT;
BEGIN
    SELECT INTO tagID t.id from tags t INNER JOIN tagtypes ttype ON (t.type = ttype.id) WHERE ttype.type = 'assetType' AND t.id = NEW.assetType;
    IF NOT FOUND THEN
        RAISE EXCEPTION '!!!!!!!!!!!The tag must have assetType as tagtype!!!!!!!!!!!!!';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_ct_checkTagForRating ON ratingAttributes;
CREATE TRIGGER trg_ct_checkTagForRating BEFORE INSERT OR UPDATE ON ratingAttributes
FOR EACH ROW EXECUTE PROCEDURE ct_checkTagForRating();

CREATE OR REPLACE FUNCTION ct_checkAssociationOfRatingAttributeWithAsset() RETURNS TRIGGER AS $$
DECLARE
    assetId INT;
BEGIN

    SELECT INTO assetId asset FROM assettags at INNER JOIN tags t ON (t.id = at.tag) INNER JOIN ratingattributes ra ON (ra.assettype = t.id) WHERE at.asset = NEW.asset and ra.id = NEW.attribute;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'The asset can''t be associated with the rating attribute ';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_ct_checkAssociationOfRatingAttributeWithAsset ON ratings;
CREATE TRIGGER trg_ct_checkAssociationOfRatingAttributeWithAsset BEFORE INSERT ON ratings
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

    -- we have to check if the table ratings has a rating for the specified asset and attribute.
    -- e.g. this query DELETE FROM ratings WHERE asset = 8; turns rating into NULL so if we try to
    -- to an INSERT INTO it will fail. This can happen only ON DELETE.
    SELECT INTO average round(avg(rating), 1) AS averageRating, count(rating) AS ratingsCount FROM ratings WHERE asset = assetId AND attribute = attributeId;
    IF average IS NULL AND TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    INSERT INTO assetRatingAverages (asset, attribute, rating, ratingsCount) VALUES (assetId, attributeId, average.averageRating, average.ratingsCount);
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_ct_sumForAsetRatings ON ratings;
CREATE TRIGGER trg_ct_sumForAssetRatings AFTER INSERT OR DELETE ON ratings
FOR EACH ROW EXECUTE PROCEDURE ct_sumForAssetRatings();

CREATE OR REPLACE FUNCTION ct_blockSumForAssetRatings() RETURNS TRIGGER AS $$
DECLARE
BEGIN
    RAISE EXCEPTION 'You can''t update the rating of an asset.';
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_ct_blockSumForAssetRatings ON ratings;
CREATE TRIGGER trg_ct_blockSumForAssetRatings BEFORE UPDATE ON ratings
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
        DELETE FROM ratings WHERE asset = assetId AND person = personId AND attribute = ratingElement[2];

        -- no check again. If the values are ok we are done, and if they don't trg_ct_checkAssociationOfRatingAttributeWithAsset
        -- will fix it for us.
        INSERT INTO ratings (asset, attribute, person, rating) VALUES (assetId, ratingElement[2], personId, ratingElement[1]);
    END LOOP;
END;
$$ LANGUAGE 'plpgsql';

