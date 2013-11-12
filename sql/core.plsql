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


-- CREATE LANGUAGE plpgsql;

-- TRIGGER function for creating full name
CREATE OR REPLACE FUNCTION ct_generateFullname() RETURNS TRIGGER AS $$
DECLARE
BEGIN
    NEW.fullName = NEW.firstName || ' ' || NEW.lastName;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ct_generateFullName ON people;
CREATE TRIGGER trg_ct_generateFullName BEFORE UPDATE OF firstName, lastName OR INSERT ON people
FOR EACH ROW EXECUTE PROCEDURE ct_generateFullname();

CREATE OR REPLACE FUNCTION ct_recordAccountActivated() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.active THEN
        NEW.activated = current_timestamp;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ct_markAccountedActivated ON people;
CREATE TRIGGER trg_ct_markAccountedActivated BEFORE UPDATE OF active ON people
FOR EACH ROW EXECUTE PROCEDURE ct_recordAccountActivated();

-- TRIGGER function for checking that a parent channel and this channel are owned by the same partner
CREATE OR REPLACE FUNCTION ct_checkChannelUpdate() RETURNS TRIGGER AS $$
DECLARE
BEGIN
    -- RAISE NOTICE 'checking parent % %', NEW.id, TG_OP;
    -- disallow changing the parent of existing channels
    IF NEW.parent IS DISTINCT FROM OLD.parent OR
       NEW.topLevel IS DISTINCT FROM OLD.topLevel OR
       NEW.store IS DISTINCT FROM OLD.store
    THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ct_checkChannelUpdate ON channels;
CREATE TRIGGER trg_ct_checkChannelUpdate BEFORE UPDATE OF parent, topLevel, store ON channels
FOR EACH ROW EXECUTE PROCEDURE ct_checkChannelUpdate();

CREATE OR REPLACE FUNCTION ct_setTopLevelOnChannel() RETURNS TRIGGER AS $$
DECLARE
BEGIN
    IF NEW.parent IS NULL THEN
        NEW.topLevel = NEW.id;
        RETURN NEW;
    END IF;

    SELECT INTO NEW.topLevel, NEW.store topLevel, store from channels where id = NEW.parent;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ct_setTopLevelOnChannel ON channels;
CREATE TRIGGER trg_ct_setTopLevelOnChannel BEFORE INSERT ON channels
FOR EACH ROW EXECUTE PROCEDURE ct_setTopLevelOnChannel();

-- recursively called from ct_associateAssetWithChannels to populate the subChannelAssets table
CREATE OR REPLACE FUNCTION ct_associateAssetWithParentChannel(int, int, int) RETURNS BOOL AS '
DECLARE
    channel        ALIAS FOR $1;
    leafChannel    ALIAS FOR $2;
    alteredAsset   ALIAS FOR $3;
    parentChannel  RECORD;
BEGIN
    INSERT INTO subChannelAssets (channel, leafChannel, asset) VALUES (channel, leafChannel, alteredAsset);
    FOR parentChannel IN SELECT c.parent AS id FROM channels c WHERE id = channel AND parent IS NOT NULL LOOP
        PERFORM ct_associateAssetWithParentChannel(parentChannel.id, leafChannel, alteredAsset);
    END LOOP;
    RETURN TRUE;
END;
' LANGUAGE 'plpgsql';

CREATE OR REPLACE FUNCTION ct_markNonExtantPricesDone() RETURNS VOID AS $$
BEGIN
    UPDATE assetprices SET ending = current_timestamp AT TIME ZONE 'UTC' FROM
        (SELECT asset FROM assetprices EXCEPT SELECT DISTINCT a.asset
         FROM assetprices a join channels c ON (a.store = c.store)
              join subchannelassets sc on (a.asset = sc.asset and c.id = sc.channel)) as tmp
        WHERE assetprices.asset = tmp.asset AND ending IS NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ct_charSynonym(c char) RETURNS char AS $$
