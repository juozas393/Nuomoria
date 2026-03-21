import React from 'react';
import { Users, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AgentManagementSection from '../components/nuomotojas2/AgentManagementSection';

const AgentsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen">
      {/* Full-page background image */}
      <img
        src="/images/settings.jpg"
        alt=""
        className="fixed inset-0 w-full h-full object-cover"
        loading="eager"
      />
      <div className="fixed inset-0 bg-white/40 backdrop-blur-[1px]" />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 lg:px-6 py-6 lg:py-8">
        {/* Page header */}
        <div className="mb-5">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-500 hover:text-teal-600 transition-colors mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Grįžti į apžvalgą
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 shadow-lg shadow-teal-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Agentai</h1>
              <p className="text-[12px] text-gray-500 mt-0.5">Valdykite nekilnojamojo turto agentus ir jų prieigą prie jūsų turto</p>
            </div>
          </div>
        </div>

        {/* Card with agent management */}
        <div className="bg-white/78 backdrop-blur-[10px] border border-white/60 shadow-[0_4px_12px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] rounded-xl p-5 lg:p-6">
          <AgentManagementSection />
        </div>
      </div>
    </div>
  );
};

AgentsPage.displayName = 'AgentsPage';
export default AgentsPage;
