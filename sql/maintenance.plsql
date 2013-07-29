
CREATE OR REPLACE FUNCTION ct_frequentMaintenance() RETURNS VOID AS $$
BEGIN
    PERFORM ct_associateDirtyAssetsWithChannels();
    PERFORM ct_refreshChannels();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ct_dailyMaintenance() RETURNS VOID AS $$
BEGIN
    -- delete accounts that are not activated within one week
    DELETE FROM people WHERE NOT activated AND created < current_timestamp - '1 week'::interval;
END;
$$ LANGUAGE plpgsql;