DECLARE
BEGIN
    c = lower(c);
    IF c IN ('æ', 'à', 'á', 'â', 'ä', 'ã', 'ā', 'ă', 'ą', 'ǎ') THEN
        RETURN 'a';
    ELSIF c IN ('è', 'é', 'ê', 'ë', 'ẽ', 'ę', 'ě')  THEN
        RETURN 'e';
    ELSIF c IN ('ì', 'í', 'î', 'ï', 'ĩ', 'ī', 'ĭ', 'ǐ')  THEN
        RETURN 'i';
    ELSIF c IN ('ò', 'ó', 'ô', 'ö', 'õ', 'ø', 'ǒ')  THEN
        RETURN 'o';
    ELSIF c IN ('ù', 'ú', 'û', 'ü', 'ũ', 'ů', 'ū', 'ǔ', 'ŭ')  THEN
        RETURN 'u';
    ELSIF c IN ('ç', 'ĉ', 'ć', 'ċ', 'č') THEN
        RETURN 'c';
    ELSIF c IN ('ł') THEN
        RETURN 'l';
    ELSIF c IN ('ñ') THEN
        RETURN 'n';
    ELSIF c IN ('š', 'ś', 'ŝ', 'ş', 'š') THEN
        RETURN 's';
    ELSIF c IN ('ż', 'ź', 'ž') THEN
        RETURN 'z';
    END IF;

    RETURN c;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ct_generateAutoTags() RETURNS TRIGGER AS $$
DECLARE
    groupTagTitle text;
    groupingId int;
BEGIN
    IF  TG_OP = 'UPDATE' THEN
        DELETE FROM autoTags WHERE source = NEW.id;
    END IF;

    SELECT INTO groupTagTitle type FROM tagTypes WHERE id = NEW.type AND type IN ('author');
    IF FOUND THEN
        groupTagTitle = groupTagTitle || '_' || ct_charSynonym(substr(NEW.title, 1, 1));
        SELECT INTO groupingId id FROM tagTypes WHERE type = 'grouping';
        INSERT INTO autoTags (source, target)
            SELECT NEW.id, id FROM tags
            WHERE type = groupingId AND title = groupTagTitle;
        IF NOT FOUND THEN
            INSERT INTO tags (type, title) VALUES (groupingId, groupTagTitle);

            INSERT INTO autoTags (source, target)
                SELECT NEW.id, id FROM tags
                WHERE type = groupingId AND title = groupTagTitle;
        END IF;
    END IF;

    -- if we have a new asset type, then associate all the content rating tags
    IF TG_OP = 'INSERT' OR OLD.type != NEW.type THEN
        PERFORM id FROM tagTypes WHERE type = 'assetType' AND id = NEW.type;
        IF FOUND THEN
            DELETE FROM relatedtags WHERE tag = NEW.id AND related IN
                (SELECT id FROM tags
                    WHERE type in (SELECT id FROM tagTypes WHERE type = 'contentrating'));
            INSERT INTO relatedTags (tag, related)
                SELECT NEW.id, t.id FROM tags t
                    WHERE t.type in (SELECT id FROM tagTypes WHERE type = 'contentrating');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ct_generateAutoTags ON tags;
CREATE TRIGGER trg_ct_generateAutoTags AFTER INSERT OR UPDATE ON tags
FOR EACH ROW EXECUTE PROCEDURE ct_generateAutoTags();

CREATE OR REPLACE FUNCTION ct_validateAssetTag() RETURNS TRIGGER AS $$
DECLARE
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.sourceTag IS NULL THEN
            -- delete any autotags
            delete from assetTags where asset = OLD.asset AND sourceTag = OLD.tag;
        END IF;
        RETURN OLD;
    ELSE
        -- deny duplicate tags on the same asset
        PERFORM tag FROM assetTags where asset = NEW.asset AND tag = NEW.tag;
        IF FOUND THEN
            RETURN null;
        END IF;
        -- add any auto tags on insert
        IF TG_OP = 'INSERT' THEN
            INSERT INTO assetTags (asset, tag, sourceTag)
                SELECT NEW.asset, target, NEW.tag FROM autoTags WHERE source = NEW.tag;
        END IF;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ct_validateAssetTag ON assetTags;
