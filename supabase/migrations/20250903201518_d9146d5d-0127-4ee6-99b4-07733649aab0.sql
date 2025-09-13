-- Fix critical security vulnerability: Profiles table email exposure
-- The current RLS policies allow unauthenticated access, exposing user emails

-- First, drop existing permissive policies that may allow public access
DROP POLICY IF EXISTS "Profiles are viewable by owner" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create strict RLS policies that explicitly require authentication

-- 1. SELECT: Only authenticated users can view their OWN profile data
CREATE POLICY "Users can only view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. INSERT: Only authenticated users can create their own profile
CREATE POLICY "Users can only insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE: Only authenticated users can update their own profile
CREATE POLICY "Users can only update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Explicitly deny ALL access to unauthenticated users
CREATE POLICY "Deny all access to unauthenticated users"
ON public.profiles
FOR ALL
TO anon
USING (false);

-- Ensure RLS is enabled (should already be enabled, but double-check)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;