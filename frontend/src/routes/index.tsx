import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { MyDayPage } from '@/features/dashboard/MyDayPage';
import { TasksPage } from '@/features/tasks/TasksPage';
import { AttendancePage } from '@/features/attendance/AttendancePage';
import { LeavePage } from '@/features/leave/LeavePage';
import { ProjectsPage } from '@/features/projects/ProjectsPage';
import { StandupsPage } from '@/features/standups/StandupsPage';
import { MeetingsPage } from '@/features/meetings/MeetingsPage';
import { TeamPage } from '@/features/employees/TeamPage';
import { OrganizationPage } from '@/features/organization/OrganizationPage';
import { ReportsPage } from '@/features/reports/ReportsPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { DownloadPage } from '@/features/downloads/DownloadPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<MyDayPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="leave" element={<LeavePage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="standup" element={<StandupsPage />} />
        <Route path="meetings" element={<MeetingsPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="organization" element={<OrganizationPage />} />
        <Route path="departments" element={<Navigate to="/organization" replace />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="download" element={<DownloadPage />} />
        <Route path="downloads" element={<Navigate to="/download" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