CREATE TRIGGER trg_ct_validateAssetTag BEFORE INSERT OR UPDATE OR DELETE ON assetTags
FOR EACH ROW EXECUTE PROCEDURE ct_validateAssetTag();

CREATE OR REPLACE FUNCTION ct_markAssetDirty() RETURNS TRIGGER AS $$
DECLARE
BEGIN
    BEGIN
        INSERT INTO assetsNeedingRefresh VALUES (NEW.asset);
    EXCEPTION WHEN unique_violation THEN
        -- do nothing
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ct_markAssetDirty ON assetTags;
CREATE TRIGGER trg_ct_markAssetDirty AFTER INSERT OR UPDATE ON assetTags
FOR EACH ROW EXECUTE PROCEDURE ct_markAssetDirty();

CREATE OR REPLACE FUNCTION ct_markAssetDeleted() RETURNS TRIGGER AS $$
DECLARE
BEGIN
    PERFORM id FROM assets WHERE id = OLD.asset;
    IF FOUND THEN
        BEGIN
            INSERT INTO assetsNeedingRefresh VALUES (OLD.asset);
        EXCEPTION WHEN unique_violation THEN
            -- do nothing
        END;
    END IF;

    RETURN OLD;
    END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ct_markAssetDeleted ON assetTags;
CREATE TRIGGER trg_ct_markAssetDeleted AFTER DELETE ON assetTags
FOR EACH ROW EXECUTE PROCEDURE ct_markAssetDeleted();

-- TRIGGER functions to associate channels and assets when the tags change
CREATE OR REPLACE FUNCTION ct_associateDirtyAssetsWithChannels() RETURNS VOID AS $$
DECLARE
    alteredAsset   int;
    basePrice int;
    parentChannel  RECORD;
    processed bool := false;
BEGIN
    FOR alteredAsset, baseprice IN
        SELECT a.id, a.baseprice FROM assetsNeedingRefresh r JOIN assets a ON (r.asset = a.id)
    LOOP
        processed := true;
        DELETE FROM channelAssets c WHERE c.asset = alteredAsset;
        DELETE FROM subChannelAssets c WHERE c.asset = alteredAsset;
        FOR parentChannel IN SELECT * FROM (SELECT c.channel AS channel, count(c.tag) = count(a.tag) as matches
                FROM channelTags c LEFT JOIN assetTags a ON (c.tag = a.tag and a.asset = alteredAsset)
                GROUP BY c.channel) as tmp WHERE matches LOOP
            INSERT INTO channelAssets (channel, asset) VALUES (parentChannel.channel, alteredAsset);
            PERFORM ct_associateAssetWithParentChannel(parentChannel.channel, parentChannel.channel, alteredAsset);
        END LOOP;

        PERFORM ct_updateAssetPrices(alteredAsset, basePrice);
    END LOOP;

    IF processed THEN
        PERFORM ct_markNonExtantPricesDone();
        -- update the cached assetCount for channels with assets
        UPDATE channels SET assetCount = tmp.assets
            from (SELECT channel, count(distinct asset) as assets FROM subChannelAssets group by channel) as tmp
            where tmp.channel = channels.id;
        -- update channels with no assets to zero
        UPDATE channels SET assetCount = 0 WHERE id NOT IN (select channel from subChannelAssets);
    END IF;

    DELETE FROM assetsNeedingRefresh;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ct_markChannelDirty() RETURNS TRIGGER AS $$
DECLARE
BEGIN
    BEGIN
        INSERT INTO channelsNeedingRefresh VALUES (NEW.channel);
    EXCEPTION WHEN unique_violation THEN
        -- do nothing
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ct_markChannelDirty ON channelTags;
CREATE TRIGGER trg_ct_markChannelDirty AFTER INSERT OR UPDATE ON channelTags
FOR EACH ROW EXECUTE PROCEDURE ct_markChannelDirty();

