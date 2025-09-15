// Background images for different sections
export const BACKGROUND_IMAGES = {
  hero: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&h=1080&fit=crop&crop=center&q=80',
  properties: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&h=1080&fit=crop&crop=center&q=80',
  modern: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1920&h=1080&fit=crop&crop=center&q=80',
  luxury: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&h=1080&fit=crop&crop=center&q=80',
  office: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1920&h=1080&fit=crop&crop=center&q=80',
  cityscape: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1920&h=1080&fit=crop&crop=center&q=80',
  architecture: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&h=1080&fit=crop&crop=center&q=80',
  modernBuilding: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1920&h=1080&fit=crop&crop=center&q=80'
};

// App configuration
export const APP_CONFIG = {
  name: 'PropertyManager',
  version: '1.0.0',
  description: 'Modern property management platform for worldwide use',
  author: 'PropertyManager Team',
  contact: {
    email: 'info@propertymanager.com',
    phone: '+370 600 00000',
    website: 'https://propertymanager.com'
  }
};

// Navigation items
export const NAVIGATION_ITEMS = [
  {
    name: 'Dashboard',
    href: '/',
    icon: 'HomeIcon',
    description: 'Pagrindinis skydelis'
  },
  {
    name: 'Properties',
    href: '/properties',
    icon: 'BuildingOfficeIcon',
    description: 'Nuosavybių valdymas'
  },
  {
    name: 'Tenants',
    href: '/tenants',
    icon: 'UsersIcon',
    description: 'Nuomininkų valdymas'
  },
  {
    name: 'Invoices',
    href: '/invoices',
    icon: 'DocumentTextIcon',
    description: 'Sąskaitų valdymas'
  },
  {
    name: 'Maintenance',
    href: '/maintenance',
    icon: 'WrenchScrewdriverIcon',
    description: 'Priežiūros valdymas'
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: 'ChartBarIcon',
    description: 'Analitika ir ataskaitos'
  }
];

// Quick actions configuration
export const QUICK_ACTIONS = [
  {
    title: 'Pridėti objektą',
    description: 'Registruoti naują nekilnojamąjį turtą',
    icon: 'BuildingOfficeIcon',
    color: 'primary',
    href: '/properties/add'
  },
  {
    title: 'Naujas nuomininkas',
    description: 'Registruoti naują nuomininką',
    icon: 'UserPlusIcon',
    color: 'primary',
    href: '/tenants/add'
  },
  {
    title: 'Sukurti sąskaitą',
    description: 'Generuoti mokėjimo sąskaitą',
    icon: 'DocumentTextIcon',
    color: 'primary',
    href: '/invoices/create'
  },
  {
    title: 'Priežiūros užklausa',
    description: 'Registruoti techninės priežiūros užklausą',
    icon: 'WrenchScrewdriverIcon',
    color: 'primary',
    href: '/maintenance/request'
  },
  {
    title: 'Ataskaitos',
    description: 'Peržiūrėti finansines ataskaitas',
    icon: 'ChartBarIcon',
    color: 'primary',
    href: '/analytics'
  },
  {
    title: 'Nustatymai',
    description: 'Sistemos konfigūracija',
    icon: 'Cog6ToothIcon',
    color: 'primary',
    href: '/settings'
  }
];

// Color schemes for different sections
export const COLOR_SCHEMES = {
  primary: {
    light: 'from-primary-400 to-primary-500',
    dark: 'from-primary-500 to-primary-600',
    text: 'text-primary-600',
    bg: 'bg-primary-50',
    border: 'border-primary-200'
  },
  success: {
    light: 'from-primary-400 to-primary-500',
    dark: 'from-primary-500 to-primary-600',
    text: 'text-primary-600',
    bg: 'bg-primary-50',
    border: 'border-primary-200'
  },
  warning: {
    light: 'from-amber-500 to-orange-600',
    dark: 'from-amber-600 to-orange-700',
    text: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200'
  },
  danger: {
    light: 'from-red-500 to-pink-600',
    dark: 'from-red-600 to-pink-700',
    text: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200'
  },
  info: {
    light: 'from-sky-500 to-blue-600',
    dark: 'from-sky-600 to-blue-700',
    text: 'text-sky-600',
    bg: 'bg-sky-50',
    border: 'border-sky-200'
  },
  neutral: {
    light: 'from-gray-500 to-gray-600',
    dark: 'from-gray-600 to-gray-700',
    text: 'text-gray-600',
    bg: 'bg-gray-50',
    border: 'border-gray-200'
  }
};

// Status configurations
export const STATUS_CONFIG = {
  occupied: {
    text: 'Užimta',
    color: 'bg-primary-100 text-primary-800 border-primary-200',
    bg: 'bg-primary-50',
    textColor: 'text-primary-700',
    progressColor: 'bg-primary-500'
  },
  vacant: {
    text: 'Laisva',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    bg: 'bg-gray-50',
    textColor: 'text-gray-700',
    progressColor: 'bg-gray-500'
  },
  maintenance: {
    text: 'Priežiūra',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    bg: 'bg-orange-50',
    textColor: 'text-orange-700',
    progressColor: 'bg-orange-500'
  }
};

// Priority configurations
export const PRIORITY_CONFIG = {
  urgent: {
    label: 'Skubu',
    color: 'bg-red-600 text-white border-red-500',
    bg: 'bg-red-50',
    text: 'text-red-700'
  },
  high: {
    label: 'Aukšta',
    color: 'bg-orange-600 text-white border-orange-500',
    bg: 'bg-orange-50',
    text: 'text-orange-700'
  },
  medium: {
    label: 'Vidutinė',
    color: 'bg-amber-600 text-white border-amber-500',
    bg: 'bg-amber-50',
    text: 'text-amber-700'
  },
  low: {
    label: 'Žema',
    color: 'bg-slate-600 text-white border-slate-500',
    bg: 'bg-slate-50',
    text: 'text-slate-700'
  }
}; 