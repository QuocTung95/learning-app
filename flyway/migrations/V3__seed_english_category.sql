MERGE INTO category target
USING (SELECT 'ENGLISH' AS code, 'English' AS name FROM dual) source
ON (target.code = source.code)
WHEN NOT MATCHED THEN
    INSERT (code, name) VALUES (source.code, source.name);
