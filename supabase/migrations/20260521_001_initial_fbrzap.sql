CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    display_name,
    avatar_url,
    phone,
    org_slug
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1), 'Novo usuario'),
    NEW.raw_user_meta_data ->> 'avatar_url',
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data ->> 'org_slug', 'default')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 120),
  avatar_url TEXT,
  phone TEXT,
  org_slug TEXT NOT NULL DEFAULT 'default' CHECK (char_length(org_slug) BETWEEN 2 AND 80),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('dm_agent', 'group')),
  title TEXT,
  agent_id TEXT,
  org_slug TEXT NOT NULL DEFAULT 'default' CHECK (char_length(org_slug) BETWEEN 2 AND 80),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chats_agent_requirements CHECK (
    (type = 'dm_agent' AND agent_id IS NOT NULL)
    OR
    (type = 'group')
  ),
  CONSTRAINT chats_group_title_requirements CHECK (
    (type = 'group' AND title IS NOT NULL)
    OR
    (type = 'dm_agent')
  )
);

CREATE TABLE IF NOT EXISTS public.chat_members (
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  muted_until TIMESTAMPTZ,
  PRIMARY KEY (chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound_user', 'outbound_agent', 'system')),
  sender_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sender_agent_id TEXT,
  content TEXT NOT NULL DEFAULT '',
  attachments JSONB NOT NULL DEFAULT '[]'::JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  mentions JSONB NOT NULL DEFAULT '[]'::JSONB,
  reply_to_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  client_message_id UUID,
  request_id UUID,
  status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('accepted', 'processing', 'replied', 'failed', 'read')),
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT messages_sender_requirements CHECK (
    (direction = 'inbound_user' AND sender_user_id IS NOT NULL AND sender_agent_id IS NULL)
    OR
    (direction = 'outbound_agent' AND sender_agent_id IS NOT NULL)
    OR
    (direction = 'system')
  )
);

CREATE TABLE IF NOT EXISTS public.message_reads (
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.distribution_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  description TEXT,
  org_slug TEXT NOT NULL DEFAULT 'default' CHECK (char_length(org_slug) BETWEEN 2 AND 80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.distribution_list_members (
  list_id UUID NOT NULL REFERENCES public.distribution_lists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (list_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.distribution_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.distribution_lists(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::JSONB,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.distribution_broadcast_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES public.distribution_broadcasts(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_chat_id UUID REFERENCES public.chats(id) ON DELETE SET NULL,
  target_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed')),
  error_code TEXT,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (broadcast_id, recipient_user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS chats_unique_dm_agent_per_creator
  ON public.chats (created_by, agent_id)
  WHERE type = 'dm_agent';

CREATE UNIQUE INDEX IF NOT EXISTS messages_client_message_id_unique
  ON public.messages (client_message_id)
  WHERE client_message_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS messages_request_id_unique
  ON public.messages (request_id)
  WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_org_slug_idx
  ON public.profiles (org_slug);

CREATE INDEX IF NOT EXISTS chats_org_slug_idx
  ON public.chats (org_slug);

CREATE INDEX IF NOT EXISTS chats_last_message_at_idx
  ON public.chats (last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS chat_members_user_id_idx
  ON public.chat_members (user_id);

CREATE INDEX IF NOT EXISTS messages_chat_created_at_idx
  ON public.messages (chat_id, created_at DESC);

CREATE INDEX IF NOT EXISTS messages_sender_user_id_idx
  ON public.messages (sender_user_id);

CREATE INDEX IF NOT EXISTS messages_sender_agent_id_idx
  ON public.messages (sender_agent_id);

CREATE INDEX IF NOT EXISTS message_reads_user_id_idx
  ON public.message_reads (user_id);

CREATE INDEX IF NOT EXISTS distribution_lists_owner_idx
  ON public.distribution_lists (owner_user_id);

CREATE INDEX IF NOT EXISTS distribution_list_members_user_idx
  ON public.distribution_list_members (user_id);

CREATE INDEX IF NOT EXISTS distribution_broadcasts_list_id_idx
  ON public.distribution_broadcasts (list_id, created_at DESC);

CREATE INDEX IF NOT EXISTS distribution_broadcast_deliveries_broadcast_idx
  ON public.distribution_broadcast_deliveries (broadcast_id);

CREATE INDEX IF NOT EXISTS distribution_broadcast_deliveries_recipient_idx
  ON public.distribution_broadcast_deliveries (recipient_user_id);

CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_chats_updated_at
BEFORE UPDATE ON public.chats
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_distribution_lists_updated_at
BEFORE UPDATE ON public.distribution_lists
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_distribution_broadcasts_updated_at
BEFORE UPDATE ON public.distribution_broadcasts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_distribution_broadcast_deliveries_updated_at
BEFORE UPDATE ON public.distribution_broadcast_deliveries
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distribution_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distribution_list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distribution_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distribution_broadcast_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_authenticated"
ON public.profiles
FOR SELECT
TO authenticated
USING (TRUE);

CREATE POLICY "profiles_insert_self"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_self"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_self"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "chats_select_member"
ON public.chats
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.chat_members chat_member
    WHERE chat_member.chat_id = public.chats.id
      AND chat_member.user_id = auth.uid()
  )
);

CREATE POLICY "chats_insert_creator"
ON public.chats
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "chats_update_member_admin"
ON public.chats
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.chat_members chat_member
    WHERE chat_member.chat_id = public.chats.id
      AND chat_member.user_id = auth.uid()
      AND chat_member.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.chat_members chat_member
    WHERE chat_member.chat_id = public.chats.id
      AND chat_member.user_id = auth.uid()
      AND chat_member.role IN ('owner', 'admin')
  )
);

CREATE POLICY "chat_members_select_member"
ON public.chat_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.chat_members self_member
    WHERE self_member.chat_id = public.chat_members.chat_id
      AND self_member.user_id = auth.uid()
  )
);

CREATE POLICY "chat_members_insert_group_admin"
ON public.chat_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.chat_members acting_member
    WHERE acting_member.chat_id = public.chat_members.chat_id
      AND acting_member.user_id = auth.uid()
      AND acting_member.role IN ('owner', 'admin')
  )
  OR user_id = auth.uid()
);

