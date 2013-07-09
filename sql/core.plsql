-- CREATE LANGUAGE plpgsql;

-- TRIGGER function for creating full name
CREATE OR REPLACE FUNCTION ct_generateFullname() RETURNS TRIGGER AS '
DECLARE
BEGIN
    NEW.fullName = NEW.firstName || '' '' || NEW.lastName;
    RETURN NEW;
END;
' LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_ct_generateFullName ON people;
CREATE TRIGGER trg_ct_generateFullName BEFORE UPDATE OR INSERT ON people
FOR EACH ROW EXECUTE PROCEDURE ct_generateFullname();

-- TRIGGER function for checking that a parent channel and this channel are owned by the same partner
CREATE OR REPLACE FUNCTION ct_checkChannelParent() RETURNS TRIGGER AS '
DECLARE
    parent RECORD;
BEGIN
    IF NEW.parent IS NULL THEN
        NEW.topLevel = NEW.id;
        RETURN NEW;
    END IF;

    SELECT INTO parent * from channels where id = NEW.parent;
    IF NOT FOUND THEN
        RETURN OLD;
    END IF;

    IF parent.partner != NEW.partner THEN
        RETURN OLD;
    END IF;

    WHILE parent.topLevel IS NULL LOOP
        IF parent.parent IS NULL THEN
            NEW.topLevel = parent.id;
            RETURN NEW;
        END IF;
        SELECT * INTO parent FROM channels WHERE id = parent.parent;
        IF NOT FOUND THEN
            RETURN OLD;
        END IF;
    END LOOP;

    NEW.topLevel = parent.topLevel;
    RETURN NEW;
END;
' LANGUAGE 'plpgsql';


-- TRIGGER function to ensure channel parents remain coherent due to parent-child relationships between channels
CREATE OR REPLACE FUNCTION ct_propagateChannelParent() RETURNS TRIGGER AS $$
DECLARE
    storeName text;
BEGIN
    SELECT INTO storeName store FROM channels WHERE id = NEW.parent;
    IF TG_OP = 'UPDATE' THEN
        IF NEW.parent != OLD.parent THEN
            RETURN OLD;
        END IF;

        -- enforce that we are not crossing channels between stores
        IF storeName != NEW.store THEN
            NEW.parent = OLD.parent;
        END IF;
    ELSIF NEW.parent THEN -- inserting, sync store name with parent
        NEW.store = storeName;
    END IF;

    UPDATE channels SET partner = NEW.partner, topLevel = NEW.topLevel WHERE parent = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_ct_checkChannelParent ON channels;
CREATE TRIGGER trg_ct_checkChannelParent BEFORE UPDATE OR INSERT ON channels
FOR EACH ROW EXECUTE PROCEDURE ct_checkChannelParent();

DROP TRIGGER IF EXISTS trg_ct_propogateChannelParent ON channels;
CREATE TRIGGER trg_ct_propogateChannelParent AFTER UPDATE ON channels
FOR EACH ROW EXECUTE PROCEDURE ct_propagateChannelParent();


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
    update assetprices set ending = (current_timestamp AT TIME ZONE 'UTC')
        where ending is null and
              asset || '_' || store not in
                (select distinct sca.asset || '_' || ca.store from subchannelassets sca
                 left join channels ca on (sca.channel = ca.id)
                 left join stores s on (ca.store = s.id));
END;
$$ LANGUAGE plpgsql;

--        ct_associateAssetWithParentChannel(parent, alteredAsset);
-- TRIGGER functions to associate channels and assets when the tags change
CREATE OR REPLACE FUNCTION ct_associateAssetWithChannels() RETURNS TRIGGER AS '
DECLARE
    alteredAsset   int;
    parentChannel  RECORD;
    noJobsInProgress bool;
