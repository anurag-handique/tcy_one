import * as React from 'react';
import {
  Users2,
  Plus,
  Mail,
  Phone,
  Building,
  Search,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  FolderPlus,
  Loader2,
  Edit2,
  Trash2,
  Building2,
  Home,
  ArrowLeftRight,
  AlertTriangle,
  Award,
  Briefcase,
} from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';
import { useAuthStore } from '@/stores/authStore';
import { Profile, UserRole, EmploymentStatus } from '@/types';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { UserAvatar } from '@/components/ui/Avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { toast } from 'sonner';

export function TeamPage() {
  const { profiles, departments, designations, createEmployeeAccount, addDepartment, updateProfileData, deleteProfile } = useDataStore();
  const { currentUser, activeRole } = useAuthStore();

  // Permission checks: Super Admin and Admin can create, edit & manage employees & departments
  const isSuperAdmin =
    activeRole === 'super_admin' ||
    currentUser?.role === 'super_admin' ||
    currentUser?.email === 'info@thecodeyogi.com';

  const canManageTeam =
    isSuperAdmin ||
    activeRole === 'admin' ||
    currentUser?.role === 'admin';

  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedDept, setSelectedDept] = React.useState('all');
  
  // Add Member modal state
  const [addModalOpen, setAddModalOpen] = React.useState(false);
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [role, setRole] = React.useState<UserRole>('employee');
  const [selectedDeptOption, setSelectedDeptOption] = React.useState('');
  const [customDeptName, setCustomDeptName] = React.useState('');
  const [designationTitle, setDesignationTitle] = React.useState('');
  const [customDesignation, setCustomDesignation] = React.useState('');
  const [phoneDigits, setPhoneDigits] = React.useState('');
  const [workLocation, setWorkLocation] = React.useState<'Office' | 'WFH' | 'Hybrid'>('Office');
  const [submittingMember, setSubmittingMember] = React.useState(false);

  // Edit Member modal state
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [editingProfile, setEditingProfile] = React.useState<Profile | null>(null);
  const [editFullName, setEditFullName] = React.useState('');
  const [editEmail, setEditEmail] = React.useState('');
  const [editRole, setEditRole] = React.useState<UserRole>('employee');
  const [editDeptId, setEditDeptId] = React.useState('');
  const [editDesignationTitle, setEditDesignationTitle] = React.useState('');
  const [editPhoneDigits, setEditPhoneDigits] = React.useState('');
  const [editWorkLocation, setEditWorkLocation] = React.useState<'Office' | 'WFH' | 'Hybrid'>('Office');
  const [editStatus, setEditStatus] = React.useState<EmploymentStatus>('active');
  const [savingEdit, setSavingEdit] = React.useState(false);

  // Delete Member modal state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deletingProfile, setDeletingProfile] = React.useState<Profile | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // Department modal state
  const [deptModalOpen, setDeptModalOpen] = React.useState(false);
  const [newDeptName, setNewDeptName] = React.useState('');
  const [newDeptDesc, setNewDeptDesc] = React.useState('');
  const [submittingDept, setSubmittingDept] = React.useState(false);

  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch =
      p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.designation_title && p.designation_title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.work_location && p.work_location.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDept = selectedDept === 'all' || p.department_id === selectedDept;
    return matchesSearch && matchesDept;
  });

  // Open Edit Modal with profile data
  const handleOpenEdit = (profile: Profile) => {
    if (!canManageTeam) {
      toast.error('Unauthorized: Only Admin or Super Admin can edit employee details');
      return;
    }
    setEditingProfile(profile);
    setEditFullName(profile.full_name);
    setEditEmail(profile.email);
    setEditRole(profile.role);
    setEditDeptId(profile.department_id || '');
    
    const desigObj = designations.find((d) => d.id === profile.designation_id);
    setEditDesignationTitle(profile.designation_title || desigObj?.title || 'Software Engineer');

    const cleanPhone = (profile.phone || '').replace(/\D/g, '').slice(-10);
    setEditPhoneDigits(cleanPhone);

    const loc = profile.work_location || 'Office';
    if (loc.toLowerCase().includes('hybrid')) {
      setEditWorkLocation('Hybrid');
    } else if (loc.toLowerCase().includes('remote') || loc.toLowerCase().includes('wfh') || loc.toLowerCase().includes('home')) {
      setEditWorkLocation('WFH');
    } else {
      setEditWorkLocation('Office');
    }

    setEditStatus((profile.employment_status as any) || 'active');
    setEditModalOpen(true);
  };

  // Submit Edit Form
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;

    if (!editFullName.trim()) {
      toast.error('Full Name cannot be empty');
      return;
    }

    setSavingEdit(true);
    const formattedPhone = editPhoneDigits.trim() ? `+91 ${editPhoneDigits.trim()}` : undefined;

    const success = await updateProfileData(editingProfile.id, {
      full_name: editFullName.trim(),
      email: editEmail.trim().toLowerCase(),
      role: editRole,
      department_id: editDeptId ? editDeptId : undefined,
      designation_title: editDesignationTitle.trim() || 'Software Engineer',
      phone: formattedPhone,
      work_location: editWorkLocation,
      employment_status: editStatus,
    });
    setSavingEdit(false);

    if (success) {
      toast.success(`Updated profile for ${editFullName.trim()}`);
      setEditModalOpen(false);
      setEditingProfile(null);
    } else {
      toast.error('Failed to update employee details');
    }
  };

  // Open Delete Confirmation
  const handleOpenDelete = (profile: Profile) => {
    if (!canManageTeam) {
      toast.error('Unauthorized: Only Admin or Super Admin can remove employees');
      return;
    }
    if (profile.email === 'info@thecodeyogi.com' || profile.id === currentUser.id) {
      toast.error('Primary Super Admin account cannot be removed.');
      return;
    }
    setDeletingProfile(profile);
    setDeleteConfirmOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingProfile) return;
    setDeleting(true);
    const success = await deleteProfile(deletingProfile.id);
    setDeleting(false);

    if (success) {
      toast.success(`Removed ${deletingProfile.full_name} from organization roster`);
      setDeleteConfirmOpen(false);
      setDeletingProfile(null);
    } else {
      toast.error('Failed to remove employee');
    }
  };

  // Submit Add Form
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageTeam) {
      toast.error('Unauthorized: Only Admin or Super Admin can onboard employees');
      return;
    }

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      toast.error('Full Name, Work Email, and Initial Password are required');
      return;
    }

    if (password.trim().length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    const resolvedDept =
      selectedDeptOption === '__custom__'
        ? customDeptName.trim()
        : selectedDeptOption.trim();

    const resolvedDesignation =
      designationTitle === '__custom__'
        ? customDesignation.trim() || 'Software Engineer'
        : designationTitle.trim() || 'Software Engineer';

    const formattedPhone = phoneDigits.trim() ? `+91 ${phoneDigits.trim()}` : undefined;

    setSubmittingMember(true);
    const result = await createEmployeeAccount({
      fullName: fullName.trim(),
      email: email.trim(),
      password: password.trim(),
      role,
      departmentName: resolvedDept || undefined,
      designationTitle: resolvedDesignation,
      phone: formattedPhone,
      workLocation: workLocation,
    });
    setSubmittingMember(false);

    if (result.success) {
      toast.success(`Employee account for ${fullName} created successfully`);
      setAddModalOpen(false);
      setFullName('');
      setEmail('');
      setPassword('');
      setSelectedDeptOption('');
      setCustomDeptName('');
      setDesignationTitle('');
      setCustomDesignation('');
      setPhoneDigits('');
      setWorkLocation('Office');
    } else {
      toast.error(result.error || 'Failed to onboard employee account');
    }
  };

  // Create Department
  const handleCreateDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageTeam) {
      toast.error('Unauthorized: Only Admin or Super Admin can create departments');
      return;
    }

    if (!newDeptName.trim()) {
      toast.error('Department Name is required');
      return;
    }

    setSubmittingDept(true);
    const created = await addDepartment(newDeptName.trim(), newDeptDesc.trim());
    setSubmittingDept(false);

    toast.success(`Department "${newDeptName.trim()}" created successfully`);
    if (created) {
      setSelectedDeptOption(created.name);
    }
    setDeptModalOpen(false);
    setNewDeptName('');
    setNewDeptDesc('');
  };

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b202c] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-white tracking-tight font-mono">
              EMPLOYEE DIRECTORY & ROSTER
            </h1>
            <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
              {profiles.length} Staff Members
            </span>
            {isSuperAdmin && (
              <span className="font-mono text-[10px] text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> SUPER ADMIN CONTROL
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage organization members, assign roles, designations, departments, work premises (Office, WFH, Hybrid), and access credentials.
          </p>
        </div>

        {canManageTeam ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeptModalOpen(true)}
              className="h-7 text-xs border-[#222837] bg-[#12151e] hover:bg-[#181d28] gap-1.5 font-mono"
            >
              <FolderPlus className="h-3.5 w-3.5 text-blue-400" />
              <span>Add Department</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setAddModalOpen(true)}
              className="h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white gap-1.5 font-mono"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Onboard Member</span>
            </Button>
          </div>
        ) : (
          <div className="text-[11px] font-mono text-slate-500 bg-[#0c0e15] px-3 py-1 rounded border border-[#1b202c] flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-amber-400" />
            <span>Employee management restricted to Administrators</span>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 p-2 rounded bg-[#0c0e15] border border-[#1b202c] text-xs">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <input
            placeholder="Search roster by name, designation, email, role, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 w-full rounded border border-[#1b202c] bg-[#11141c] pl-8 pr-2 text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none font-mono"
          />
        </div>

        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="h-7 rounded border border-[#1b202c] bg-[#11141c] px-2 text-[11px] text-slate-300 font-mono focus:outline-none"
        >
          <option value="all">ALL DEPARTMENTS ({departments.length})</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.code} — {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredProfiles.map((member) => {
          const dept = departments.find((d) => d.id === member.department_id);
          const desig = designations.find((g) => g.id === member.designation_id);
          const displayDesignation = member.designation_title || desig?.title || (member.role === 'super_admin' ? 'Chief Technology Officer & Founder' : member.role.replace('_', ' ').toUpperCase());

          const loc = member.work_location || 'Office';
          const isHybrid = loc.toLowerCase().includes('hybrid');
          const isWFH = loc.toLowerCase().includes('wfh') || loc.toLowerCase().includes('remote') || loc.toLowerCase().includes('home');

          return (
            <div
              key={member.id}
              className="desktop-panel rounded-lg p-3.5 flex flex-col justify-between space-y-3 group hover:border-[#2a3449] transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <UserAvatar
                      name={member.full_name}
                      avatarUrl={member.avatar_url}
                      size="md"
                      className="h-9 w-9 ring-1 ring-blue-500/20"
                    />
                    <div>
                      <div className="font-bold text-xs text-white">{member.full_name}</div>
                      <div className="text-[11px] text-blue-400 font-mono font-medium truncate max-w-[170px]" title={displayDesignation}>
                        {displayDesignation}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                        member.employment_status === 'active'
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50'
                          : 'bg-amber-950/40 text-amber-400 border-amber-900/50'
                      }`}
                    >
                      {member.employment_status || 'active'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate font-mono text-slate-300">{member.email}</span>
                  </div>
                  {dept && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate text-slate-300">{dept.name}</span>
                    </div>
                  )}
                  {member.phone && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-slate-300">{member.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer with Location Badge & Super Admin Action Controls */}
              <div className="pt-2.5 border-t border-[#1b202c] flex items-center justify-between text-[10px] font-mono">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                      isHybrid
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : isWFH
                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}
                  >
                    {isHybrid ? (
                      <>
                        <ArrowLeftRight className="h-3 w-3" /> Hybrid
                      </>
                    ) : isWFH ? (
                      <>
                        <Home className="h-3 w-3" /> WFH
                      </>
                    ) : (
                      <>
                        <Building2 className="h-3 w-3" /> Office
                      </>
                    )}
                  </span>
                </div>

                {canManageTeam ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(member)}
                      title="Edit Employee"
                      className="p-1 rounded bg-[#131722] hover:bg-blue-600/20 hover:text-blue-400 text-slate-400 border border-[#202636] transition-colors flex items-center gap-1 text-[10px] px-1.5"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Edit</span>
                    </button>

                    {member.email !== 'info@thecodeyogi.com' && member.id !== currentUser.id && (
                      <button
                        type="button"
                        onClick={() => handleOpenDelete(member)}
                        title="Remove Employee"
                        className="p-1 rounded bg-[#131722] hover:bg-rose-600/20 hover:text-rose-400 text-slate-400 border border-[#202636] transition-colors flex items-center gap-1 text-[10px] px-1.5"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-500">Joined {formatDate(member.joining_date, 'MMM yyyy')}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 1. Add Member Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-md bg-[#0e1118] border-[#1f2533] p-5 text-xs text-slate-200 shadow-2xl">
          <DialogHeader className="border-b border-[#1b202c] pb-3">
            <DialogTitle className="text-base text-white font-mono flex items-center gap-2">
              <Plus className="h-4 w-4 text-blue-400" />
              <span>ONBOARD TEAM MEMBER</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-3 pt-2">
            <div>
              <label className="text-[10px] font-mono uppercase text-slate-400">Full Name</label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="h-7 mt-1 bg-[#0b0e14] border-[#1b202c] text-xs font-mono"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-slate-400">Work Email (Login ID)</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="employee@thecodeyogi.com"
                className="h-7 mt-1 bg-[#0b0e14] border-[#1b202c] text-xs font-mono"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-slate-400">Designation / Job Title</label>
              <select
                value={designationTitle}
                onChange={(e) => setDesignationTitle(e.target.value)}
                className="h-7 w-full rounded border border-[#1b202c] bg-[#0b0e14] px-2 text-xs text-white font-mono mt-1"
              >
                <option value="">Select Designation...</option>
                {designations.map((d) => (
                  <option key={d.id} value={d.title}>{d.title} {d.level ? `— ${d.level}` : ''}</option>
                ))}
                <option value="__custom__">+ Enter Custom Designation...</option>
              </select>

              {designationTitle === '__custom__' && (
                <Input
                  value={customDesignation}
                  onChange={(e) => setCustomDesignation(e.target.value)}
                  placeholder="e.g. AI Research Scientist, Mobile Lead..."
                  className="h-7 mt-1.5 bg-[#0b0e14] border-blue-500/50 text-xs font-mono"
                  autoFocus
                  required
                />
              )}
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-slate-400">Initial Login Password</label>
              <div className="relative mt-1">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters (e.g. TCY@2026)"
                  className="h-7 bg-[#0b0e14] border-[#1b202c] text-xs font-mono pr-8"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                The employee will use this password to sign in to the TCY One portal.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="h-7 w-full rounded border border-[#1b202c] bg-[#0b0e14] px-2 text-xs text-white font-mono mt-1"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono uppercase text-slate-400">Department</label>
                  <button
                    type="button"
                    onClick={() => setDeptModalOpen(true)}
                    className="text-[10px] font-mono text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-0.5"
                  >
                    <FolderPlus className="h-3 w-3" />
                    <span>+ New Dept</span>
                  </button>
                </div>
                <select
                  value={selectedDeptOption}
                  onChange={(e) => setSelectedDeptOption(e.target.value)}
                  className="h-7 w-full rounded border border-[#1b202c] bg-[#0b0e14] px-2 text-xs text-white font-mono mt-1"
                >
                  <option value="">Select Department...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                  <option value="__custom__">+ Enter Custom Department...</option>
                </select>

                {selectedDeptOption === '__custom__' && (
                  <Input
                    value={customDeptName}
                    onChange={(e) => setCustomDeptName(e.target.value)}
                    placeholder="Type new department name..."
                    className="h-7 mt-1.5 bg-[#0b0e14] border-blue-500/50 text-xs font-mono"
                    autoFocus
                    required
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400">Phone</label>
                <div className="relative flex items-center mt-1">
                  <span className="inline-flex h-7 items-center px-2 bg-[#141822] border border-r-0 border-[#1b202c] text-xs font-mono text-slate-400 select-none">
                    +91
                  </span>
                  <Input
                    type="tel"
                    value={phoneDigits}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhoneDigits(val);
                    }}
                    placeholder="98765 00000"
                    maxLength={10}
                    className="h-7 rounded-l-none bg-[#0b0e14] border-[#1b202c] text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400">Work Location</label>
                <select
                  value={workLocation}
                  onChange={(e) => setWorkLocation(e.target.value as any)}
                  className="h-7 w-full rounded border border-[#1b202c] bg-[#0b0e14] px-2 text-xs text-white font-mono mt-1"
                >
                  <option value="Office">Office (Office Premises)</option>
                  <option value="WFH">WFH (Work From Home)</option>
                  <option value="Hybrid">Hybrid (Office + WFH)</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-[#1b202c]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={submittingMember}
                onClick={() => setAddModalOpen(false)}
                className="h-7 text-xs font-mono"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingMember}
                className="h-7 text-xs bg-blue-600 hover:bg-blue-500 font-mono"
              >
                {submittingMember ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create Account</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Edit Member Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md bg-[#0e1118] border-[#1f2533] p-5 text-xs text-slate-200 shadow-2xl">
          <DialogHeader className="border-b border-[#1b202c] pb-3">
            <DialogTitle className="text-base text-white font-mono flex items-center gap-2">
              <Edit2 className="h-4 w-4 text-blue-400" />
              <span>EDIT EMPLOYEE DETAILS</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-3 pt-2">
            <div>
              <label className="text-[10px] font-mono uppercase text-slate-400">Full Name</label>
              <Input
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                className="h-7 mt-1 bg-[#0b0e14] border-[#1b202c] text-xs font-mono"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-slate-400">Work Email</label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="h-7 mt-1 bg-[#0b0e14] border-[#1b202c] text-xs font-mono"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-slate-400">Designation / Job Title</label>
              <Input
                value={editDesignationTitle}
                onChange={(e) => setEditDesignationTitle(e.target.value)}
                placeholder="e.g. Senior Full Stack Engineer"
                className="h-7 mt-1 bg-[#0b0e14] border-[#1b202c] text-xs font-mono"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="h-7 w-full rounded border border-[#1b202c] bg-[#0b0e14] px-2 text-xs text-white font-mono mt-1"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400">Department</label>
                <select
                  value={editDeptId}
                  onChange={(e) => setEditDeptId(e.target.value)}
                  className="h-7 w-full rounded border border-[#1b202c] bg-[#0b0e14] px-2 text-xs text-white font-mono mt-1"
                >
                  <option value="">No Department Assigned</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400">Phone</label>
                <div className="relative flex items-center mt-1">
                  <span className="inline-flex h-7 items-center px-2 bg-[#141822] border border-r-0 border-[#1b202c] text-xs font-mono text-slate-400 select-none">
                    +91
                  </span>
                  <Input
                    type="tel"
                    value={editPhoneDigits}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setEditPhoneDigits(val);
                    }}
                    placeholder="98765 00000"
                    maxLength={10}
                    className="h-7 rounded-l-none bg-[#0b0e14] border-[#1b202c] text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400">Work Location</label>
                <select
                  value={editWorkLocation}
                  onChange={(e) => setEditWorkLocation(e.target.value as any)}
                  className="h-7 w-full rounded border border-[#1b202c] bg-[#0b0e14] px-2 text-xs text-white font-mono mt-1"
                >
                  <option value="Office">Office (Office Premises)</option>
                  <option value="WFH">WFH (Work From Home)</option>
                  <option value="Hybrid">Hybrid (Office + WFH)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-slate-400">Employment Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as any)}
                className="h-7 w-full rounded border border-[#1b202c] bg-[#0b0e14] px-2 text-xs text-white font-mono mt-1"
              >
                <option value="active">Active</option>
                <option value="probation">Probation</option>
                <option value="on_leave">On Extended Leave</option>
                <option value="terminated">Terminated / Resigned</option>
              </select>
            </div>

            <DialogFooter className="pt-3 border-t border-[#1b202c]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={savingEdit}
                onClick={() => setEditModalOpen(false)}
                className="h-7 text-xs font-mono"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingEdit}
                className="h-7 text-xs bg-blue-600 hover:bg-blue-500 font-mono"
              >
                {savingEdit ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 3. Delete Confirmation Modal */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm bg-[#0e1118] border-rose-900/40 p-5 text-xs text-slate-200 shadow-2xl">
          <DialogHeader className="border-b border-[#1b202c] pb-3">
            <DialogTitle className="text-sm text-rose-400 font-mono flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              <span>REMOVE EMPLOYEE</span>
            </DialogTitle>
          </DialogHeader>

          <div className="py-3 space-y-2">
            <p className="text-slate-300 text-xs">
              Are you sure you want to remove <strong className="text-white">{deletingProfile?.full_name}</strong> ({deletingProfile?.email}) from the company directory?
            </p>
            <p className="text-[11px] text-slate-400">
              This will remove their profile and access rights from the platform.
            </p>
          </div>

          <DialogFooter className="pt-2 border-t border-[#1b202c]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={deleting}
              onClick={() => setDeleteConfirmOpen(false)}
              className="h-7 text-xs font-mono"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={deleting}
              onClick={handleConfirmDelete}
              className="h-7 text-xs bg-rose-600 hover:bg-rose-500 text-white font-mono"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  <span>Removing...</span>
                </>
              ) : (
                <span>Confirm Removal</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Add Department Modal */}
      <Dialog open={deptModalOpen} onOpenChange={setDeptModalOpen}>
        <DialogContent className="max-w-sm bg-[#0e1118] border-[#1f2533] p-5 text-xs text-slate-200 shadow-2xl">
          <DialogHeader className="border-b border-[#1b202c] pb-3">
            <DialogTitle className="text-sm text-white font-mono flex items-center gap-2">
              <FolderPlus className="h-4 w-4 text-blue-400" />
              <span>CREATE NEW DEPARTMENT</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateDeptSubmit} className="space-y-3 pt-2">
            <div>
              <label className="text-[10px] font-mono uppercase text-slate-400">Department Name</label>
              <Input
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="e.g. Artificial Intelligence, Marketing"
                className="h-7 mt-1 bg-[#0b0e14] border-[#1b202c] text-xs font-mono"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-slate-400">Description (Optional)</label>
              <Input
                value={newDeptDesc}
                onChange={(e) => setNewDeptDesc(e.target.value)}
                placeholder="e.g. Core AI development squad"
                className="h-7 mt-1 bg-[#0b0e14] border-[#1b202c] text-xs font-mono"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-[#1b202c]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={submittingDept}
                onClick={() => setDeptModalOpen(false)}
                className="h-7 text-xs font-mono"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingDept}
                className="h-7 text-xs bg-blue-600 hover:bg-blue-500 font-mono"
              >
                {submittingDept ? 'Creating...' : 'Create Department'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
