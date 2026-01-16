/**
 * PDF Export Utility
 * 
 * Generuoja PDF reportą iš Analytics duomenų
 * Naudoja browser print API (window.print) su @media print stiliais
 */

export interface PDFExportOptions {
  title: string;
  subtitle?: string;
  includeCharts?: boolean;
  includeTable?: boolean;
  includeInsights?: boolean;
  orientation?: 'portrait' | 'landscape';
}

export const exportToPDF = async (options: PDFExportOptions): Promise<void> => {
  const {
    title,
    subtitle,
    includeCharts = true,
    includeTable = true,
    includeInsights = true,
    orientation = 'portrait'
  } = options;

  // Create print-friendly HTML
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Popup blocked. Please allow popups for this site.');
  }

  // Get current page content
  const content = document.getElementById('analytics-content');
  if (!content) {
    throw new Error('Analytics content not found');
  }

  // Clone content
  const clonedContent = content.cloneNode(true) as HTMLElement;

  // Remove interactive elements
  clonedContent.querySelectorAll('button, input, select').forEach(el => el.remove());
  
  // Hide charts if not included
  if (!includeCharts) {
    clonedContent.querySelectorAll('[data-chart]').forEach(el => (el as HTMLElement).style.display = 'none');
  }
  
  // Hide table if not included
  if (!includeTable) {
    clonedContent.querySelectorAll('[data-table]').forEach(el => (el as HTMLElement).style.display = 'none');
  }
  
  // Hide insights if not included
  if (!includeInsights) {
    clonedContent.querySelectorAll('[data-insights]').forEach(el => (el as HTMLElement).style.display = 'none');
  }

  // Build print document
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          @page {
            size: ${orientation === 'landscape' ? 'landscape' : 'portrait'};
            margin: 1.5cm;
          }
          
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 10pt;
            line-height: 1.4;
            color: #000;
          }
          
          h1 {
            font-size: 24pt;
            font-weight: bold;
            margin-bottom: 0.5cm;
            color: #2F8481;
          }
          
          h2 {
            font-size: 16pt;
            font-weight: bold;
            margin-top: 0.8cm;
            margin-bottom: 0.4cm;
            color: #000;
          }
          
          h3 {
            font-size: 12pt;
            font-weight: bold;
            margin-top: 0.5cm;
            margin-bottom: 0.3cm;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 0.5cm;
            font-size: 9pt;
          }
          
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          
          th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          
          .page-break {
            page-break-after: always;
          }
          
          .no-print {
            display: none !important;
          }
          
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 0.5cm;
            margin: 0.5cm 0;
          }
          
          .kpi-card {
            border: 1px solid #ddd;
            padding: 0.3cm;
            border-radius: 4px;
          }
          
          .kpi-value {
            font-size: 18pt;
            font-weight: bold;
            color: #2F8481;
          }
          
          .kpi-label {
            font-size: 9pt;
            color: #666;
            margin-top: 4px;
          }
          
          svg {
            max-width: 100%;
            height: auto;
          }
          
          .subtitle {
            font-size: 11pt;
            color: #666;
            margin-bottom: 1cm;
          }
          
          .footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 1cm;
            text-align: center;
            font-size: 8pt;
            color: #999;
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ''}
        
        ${clonedContent.innerHTML}
        
        <div class="footer">
          Sugeneruota: ${new Date().toLocaleString('lt-LT')} | ${title}
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();
  
  // Wait for content to load
  printWindow.onload = () => {
    // Trigger print dialog
    setTimeout(() => {
      printWindow.print();
      // Close after print (optional)
      // printWindow.close();
    }, 250);
  };
};

/**
 * Export data to CSV
 */
export const exportToCSV = (data: any[], filename: string): void => {
  if (data.length === 0) return;

  // Get headers
  const headers = Object.keys(data[0]);
  
  // Build CSV rows
  const csvRows = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma
        const escaped = String(value).replace(/"/g, '""');
        return escaped.includes(',') ? `"${escaped}"` : escaped;
      }).join(',')
    )
  ];
  
  // Create CSV blob
  const csvContent = csvRows.join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // UTF-8 BOM
  
  // Trigger download
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  
  // Cleanup
  URL.revokeObjectURL(link.href);
};

/**
 * Schedule report generation
 */
export interface ScheduledReportConfig {
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  time: string; // HH:MM format
  recipients: string[]; // Email addresses
  format: 'pdf' | 'csv' | 'both';
  includeCharts: boolean;
}

export const scheduleReport = async (config: ScheduledReportConfig): Promise<void> => {
  // This would be implemented on the backend
  // Frontend just stores the configuration
  const scheduledReports = JSON.parse(localStorage.getItem('scheduledReports') || '[]');
  scheduledReports.push({
    ...config,
    id: Date.now(),
    createdAt: new Date().toISOString()
  });
  localStorage.setItem('scheduledReports', JSON.stringify(scheduledReports));
  
  console.log('Report scheduled:', config);
  // In production: Send to backend API
  // await fetch('/api/reports/schedule', { method: 'POST', body: JSON.stringify(config) });
};

