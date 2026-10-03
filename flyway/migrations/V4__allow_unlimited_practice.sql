-- Published quizzes can be practiced repeatedly without an admin retake grant.
-- Keep historical attempts and the unique constraint for explicit retake grants.
BEGIN
    EXECUTE IMMEDIATE 'DROP INDEX uq_attempt_first';
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE != -1418 THEN
            RAISE;
        END IF;
END;
/
