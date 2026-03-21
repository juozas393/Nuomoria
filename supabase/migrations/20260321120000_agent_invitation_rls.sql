-- Migration to allow agents to accept/decline invitations

-- Add agent_status type if not exists, but we use text 'pending' | 'active'
-- So we just add RLS to allow agents to update exactly the status to 'active' or delete 'pending' records.

-- Allow agent to accept the status
CREATE POLICY "agent_accept_invitation" 
ON agent_assignments 
FOR UPDATE 
USING (auth.uid() = agent_id AND status = 'pending')
WITH CHECK (status = 'active');

-- Allow agent to decline the status
CREATE POLICY "agent_decline_invitation" 
ON agent_assignments 
FOR DELETE 
USING (auth.uid() = agent_id AND status = 'pending');
