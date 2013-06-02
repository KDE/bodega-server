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
CREATE OR REPLACE FUNCTION ct_propagateChannelParent() RETURNS TRIGGER AS '
BEGIN
    UPDATE channels SET partner = NEW.partner, topLevel = NEW.topLevel WHERE parent = NEW.id;
    RETURN NEW;
END;
' LANGUAGE 'plpgsql';

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

    IF (TG_OP = ''DELETE'') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
' LANGUAGE 'plpgsql';

CREATE OR REPLACE FUNCTION ct_test() RETURNS bool AS $$
DECLARE
    go bool;
BEGIN
    select into go dowork from test where what = 'updateassetcount';
    return go;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_ct_associateAssetWithChannels ON assetTags;
CREATE TRIGGER trg_ct_associateAssetWithChannels AFTER INSERT OR UPDATE OR DELETE ON assetTags
FOR EACH ROW EXECUTE PROCEDURE ct_associateAssetWithChannels();


CREATE OR REPLACE FUNCTION ct_associateChannelWithAssets() RETURNS TRIGGER AS '
DECLARE
    alteredChannel   int;
    tagCount         int;
    asset            RECORD;
    noJobsInProgress bool;
BEGIN
    IF (TG_OP = ''DELETE'') THEN
        alteredChannel := OLD.channel;
    ELSE
        alteredChannel := NEW.channel;
    END IF;
    SELECT INTO tagCount count(tag) FROM channelTags c WHERE c.channel = alteredChannel;
    DELETE FROM channelAssets c WHERE c.channel = alteredChannel;
    DELETE FROM subChannelAssets sc WHERE sc.channel = alteredChannel OR sc.leafChannel = alteredChannel;
    FOR asset IN SELECT a.asset as id, count(a.tag) = tagCount as matches
            FROM assetTags a RIGHT JOIN channelTags c ON (c.tag = a.tag and c.channel = alteredChannel)
            WHERE a.asset IS NOT NULL GROUP BY a.asset LOOP
        IF (asset.matches) THEN
            INSERT INTO channelAssets (channel, asset) VALUES (alteredChannel, asset.id);
            PERFORM ct_associateAssetWithParentChannel(alteredChannel, alteredChannel, asset.id);
        END IF;
    END LOOP;

    select into noJobsInProgress NOT bool_or(dowork) from batchjobsinprogress;
    IF (noJobsInProgress) THEN
        UPDATE channels SET assetCount = (SELECT count(channel) FROM subChannelAssets WHERE channel = channels.id);
    END IF;

    IF (TG_OP = ''DELETE'') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
' LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_ct_associateChannelWithAssets ON channelTags;
CREATE TRIGGER trg_ct_associateChannelWithAssets AFTER INSERT OR UPDATE OR DELETE ON channelTags
FOR EACH ROW EXECUTE PROCEDURE ct_associateChannelWithAssets();

CREATE OR REPLACE FUNCTION ct_calcPoints(points int, flatMarkup bool, markup int, minMarkup int, maxMarkup int) RETURNS INT AS $$
DECLARE
    price int := 0;
BEGIN
    IF markup <= 0 THEN
        RETURN points;
    END IF;

    IF flatMarkup THEN
        price := markup;
    ELSE
        price := ((markup / 100.0) * points)::int;
    END IF;

    IF price < minMarkup THEN
        price := minMarkup;
    ELSIF maxMarkup > 0 AND price > maxMarkup THEN
        price := maxMarkup;
    END IF;

    price := price + points;
    IF price % 5 > 0 THEN
        price := price + (5 - price % 5);
    END IF;

    RETURN price;
END;
$$ LANGUAGE 'plpgsql';

-- updates prices in stores when the store markup changes
CREATE OR REPLACE FUNCTION ct_updateStorePrices() RETURNS TRIGGER AS $$
DECLARE
BEGIN
    IF (NEW.markup = 0) THEN
        RETURN NEW;
    END IF;

    IF (TG_OP = 'UPDATE' AND
        NEW.markup = OLD.markup AND
        NEW.minMarkup = OLD.minMarkup AND
        NEW.maxMarkup = OLD.maxMarkup AND
        NEW.flatMarkup = OLD.flatMarkup)
    THEN
        RETURN NEW;
    END IF;

    INSERT INTO assetPrices (asset, store, points)
    SELECT a.id, NEW.id, ct_calcPoints(a.basePrice, NEW.flatMarkup, NEW.markup, NEW.minMarkup, NEW.maxMarkup)
        FROM assets a LEFT JOIN subChannelAssets sa ON (a.id = sa.asset)
                      LEFT JOIN storeChannels sc ON (sc.channel = sa.channel)
                      LEFT JOIN channels c ON (c.id = sc.channel)
        WHERE sc.store = NEW.id AND c.parent IS NULL AND a.basePrice > 0;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_ct_updateStorePricesOnStoreUpdate ON stores;
CREATE TRIGGER trg_ct_updateStorePricesOnStoreUpdate AFTER INSERT OR UPDATE ON stores
FOR EACH ROW EXECUTE PROCEDURE ct_updateStorePrices();

-- sets prices in stores for a given asset
CREATE OR REPLACE FUNCTION ct_updateAssetPrices(assetId int, basePrice int) RETURNS VOID AS $$
DECLARE
    storeRec  RECORD;
    price int := 0;
BEGIN
    UPDATE assetPrices SET ending = (current_timestamp AT TIME ZONE 'UTC') WHERE asset = assetId;

    IF (basePrice <= 0) THEN
        RETURN;
    END IF;

    FOR storeRec IN
        SELECT DISTINCT d.id, d.minMarkup, d.maxMarkup, d.flatMarkup, d.markup
        FROM stores d JOIN storeChannels c ON (d.id = c.store)
                       JOIN channelAssets a ON (c.channel = a.channel AND a.asset = assetId)
    LOOP
        INSERT INTO assetPrices (asset, store, points) VALUES (assetId, storeRec.id, ct_calcPoints(basePrice, storeRec.flatMarkup, storeRec.markup, storeRec.minMarkup, storeRec.maxMarkup));
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

    NEW.file = substring(NEW.path FROM '[^/]*$');
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
    NEW.file = substring(NEW.path FROM '[^/]*$');
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

CREATE OR REPLACE FUNCTION ct_updateChannel(channelId int, channelParent int, channelName text) RETURNS BOOL
AS
$$
DECLARE
    parentTrace int;
BEGIN
    IF (channelParent > 0) THEN
        IF (channelId = channelParent) THEN
            RETURN FALSE;
        END IF;

        parentTrace := channelParent;
        WHILE parentTrace > 0
        LOOP
            SELECT INTO parentTrace parent FROM channels WHERE id = parentTrace;
            IF NOT FOUND THEN
                RETURN FALSE;
            END IF;

            IF (parentTrace = channelId) THEN
                -- Uh-oh .. we found a loop back to ourself
                RETURN FALSE;
            END IF;

        END LOOP;

        UPDATE channels SET parent = channelParent WHERE id = channelId;
    ELSIF (channelParent = 0) THEN
        UPDATE channels SET parent = null WHERE id = channelId;
    END IF;

    IF (length(channelName) > 0) THEN
        UPDATE channels SET name = channelName WHERE id = channelId;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE 'plpgsql';
