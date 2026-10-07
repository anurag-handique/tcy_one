import { Attendance, Profile } from '@/types';

/**
 * Generates and triggers download of a standardized CSV file for Attendance Records
 */
export function exportAttendanceCSV(records: Attendance[], profiles: Profile[], filename = 'attendance_records.csv') {
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const headers = [
    'Date',
    'Employee ID',
    'Employee Name',
    'Department',
    'Role',
    'Work Mode',
    'Status',
    'Clock In',
    'Clock Out',
    'Break (Mins)',
    'Total Hours',
    'Overtime Hours',
    'Punch-In Location',
    'Punch-Out Location',
    'Notes',
  ];

  const rows = records.map((rec) => {
    const prof = profileMap.get(rec.employee_id);
    const empName = prof?.full_name || rec.employee_id;
    const dept = prof?.department?.name || 'General';
    const role = prof?.role || 'member';

    const clockInStr = rec.clock_in ? new Date(rec.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
    const clockOutStr = rec.clock_out ? new Date(rec.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

    return [
      `"${rec.date}"`,
      `"${rec.employee_id}"`,
      `"${empName.replace(/"/g, '""')}"`,
      `"${dept.replace(/"/g, '""')}"`,
      `"${role}"`,
      `"${rec.work_mode || 'office'}"`,
      `"${rec.status || 'present'}"`,
      `"${clockInStr}"`,
      `"${clockOutStr}"`,
      rec.break_minutes || 0,
      rec.total_hours || 0,
      rec.overtime_hours || 0,
      `"${(rec.punch_in_location || '').replace(/"/g, '""')}"`,
      `"${(rec.punch_out_location || '').replace(/"/g, '""')}"`,
      `"${(rec.notes || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Triggers a formatted browser print layout for timesheet / attendance records
 */
export function printTimesheetDocument(title: string, records: Attendance[], profiles: Profile[]) {
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return;

  const totalLogged = records.reduce((s, r) => s + (r.total_hours || 0), 0);
  const totalOT = records.reduce((s, r) => s + (r.overtime_hours || 0), 0);
  const totalBreaks = records.reduce((s, r) => s + (r.break_minutes || 0), 0);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #111; font-size: 12px; }
          .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 20px; }
          .logo { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
          .meta { text-align: right; font-size: 11px; color: #555; }
          .summary { display: flex; gap: 20px; margin-bottom: 20px; background: #f4f6f8; padding: 12px 16px; border-radius: 6px; }
          .summary-item { font-size: 11px; }
          .summary-item strong { display: block; font-size: 14px; color: #000; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
          th { background: #f0f3f6; font-weight: 600; font-size: 11px; text-transform: uppercase; }
          tr:nth-child(even) { background: #fafbfc; }
          .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
          .badge-present { background: #e6f4ea; color: #137333; }
          .badge-late { background: #fef7e0; color: #b06000; }
          .badge-absent { background: #fce8e6; color: #c5221f; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">TCY ONE — ENTERPRISE HRMS</div>
            <div style="font-size: 14px; font-weight: 600; margin-top: 4px;">${title}</div>
          </div>
          <div class="meta">
            <div>Generated: ${new Date().toLocaleString()}</div>
            <div>Total Records: ${records.length}</div>
          </div>
        </div>

        <div class="summary">
          <div class="summary-item">
            <span>Total Hours Logged</span>
            <strong>${totalLogged.toFixed(1)}h</strong>
          </div>
          <div class="summary-item">
            <span>Total Overtime</span>
            <strong>${totalOT.toFixed(1)}h</strong>
          </div>
          <div class="summary-item">
            <span>Total Breaks</span>
            <strong>${totalBreaks} mins</strong>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Employee</th>
              <th>Dept</th>
              <th>Mode</th>
              <th>Status</th>
              <th>Clock In</th>
              <th>Clock Out</th>
              <th>Break</th>
              <th>Hours</th>
              <th>OT</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            ${records
              .map((r) => {
                const p = profileMap.get(r.employee_id);
                return `
                <tr>
                  <td><strong>${r.date}</strong></td>
                  <td>${p?.full_name || r.employee_id}</td>
                  <td>${p?.department?.name || 'General'}</td>
                  <td>${r.work_mode || 'office'}</td>
                  <td><span class="badge badge-${r.status || 'present'}">${(r.status || 'present').toUpperCase()}</span></td>
                  <td>${r.clock_in ? new Date(r.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</td>
                  <td>${r.clock_out ? new Date(r.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</td>
                  <td>${r.break_minutes || 0}m</td>
                  <td><strong>${r.total_hours || 0}h</strong></td>
                  <td>${r.overtime_hours ? '+' + r.overtime_hours + 'h' : '0h'}</td>
                  <td style="font-size: 10px; color: #666;">${r.punch_in_location || 'Verified'}</td>
                </tr>
              `;
              })
              .join('')}
          </tbody>
        </table>

        <script>
          window.onload = () => {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
