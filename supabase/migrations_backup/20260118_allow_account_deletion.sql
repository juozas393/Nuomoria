-- Allow users to delete their own profiles and users records
-- This enables account self-deletion

-- Allow authenticated users to delete their own profile
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Allow authenticated users to delete their own user record
DROP POLICY IF EXISTS "Users can delete own user" ON users;
CREATE POLICY "Users can delete own user"
  ON users FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Grant delete permission on profiles
GRANT DELETE ON profiles TO authenticated;

-- Grant delete permission on users
GRANT DELETE ON users TO authenticated;
