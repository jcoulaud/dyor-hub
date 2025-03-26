-- Check if the vote_type column exists
DO $$
DECLARE
    vote_type_exists BOOLEAN;
    type_exists BOOLEAN;
BEGIN
    -- Check if vote_type column exists
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'comment_votes' AND column_name = 'vote_type'
    ) INTO vote_type_exists;
    
    -- Check if type column exists
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'comment_votes' AND column_name = 'type'
    ) INTO type_exists;
    
    -- If vote_type exists but type doesn't, rename the column
    IF vote_type_exists AND NOT type_exists THEN
        EXECUTE 'ALTER TABLE "comment_votes" RENAME COLUMN "vote_type" TO "type"';
        RAISE NOTICE 'Renamed vote_type column to type in comment_votes table';
        
        -- Record the migration
        INSERT INTO "migrations"."typeorm_migrations"("timestamp", "name") 
        VALUES(1740587586482, '1740587586482-fix-vote-type-column')
        ON CONFLICT DO NOTHING;
        
    -- If both columns exist, we have a problem
    ELSIF vote_type_exists AND type_exists THEN
        RAISE NOTICE 'Both vote_type and type columns exist in comment_votes table. Manual intervention required.';
        
    -- If neither column exists, we have a bigger problem
    ELSIF NOT vote_type_exists AND NOT type_exists THEN
        RAISE NOTICE 'Neither vote_type nor type column exists in comment_votes table. Manual intervention required.';
        
    -- If only type exists, we're good
    ELSE
        RAISE NOTICE 'Column type already exists in comment_votes table, no action needed';
        
        -- Ensure migration is recorded
        INSERT INTO "migrations"."typeorm_migrations"("timestamp", "name") 
        VALUES(1740587586482, '1740587586482-fix-vote-type-column')
        ON CONFLICT DO NOTHING;
    END IF;
END $$; 