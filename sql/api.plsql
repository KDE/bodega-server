-- -*- mode:sql -*-


CREATE OR REPLACE FUNCTION ct_addTagsToAsset(assetId int, tags int[]) RETURNS VOID AS $$
DECLARE
    tagId   int;
BEGIN
    FOREACH tagId IN ARRAY tags LOOP
        PERFORM * FROM tags WHERE id = tagId AND 
                       (partner IS NULL OR 
                        partner = (select partner from assets where id = assetId));
        IF FOUND THEN
            PERFORM * FROM assetTags WHERE asset = assetId AND tag = tagId;
            IF NOT FOUND THEN
                INSERT INTO assetTags (asset, tag) VALUES (assetId, tagId);
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE 'plpgsql';

CREATE OR REPLACE FUNCTION ct_rmTagsFromAsset(assetId int, tags int[]) RETURNS VOID AS $$
DECLARE
    tagId   int;
BEGIN
    DELETE FROM assetTags WHERE asset = assetId AND tag = ANY(tags);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ct_addTagsToChannel(channelId int, partnerId int, tags int[]) RETURNS VOID AS $$
DECLARE
    tagId   int;
BEGIN
    FOREACH tagId IN ARRAY tags LOOP
        PERFORM * FROM tags WHERE id = tagId AND (partner IS NULL OR partner = partnerId);
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

CREATE OR REPLACE FUNCTION ct_updateChannel(channelId int, channelParent int, channelName text, channelDescription text) RETURNS BOOL AS $$
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

    IF (length(channelDescription) > 0) THEN
        UPDATE channels SET description = channelDescription WHERE id = channelId;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE 'plpgsql';

CREATE OR REPLACE FUNCTION ct_addChannel(storeName text, channelParent int, channelName text, channelDescription text) RETURNS INT AS $$
DECLARE
BEGIN
    IF (channelParent > 0) THEN
        INSERT INTO channels (store, parent, name, description) VALUES (storeName, channelParent, channelName, channelDescription);
    ELSE
        INSERT INTO channels (store, name, description) VALUES (storeName, channelName, channelDescription);
    END IF;

    IF FOUND THEN
        RETURN currval('seq_channelIds');
    ELSE
        RETURN 0;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ct_reserveEmailQueue(int) RETURNS TEXT AS $$
DECLARE
    rv text := random_string(20);
BEGIN
    --rv := random_string(20);
    UPDATE emailqueue SET process = rv
        WHERE id in (SELECT id FROM emailqueue WHERE process IS NULL LIMIT $1 FOR UPDATE);
    IF NOT FOUND THEN
        RETURN null;
    END IF;
    return rv;
END
$$ LANGUAGE 'plpgsql';

CREATE OR REPLACE FUNCTION ct_markEmailQueueProcessed(text) RETURNS VOID AS $$
DECLARE
BEGIN
    UPDATE emailqueue SET completed = current_timestamp WHERE process = $1;
END
$$ LANGUAGE 'plpgsql';

