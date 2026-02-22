-- Fix push_subscriptions: restrict SELECT, INSERT, UPDATE policies

-- 1. Drop overly permissive policies
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Anyone can insert push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Anyone can update push subscriptions by endpoint" ON public.push_subscriptions;

-- 2. SELECT: only authenticated users can view their own subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- 3. INSERT: only authenticated users can insert
CREATE POLICY "Authenticated users can insert subscriptions"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 4. UPDATE: only authenticated users can update their own subscriptions
CREATE POLICY "Users can update their own subscriptions"
  ON public.push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id OR (user_id IS NULL AND auth.uid() IS NOT NULL));