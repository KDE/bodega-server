CREATE OR REPLACE FUNCTION ct_frequentMaintenance() RETURNS VOID AS $$
BEGIN
    PERFORM ct_associateDirtyAssetsWithChannels();
    PERFORM ct_refreshChannels();
END;
$$ LANGUAGE plpgsql;
