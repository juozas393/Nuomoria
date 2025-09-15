import React, { useState, useEffect } from 'react';
import { 
  WrenchScrewdriverIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  UserIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  BeakerIcon,
  BoltIcon,
  FireIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { formatDate } from '../utils/format';

interface MaintenanceTask {
  id: string;
  title: string;
  description: string;
  propertyAddress: string;
  tenantName: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  category: 'plumbing' | 'electrical' | 'heating' | 'cleaning' | 'repair' | 'inspection';
  estimatedCost: number;
  actualCost?: number;
  scheduledDate: Date;
  completedDate?: Date;
  assignedTo?: string;
  notes?: string;
  createdAt: Date;
}

const Maintenance: React.FC = () => {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  useEffect(() => {
    const loadTasks = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockTasks: MaintenanceTask[] = [
        {
          id: '1',
          title: 'Vandens čiaupo remontas',
          description: 'Virtuvėje esantis čiaupas nuteka. Reikia pakeisti gumos žiedą.',
          propertyAddress: 'Vokiečių g. 117',
          tenantName: 'Jonas Jonaitis',
          priority: 'medium',
          status: 'pending',
          category: 'plumbing',
          estimatedCost: 50,
          scheduledDate: new Date('2025-07-15'),
          createdAt: new Date('2025-07-01'),
        },
        {
          id: '2',
          title: 'Elektros skydelio patikrinimas',
          description: 'Nuomininkas praneša apie trumpus elektros išjungimus.',
          propertyAddress: 'Laisvės al. 45',
          tenantName: 'Marija Jonaitė',
          priority: 'high',
          status: 'in_progress',
          category: 'electrical',
          estimatedCost: 120,
          actualCost: 95,
          scheduledDate: new Date('2025-07-10'),
          assignedTo: 'Elektros meistras',
          createdAt: new Date('2025-06-28'),
        },
        {
          id: '3',
          title: 'Šildymo sistemos priežiūra',
          description: 'Sezoninė šildymo sistemos patikra ir valymas.',
          propertyAddress: 'Gedimino pr. 12',
          tenantName: 'Jonas Petrauskas',
          priority: 'low',
          status: 'completed',
          category: 'heating',
          estimatedCost: 80,
          actualCost: 75,
          scheduledDate: new Date('2025-06-25'),
          completedDate: new Date('2025-06-26'),
          assignedTo: 'Šildymo technikas',
          createdAt: new Date('2025-06-20'),
        },
        {
          id: '4',
          title: 'Balkono durų remontas',
          description: 'Balkono durys neužsidaro tvirtai, reikia reguliuoti.',
          propertyAddress: 'Vokiečių g. 117',
          tenantName: 'Jonas Jonaitis',
          priority: 'urgent',
          status: 'pending',
          category: 'repair',
          estimatedCost: 150,
          scheduledDate: new Date('2025-07-20'),
          createdAt: new Date('2025-07-02'),
        },
        {
          id: '5',
          title: 'Ventiliacijos patikra',
          description: 'Virtuvės ventiliacijos sistema veikia silpnai.',
          propertyAddress: 'Laisvės al. 45',
          tenantName: 'Marija Jonaitė',
          priority: 'medium',
          status: 'in_progress',
          category: 'inspection',
          estimatedCost: 60,
          scheduledDate: new Date('2025-07-12'),
          assignedTo: 'Ventiliacijos technikas',
          createdAt: new Date('2025-07-01'),
        }
      ];
      
      setTasks(mockTasks);
      setLoading(false);
    };

    loadTasks();
  }, []);

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.propertyAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.tenantName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-400';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'resolved': return 'bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'Skubu';
      case 'high':
        return 'Aukšta';
      case 'medium':
        return 'Vidutinė';
      case 'low':
        return 'Žema';
      default:
        return priority;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Atlikta';
      case 'in_progress':
        return 'Vykdoma';
      case 'pending':
        return 'Laukia';
      case 'cancelled':
        return 'Atšaukta';
      default:
        return status;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'plumbing':
        return <BeakerIcon className="w-6 h-6" />;
      case 'electrical':
        return <BoltIcon className="w-6 h-6" />;
      case 'heating':
        return <FireIcon className="w-6 h-6" />;
      case 'cleaning':
        return <SparklesIcon className="w-6 h-6" />;
      case 'repair':
        return <WrenchScrewdriverIcon className="w-6 h-6" />;
      case 'inspection':
        return <EyeIcon className="w-6 h-6" />;
      default:
        return <WrenchScrewdriverIcon className="w-6 h-6" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="card p-6">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Priežiūra
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Valdykite techninę priežiūrą ir remontus
          </p>
        </div>
        <button className="btn-primary flex items-center space-x-2">
          <PlusIcon className="w-5 h-5" />
          <span>Pridėti užduotį</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Ieškoti pagal pavadinimą, adresą ar nuomininką..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <FunnelIcon className="w-5 h-5 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="all">Visi statusai</option>
              <option value="pending">Laukia</option>
              <option value="in_progress">Vykdoma</option>
              <option value="completed">Atlikta</option>
              <option value="cancelled">Atšaukta</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="all">Visos prioritetai</option>
              <option value="urgent">Skubu</option>
              <option value="high">Aukšta</option>
              <option value="medium">Vidutinė</option>
              <option value="low">Žema</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTasks.map((task) => (
          <div key={task.id} className="card p-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getCategoryIcon(task.category)}</span>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {task.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {task.description}
                  </p>
                </div>
              </div>
              <div className="flex flex-col space-y-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                  {getPriorityText(task.priority)}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                  {getStatusText(task.status)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {/* Property and Tenant */}
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <BuildingOfficeIcon className="w-4 h-4" />
                <span>{task.propertyAddress}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <UserIcon className="w-4 h-4" />
                <span>{task.tenantName}</span>
              </div>

              {/* Schedule and Cost */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-sm">
                  <CalendarIcon className="w-4 h-4" />
                  <span>{formatDate(task.scheduledDate)}</span>
                </div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  €{task.estimatedCost}
                </div>
              </div>

              {/* Assigned To */}
              {task.assignedTo && (
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <WrenchScrewdriverIcon className="w-4 h-4" />
                  <span>{task.assignedTo}</span>
                </div>
              )}

              {/* Completion Date */}
              {task.completedDate && (
                <div className="flex items-center space-x-2 text-sm text-primary-600">
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>Atlikta: {formatDate(task.completedDate)}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button className="flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400">
                <EyeIcon className="w-4 h-4" />
                <span>Peržiūrėti</span>
              </button>
              <button className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-700 dark:text-gray-400">
                <PencilIcon className="w-4 h-4" />
                <span>Redaguoti</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <WrenchScrewdriverIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Nerasta priežiūros užduočių
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Pabandykite pakeisti paieškos kriterijus arba pridėkite naują užduotį.
          </p>
        </div>
      )}
    </div>
  );
};

export default Maintenance; 