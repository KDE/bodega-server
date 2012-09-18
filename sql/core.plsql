-- CREATE LANGUAGE plpgsql;

-- TRIGGER function for creating full name
CREATE OR REPLACE FUNCTION ct_generateFullname() RETURNS TRIGGER AS '
DECLARE
BEGIN
    NEW.fullName = NEW.firstName || '' '' || NEW.lastName;
    RETURN NEW;
END;
' LANGUAGE 'PLPGSQL';

DROP TRIGGER IF EXISTS trg_ct_generateFullName ON people;
CREATE TRIGGER trg_ct_generateFullName BEFORE UPDATE OR INSERT ON people
FOR EACH ROW EXECUTE PROCEDURE ct_generateFullname();

-- TRIGGER function for checking that a parent channel and this channel are owned by the same partner
CREATE OR REPLACE FUNCTION ct_checkChannelParent() RETURNS TRIGGER AS '
DECLARE
    parentPartner int;
BEGIN
    IF NEW.parent IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT INTO parentPartner partner from channels where id = NEW.parent;
    IF NOT FOUND THEN
        RETURN OLD;
    END IF;

    IF parentPartner != NEW.partner THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
' LANGUAGE 'PLPGSQL';


-- TRIGGER function to ensure channel parents remain coherent due to parent-child relationships between channels
CREATE OR REPLACE FUNCTION ct_propagateChannelParent() RETURNS TRIGGER AS '
BEGIN
    UPDATE channels SET partner = NEW.partner WHERE parent = NEW.id;
    RETURN NEW;
END;
' LANGUAGE 'PLPGSQL';

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
' LANGUAGE 'PLPGSQL';

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
' LANGUAGE 'PLPGSQL';

CREATE OR REPLACE FUNCTION ct_test() RETURNS bool AS $$
DECLARE
    go bool;
BEGIN
    select into go dowork from test where what = 'updateassetcount';
    return go;
END;
$$ LANGUAGE 'PLPGSQL';

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
' LANGUAGE 'PLPGSQL';

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
$$ LANGUAGE 'PLPGSQL';

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

    INSERT INTO assetPrices (asset, device, points)
    SELECT a.id, NEW.partNumber, ct_calcPoints(a.basePrice, NEW.flatMarkup, NEW.markup, NEW.minMarkup, NEW.maxMarkup)
        FROM assets a LEFT JOIN subChannelAssets sa ON (a.id = sa.asset)
                      LEFT JOIN deviceChannels dc ON (dc.channel = sa.channel)
                      LEFT JOIN channels c ON (c.id = dc.channel)
        WHERE dc.device = NEW.partNumber AND c.parent IS NULL AND a.basePrice > 0;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_ct_updateStorePricesOnStoreUpdate ON devices;
CREATE TRIGGER trg_ct_updateStorePricesOnStoreUpdate AFTER INSERT OR UPDATE ON devices
FOR EACH ROW EXECUTE PROCEDURE ct_updateStorePrices();

-- sets prices in stores for a given asset
CREATE OR REPLACE FUNCTION ct_updateAssetPrices(assetId int, basePrice int) RETURNS VOID AS $$
DECLARE
    deviceRec  RECORD;
    price int := 0;
BEGIN
    UPDATE assetPrices SET ending = (current_timestamp AT TIME ZONE 'UTC') WHERE asset = assetId;

    IF (basePrice <= 0) THEN
        RETURN;
    END IF;

    FOR deviceRec IN
        SELECT DISTINCT d.partNumber, d.minMarkup, d.maxMarkup, d.flatMarkup, d.markup
        FROM devices d JOIN deviceChannels c ON (d.partNumber = c.device)
                       JOIN channelAssets a ON (c.channel = a.channel AND a.asset = assetId)
    LOOP
        INSERT INTO assetPrices (asset, device, points) VALUES (assetId, deviceRec.partNumber, ct_calcPoints(basePrice, deviceRec.flatMarkup, deviceRec.markup, deviceRec.minMarkup, deviceRec.maxMarkup));
    END LOOP;
END;
$$ LANGUAGE 'PLPGSQL';

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
$$ LANGUAGE 'PLPGSQL';

CREATE OR REPLACE FUNCTION ct_processNewAsset() RETURNS TRIGGER AS $$
DECLARE
BEGIN
    PERFORM ct_updateAssetPrices(NEW.id, NEW.basePrice);
    NEW.file = substring(NEW.path FROM '[^/]*$');
    RETURN NEW;
END;
$$ LANGUAGE 'PLPGSQL';

DROP TRIGGER IF EXISTS trg_ct_processUpdatedAsset ON assets;
CREATE TRIGGER trg_ct_processUpdatedAsset BEFORE UPDATE ON assets
FOR EACH ROW EXECUTE PROCEDURE ct_processUpdatedAsset();

DROP TRIGGER IF EXISTS trg_ct_processNewAsset ON assets;
CREATE TRIGGER trg_ct_processNewAsset BEFORE INSERT ON assets
FOR EACH ROW EXECUTE PROCEDURE ct_processNewAsset();

create function affiliatePerson(firstname text, lastname text, email text,
                                partnername text, prole text)
returns void
AS
$$
    INSERT INTO affiliations
     SELECT pep.id AS person, par.id AS partner, r.id AS role
       FROM people pep, partners par, personRoles r
       WHERE pep.firstname=$1 AND pep.lastname=$2 AND pep.email=$3
       AND par.name=$4
       AND r.description=$5
$$ language SQL;

