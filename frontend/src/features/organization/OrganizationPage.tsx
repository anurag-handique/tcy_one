import * as React from 'react';
import {
  Building2,
  Award,
  Users2,
  Plus,
  Search,
  Trash2,
  Edit3,
  Layers,
  Sparkles,
  ChevronRight,
  Filter,
  ShieldCheck,
  Briefcase,
  GitFork,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { Department, Designation, Profile } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type ActiveTab = 'departments' | 'designations' | 'hierarchy';

const SENIORITY_LEVELS = ['Intern', 'Junior', 'Mid', 'Senior', 'Lead', 'Executive'] as const;

export function OrganizationPage() {
  const { currentUser, activeRole } = useAuthStore();
  const {
    departments,
    designations,
    profiles,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    addDesignation,
    updateDesignation,
    deleteDesignation,
  } = useDataStore();

  const isSuperAdminOrAdmin =
    activeRole === 'super_admin' ||
    activeRole === 'admin' ||
    currentUser?.role === 'super_admin' ||
    currentUser?.role === 'admin';

  const [activeTab, setActiveTab] = React.useState<ActiveTab>('departments');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [levelFilter, setLevelFilter] = React.useState<string>('all');
  const [deptFilter, setDeptFilter] = React.useState<string>('all');

  // --- Department Modal State ---
  const [deptModalOpen, setDeptModalOpen] = React.useState(false);
  const [editingDept, setEditingDept] = React.useState<Department | null>(null);
  const [deptName, setDeptName] = React.useState('');
  const [deptCode, setDeptCode] = React.useState('');
  const [deptDesc, setDeptDesc] = React.useState('');
  const [deptSubmitting, setDeptSubmitting] = React.useState(false);

  // --- Designation Modal State ---
  const [desigModalOpen, setDesigModalOpen] = React.useState(false);
  const [editingDesig, setEditingDesig] = React.useState<Designation | null>(null);
  const [desigTitle, setDesigTitle] = React.useState('');
  const [desigLevel, setDesigLevel] = React.useState('Mid');
  const [desigDeptId, setDesigDeptId] = React.useState('');
  const [desigDesc, setDesigDesc] = React.useState('');
  const [desigSubmitting, setDesigSubmitting] = React.useState(false);

  // Open Create Department Modal
  const openCreateDept = () => {
    setEditingDept(null);
    setDeptName('');
    setDeptCode('');
    setDeptDesc('');
    setDeptModalOpen(true);
  };

  // Open Edit Department Modal
  const openEditDept = (dept: Department) => {
    setEditingDept(dept);
    setDeptName(dept.name);
    setDeptCode(dept.code || '');
    setDeptDesc(dept.description || '');
    setDeptModalOpen(true);
  };

  // Open Create Designation Modal
  const openCreateDesig = (defaultDeptId?: string) => {
    setEditingDesig(null);
    setDesigTitle('');
    setDesigLevel('Mid');
    setDesigDeptId(defaultDeptId || (departments[0]?.id ?? ''));
    setDesigDesc('');
    setDesigModalOpen(true);
  };

  // Open Edit Designation Modal
  const openEditDesig = (desig: Designation) => {
    setEditingDesig(desig);
    setDesigTitle(desig.title);
    setDesigLevel(desig.level || 'Mid');
    setDesigDeptId(desig.department_id || '');
    setDesigDesc(desig.description || '');
    setDesigModalOpen(true);
  };

  // Submit Department
  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) {
      toast.error('Department name is required');
      return;
    }
    setDeptSubmitting(true);
    try {
      if (editingDept) {
        await updateDepartment(editingDept.id, {
          name: deptName.trim(),
          code: deptCode.trim() ? deptCode.trim().toUpperCase() : deptName.substring(0, 4).toUpperCase(),
          description: deptDesc.trim(),
        });
        toast.success(`Department "${deptName.trim()}" updated successfully`);
      } else {
        await addDepartment(deptName.trim(), deptDesc.trim());
        toast.success(`Department "${deptName.trim()}" created successfully`);
      }
      setDeptModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save department');
    } finally {
      setDeptSubmitting(false);
    }
  };

  // Delete Department
  const handleDeleteDept = async (dept: Department) => {
    const memberCount = profiles.filter((p) => p.department_id === dept.id).length;
    if (!window.confirm(`Delete department "${dept.name}"? ${memberCount > 0 ? `(${memberCount} members currently assigned)` : ''}`)) {
      return;
    }
    await deleteDepartment(dept.id);
    toast.success(`Department "${dept.name}" removed`);
  };

  // Submit Designation
  const handleSaveDesig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desigTitle.trim()) {
      toast.error('Designation title is required');
      return;
    }
    setDesigSubmitting(true);
    try {
      if (editingDesig) {
        await updateDesignation(editingDesig.id, {
          title: desigTitle.trim(),
          level: desigLevel,
          department_id: desigDeptId || undefined,
          description: desigDesc.trim(),
        });
        toast.success(`Designation "${desigTitle.trim()}" updated successfully`);
      } else {
        await addDesignation(desigTitle.trim(), desigLevel, desigDeptId || undefined);
        toast.success(`Designation "${desigTitle.trim()}" created successfully`);
      }
      setDesigModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save designation');
    } finally {
      setDesigSubmitting(false);
    }
  };

  // Delete Designation
  const handleDeleteDesig = async (desig: Designation) => {
    const assignedCount = profiles.filter(
      (p) => p.designation_id === desig.id || p.designation_title === desig.title
    ).length;
    if (!window.confirm(`Delete designation "${desig.title}"? ${assignedCount > 0 ? `(${assignedCount} employees holding this title)` : ''}`)) {
      return;
    }
    await deleteDesignation(desig.id);
    toast.success(`Designation "${desig.title}" removed`);
  };

  // Filtered Departments
  const filteredDepartments = departments.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filtered Designations
  const filteredDesignations = designations.filter((d) => {
    const matchesSearch =
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.level?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = levelFilter === 'all' || d.level?.toLowerCase() === levelFilter.toLowerCase();
    const matchesDept = deptFilter === 'all' || d.department_id === deptFilter;
    return matchesSearch && matchesLevel && matchesDept;
  });

  const getLevelBadgeColor = (level?: string) => {
    switch (level?.toLowerCase()) {
      case 'executive':
        return 'bg-purple-950/70 text-purple-300 border-purple-800/60';
      case 'lead':
        return 'bg-amber-950/70 text-amber-300 border-amber-800/60';
      case 'senior':
        return 'bg-blue-950/70 text-blue-300 border-blue-800/60';
      case 'mid':
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60';
      case 'junior':
        return 'bg-cyan-950/70 text-cyan-300 border-cyan-800/60';
      case 'intern':
        return 'bg-slate-800/70 text-slate-300 border-slate-700/60';
      default:
        return 'bg-slate-800/70 text-slate-300 border-slate-700/60';
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f2637] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-400">
              <GitFork className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                TCY Consulting Private Limited
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#1e2538] text-slate-400 border border-[#2b354e]">
                  Corporate Org
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Centralized management of corporate departments, designations, seniority tiers, and team distribution for TCY Consulting Private Limited.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        {isSuperAdminOrAdmin && (
          <div className="flex items-center gap-2.5">
            <Button
              onClick={openCreateDept}
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs h-9 px-3.5 shadow-sm shadow-blue-900/30 gap-1.5"
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Add Department</span>
            </Button>
            <Button
              onClick={() => openCreateDesig()}
              variant="outline"
              className="border-[#2b354e] bg-[#141824] hover:bg-[#1a2030] text-slate-200 font-medium text-xs h-9 px-3.5 gap-1.5"
            >
              <Award className="h-3.5 w-3.5 text-amber-400" />
              <span>Add Designation</span>
            </Button>
          </div>
        )}
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="border border-[#1b2230] bg-[#0c1018] p-3 space-y-1 hover:border-[#2a3449] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Departments</span>
            <Building2 className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-1.5 pt-0.5">
            <span className="text-xl font-bold font-mono text-white">{departments.length}</span>
            <span className="text-[10px] text-slate-500 font-mono">active</span>
          </div>
        </div>

        <div className="border border-[#1b2230] bg-[#0c1018] p-3 space-y-1 hover:border-[#2a3449] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Designations</span>
            <Award className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1.5 pt-0.5">
            <span className="text-xl font-bold font-mono text-white">{designations.length}</span>
            <span className="text-[10px] text-slate-500 font-mono">roles</span>
          </div>
        </div>

        <div className="border border-[#1b2230] bg-[#0c1018] p-3 space-y-1 hover:border-[#2a3449] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Headcount</span>
            <Users2 className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1.5 pt-0.5">
            <span className="text-xl font-bold font-mono text-white">{profiles.length}</span>
            <span className="text-[10px] text-slate-500 font-mono">staff</span>
          </div>
        </div>

        <div className="border border-[#1b2230] bg-[#0c1018] p-3 space-y-1 hover:border-[#2a3449] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Seniority</span>
            <Layers className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-1.5 pt-0.5">
            <span className="text-xl font-bold font-mono text-white">{SENIORITY_LEVELS.length}</span>
            <span className="text-[10px] text-slate-500 font-mono">tiers</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-[#0a0d14] border border-[#1b202d] p-1">
        <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('departments')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap border',
              activeTab === 'departments'
                ? 'bg-blue-600 text-white border-blue-500'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#121724]'
            )}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>Departments</span>
            <span className="ml-1 text-[9px] font-mono px-1 py-0.2 bg-black/30 border border-white/10">
              {departments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('designations')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap border',
              activeTab === 'designations'
                ? 'bg-blue-600 text-white border-blue-500'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#121724]'
            )}
          >
            <Award className="h-3.5 w-3.5" />
            <span>Designations & Roles</span>
            <span className="ml-1 text-[9px] font-mono px-1 py-0.2 bg-black/30 border border-white/10">
              {designations.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('hierarchy')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap border',
              activeTab === 'hierarchy'
                ? 'bg-blue-600 text-white border-blue-500'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#121724]'
            )}
          >
            <GitFork className="h-3.5 w-3.5" />
            <span>Structure Breakdown</span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-2.5 top-2 h-3 w-3 text-slate-500" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 w-full border border-[#232c3f] bg-[#0e121c] pl-7 pr-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none rounded-none font-mono"
            />
          </div>

          {activeTab === 'designations' && (
            <>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="h-7 border border-[#232c3f] bg-[#0e121c] px-2 text-xs text-slate-300 focus:border-blue-500 focus:outline-none rounded-none font-mono"
              >
                <option value="all">All Levels</option>
                {SENIORITY_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>

              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="h-7 border border-[#232c3f] bg-[#0e121c] px-2 text-xs text-slate-300 focus:border-blue-500 focus:outline-none max-w-[130px] rounded-none font-mono"
              >
                <option value="all">All Depts</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DEPARTMENTS */}
      {/* ========================================================================= */}
      {activeTab === 'departments' && (
        <div className="space-y-3">
          {filteredDepartments.length === 0 ? (
            <div className="flex flex-col items-center justify-center border border-dashed border-[#232c40] bg-[#080b11] py-12 px-4 text-center">
              <Building2 className="h-6 w-6 text-slate-500 mb-2" />
              <h3 className="text-xs font-semibold text-white">No departments found</h3>
              <p className="text-[11px] text-slate-500 max-w-sm mt-0.5">
                {searchQuery
                  ? `No department matches "${searchQuery}".`
                  : 'Create your organization\'s first corporate department.'}
              </p>
              {isSuperAdminOrAdmin && (
                <Button
                  onClick={openCreateDept}
                  className="mt-3 bg-blue-600 hover:bg-blue-500 text-white text-xs h-7.5 px-3 gap-1 rounded-none"
                >
                  <Plus className="h-3 w-3" />
                  <span>Create Department</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {filteredDepartments.map((dept) => {
                const memberCount = profiles.filter((p) => p.department_id === dept.id).length;
                const roleCount = designations.filter((d) => d.department_id === dept.id).length;

                return (
                  <div
                    key={dept.id}
                    className="flex flex-col justify-between border border-[#1b2230] bg-[#0c1018] p-3 hover:border-[#2a3449] transition-all group"
                  >
                    <div className="space-y-2">
                      {/* Card Header */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="inline-flex items-center justify-center px-1.5 py-0.2 bg-blue-500/10 border border-blue-500/25 text-blue-400 font-mono font-bold text-[10px] shrink-0 whitespace-nowrap">
                            {dept.code || dept.name.substring(0, 3).toUpperCase()}
                          </span>
                          <h3 className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors truncate">
                            {dept.name}
                          </h3>
                        </div>

                        {/* Actions */}
                        {isSuperAdminOrAdmin && (
                          <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEditDept(dept)}
                              className="p-1 text-slate-400 hover:text-blue-300 hover:bg-[#151b27] transition-colors"
                              title="Edit Department"
                            >
                              <Edit3 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteDept(dept)}
                              className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Delete Department"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-[11px] text-slate-400 line-clamp-2 min-h-[28px] leading-relaxed">
                        {dept.description || 'No specific description provided for this department.'}
                      </p>
                    </div>

                    {/* Stats Footer */}
                    <div className="mt-3 pt-2 border-t border-[#161d2b] flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-slate-400">
                          <Users2 className="h-3 w-3 text-emerald-400" />
                          <span className="font-mono font-medium text-slate-200 text-[10px]">{memberCount}</span>
                          <span className="text-[10px] text-slate-500">members</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400">
                          <Award className="h-3 w-3 text-amber-400" />
                          <span className="font-mono font-medium text-slate-200 text-[10px]">{roleCount}</span>
                          <span className="text-[10px] text-slate-500">roles</span>
                        </div>
                      </div>

                      {isSuperAdminOrAdmin && (
                        <button
                          onClick={() => openCreateDesig(dept.id)}
                          className="text-[10px] font-mono font-medium text-blue-400 hover:text-blue-300 flex items-center gap-0.5 hover:underline"
                        >
                          <span>Add Role</span>
                          <Plus className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DESIGNATIONS & ROLES */}
      {/* ========================================================================= */}
      {activeTab === 'designations' && (
        <div className="space-y-3">
          {filteredDesignations.length === 0 ? (
            <div className="flex flex-col items-center justify-center border border-dashed border-[#232c40] bg-[#080b11] py-12 px-4 text-center">
              <Award className="h-6 w-6 text-slate-500 mb-2" />
              <h3 className="text-xs font-semibold text-white">No designations found</h3>
              <p className="text-[11px] text-slate-500 max-w-sm mt-0.5">
                {searchQuery || levelFilter !== 'all' || deptFilter !== 'all'
                  ? 'No designation matched the applied filters.'
                  : 'Add job titles and seniority levels.'}
              </p>
              {isSuperAdminOrAdmin && (
                <Button
                  onClick={() => openCreateDesig()}
                  className="mt-3 bg-amber-600 hover:bg-amber-500 text-white text-xs h-7.5 px-3 gap-1 rounded-none"
                >
                  <Plus className="h-3 w-3" />
                  <span>Create Designation</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="border border-[#1b2230] bg-[#0c1018] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#18202d] bg-[#080b11] text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-2.5">Job Title / Designation</th>
                      <th className="px-3 py-2.5">Tier</th>
                      <th className="px-3 py-2.5">Department</th>
                      <th className="px-3 py-2.5 text-center">Headcount</th>
                      {isSuperAdminOrAdmin && <th className="px-4 py-2.5 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#151b26]">
                    {filteredDesignations.map((desig) => {
                      const matchedDept = departments.find((d) => d.id === desig.department_id);
                      const memberCount = profiles.filter(
                        (p) => p.designation_id === desig.id || p.designation_title === desig.title
                      ).length;

                      return (
                        <tr key={desig.id} className="hover:bg-[#101522] transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-slate-100 flex items-center gap-1.5 text-xs">
                              <Briefcase className="h-3 w-3 text-blue-400 shrink-0" />
                              <span>{desig.title}</span>
                            </div>
                            {desig.description && (
                              <p className="text-[10px] text-slate-500 mt-0.5 max-w-md line-clamp-1">
                                {desig.description}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={cn(
                                'inline-flex items-center px-1.5 py-0.2 text-[9px] font-mono font-semibold border',
                                getLevelBadgeColor(desig.level)
                              )}
                            >
                              {desig.level || 'Mid'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            {matchedDept ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-[#080b11] text-slate-300 text-[10px] border border-[#1b2230] font-mono">
                                <Building2 className="h-2.5 w-2.5 text-blue-400" />
                                {matchedDept.name}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">General</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="font-mono text-slate-300 bg-[#080b11] px-1.5 py-0.2 border border-[#1b2230] text-[10px]">
                              {memberCount}
                            </span>
                          </td>
                          {isSuperAdminOrAdmin && (
                            <td className="px-4 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => openEditDesig(desig)}
                                  className="p-1 text-slate-400 hover:text-blue-300 hover:bg-[#151b27] transition-colors"
                                  title="Edit Designation"
                                >
                                  <Edit3 className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteDesig(desig)}
                                  className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                  title="Delete Designation"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: HIERARCHY & STRUCTURE BREAKDOWN */}
      {/* ========================================================================= */}
      {activeTab === 'hierarchy' && (
        <div className="space-y-3">
          {departments.length === 0 ? (
            <div className="border border-[#1b2230] bg-[#0c1018] p-8 text-center">
              <GitFork className="h-6 w-6 text-slate-500 mx-auto mb-1.5" />
              <p className="text-xs text-slate-400">Add departments to view hierarchy.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {departments.map((dept) => {
                const deptRoles = designations.filter((d) => d.department_id === dept.id);
                const deptMembers = profiles.filter((p) => p.department_id === dept.id);

                return (
                  <div
                    key={dept.id}
                    className="border border-[#1b2230] bg-[#0c1018] overflow-hidden"
                  >
                    {/* Dept Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#080b11] px-4 py-2 border-b border-[#18202d]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="inline-flex items-center justify-center px-1.5 py-0.2 bg-blue-500/10 border border-blue-500/25 text-blue-400 font-mono font-bold text-[10px] shrink-0 whitespace-nowrap">
                          {dept.code || dept.name.substring(0, 3).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex items-baseline gap-1.5">
                          <h3 className="text-xs font-bold text-white truncate">{dept.name}</h3>
                          {dept.description && (
                            <p className="text-[10px] text-slate-500 truncate hidden md:inline">· {dept.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] font-mono">
                        <span className="px-2 py-0.5 bg-[#0e121c] text-slate-300 border border-[#1b2230]">
                          {deptRoles.length} Roles
                        </span>
                        <span className="px-2 py-0.5 bg-[#0e121c] text-emerald-300 border border-[#1b2230]">
                          {deptMembers.length} Staff
                        </span>
                      </div>
                    </div>

                    {/* Roles Tree Body */}
                    <div className="p-3 space-y-2">
                      {deptRoles.length === 0 ? (
                        <div className="text-center py-4 text-[11px] text-slate-500 italic">
                          No designations assigned yet.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {deptRoles.map((role) => {
                            const roleMembers = profiles.filter(
                              (p) => p.designation_id === role.id || p.designation_title === role.title
                            );

                            return (
                              <div
                                key={role.id}
                                className="border border-[#18202d] bg-[#080b11] p-2.5 hover:border-[#28334a] transition-colors"
                              >
                                <div className="flex items-start justify-between gap-1.5">
                                  <span className="font-semibold text-[11px] text-slate-100">{role.title}</span>
                                  <span
                                    className={cn(
                                      'text-[8px] px-1 py-0.2 font-mono font-semibold border',
                                      getLevelBadgeColor(role.level)
                                    )}
                                  >
                                    {role.level}
                                  </span>
                                </div>

                                {/* Active members list for this role */}
                                <div className="mt-2 pt-1.5 border-t border-[#141925]">
                                  <div className="text-[9px] text-slate-500 uppercase font-mono font-semibold mb-1">
                                    Assigned ({roleMembers.length})
                                  </div>
                                  {roleMembers.length === 0 ? (
                                    <span className="text-[10px] text-slate-600 italic">0 assigned</span>
                                  ) : (
                                    <div className="flex flex-wrap gap-1">
                                      {roleMembers.map((m) => (
                                        <span
                                          key={m.id}
                                          className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 bg-[#0c1018] text-slate-300 border border-[#1b2230]"
                                        >
                                          <div className="h-1 w-1 bg-emerald-400" />
                                          {m.full_name}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT DEPARTMENT */}
      {/* ========================================================================= */}
      <Dialog open={deptModalOpen} onOpenChange={setDeptModalOpen}>
        <DialogContent className="max-w-md bg-[#0e121c] border-[#222a3d] text-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-400" />
              {editingDept ? 'Edit Department' : 'Create New Department'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveDept} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Department Name <span className="text-red-400">*</span>
              </label>
              <Input
                placeholder="e.g. Engineering & Technology"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                className="bg-[#141926] border-[#232d42] text-xs h-9"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Department Code / Abbreviation
              </label>
              <Input
                placeholder="e.g. ENG, PROD, OPS"
                value={deptCode}
                onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="bg-[#141926] border-[#232d42] text-xs h-9 font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Short 2-5 letter identifier code.</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Description</label>
              <textarea
                placeholder="Core responsibilities and team mandate..."
                value={deptDesc}
                onChange={(e) => setDeptDesc(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-[#232d42] bg-[#141926] p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeptModalOpen(false)}
                className="border-[#232d42] text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={deptSubmitting}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-9 px-4"
              >
                {deptSubmitting ? 'Saving...' : editingDept ? 'Update Department' : 'Create Department'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT DESIGNATION */}
      {/* ========================================================================= */}
      <Dialog open={desigModalOpen} onOpenChange={setDesigModalOpen}>
        <DialogContent className="max-w-md bg-[#0e121c] border-[#222a3d] text-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-400" />
              {editingDesig ? 'Edit Designation' : 'Create New Designation'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveDesig} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Designation Title <span className="text-red-400">*</span>
              </label>
              <Input
                placeholder="e.g. Senior Full Stack Engineer"
                value={desigTitle}
                onChange={(e) => setDesigTitle(e.target.value)}
                className="bg-[#141926] border-[#232d42] text-xs h-9"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Seniority Tier</label>
                <select
                  value={desigLevel}
                  onChange={(e) => setDesigLevel(e.target.value)}
                  className="w-full h-9 rounded-lg border border-[#232d42] bg-[#141926] px-3 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                >
                  {SENIORITY_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Department</label>
                <select
                  value={desigDeptId}
                  onChange={(e) => setDesigDeptId(e.target.value)}
                  className="w-full h-9 rounded-lg border border-[#232d42] bg-[#141926] px-3 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">General (No Department)</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Description / Summary</label>
              <textarea
                placeholder="Key role responsibilities or expectations..."
                value={desigDesc}
                onChange={(e) => setDesigDesc(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-[#232d42] bg-[#141926] p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDesigModalOpen(false)}
                className="border-[#232d42] text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={desigSubmitting}
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs h-9 px-4"
              >
                {desigSubmitting ? 'Saving...' : editingDesig ? 'Update Designation' : 'Create Designation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
