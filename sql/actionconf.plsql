create or replace function random_string(length integer) returns text as $$
declare
    chars text[] := '{0,1,2,3,4,5,6,7,8,9,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z,a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z}';
    result text := '';
    i integer := 0;
begin
    if length < 0 then
        raise exception 'Given length cannot be less than 0';
    end if;

    for i in 1..length loop
        result := result || chars[1+random()*(array_length(chars, 1)-1)];
    end loop;

    return result;
    end;
$$ language 'plpgsql';


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
$$ LANGUAGE 'PLPGSQL';

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
$$ LANGUAGE 'PLPGSQL';

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
$$ LANGUAGE 'PLPGSQL';

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
$$ LANGUAGE 'PLPGSQL';


