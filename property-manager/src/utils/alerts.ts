/**
 * Smart Alerts & Anomaly Detection
 * 
 * Automatiškai aptinka anomalijas ir siunčia alerts
 * Naudoja simple statistical methods (moving average, std dev)
 */

export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  metric: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  acknowledged: boolean;
  action?: {
    label: string;
    handler: () => void;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'above' | 'below' | 'change';
  threshold: number;
  enabled: boolean;
}

/**
 * Detect anomalies using moving average and standard deviation
 */
export const detectAnomalies = (values: number[], windowSize: number = 6): number[] => {
  if (values.length < windowSize) return [];
  
  const anomalyIndices: number[] = [];
  
  for (let i = windowSize; i < values.length; i++) {
    const window = values.slice(i - windowSize, i);
    const mean = window.reduce((sum, v) => sum + v, 0) / windowSize;
    const stdDev = Math.sqrt(
      window.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / windowSize
    );
    
    const current = values[i];
    const zScore = stdDev > 0 ? Math.abs((current - mean) / stdDev) : 0;
    
    // If z-score > 2 (2 standard deviations), mark as anomaly
    if (zScore > 2) {
      anomalyIndices.push(i);
    }
  }
  
  return anomalyIndices;
};

/**
 * Check alert rules
 */
export const checkAlertRules = (
  data: { metric: string; value: number }[],
  rules: AlertRule[]
): Alert[] => {
  const alerts: Alert[] = [];
  
  rules.forEach(rule => {
    if (!rule.enabled) return;
    
    const metricData = data.find(d => d.metric === rule.metric);
    if (!metricData) return;
    
    let shouldAlert = false;
    
    switch (rule.condition) {
      case 'above':
        shouldAlert = metricData.value > rule.threshold;
        break;
      case 'below':
        shouldAlert = metricData.value < rule.threshold;
        break;
      case 'change':
        // Would need historical data for this
        break;
    }
    
    if (shouldAlert) {
      alerts.push({
        id: `${rule.id}-${Date.now()}`,
        type: metricData.value > rule.threshold * 1.2 || metricData.value < rule.threshold * 0.8 
          ? 'critical' 
          : 'warning',
        title: rule.name,
        message: `${rule.metric} yra ${rule.condition === 'above' ? 'virš' : 'žemiau'} ribos`,
        metric: rule.metric,
        threshold: rule.threshold,
        currentValue: metricData.value,
        timestamp: new Date(),
        acknowledged: false
      });
    }
  });
  
  return alerts;
};

/**
 * Predict next value using simple linear regression
 */
export const predictNextValue = (values: number[]): number => {
  if (values.length < 2) return values[values.length - 1] || 0;
  
  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = values;
  
  // Calculate means
  const xMean = x.reduce((sum, v) => sum + v, 0) / n;
  const yMean = y.reduce((sum, v) => sum + v, 0) / n;
  
  // Calculate slope
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (x[i] - xMean) * (y[i] - yMean);
    denominator += Math.pow(x[i] - xMean, 2);
  }
  
  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;
  
  // Predict next value (x = n)
  return slope * n + intercept;
};

/**
 * Calculate trend (positive, negative, or stable)
 */
export const calculateTrend = (
  values: number[],
  threshold: number = 0.05
): 'up' | 'down' | 'stable' => {
  if (values.length < 2) return 'stable';
  
  const first = values[0];
  const last = values[values.length - 1];
  const change = (last - first) / first;
  
  if (Math.abs(change) < threshold) return 'stable';
  return change > 0 ? 'up' : 'down';
};

/**
 * Default alert rules for property management
 */
export const defaultAlertRules: AlertRule[] = [
  {
    id: 'eu-low',
    name: 'Ekonominis užimtumas žemas',
    metric: 'economicOccupancy',
    condition: 'below',
    threshold: 90,
    enabled: true
  },
  {
    id: 'collection-low',
    name: 'Surinkimo rodiklis žemas',
    metric: 'collectionRate',
    condition: 'below',
    threshold: 90,
    enabled: true
  },
  {
    id: 'overdue-high',
    name: 'Daug vėluojančių mokėjimų',
    metric: 'overdueAmount',
    condition: 'above',
    threshold: 5000,
    enabled: true
  },
  {
    id: 'vacancy-high',
    name: 'Aukštas tuštumas',
    metric: 'vacantUnits',
    condition: 'above',
    threshold: 2,
    enabled: true
  }
];

/**
 * Store alert in localStorage (for persistence)
 */
export const storeAlert = (alert: Alert): void => {
  const alerts = JSON.parse(localStorage.getItem('propertyAlerts') || '[]');
  alerts.unshift(alert);
  // Keep only last 50 alerts
  if (alerts.length > 50) alerts.splice(50);
  localStorage.setItem('propertyAlerts', JSON.stringify(alerts));
};

/**
 * Get stored alerts
 */
export const getStoredAlerts = (): Alert[] => {
  return JSON.parse(localStorage.getItem('propertyAlerts') || '[]');
};

/**
 * Acknowledge alert
 */
export const acknowledgeAlert = (alertId: string): void => {
  const alerts = getStoredAlerts();
  const alert = alerts.find(a => a.id === alertId);
  if (alert) {
    alert.acknowledged = true;
    localStorage.setItem('propertyAlerts', JSON.stringify(alerts));
  }
};

