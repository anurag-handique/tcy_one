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
} from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';
import { useAuthStore } from '@/stores/authStore';
import { Profile, UserRole } from '@/types';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { UserAvatar } from '@/components/ui/Avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { toast } from 'sonner';

export function TeamPage() {
  const { profiles, departments, designations, createEmployeeAccount, addDepartment } = useDataStore();
  const { currentUser, activeRole } = useAuthStore();

  // Strict check: ONLY Super Admin (info@thecodeyogi.com) is allowed to create employees & departments
  const isSuperAdmin = activeRole === 'super_admin' || currentUser.email === 'info@thecodeyogi.com';

  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedDept, setSelectedDept] = React.useState('all');
  
  // Member modal
  const [addModalOpen, setAddModalOpen] = React.useState(false);
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [role, setRole] = React.useState<UserRole>('employee');
  const [departmentName, setDepartmentName] = React.useState('');
  const [phoneDigits, setPhoneDigits] = React.useState('');
  const [workLocation, setWorkLocation] = React.useState('Office');
  const [submittingMember, setSubmittingMember] = React.useState(false);

  // Department modal
  const [deptModalOpen, setDeptModalOpen] = React.useState(false);
  const [newDeptName, setNewDeptName] = React.useState('');
  const [newDeptDesc, setNewDeptDesc] = React.useState('');
  const [submittingDept, setSubmittingDept] = React.useState(false);

  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch =
      p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDept === 'all' || p.department_id === selectedDept;
    return matchesSearch && matchesDept;
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      toast.error('Unauthorized: Only Super Admin can onboard employees');
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

    const formattedPhone = phoneDigits.trim() ? `+91 ${phoneDigits.trim()}` : undefined;

    setSubmittingMember(true);
    const result = await createEmployeeAccount({
      fullName: fullName.trim(),
      email: email.trim(),
      password: password.trim(),
      role,
      departmentName: departmentName.trim() || undefined,
      phone: formattedPhone,
      workLocation: workLocation.trim(),
    });
    setSubmittingMember(false);

    if (result.success) {
      toast.success(`Employee account for ${fullName} created successfully`);
      setAddModalOpen(false);
      setFullName('');
      setEmail('');
      setPassword('');
      setDepartmentName('');
      setPhoneDigits('');
    } else {
      toast.error(result.error || 'Failed to onboard employee account');
    }
  };

  const handleCreateDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      toast.error('Unauthorized: Only Super Admin can create departments');
      return;
    }

    if (!newDeptName.trim()) {
      toast.error('Department Name is required');
      return;
    }

    setSubmittingDept(true);
    await addDepartment(newDeptName.trim(), newDeptDesc.trim());
    setSubmittingDept(false);

    toast.success(`Department "${newDeptName.trim()}" created successfully`);
    setDeptModalOpen(false);
    setNewDeptName('');
    setNewDeptDesc('');
  };

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b202c] pb-3">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight font-mono flex items-center gap-2">
            <span>TEAM & WORKFORCE DIRECTORY</span>
            {isSuperAdmin && (
              <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 px-1.5 py-0.5 rounded font-mono">
                <ShieldCheck className="h-3 w-3" /> SUPER ADMIN ACCESS
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Personnel profiles, department hierarchy, reporting relationships, and contact roster.
          </p>
        </div>

        {isSuperAdmin ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDeptModalOpen(true)}
              className="h-7 text-xs border-[#232a3b] bg-[#11141c] hover:bg-[#161a24] text-slate-200 font-medium gap-1"
            >
              <FolderPlus className="h-3.5 w-3.5 text-blue-400" />
              <span>Add Department</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setAddModalOpen(true)}
              className="h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium gap-1 shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Member</span>
            </Button>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#141822] border border-[#202738] text-[11px] font-mono text-slate-400">
            <Lock className="h-3 w-3 text-amber-400" />
            <span>Employee onboarding restricted to Super Admin</span>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 p-2 rounded bg-[#0c0e15] border border-[#1b202c] text-xs">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <input
            placeholder="Search roster..."
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

          return (
            <div
              key={member.id}
              className="desktop-panel rounded-lg p-3.5 flex flex-col justify-between space-y-3"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <UserAvatar
                      name={member.full_name}
                      avatarUrl={member.avatar_url}
                      size="md"
                      className="h-9 w-9"
                    />
                    <div>
                      <div className="font-bold text-xs text-white">{member.full_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {desig?.title || member.role.replace('_', ' ').toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                      member.employment_status === 'active'
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50'
                        : 'bg-amber-950/40 text-amber-400 border-amber-900/50'
                    }`}
                  >
                    {member.employment_status}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate font-mono">{member.email}</span>
                  </div>
                  {dept && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{dept.name}</span>
                    </div>
                  )}
                  {member.phone && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-[#1b202c] flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>Joined {formatDate(member.joining_date, 'MMM yyyy')}</span>
                <span className="text-slate-300">{member.work_location}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Member Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-md bg-[#0e1118] border-[#1f2533] p-5">
          <DialogHeader>
            <DialogTitle className="text-base text-white font-mono">Onboard Team Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-3 pt-2 text-xs">
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
                The employee will use this password to sign in at the TCY One login portal.
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
                <label className="text-[10px] font-mono uppercase text-slate-400">Department Name</label>
                <Input
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                  placeholder="e.g. Engineering"
                  list="dept-list"
                  className="h-7 mt-1 bg-[#0b0e14] border-[#1b202c] text-xs font-mono"
                />
                <datalist id="dept-list">
                  {departments.map((d) => (
                    <option key={d.id} value={d.name} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400">Phone</label>
                <div className="relative flex items-center mt-1">
                  <span className="inline-flex h-7 items-center px-2.5 bg-[#141822] border border-r-0 border-[#1b202c] text-xs font-mono text-slate-400 select-none">
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
                <label className="text-[10px] font-mono uppercase text-slate-400">Location</label>
                <Input
                  value={workLocation}
                  onChange={(e) => setWorkLocation(e.target.value)}
                  className="h-7 mt-1 bg-[#0b0e14] border-[#1b202c] text-xs font-mono"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
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

      {/* Add Department Modal */}
      <Dialog open={deptModalOpen} onOpenChange={setDeptModalOpen}>
        <DialogContent className="max-w-sm bg-[#0e1118] border-[#1f2533] p-5">
          <DialogHeader>
            <DialogTitle className="text-base text-white font-mono">Create Department</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateDeptSubmit} className="space-y-3 pt-2 text-xs">
            <div>
              <label className="text-[10px] font-mono uppercase text-slate-400">Department Name</label>
              <Input
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="e.g. Engineering, Sales, Operations"
                className="h-7 mt-1 bg-[#0b0e14] border-[#1b202c] text-xs font-mono"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-slate-400">Description (Optional)</label>
              <Input
                value={newDeptDesc}
                onChange={(e) => setNewDeptDesc(e.target.value)}
                placeholder="Brief description of department scope"
                className="h-7 mt-1 bg-[#0b0e14] border-[#1b202c] text-xs font-mono"
              />
            </div>

            <DialogFooter className="pt-2">
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
                {submittingDept ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Department</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