CREATE OR REPLACE FUNCTION ct_markChannelDeleted() RETURNS TRIGGER AS $$
DECLARE
BEGIN
    PERFORM id FROM channels WHERE id = OLD.channel;
    IF FOUND THEN
        BEGIN
            INSERT INTO channelsNeedingRefresh VALUES (OLD.channel);
        EXCEPTION WHEN unique_violation THEN
            -- do nothing
        END;
    END IF;

    RETURN OLD;
    END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ct_markChannelDeleted ON channelTags;
CREATE TRIGGER trg_ct_markChannelDeleted AFTER DELETE ON channelTags
FOR EACH ROW EXECUTE PROCEDURE ct_markChannelDeleted();

CREATE OR REPLACE FUNCTION ct_refreshChannels() RETURNS VOID AS $$
DECLARE
    alteredChannel   int;
    tagCount         int;
    assetRow         RECORD;
    markupRow        RECORD;
    warehouse        RECORD;
    pricesRow        RECORD;
    processed        bool := false;
BEGIN
    FOR alteredChannel IN SELECT channel FROM channelsNeedingRefresh
    LOOP
        processed := true;
        SELECT INTO warehouse markup, minMarkup, maxMarkup FROM warehouses WHERE id = 'main';
        SELECT INTO tagCount count(tag) FROM channelTags c WHERE c.channel = alteredChannel;
        SELECT INTO markupRow s.minMarkup as minMarkup, s.maxMarkup as  maxMarkup,
                            s.markup as markup, s.id as store
                            FROM stores s LEFT JOIN channels c ON (s.id = c.store)
                            WHERE c.id = alteredChannel;

        DELETE FROM channelAssets c WHERE c.channel = alteredChannel;
        DELETE FROM subChannelAssets sc WHERE sc.channel = alteredChannel OR sc.leafChannel = alteredChannel;

        FOR assetRow IN SELECT tmp.*, a.basePrice FROM
                (SELECT a.asset as id, count(a.tag) = tagCount as matches
                    FROM assetTags a RIGHT JOIN channelTags c ON (c.tag = a.tag and c.channel = alteredChannel)
                    WHERE a.asset IS NOT NULL GROUP BY a.asset) as tmp
            JOIN assets a ON (tmp.id = a.id) WHERE tmp.matches
        LOOP
            INSERT INTO channelAssets (channel, asset) VALUES (alteredChannel, assetRow.id);
            PERFORM ct_associateAssetWithParentChannel(alteredChannel, alteredChannel, assetRow.id);
            IF assetRow.basePrice > 0 THEN
                PERFORM * FROM assetPrices WHERE asset = assetRow.id AND store = markupRow.store AND ending IS NULL;
                IF NOT FOUND THEN
                    SELECT INTO pricesRow
                        (ct_calcPoints(baseprice, markupRow.markup, markupRow.minMarkup, markupRow.maxMarkup,
                         warehouse.markup, warehouse.minMarkup, warehouse.maxMarkup)).*
                        FROM assets WHERE id = assetRow.id;
                    IF pricesRow.retailpoints > 0 THEN
                        INSERT INTO assetPrices (asset, store, points, toStore)
                           VALUES (assetRow.id, markupRow.store, pricesRow.retailpoints, pricesRow.tostorepoints);
                    END IF;
                END IF;
            END IF;
        END LOOP;
    END LOOP;

    IF processed THEN
        PERFORM ct_markNonExtantPricesDone();

        UPDATE channels SET assetCount = tmp.assets from
            (SELECT channel, count(distinct asset) as assets FROM subChannelAssets group by channel) as tmp
            where tmp.channel = channels.id;
    END IF;

    DELETE FROM channelsNeedingRefresh;
END;
$$ LANGUAGE 'plpgsql';

CREATE OR REPLACE FUNCTION ct_calcPoints(points int,
                                         storeMarkup int, storeMinMarkup int, storeMaxMarkup int,
                                         wareMarkup int, wareMinMarkup int, wareMaxMarkup int,
                                         OUT retailPoints int, OUT toStorePoints int) AS $$
DECLARE
    price int := 0;
    storeCut int := 0;
    wareCut int := 0;