BEGIN
    IF (TG_OP = ''DELETE'') THEN
        alteredAsset := OLD.asset;
    ELSE
        alteredAsset := NEW.asset;
    END IF;

    DELETE FROM channelAssets c WHERE c.asset = alteredAsset;
    DELETE FROM subChannelAssets c WHERE c.asset = alteredAsset;
    FOR parentChannel IN SELECT c.channel AS channel, count(c.tag) = count(a.tag) as matches
            FROM channelTags c LEFT JOIN assetTags a ON (c.tag = a.tag and a.asset = alteredAsset)
            GROUP BY c.channel LOOP
        IF (parentChannel.matches) THEN
            INSERT INTO channelAssets (channel, asset) VALUES (parentChannel.channel, alteredAsset);
            PERFORM ct_associateAssetWithParentChannel(parentChannel.channel, parentChannel.channel, alteredAsset);
        END IF;
    END LOOP;

    select into noJobsInProgress NOT bool_or(dowork) from batchjobsinprogress;
    IF (noJobsInProgress) THEN
        UPDATE channels SET assetCount = (SELECT count(channel) FROM subChannelAssets WHERE channel = channels.id);
    END IF;

    PERFORM ct_markNonExtantPricesDone();
    IF (TG_OP = ''DELETE'') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
' LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_ct_associateAssetWithChannels ON assetTags;
CREATE TRIGGER trg_ct_associateAssetWithChannels AFTER INSERT OR UPDATE OR DELETE ON assetTags
FOR EACH ROW EXECUTE PROCEDURE ct_associateAssetWithChannels();

CREATE OR REPLACE FUNCTION ct_associateChannelWithAssets() RETURNS TRIGGER AS $$
DECLARE
    alteredChannel   int;
    tagCount         int;
    assetRow         RECORD;
    markupRow        RECORD;
    warehouse        RECORD;
    pricesRow        RECORD;
    noJobsInProgress bool;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        alteredChannel := OLD.channel;
    ELSE
        alteredChannel := NEW.channel;
    END IF;
    SELECT INTO warehouse markup, minMarkup, maxMarkup FROM warehouses WHERE id = 'main';
    SELECT INTO tagCount count(tag) FROM channelTags c WHERE c.channel = alteredChannel;
    SELECT INTO markupRow s.minMarkup as minMarkup, s.maxMarkup as  maxMarkup,
                        s.markup as markup, s.id as store
                        FROM stores s LEFT JOIN channels c ON (s.id = c.store)
                        WHERE c.id = alteredChannel;

    DELETE FROM channelAssets c WHERE c.channel = alteredChannel;
    DELETE FROM subChannelAssets sc WHERE sc.channel = alteredChannel OR sc.leafChannel = alteredChannel;

    FOR assetRow IN SELECT a.asset as id, count(a.tag) = tagCount as matches
            FROM assetTags a RIGHT JOIN channelTags c ON (c.tag = a.tag and c.channel = alteredChannel)
            WHERE a.asset IS NOT NULL GROUP BY a.asset LOOP
        IF (assetRow.matches) THEN
            INSERT INTO channelAssets (channel, asset) VALUES (alteredChannel, assetRow.id);
            PERFORM ct_associateAssetWithParentChannel(alteredChannel, alteredChannel, assetRow.id);
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

    select into noJobsInProgress NOT bool_or(dowork) from batchjobsinprogress;
    IF (noJobsInProgress) THEN
        PERFORM ct_markNonExtantPricesDone();
        UPDATE channels SET assetCount = (SELECT count(channel) FROM subChannelAssets WHERE channel = channels.id);
    END IF;

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_ct_associateChannelWithAssets ON channelTags;
CREATE TRIGGER trg_ct_associateChannelWithAssets AFTER INSERT OR UPDATE OR DELETE ON channelTags
FOR EACH ROW EXECUTE PROCEDURE ct_associateChannelWithAssets();

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
    -- RAISE NOTICE 'markups for the warehosue are % % %', wareMarkup, wareMinMarkup, wareMaxMarkup;
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
    IF (TG_OP = 'UPDATE' AND
        NEW.markup = OLD.markup AND
        NEW.minMarkup = OLD.minMarkup AND
        NEW.maxMarkup = OLD.maxMarkup)
    THEN
        RETURN NEW;
    END IF;

    UPDATE assetPrices SET ending = (current_timestamp AT TIME ZONE 'UTC')
           WHERE store = NEW.id AND ending IS NULL;

    SELECT INTO warehouse markup, minMarkup, maxMarkup FROM warehouses WHERE id = 'main';
    INSERT INTO assetPrices (asset, store, points, tostore)
    SELECT a.id, NEW.id, (ct_calcPoints(a.basePrice, NEW.markup, NEW.minMarkup, NEW.maxMarkup,
                                       warehouse.markup, warehouse.minMarkup, warehouse.maxMarkup)).*
        FROM assets a LEFT JOIN subChannelAssets sa ON (a.id = sa.asset)
                      LEFT JOIN channels c ON (c.id = sa.channel)
        WHERE c.store = NEW.id AND c.parent IS NULL AND a.basePrice > 0;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_ct_updateStorePricesOnStoreUpdate ON stores;
