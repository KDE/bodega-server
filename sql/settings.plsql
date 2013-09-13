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


