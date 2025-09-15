import React, { useState, useEffect } from 'react';
import { 
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  LightBulbIcon,
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyEuroIcon,
  CalendarIcon,
  BoltIcon,
  WrenchScrewdriverIcon,
  UserIcon,
  CogIcon,
  PlayIcon,
  PauseIcon,
  StopIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

interface AIInsight {
  id: string;
  type: 'payment' | 'maintenance' | 'contract' | 'communication' | 'optimization';
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  confidence: number;
  action?: {
    label: string;
    onClick: () => void;
    type: 'primary' | 'secondary' | 'danger';
  };
  timestamp: string;
}

interface AIPrediction {
  id: string;
  category: string;
  prediction: string;
  probability: number;
  timeframe: string;
  trend: 'up' | 'down' | 'stable';
}

interface AIAction {
  id: string;
  title: string;
  description: string;
  type: 'automated' | 'suggested' | 'manual';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  estimatedTime?: string;
}

const AIAssistant: React.FC = () => {
  const [isActive, setIsActive] = useState(true);
  const [currentMode, setCurrentMode] = useState<'insights' | 'predictions' | 'actions'>('insights');
  const [selectedInsight, setSelectedInsight] = useState<string | null>(null);

  const [insights, setInsights] = useState<AIInsight[]>([
    {
      id: '1',
      type: 'payment',
      title: 'Mokėjimo optimizacija',
      description: 'Jūsų mokėjimų istorija rodo puikų rezultatą. Rekomenduojame tęsti laiku mokėti sąskaitas.',
      impact: 'positive',
      confidence: 95,
      action: {
        label: 'Nustatyti automatinį mokėjimą',
        onClick: () => console.log('Setup auto payment'),
        type: 'primary'
      },
      timestamp: '2024-01-28T10:00:00Z'
    },
    {
      id: '2',
      type: 'maintenance',
      title: 'Proaktyvus priežiūros valdymas',
      description: 'Greitas atsakymas į priežiūros prašymus pagerina nuomininko-nuomotojo santykius.',
      impact: 'positive',
      confidence: 88,
      action: {
        label: 'Pranešti apie problemą',
        onClick: () => console.log('Report issue'),
        type: 'secondary'
      },
      timestamp: '2024-01-28T09:30:00Z'
    },
    {
      id: '3',
      type: 'contract',
      title: 'Sutarties pratėsimas',
      description: 'Jūsų sutartis baigiasi už 15 dienų. Rekomenduojame greitai priimti sprendimą.',
      impact: 'negative',
      confidence: 92,
      action: {
        label: 'Pratęsti sutartį',
        onClick: () => console.log('Renew contract'),
        type: 'primary'
      },
      timestamp: '2024-01-28T08:15:00Z'
    },
    {
      id: '4',
      type: 'optimization',
      title: 'Energijos vartojimo optimizacija',
      description: 'Jūsų energijos vartojimas yra 15% didesnis nei vidutinis. Galite sutaupyti 25€ per mėnesį.',
      impact: 'neutral',
      confidence: 78,
      action: {
        label: 'Peržiūrėti patarimus',
        onClick: () => console.log('View tips'),
        type: 'secondary'
      },
      timestamp: '2024-01-27T16:45:00Z'
    }
  ]);

  const [predictions, setPredictions] = useState<AIPrediction[]>([
    {
      id: '1',
      category: 'Mokėjimai',
      prediction: 'Vasario mokėjimas bus atliktas laiku',
      probability: 95,
      timeframe: '2024-02-15',
      trend: 'up'
    },
    {
      id: '2',
      category: 'Energijos vartojimas',
      prediction: 'Sausio energijos sąskaita bus 12% mažesnė',
      probability: 78,
      timeframe: '2024-02-01',
      trend: 'down'
    },
    {
      id: '3',
      category: 'Sutarties pratėsimas',
      prediction: 'Sutartis bus pratęsta dar 12 mėnesių',
      probability: 85,
      timeframe: '2024-08-31',
      trend: 'stable'
    },
    {
      id: '4',
      category: 'Priežiūros prašymai',
      prediction: 'Naujas priežiūros prašymas per 7 dienas',
      probability: 65,
      timeframe: '2024-02-05',
      trend: 'up'
    }
  ]);

  const [actions, setActions] = useState<AIAction[]>([
    {
      id: '1',
      title: 'Automatinis skaitliukų rodmenų pateikimas',
      description: 'AI automatiškai pateiks skaitliukų rodmenis kiekvieną mėnesį',
      type: 'automated',
      status: 'running',
      progress: 75,
      estimatedTime: '2 min'
    },
    {
      id: '2',
      title: 'Mokėjimo priminimas',
      description: 'Siųsti priminimą apie artėjančią mokėjimo datą',
      type: 'suggested',
      status: 'pending'
    },
    {
      id: '3',
      title: 'Sutarties pratėsimo dokumentų paruošimas',
      description: 'Paruošti dokumentus sutarties pratėsimui',
      type: 'manual',
      status: 'pending'
    }
  ]);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive': return 'text-green-600 bg-green-100';
      case 'negative': return 'text-red-600 bg-red-100';
      case 'neutral': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'positive': return ArrowTrendingUpIcon;
      case 'negative': return ArrowTrendingDownIcon;
      case 'neutral': return ChartBarIcon;
      default: return ChartBarIcon;
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case 'primary': return 'bg-blue-600 hover:bg-blue-700 text-white';
      case 'secondary': return 'bg-gray-600 hover:bg-gray-700 text-white';
      case 'danger': return 'bg-red-600 hover:bg-red-700 text-white';
      default: return 'bg-gray-600 hover:bg-gray-700 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('lt-LT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 mb-8 shadow-lg border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl">
                <SparklesIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AI Asistentas</h1>
                <p className="text-gray-600">Inteligentus nuomininko valdymas</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className={`text-sm font-medium ${isActive ? 'text-green-600' : 'text-gray-500'}`}>
                  {isActive ? 'Aktyvus' : 'Neaktyvus'}
                </span>
              </div>
              <button
                onClick={() => setIsActive(!isActive)}
                className={`p-2 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {isActive ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 bg-white rounded-xl p-1 mb-8 shadow-sm">
          {[
            { id: 'insights', label: 'AI Insights', icon: LightBulbIcon },
            { id: 'predictions', label: 'Prognozės', icon: ChartBarIcon },
            { id: 'actions', label: 'Automatiniai Veiksmai', icon: CogIcon }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = currentMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentMode(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {currentMode === 'insights' && (
            <motion.div
              key="insights"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {insights.map((insight, index) => {
                const ImpactIcon = getImpactIcon(insight.impact);
                return (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow cursor-pointer"
                    onClick={() => setSelectedInsight(insight.id)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-xl ${getImpactColor(insight.impact)}`}>
                        <ImpactIcon className="w-6 h-6" />
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Confidence</div>
                        <div className="text-lg font-bold text-gray-900">{insight.confidence}%</div>
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{insight.title}</h3>
                    <p className="text-gray-600 mb-4">{insight.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">{formatDate(insight.timestamp)}</span>
                      {insight.action && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            insight.action?.onClick();
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${getActionColor(insight.action.type)}`}
                        >
                          {insight.action.label}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {currentMode === 'predictions' && (
            <motion.div
              key="predictions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {predictions.map((prediction, index) => (
                <motion.div
                  key={prediction.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">{prediction.category}</h3>
                    <div className="flex items-center space-x-2">
                      {prediction.trend === 'up' && <ArrowTrendingUpIcon className="w-5 h-5 text-green-500" />}
                      {prediction.trend === 'down' && <ArrowTrendingDownIcon className="w-5 h-5 text-red-500" />}
                      {prediction.trend === 'stable' && <ChartBarIcon className="w-5 h-5 text-blue-500" />}
                    </div>
                  </div>
                  <p className="text-gray-600 mb-4">{prediction.prediction}</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Tikimybė</span>
                      <span className="text-sm font-medium text-gray-900">{prediction.probability}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${prediction.probability}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>Laikas</span>
                      <span>{prediction.timeframe}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {currentMode === 'actions' && (
            <motion.div
              key="actions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {actions.map((action, index) => (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-3 rounded-xl ${getStatusColor(action.status)}`}>
                        {action.status === 'running' && <PlayIcon className="w-5 h-5" />}
                        {action.status === 'completed' && <CheckCircleIcon className="w-5 h-5" />}
                        {action.status === 'failed' && <ExclamationTriangleIcon className="w-5 h-5" />}
                        {action.status === 'pending' && <ClockIcon className="w-5 h-5" />}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{action.title}</h3>
                        <p className="text-sm text-gray-500">{action.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(action.status)}`}>
                        {action.type === 'automated' ? 'Automatinis' : 
                         action.type === 'suggested' ? 'Pasiūlymas' : 'Rankinis'}
                      </span>
                    </div>
                  </div>
                  
                  {action.progress !== undefined && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Progresas</span>
                        <span className="font-medium text-gray-900">{action.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${action.progress}%` }}
                        ></div>
                      </div>
                      {action.estimatedTime && (
                        <p className="text-xs text-gray-500">Likęs laikas: {action.estimatedTime}</p>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AIAssistant; 