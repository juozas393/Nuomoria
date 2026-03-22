import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Users, Check, X, Loader2 } from 'lucide-react';

interface PendingInvitation {
  landlord_id: string;
  landlord_name: string;
  landlord_email: string;
  assignment_ids: string[];
}

export const AgentInvitationsWidget: React.FC = () => {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadInvitations = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Fetch pending assignments for this agent
      const { data: assignments, error } = await supabase
        .from('agent_assignments')
        .select('id, landlord_id')
        .eq('agent_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;
      if (!assignments || assignments.length === 0) {
        setInvitations([]);
        return;
      }

      // Group by landlord
      const grouped = assignments.reduce<Record<string, string[]>>((acc, a) => {
        if (!acc[a.landlord_id]) acc[a.landlord_id] = [];
        acc[a.landlord_id].push(a.id);
        return acc;
      }, {});

      // Fetch landlord details
      const landlordIds = Object.keys(grouped);
      const { data: landlords } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .in('id', landlordIds);

      const landlordMap = new Map<string, any>();
      if (landlords) {
        landlords.forEach(l => landlordMap.set(l.id, l));
      }

      const formatted: PendingInvitation[] = Object.entries(grouped).map(([llId, accIds]) => {
        const ll = landlordMap.get(llId);
        const name = ll ? [ll.first_name, ll.last_name].filter(Boolean).join(' ').trim() : '';
        const email = ll?.email || 'Nežinomas el. paštas';
        return {
          landlord_id: llId,
          landlord_name: name || email,
          landlord_email: email,
          assignment_ids: accIds,
        };
      });

      setInvitations(formatted);
    } catch (err) {
      console.error('Failed to load agent invitations:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  const handleAccept = async (invitation: PendingInvitation) => {
    setProcessingId(invitation.landlord_id);
    try {
      await supabase
        .from('agent_assignments')
        .update({ status: 'active' })
        .in('id', invitation.assignment_ids);
      
      // Remove from list
      setInvitations(prev => prev.filter(i => i.landlord_id !== invitation.landlord_id));
      
      // Reload page to refresh permissions and assignments globally
      window.location.reload();
    } catch (err) {
      console.error('Error accepting invitation', err);
    } finally {
      if (invitations.length > 1) {
        setProcessingId(null);
      }
    }
  };

  const handleDecline = async (invitation: PendingInvitation) => {
    setProcessingId(invitation.landlord_id);
    try {
      await supabase
        .from('agent_assignments')
        .delete()
        .in('id', invitation.assignment_ids);

      setInvitations(prev => prev.filter(i => i.landlord_id !== invitation.landlord_id));
    } catch (err) {
      console.error('Error declining invitation', err);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading || invitations.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      {invitations.map(inv => (
        <div key={inv.landlord_id} className="bg-amber-50/80 border border-amber-200/60 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
          
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-amber-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">Naujas agento kvietimas</h3>
            <p className="text-sm text-gray-600 mt-0.5">
              <strong className="text-gray-900">{inv.landlord_name}</strong> kviečia jus tapti nuomotojo agentu ir valdyti priskirtus būstus.
            </p>
          </div>
          
          <div className="flex flex-row items-center gap-2 w-full sm:w-auto">
            {processingId === inv.landlord_id ? (
              <div className="w-full sm:w-auto flex justify-center px-6 py-2">
                <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
              </div>
            ) : (
              <>
                <button
                  onClick={() => handleDecline(inv)}
                  disabled={!!processingId}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 hover:text-red-600 hover:border-red-200 transition-all active:scale-[0.98]"
                >
                  <X className="w-4 h-4" />
                  Atmesti
                </button>
                <button
                  onClick={() => handleAccept(inv)}
                  disabled={!!processingId}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 shadow-sm transition-all active:scale-[0.98]"
                >
                  <Check className="w-4 h-4" />
                  Priimti
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