CREATE POLICY "chat_members_update_group_owner_admin"
ON public.chat_members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.chat_members acting_member
    WHERE acting_member.chat_id = public.chat_members.chat_id
      AND acting_member.user_id = auth.uid()
      AND acting_member.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.chat_members acting_member
    WHERE acting_member.chat_id = public.chat_members.chat_id
      AND acting_member.user_id = auth.uid()
      AND acting_member.role IN ('owner', 'admin')
  )
);

CREATE POLICY "chat_members_delete_group_owner_admin_or_self"
ON public.chat_members
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.chat_members acting_member
    WHERE acting_member.chat_id = public.chat_members.chat_id
      AND acting_member.user_id = auth.uid()
      AND acting_member.role IN ('owner', 'admin')
  )
);

CREATE POLICY "messages_select_chat_member"
ON public.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.chat_members chat_member
    WHERE chat_member.chat_id = public.messages.chat_id
      AND chat_member.user_id = auth.uid()
  )
);

CREATE POLICY "messages_insert_sender_member"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.chat_members chat_member
    WHERE chat_member.chat_id = public.messages.chat_id
      AND chat_member.user_id = auth.uid()
  )
  AND (
    sender_user_id = auth.uid()
    OR direction <> 'inbound_user'
  )
);

CREATE POLICY "messages_update_sender_or_chat_admin"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  sender_user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.chat_members chat_member
    WHERE chat_member.chat_id = public.messages.chat_id
      AND chat_member.user_id = auth.uid()
      AND chat_member.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  sender_user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.chat_members chat_member
    WHERE chat_member.chat_id = public.messages.chat_id
      AND chat_member.user_id = auth.uid()
      AND chat_member.role IN ('owner', 'admin')
  )
);

CREATE POLICY "message_reads_select_chat_member"
ON public.message_reads
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.messages message
    JOIN public.chat_members chat_member
      ON chat_member.chat_id = message.chat_id
    WHERE message.id = public.message_reads.message_id
      AND chat_member.user_id = auth.uid()
  )
);

CREATE POLICY "message_reads_insert_self"
ON public.message_reads
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.messages message
    JOIN public.chat_members chat_member
      ON chat_member.chat_id = message.chat_id
    WHERE message.id = public.message_reads.message_id
      AND chat_member.user_id = auth.uid()
  )
);

CREATE POLICY "distribution_lists_select_owner"
ON public.distribution_lists
FOR SELECT
TO authenticated
USING (owner_user_id = auth.uid());

CREATE POLICY "distribution_lists_insert_owner"
ON public.distribution_lists
FOR INSERT
TO authenticated
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "distribution_lists_update_owner"
ON public.distribution_lists
FOR UPDATE
TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "distribution_lists_delete_owner"
ON public.distribution_lists
FOR DELETE
TO authenticated
USING (owner_user_id = auth.uid());

CREATE POLICY "distribution_list_members_select_owner"
ON public.distribution_list_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.distribution_lists distribution_list
    WHERE distribution_list.id = public.distribution_list_members.list_id
      AND distribution_list.owner_user_id = auth.uid()
  )
);

CREATE POLICY "distribution_list_members_insert_owner"
ON public.distribution_list_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.distribution_lists distribution_list
    WHERE distribution_list.id = public.distribution_list_members.list_id
      AND distribution_list.owner_user_id = auth.uid()
  )
);

CREATE POLICY "distribution_list_members_delete_owner"
ON public.distribution_list_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.distribution_lists distribution_list
    WHERE distribution_list.id = public.distribution_list_members.list_id
      AND distribution_list.owner_user_id = auth.uid()
  )
);

CREATE POLICY "distribution_broadcasts_select_owner"
ON public.distribution_broadcasts
FOR SELECT
TO authenticated
USING (owner_user_id = auth.uid());

CREATE POLICY "distribution_broadcasts_insert_owner"
ON public.distribution_broadcasts
FOR INSERT
TO authenticated
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "distribution_broadcasts_update_owner"
ON public.distribution_broadcasts
FOR UPDATE
TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "distribution_broadcast_deliveries_select_owner"
ON public.distribution_broadcast_deliveries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.distribution_broadcasts distribution_broadcast
    WHERE distribution_broadcast.id = public.distribution_broadcast_deliveries.broadcast_id
      AND distribution_broadcast.owner_user_id = auth.uid()
  )
);

CREATE POLICY "distribution_broadcast_deliveries_insert_owner"
ON public.distribution_broadcast_deliveries
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.distribution_broadcasts distribution_broadcast
    WHERE distribution_broadcast.id = public.distribution_broadcast_deliveries.broadcast_id
      AND distribution_broadcast.owner_user_id = auth.uid()
  )
);

CREATE POLICY "distribution_broadcast_deliveries_update_owner"
ON public.distribution_broadcast_deliveries
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.distribution_broadcasts distribution_broadcast
    WHERE distribution_broadcast.id = public.distribution_broadcast_deliveries.broadcast_id
      AND distribution_broadcast.owner_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.distribution_broadcasts distribution_broadcast
    WHERE distribution_broadcast.id = public.distribution_broadcast_deliveries.broadcast_id
      AND distribution_broadcast.owner_user_id = auth.uid()
  )
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.distribution_broadcasts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.distribution_broadcast_deliveries;
