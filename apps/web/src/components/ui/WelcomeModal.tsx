import React, { useState } from 'react';
import { Sparkles, ArrowRight, Home, ShieldCheck, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export const WelcomeModal: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  // If there's no user, or they've already completed the welcome step, don't render.
  if (!user || user.welcome_completed) return null;
  if (!isOpen) return null;

  const handleStart = async () => {
    setIsStarting(true);
    
    try {
      // 1. Mark in database
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ welcome_completed: true })
        .eq('id', user.id);
        
      if (dbError) throw dbError;

      // 2. Trigger Welcome Email Edge Function
      // Note: We don't await this so the UI feels instant.
      supabase.functions.invoke('send-welcome-email', {
        body: {
          to: user.email,
          name: user.first_name,
          role: user.role
        }
      }).catch(err => {
        // Just log the error, don't block the user
        console.error('Failed to send welcome email:', err);
      });

      // 3. Update local state to close modal
      setIsOpen(false);
      
      // Update local user object so it doesn't pop up again this session
      user.welcome_completed = true;

    } catch (error) {
      console.error('Error completing welcome flow:', error);
      // Even on error, let them into the dashboard
      setIsOpen(false);
      user.welcome_completed = true;
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-400">
        
        <div className="p-8 pb-6 text-center">
          <div className="w-14 h-14 bg-[#E8F5F4] rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm border border-[#2F8481]/10">
            <Sparkles className="w-7 h-7 text-[#2F8481]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Sveiki, {user.first_name || 'prisijungę'}!
          </h2>
          <p className="text-gray-500 text-[13px] leading-relaxed">
            Jūsų profilis sėkmingai sukurtas. Atraskite profesionalų būdą {user.role === 'tenant' ? 'valdyti savo nuomą' : 'administruoti nekilnojamąjį turtą'}.
          </p>
        </div>

        <div className="px-8 pb-8">
          <div className="space-y-5 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex flex-shrink-0 items-center justify-center">
                <Home className="w-4 h-4 text-gray-600" />
              </div>
              <div className="pt-0.5">
                <h4 className="text-[13px] font-bold text-gray-900">Viskas vienoje vietoje</h4>
                <p className="text-[12px] text-gray-500 mt-0.5 leading-relaxed">Sutartys, sąskaitos ir skaitiklių rodmenys jūsų prietaisų skydelyje.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex flex-shrink-0 items-center justify-center">
                <Zap className="w-4 h-4 text-gray-600" />
              </div>
              <div className="pt-0.5">
                <h4 className="text-[13px] font-bold text-gray-900">Efektyvus valdymas</h4>
                <p className="text-[12px] text-gray-500 mt-0.5 leading-relaxed">Automatizuoti procesai taupo jūsų laiką kiekvieną dieną.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex flex-shrink-0 items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-gray-600" />
              </div>
              <div className="pt-0.5">
                <h4 className="text-[13px] font-bold text-gray-900">Saugumas garantuotas</h4>
                <p className="text-[12px] text-gray-500 mt-0.5 leading-relaxed">Jūsų duomenys apsaugoti moderniausiomis technologijomis.</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={isStarting}
            className="w-full py-3.5 bg-[#2F8481] hover:bg-[#267370] text-white text-[13px] font-bold rounded-xl transition-all shadow-md shadow-[#2F8481]/20 flex items-center justify-center gap-2 group active:scale-[0.98]"
          >
            {isStarting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Pradėti naudotis
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
