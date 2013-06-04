-- -*- mode:sql -*-

CREATE TYPE FindAssetInfo as (id int, namerank real, tagrank real, rank double precision, license int, partnerid int, partnername text, version text, path text, image text, name text, points int);

CREATE OR REPLACE FUNCTION
ct_FindAssets(query text, channelId int, pagesize int, offsetStart int)
RETURNS setof FindAssetInfo AS $$
BEGIN
    RETURN QUERY
    SELECT a.id, sum(temp.namerank) as namerank, sum(temp.tagrank) as tagrank,
        (sum(temp.namerank) + sum(temp.tagrank)) / (1 + sum(CASE WHEN temp.tagrank > 0 THEN 1 ELSE 0 END)) as rank,
        max(a.license) as license, max(partners.id) as partnerid,
        max(partners.name) AS partnername, max(a.version) as version, max(a.path) as path, max(a.image) as image, max(a.name) as name,
        CASE WHEN max(temp.points) IS NULL THEN 0 ELSE max(temp.points) END AS points
    FROM
    (
        SELECT a.id as id, p.points as points,
        ts_rank_cd(a.en_index, plainto_tsquery('english', $1)) as namerank,
        0 as tagrank
        FROM assets a
        INNER JOIN subChannelAssets s ON (a.id = s.asset)
        LEFT JOIN assetPrices p ON (p.asset = a.id AND p.channel = s.channel)
        WHERE
        a.en_index @@ plainto_tsquery('english', $1) AND
        s.channel = $2
      UNION
        SELECT a.id as id, p.points as points,
        0 as namerank,
        ts_rank_cd(a.en_index, plainto_tsquery('english', $1)) as tagrank
        FROM assets a
        INNER JOIN subChannelAssets s ON (a.id = s.asset)
        LEFT JOIN assetPrices p ON (p.asset = a.id AND p.channel = s.channel)
        LEFT JOIN assetTags at ON (a.id = at.asset)
        LEFT JOIN tags t on (t.id = at.tag)
        WHERE
        s.channel = $2 AND
        t.en_index @@ plainto_tsquery('english', $1) AND
        t.type in (select id from tagtypes where type in ('category', 'descriptive', 'author', 'contributor'))
    ) as temp
        LEFT JOIN assets a ON (a.id = temp.id)
        LEFT JOIN partners ON (a.partner = partners.id)
    GROUP BY a.id
    ORDER BY rank DESC, max(a.name) LIMIT $3 OFFSET $4;
END;
$$ LANGUAGE plpgsql;


CREATE TYPE AssetInfo as (id int, license int, partnerid int, partnername text, version text, path text, image text, name text, points int);

CREATE OR REPLACE FUNCTION
ct_ListChannels(topChannel int)
RETURNS setof AssetInfo AS $$
BEGIN
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION
ct_ListAssets(channelId int)
RETURNS setof AssetInfo AS $$
BEGIN
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ct_addTagsToChannel(channelId int, partnerId int, tags int[]) RETURNS VOID AS $$
DECLARE
    tagId   int;
BEGIN
    FOREACH tagId IN ARRAY tags LOOP
        PERFORM * FROM tags WHERE id = tagId AND partner IS NULL OR partner = partnerId;
        IF FOUND THEN
            PERFORM * FROM channelTags WHERE channel = channelId AND tag = tagId;
            IF NOT FOUND THEN
                INSERT INTO channelTags (channel, tag) VALUES (channelId, tagId);
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ct_rmTagsFromChannel(channelId int, tags int[]) RETURNS VOID AS $$
DECLARE
    tagId   int;
BEGIN
    DELETE FROM channelTags WHERE channel = channelId AND tag = ANY(tags);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ct_updateChannel(channelId int, channelParent int, channelName text) RETURNS BOOL AS $$
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

CREATE OR REPLACE FUNCTION ct_addChannel(storeName text, channelParent int, channelName text) RETURNS INT AS $$
DECLARE
BEGIN
    IF (channelParent > 0) THEN
        INSERT INTO channels (store, parent, name) VALUES (storeName, channelParent, channelName);
    ELSE
        INSERT INTO channels (store, name) VALUES (storeName, channelName);
    END IF;

    IF FOUND THEN
        RETURN currval('seq_channelIds');
    ELSE
        RETURN 0;
    END IF;
END;
$$ LANGUAGE plpgsql;
