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



CREATE OR REPLACE FUNCTION ct_frequentMaintenance() RETURNS VOID AS $$
BEGIN
    PERFORM ct_associateDirtyAssetsWithChannels();
    PERFORM ct_refreshChannels();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ct_hourlyMaintenance() RETURNS VOID AS $$
BEGIN
    PERFORM ct_updateStoreContentSummaries();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ct_dailyMaintenance() RETURNS VOID AS $$
BEGIN
    -- delete accounts that are not activated within one week
    DELETE FROM people WHERE activated IS NULL AND created < current_timestamp - '1 week'::interval;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ct_removeChannelTagDupes() RETURNS VOID AS $$
BEGIN
    LOOP
        DELETE FROM channeltags WHERE ctid in
            (SELECT ctid FROM
                (SELECT max(ctid) as ctid, channel, tag, COUNT(channel) as COUNT
                 FROM channeltags GROUP by channel, tag order by channel) as finder
              WHERE finder.COUNT > 1);

        IF NOT FOUND THEN
            EXIT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ct_updateStoreContentSummaries() RETURNS VOID AS $$
DECLARE
    store record;
BEGIN
    -- update the store content summary table
    DELETE FROM storeAssetSummary;
    FOR store IN SELECT id FROM stores
    LOOP
        INSERT INTO storeAssetSummary (store, assetType, total)
        SELECT store.id, t.id, counts.total
            FROM tags t JOIN
                (SELECT at.tag, COUNT(DISTINCT at.asset) AS total
                    FROM assettags at
                        JOIN subchannelassets ca ON (ca.asset = at.asset)
                        JOIN channels c ON (ca.channel = c.id)
                    WHERE c.parent IS NULL AND c.store = store.id AND
                          at.tag IN
                            (SELECT t.id FROM tags t JOIN tagtypes tt ON t.type = tt.id
                                WHERE tt.type = 'assetType')
                 GROUP BY at.tag) AS counts ON t.id = counts.tag;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

