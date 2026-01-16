// Optimized utility functions for tenant operations
export const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'Nenurodyta';
  const date = new Date(dateString);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('lt-LT', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};

export const getDaysUntilContractEnd = (contractEnd: string): number => {
  const endDate = new Date(contractEnd);
  const today = new Date();
  const diffTime = endDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const getContractStatusText = (contractEnd: string): string => {
  const daysLeft = getDaysUntilContractEnd(contractEnd);
  
  if (daysLeft < 0) {
    return 'Sutartis baigėsi';
  } else if (daysLeft === 0) {
    return 'Sutartis baigiasi šiandien';
  } else if (daysLeft <= 30) {
    return `Baigiasi per ${daysLeft} dienų`;
  } else if (daysLeft <= 90) {
    return `Baigiasi per ${Math.ceil(daysLeft / 30)} mėnesių`;
  } else {
    return `Baigiasi ${formatDate(contractEnd)}`;
  }
};

export const getContractDateColor = (contractEnd: string): string => {
  const daysLeft = getDaysUntilContractEnd(contractEnd);
  
  if (daysLeft < 0) return 'text-red-600';
  if (daysLeft <= 30) return 'text-orange-600';
  if (daysLeft <= 90) return 'text-yellow-600';
  return 'text-green-600';
};

export const calculateTenantStatistics = (tenants: any[]) => {
  const total = tenants.length;
  const problems = tenants.filter(t => 
    t.payment_status === 'overdue' || 
    t.payment_status === 'unpaid' || 
    !t.meters_submitted || 
    t.cleaning_required ||
    getDaysUntilContractEnd(t.contractEnd) < 0
  ).length;
  
  const unpaid = tenants.filter(t => t.payment_status === 'unpaid' || t.payment_status === 'overdue').length;
  const unsubmitted = tenants.filter(t => !t.meters_submitted).length;
  const cleaning = tenants.filter(t => t.cleaning_required).length;
  const expired = tenants.filter(t => getDaysUntilContractEnd(t.contractEnd) < 0).length;
  const active = tenants.filter(t => t.status === 'active' && getDaysUntilContractEnd(t.contractEnd) >= 0).length;
  const movingOut = tenants.filter(t => t.planned_move_out_date).length;

  return {
    total,
    problems,
    unpaid,
    unsubmitted,
    cleaning,
    expired,
    active,
    movingOut
  };
};

export const filterTenants = (
  tenants: any[], 
  searchTerm: string, 
  activeFilter: string
) => {
  return tenants.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    switch (activeFilter) {
      case 'problems':
        return tenant.payment_status === 'overdue' || 
               tenant.payment_status === 'unpaid' || 
               !tenant.meters_submitted || 
               tenant.cleaning_required ||
               getDaysUntilContractEnd(tenant.contractEnd) < 0;
      case 'unpaid':
        return tenant.payment_status === 'unpaid' || tenant.payment_status === 'overdue';
      case 'unsubmitted':
        return !tenant.meters_submitted;
      case 'cleaning':
        return tenant.cleaning_required;
      case 'expired':
        return getDaysUntilContractEnd(tenant.contractEnd) < 0;
      case 'active':
        return tenant.status === 'active' && getDaysUntilContractEnd(tenant.contractEnd) >= 0;
      case 'movingOut':
        return !!tenant.planned_move_out_date;
      default:
        return true;
    }
  });
};

export const sortTenants = (tenants: any[], sortBy: string) => {
  const sorted = [...tenants];
  
  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'date':
        return new Date(b.contractEnd).getTime() - new Date(a.contractEnd).getTime();
      case 'status':
        return a.status.localeCompare(b.status);
      case 'payment':
        return (b.outstanding_amount || 0) - (a.outstanding_amount || 0);
      case 'area':
        return (b.area || 0) - (a.area || 0);
      case 'rooms':
        return (b.rooms || 0) - (a.rooms || 0);
      default:
        return 0;
    }
  });
  
  return sorted;
};

export const groupTenantsByAddress = (tenants: any[]) => {
  const grouped: { [address: string]: any[] } = {};
  tenants.forEach(tenant => {
    if (!grouped[tenant.address]) {
      grouped[tenant.address] = [];
    }
    grouped[tenant.address].push(tenant);
  });
  return grouped;
}; 