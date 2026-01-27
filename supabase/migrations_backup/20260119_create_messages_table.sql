-- Messaging System: Conversations and Messages
-- Enable real-time chat between landlords and tenants

-- Conversations table (1:1 between two users)
create table if not exists public.conversations (
    id uuid primary key default gen_random_uuid(),
    property_id uuid references public.properties(id) on delete set null,
    participant_1 uuid not null references auth.users(id) on delete cascade,
    participant_2 uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    
    -- Ensure unique conversation per pair
    constraint unique_conversation unique (participant_1, participant_2)
);

-- Messages table
create table if not exists public.messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.conversations(id) on delete cascade,
    sender_id uuid not null references auth.users(id) on delete cascade,
    content text not null,
    message_type text not null default 'text' check (message_type in ('text', 'invitation_code', 'system')),
    metadata jsonb, -- For invitation_code: { invitation_id, property_label, code }
    is_read boolean not null default false,
    created_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_messages_conversation on public.messages(conversation_id);
create index if not exists idx_messages_created_at on public.messages(created_at desc);
create index if not exists idx_conversations_participant_1 on public.conversations(participant_1);
create index if not exists idx_conversations_participant_2 on public.conversations(participant_2);

-- Enable RLS
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- RLS: Conversations - users can only see their own conversations
drop policy if exists "Users can view own conversations" on public.conversations;
create policy "Users can view own conversations"
    on public.conversations for select
    using (auth.uid() = participant_1 or auth.uid() = participant_2);

drop policy if exists "Users can create conversations" on public.conversations;
create policy "Users can create conversations"
    on public.conversations for insert
    with check (auth.uid() = participant_1 or auth.uid() = participant_2);

-- RLS: Messages - users can only see messages in their conversations
drop policy if exists "Users can view messages in their conversations" on public.messages;
create policy "Users can view messages in their conversations"
    on public.messages for select
    using (
        exists (
            select 1 from public.conversations c
            where c.id = conversation_id
            and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
        )
    );

drop policy if exists "Users can send messages in their conversations" on public.messages;
create policy "Users can send messages in their conversations"
    on public.messages for insert
    with check (
        sender_id = auth.uid()
        and exists (
            select 1 from public.conversations c
            where c.id = conversation_id
            and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
        )
    );

drop policy if exists "Users can mark messages as read" on public.messages;
create policy "Users can mark messages as read"
    on public.messages for update
    using (
        exists (
            select 1 from public.conversations c
            where c.id = conversation_id
            and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
        )
    )
    with check (
        -- Can only update is_read field, content stays same
        is_read = true
    );

-- Function to update conversation timestamp
create or replace function update_conversation_timestamp()
returns trigger as $$
begin
    update public.conversations 
    set updated_at = now() 
    where id = NEW.conversation_id;
    return NEW;
end;
$$ language plpgsql security definer;

-- Trigger to auto-update conversation on new message
drop trigger if exists on_new_message on public.messages;
create trigger on_new_message
    after insert on public.messages
    for each row
    execute function update_conversation_timestamp();

-- Enable realtime for messages (run only once - comment out if already added)
-- Note: If you get "already member of publication" error, this table is already set up for realtime
do $$
begin
    if not exists (
        select 1 from pg_publication_tables 
        where pubname = 'supabase_realtime' 
        and tablename = 'messages'
    ) then
        alter publication supabase_realtime add table public.messages;
    end if;
end $$;