CREATE TRIGGER trg_ct_updateStorePricesOnStoreUpdate AFTER INSERT OR UPDATE ON stores
FOR EACH ROW EXECUTE PROCEDURE ct_updateStorePrices();

-- updates prices in stores when the warehouse markup changes
CREATE OR REPLACE FUNCTION ct_updateWarehousePrices() RETURNS TRIGGER AS $$
DECLARE
BEGIN
    IF (TG_OP = 'UPDATE' AND
        NEW.markup = OLD.markup AND
        NEW.minMarkup = OLD.minMarkup AND
        NEW.maxMarkup = OLD.maxMarkup)
    THEN
        RETURN NEW;
    END IF;

    UPDATE assetPrices SET ending = (current_timestamp AT TIME ZONE 'UTC')
           WHERE ending IS NULL;

    INSERT INTO assetPrices (asset, store, points, toStore)
    SELECT DISTINCT a.id, s.id, (ct_calcPoints(a.basePrice, s.markup, s.minMarkup, s.maxMarkup,
                                                NEW.markup, NEW.minMarkup, NEW.maxMarkup)).*
        FROM assets a LEFT JOIN subChannelAssets sa ON (a.id = sa.asset)
                      LEFT JOIN channels c ON (c.id = sa.channel)
                      LEFT JOIN stores s ON (c.store = s.id)
        WHERE c.parent IS NULL AND a.basePrice > 0;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_ct_updateWarehousePricesOnStoreUpdate ON warehouses;
CREATE TRIGGER trg_ct_updateWarehousePricesOnStoreUpdate AFTER INSERT OR UPDATE ON warehouses
FOR EACH ROW EXECUTE PROCEDURE ct_updateWarehousePrices();

-- sets prices in stores for a given asset
CREATE OR REPLACE FUNCTION ct_updateAssetPrices(assetId int, basePrice int) RETURNS VOID AS $$
DECLARE
    warehouse record;
    storeRec  RECORD;
    price int := 0;
BEGIN
    RETURN;
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

-- TRIGGER function to create changelog entries automatically and update prices
CREATE OR REPLACE FUNCTION ct_processUpdatedAsset() RETURNS TRIGGER AS $$
DECLARE
    dummy int;
BEGIN
    IF OLD.basePrice != NEW.basePrice THEN
        PERFORM ct_updateAssetPrices(NEW.id, NEW.basePrice);
    END IF;

    IF OLD.version != NEW.version THEN
        SELECT INTO dummy asset FROM assetChangelogs a where a.asset = OLD.id and a.version = OLD.version;
        IF NOT FOUND THEN
            INSERT INTO assetChangeLogs (asset, version, versionTs) VALUES (OLD.id, OLD.version, OLD.versionTs);
        END IF;

        INSERT INTO assetChangeLogs (asset, version, versionTs) VALUES (NEW.id, NEW.version, NEW.versionTs);
        NEW.versionTs = CURRENT_TIMESTAMP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE OR REPLACE FUNCTION ct_processNewAsset() RETURNS TRIGGER AS $$
DECLARE
BEGIN
    PERFORM ct_updateAssetPrices(NEW.id, NEW.basePrice);
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_ct_processUpdatedAsset ON assets;
CREATE TRIGGER trg_ct_processUpdatedAsset BEFORE UPDATE ON assets
FOR EACH ROW EXECUTE PROCEDURE ct_processUpdatedAsset();

DROP TRIGGER IF EXISTS trg_ct_processNewAsset ON assets;
CREATE TRIGGER trg_ct_processNewAsset BEFORE INSERT ON assets
FOR EACH ROW EXECUTE PROCEDURE ct_processNewAsset();

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