BEGIN
    IF points < 1 THEN
        retailPoints = storeMinMarkup + wareMinMarkup;
        toStorePoints = storeMinMarkup;
        RETURN;
    END IF;

    -- RAISE NOTICE 'markups for the store are % % %', storeMarkup, storeMinMarkup, storeMaxMarkup;
    -- RAISE NOTICE 'markups for the warehouse are % % %', wareMarkup, wareMinMarkup, wareMaxMarkup;
    price := (points / (1 - ((storeMarkup + wareMarkup) / 100.0)))::int;
    storeCut := (price * (storeMarkup / 100.0))::int;
    wareCut := (price * (wareMarkup / 100.0))::int;
    -- RAISE NOTICE 'cuts are % % %', price, storeCut, wareCut;

    IF storeCut < storeMinMarkup THEN
        -- RAISE  notice 'did not make the min store markup of %  with %', storeMinMarkup, storeCut;
        storeCut := storeMinMarkup;
    ELSIF storeMaxMarkup > 0 AND storeCut > storeMaxMarkup THEN
        -- RAISE  notice 'hit the max store markup ceiling of %  with %', storeMaxMarkup, storeCut;
        storeCut := storeMaxMarkup;
    END IF;

    IF wareCut < wareMinMarkup THEN
        -- RAISE  notice 'did not make the min warehouse markup of %  with %', wareMinMarkup, wareCut;
        wareCut := wareMinMarkup;
    ELSIF wareMaxMarkup > 0 AND wareCut > wareMaxMarkup THEN
        -- RAISE  notice 'hit the max warehouse markup ceiling of %  with %', wareMarkup, wareCut;
        wareCut := wareMaxMarkup;
    END IF;

    -- now calc markups based on the actual cut relative to the base points price
    storeMarkup := ((storeCut / points::float) * 100)::int;
    wareMarkup := ((wareCut / points::float) * 100)::int;
    -- raise notice 'final markups are % % % %', storeMarkup, storeCut, wareMarkup, wareCut;

    toStorePoints := storeCut;
    retailPoints := (points * (1 + ((storeMarkup + wareMarkup) / 100.0)))::int;

    -- raise notice 'final price is %', retailPoints;
    -- finally, make sure it is multiple of 10
    IF retailPoints % 10 > 0 THEN
        retailPoints := retailPoints + (10 - retailPoints % 10);
    END IF;

    -- raise notice '==================';
END;
$$ LANGUAGE 'plpgsql';

-- updates prices in stores when the store markup changes
CREATE OR REPLACE FUNCTION ct_updateStorePrices() RETURNS TRIGGER AS $$
DECLARE
    warehouse record;
BEGIN
    UPDATE assetPrices SET ending = (current_timestamp AT TIME ZONE 'UTC')
           WHERE store = NEW.id AND ending IS NULL;

    SELECT INTO warehouse markup, minMarkup, maxMarkup FROM warehouses WHERE id = 'main';
    INSERT INTO assetPrices (asset, store, points, tostore)
    SELECT a.id, NEW.id, (ct_calcPoints(a.basePrice, NEW.markup, NEW.minMarkup, NEW.maxMarkup,
                                        warehouse.markup, warehouse.minMarkup, warehouse.maxMarkup)).*
        FROM assets a JOIN subChannelAssets sa ON (a.id = sa.asset)
                      JOIN channels c ON (c.id = sa.channel)
        WHERE c.store = NEW.id AND c.parent IS NULL AND a.basePrice > 0;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_ct_updateStorePricesOnStoreUpdate ON stores;
CREATE TRIGGER trg_ct_updateStorePricesOnStoreUpdate AFTER INSERT OR UPDATE OF markup, minMarkup, maxMarkup ON stores
FOR EACH ROW EXECUTE PROCEDURE ct_updateStorePrices();

