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
    rating    int        check (rating > 0 AND rating < 6)
);

create index ratings_asset on ratings(asset);

create table assetRatingAverages
(
    asset     int        not null references assets(id) on delete cascade,
    attribute int        not null references ratingAttributes(id) on delete cascade,
    rating    float      not null check (rating > 0 AND rating < 6)
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

CREATE OR REPLACE FUNCTION ct_sumForAssetRatings() RETURNS TRIGGER AS $$
DECLARE
BEGIN
    DELETE FROM assetRatingAverages WHERE asset = NEW.asset;
    INSERT INTO assetRatingAverages (asset, attribute, rating) SELECT asset, attribute, round(avg(rating), 1) from ratings WHERE asset = NEW.asset GROUP BY asset, attribute;

    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_ct_checkTagForRating ON ratings;
CREATE TRIGGER trg_ct_sumForAssetRatings AFTER INSERT OR UPDATE ON ratings
FOR EACH ROW EXECUTE PROCEDURE ct_sumForAssetRatings();

