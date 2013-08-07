CREATE OR REPLACE FUNCTION ct_createSetting(newKey text, newValue text) RETURNS VOID AS $$
BEGIN
    PERFORM * FROM settings WHERE key = newKey;
    IF FOUND THEN
        UPDATE settings SET value = newValue WHERE key = newKey;
    ELSE
        INSERT INTO SETTINGS (key, value) VALUES (newKey, newValue);
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ct_removeSetting(oldKey text) RETURNS VOID AS $$
BEGIN
    DELETE FROM settings WHERE key = oldKey;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ct_setting(checkKey text) RETURNS TEXT AS $$
DECLARE
    rv text;
BEGIN
    SELECT INTO rv value FROM settings WHERE key = checkKey;
    return rv;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ct_settingChanged() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.key = 'discourseConnectString' THEN
        PERFORM ct_enableDiscourseIntegration(NEW.value IS NOT NULL AND NEW.value != '');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


DROP TRIGGER IF EXISTS trg_ct_settingChanged ON settings;
CREATE TRIGGER trg_ct_settingChanged AFTER UPDATE OF value OR INSERT ON settings
FOR EACH ROW EXECUTE PROCEDURE ct_settingChanged();

CREATE OR REPLACE FUNCTION ct_settingDeleted() RETURNS TRIGGER AS $$
BEGIN
    IF OLD.key = 'discourseConnectString' THEN
        PERFORM ct_enableDiscourseIntegration(false);
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ct_settingDeleted ON settings;
CREATE TRIGGER trg_ct_settingDeleted AFTER DELETE ON settings
FOR EACH ROW EXECUTE PROCEDURE ct_settingDeleted();