-- updates prices in stores when the warehouse markup changes
CREATE OR REPLACE FUNCTION ct_updateWarehousePrices() RETURNS TRIGGER AS $$
DECLARE
BEGIN
    UPDATE assetPrices SET ending = (current_timestamp AT TIME ZONE 'UTC')
           WHERE ending IS NULL;

    INSERT INTO assetPrices (asset, store, points, toStore)
    SELECT DISTINCT a.id, s.id, (ct_calcPoints(a.basePrice, s.markup, s.minMarkup, s.maxMarkup,
                                               NEW.markup, NEW.minMarkup, NEW.maxMarkup)).*
        FROM assets a JOIN subChannelAssets sa ON (a.id = sa.asset)
                      JOIN channels c ON (c.id = sa.channel)
                      JOIN stores s ON (c.store = s.id)
        WHERE c.parent IS NULL AND a.basePrice > 0 AND s.id IS NOT NULL;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_ct_updateWarehousePricesOnStoreUpdate ON warehouses;
CREATE TRIGGER trg_ct_updateWarehousePricesOnStoreUpdate AFTER INSERT OR UPDATE OF markup, minMarkup, maxMarkup ON warehouses
FOR EACH ROW EXECUTE PROCEDURE ct_updateWarehousePrices();

-- sets prices in stores for a given asset
CREATE OR REPLACE FUNCTION ct_updateAssetPrices(assetId int, basePrice int) RETURNS VOID AS $$
DECLARE
    warehouse record;
    storeRec  RECORD;
    price int := 0;
BEGIN
    UPDATE assetPrices SET ending = (current_timestamp AT TIME ZONE 'UTC')
        WHERE asset = assetId AND ending IS NULL;

    IF (basePrice <= 0) THEN
        RETURN;
    END IF;

    SELECT INTO warehouse markup, minMarkup, maxMarkup FROM warehouses WHERE id = 'main';

    FOR storeRec IN
        SELECT DISTINCT d.id, d.minMarkup, d.maxMarkup, d.markup
        FROM stores d JOIN channels c ON (d.id = c.store AND parent IS NULL)
                      JOIN subChannelAssets a ON (a.channel = c.id AND a.asset = assetId)
    LOOP
        INSERT INTO assetPrices (asset, store, points, toStore)
                         VALUES (assetId, storeRec.id,
                                 (ct_calcPoints(basePrice, storeRec.markup, storeRec.minMarkup, storeRec.maxMarkup,
                                               warehouse.markup, warehouse.minMarkup, warehouse.maxMarkup)).*);
    END LOOP;
END;
$$ LANGUAGE 'plpgsql';

CREATE OR REPLACE FUNCTION ct_setNameGroupingTag(assetId int, name text) RETURNS VOID AS $$
DECLARE
    groupTagTitle text := 'name_';
    leadChar char;
    groupingId int;
BEGIN
    IF name ~ '^[tT]he ' THEN
        leadChar = substring(name from '[tT]he[^\w](\w)');
    ELSIF name ~ '^[aA]n? ' THEN
        leadChar = substring(name from '[aA]n?[^\w](\w)');
    ELSE
        leadChar = substring(name from '[\w]');
    END IF;

    leadChar = ct_charSynonym(leadChar);

    IF leadChar ~ '\d' THEN
        groupTagTitle = groupTagTitle || '0-9';
    ELSIF leadChar >= 'α' AND leadChar <= 'х' THEN
        groupTagTitle = groupTagTitle || 'α-х';
    ELSE
        groupTagTitle = groupTagTitle || leadChar;
    END IF;

    SELECT INTO groupingId id FROM tagTypes WHERE type = 'grouping';
    DELETE from assetTags WHERE asset = assetId AND tag IN
        (SELECT id FROM tags WHERE type = groupingId AND title LIKE 'name_%');
    INSERT INTO assetTags (asset, tag)
        SELECT assetId, id as tagId FROM tags
        WHERE type = groupingId AND title = groupTagTitle;
    IF NOT FOUND THEN
        INSERT INTO tags (type, title) VALUES (groupingId, groupTagTitle);

        INSERT INTO assetTags (asset, tag)
            SELECT assetId, id FROM tags
            WHERE type = groupingId AND title = groupTagTitle;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER function to create changelog entries automatically and update prices
