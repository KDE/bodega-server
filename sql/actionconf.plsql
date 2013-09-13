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


-- creates a new activation confirmation code for an account
-- PARAMETERS: int person
-- RETURNS: text code
CREATE OR REPLACE FUNCTION ct_createAccountActivationCode(activatePerson int) RETURNS TEXT AS $$
DECLARE
    code        TEXT;
BEGIN
    code := random_string(40);
    DELETE FROM actionConfCodes WHERE action = 'ACTIVATE' AND person = activatePerson;
    INSERT INTO actionConfCodes (person, action, code) VALUES (activatePerson, 'ACTIVATE',  code);
    RETURN code;
END;
$$ LANGUAGE 'plpgsql';

-- activates an account if the conf code matches
-- PARAMETERS: int person, text code
-- RETURNS: bool, true on success
CREATE OR REPLACE FUNCTION ct_activateAccount(activatePerson int, checkCode text) RETURNS BOOL AS $$
DECLARE
BEGIN
    DELETE FROM actionConfCodes WHERE person = activatePerson AND action = 'ACTIVATE'
                                                              AND code = checkCode
                                                              AND issued > current_timestamp - '7 days'::interval;
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    UPDATE people SET active = TRUE WHERE id = activatePerson;
    RETURN FOUND;
END;
$$ LANGUAGE 'plpgsql';

-- for password reset
-- PARAMETERS: int person
-- RETURNS: text code
CREATE OR REPLACE FUNCTION ct_createPasswordResetCode(resetPerson int) RETURNS TEXT AS $$
DECLARE
    code        TEXT;
BEGIN
    code := random_string(40);
    DELETE FROM actionConfCodes WHERE action = 'PASSRESET' AND person = resetPerson;
    INSERT INTO actionConfCodes (person, action, code) VALUES (resetPerson, 'PASSRESET', code);
    return code;
END;
$$ LANGUAGE 'plpgsql';

-- resets a password if the conf code matches
-- PARAMETERS: int person, text new password, text code
-- RETURNS: bool, true on success
CREATE OR REPLACE FUNCTION ct_setPassword(resetPerson int, newPassword text, checkCode text) RETURNS BOOL AS $$
DECLARE
BEGIN
    IF (char_length(checkCode) > 0) THEN
        DELETE FROM actionConfCodes WHERE person = resetPerson AND action = 'PASSRESET'
                                                                  AND code = checkCode
                                    AND issued > current_timestamp - '2 days'::interval;
        IF NOT FOUND THEN
            RETURN FALSE;
        END IF;
    END IF;

    UPDATE people SET password = newPassword WHERE id = resetPerson;
    RETURN FOUND;
END;
$$ LANGUAGE 'plpgsql';