CREATE OR REPLACE FUNCTION ct_processUpdatedAssetName() RETURNS TRIGGER AS $$
BEGIN
    PERFORM ct_setNameGroupingTag(NEW.id, NEW.name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ct_processUpdatedAssetName ON assets;
CREATE TRIGGER trg_ct_processUpdatedAssetName AFTER UPDATE OF name ON assets
FOR EACH ROW EXECUTE PROCEDURE ct_processUpdatedAssetName();

CREATE OR REPLACE FUNCTION ct_processUpdatedAssetPrice() RETURNS TRIGGER AS $$
BEGIN
    PERFORM ct_updateAssetPrices(NEW.id, NEW.basePrice);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ct_processUpdatedAssetPrice ON assets;
CREATE TRIGGER trg_ct_processUpdatedAssetPrice AFTER UPDATE OF basePrice ON assets
FOR EACH ROW EXECUTE PROCEDURE ct_processUpdatedAssetPrice();

CREATE OR REPLACE FUNCTION ct_processUpdatedAssetVersion() RETURNS TRIGGER AS $$
BEGIN
    PERFORM asset FROM assetChangelogs a where a.asset = OLD.id and a.version = OLD.version;
    IF NOT FOUND THEN
        INSERT INTO assetChangeLogs (asset, version, versionTs) VALUES (OLD.id, OLD.version, OLD.versionTs);
    END IF;

    INSERT INTO assetChangeLogs (asset, version, versionTs) VALUES (NEW.id, NEW.version, NEW.versionTs);
    NEW.versionTs = CURRENT_TIMESTAMP;

    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_ct_processUpdatedAssetVersion ON assets;
CREATE TRIGGER trg_ct_processUpdatedAssetVersion AFTER UPDATE OF version ON assets
FOR EACH ROW EXECUTE PROCEDURE ct_processUpdatedAssetVersion();

CREATE OR REPLACE FUNCTION ct_processNewAsset() RETURNS TRIGGER AS $$
DECLARE
BEGIN
    PERFORM ct_setNameGroupingTag(NEW.id, NEW.name);
    PERFORM ct_updateAssetPrices(NEW.id, NEW.basePrice);
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_ct_processNewAsset ON assets;
CREATE TRIGGER trg_ct_processNewAsset AFTER INSERT ON assets
FOR EACH ROW EXECUTE PROCEDURE ct_processNewAsset();

CREATE OR REPLACE FUNCTION ct_processDeletedAsset() RETURNS TRIGGER AS $$
DECLARE
BEGIN
    UPDATE channels SET assetCount = tmp.assets from
        (SELECT channel, count(distinct asset) as assets FROM subChannelAssets
         WHERE asset != OLD.id AND
               channel IN (SELECT DISTINCT channel FROM channelAssets WHERE asset = OLD.id)
               group by channel) AS tmp
        WHERE tmp.channel = channels.id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_ct_processDeletedAsset ON assets;
CREATE TRIGGER trg_ct_processDeletedAsset BEFORE DELETE ON assets
FOR EACH ROW EXECUTE PROCEDURE ct_processDeletedAsset();

CREATE OR REPLACE function affiliatePerson(text, text, text) returns BOOL
AS
$$
DECLARE
    targetEmail ALIAS FOR $1;
    targetPartner ALIAS FOR $2;
    targetRole ALIAS FOR $3;
    person  int;
    partner int;
    role    int;
BEGIN
    SELECT INTO person id FROM people WHERE email = targetEmail;
    IF NOT FOUND THEN
        RETURN false;
    END IF;

    SELECT INTO partner id FROM partners WHERE name = targetPartner;
    IF NOT FOUND THEN
        RETURN false;
    END IF;

    SELECT INTO role id FROM personRoles WHERE description = targetRole;
    IF NOT FOUND THEN
        RETURN false;
    END IF;

    INSERT INTO affiliations (person, partner, role) values (person, partner, role);
    return true;
END;
$$ LANGUAGE 'plpgsql';
