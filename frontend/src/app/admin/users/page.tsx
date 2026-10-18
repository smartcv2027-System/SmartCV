"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { api, User } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLanguage, getRoleLabel, format } from "@/lib/i18n";
import { useConfirm } from "@/lib/confirm-context";
import { Pagination } from "@/components/Pagination";
import {
  Users,
  ArrowLeft,
  Plus,
  Search,
  Edit3,
  Trash2,
  ShieldCheck,
  Briefcase,
  GraduationCap,
  CheckCircle2,
  XCircle,
  X,
  Mail,
  Phone,
  Clock
} from "lucide-react";

export default function ManageUsersPage() {
  const { user: currentUser } = useAuth();
  const { confirm, showAlert } = useConfirm();
  const { t } = useLanguage();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [roleType, setRoleType] = useState<"applicant" | "recruiter" | "admin">("applicant");
  const [statusVal, setStatusVal] = useState("active");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const openCreateModal = () => {
    setEditingUser(null);
    setUsername("");
    setFullName("");
    setEmail("");
    setPhone("");
    setRoleType("applicant");
    setStatusVal("active");
    setPassword("");
    setIsModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setUsername(u.username);
    setFullName(u.full_name);
    setEmail(u.email);
    setPhone(u.phone || "");
    setRoleType(u.role_type);
    setStatusVal(u.status || "active");
    setPassword("");
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingUser) {
        const payload: any = {
          full_name: fullName,
          email,
          role_type: roleType,
          phone: phone || undefined,
          status: statusVal
        };
        if (password.trim()) {
          payload.password = password.trim();
        }
        await api.updateUserAdmin(editingUser.user_id, payload);
      } else {
        await api.createUserAdmin({
          username,
          full_name: fullName,
          email,
          password,
          role_type: roleType,
          phone: phone || undefined,
          status: statusVal
        });
      }
      setIsModalOpen(false);
      await loadUsers();
    } catch (err: any) {
      await showAlert({
        title: t.common.error,
        message: err.message || t.common.unexpectedError,
        variant: "danger"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (u: User) => {
    const nextStatus = u.status === "active" ? "suspended" : "active";
    try {
      await api.updateUserAdmin(u.user_id, { status: nextStatus });
      await loadUsers();
    } catch (err: any) {
      await showAlert({
        title: t.common.error,
        message: err.message || t.common.unexpectedError,
        variant: "danger"
      });
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (u.user_id === currentUser?.user_id) {
      await showAlert({
        title: t.common.error,
        message: t.admin.cannotDeleteSelfError,
        variant: "danger"
      });
      return;
    }

    const ok = await confirm({
      title: t.admin.deleteUserConfirmTitle,
      message: format(t.admin.deleteUserConfirmMsg, { name: u.full_name, username: u.username }),
      confirmText: t.common.delete,
      cancelText: t.common.cancel,
      variant: "danger"
    });
    if (!ok) return;

    try {
      await api.deleteUserAdmin(u.user_id);
      await loadUsers();
    } catch (err: any) {
      await showAlert({
        title: t.common.error,
        message: err.message || t.common.unexpectedError,
        variant: "danger"
      });
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.full_name?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        (u.phone && u.phone.toLowerCase().includes(q));

      const matchesRole = roleFilter === "all" || u.role_type === roleFilter;
      const matchesStatus =
        statusFilter === "all" || (u.status || "active").toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  const roleCounts = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((u) => u.role_type === "admin").length,
      recruiters: users.filter((u) => u.role_type === "recruiter").length,
      applicants: users.filter((u) => u.role_type === "applicant").length
    };
  }, [users]);

  const renderRoleBadge = (role: User["role_type"]) => {
    if (role === "admin") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          <ShieldCheck className="w-3 h-3 text-purple-600" />
          {getRoleLabel("admin", t)}
        </span>
      );
    }
    if (role === "recruiter") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Briefcase className="w-3 h-3 text-indigo-600" />
          {getRoleLabel("recruiter", t)}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <GraduationCap className="w-3 h-3 text-emerald-600" />
        {getRoleLabel("applicant", t)}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" /> {t.common.back}
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
              <Users className="w-7 h-7 text-purple-600" />
              <span>{t.admin.usersManagerTitle}</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {t.admin.usersManagerDesc}
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{t.admin.addNewUser}</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl glass-card border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {t.admin.totalUsers}
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">{roleCounts.total}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {t.admin.applicantsCard}
            </p>
            <h3 className="text-2xl font-black text-emerald-600 mt-0.5">{roleCounts.applicants}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {t.admin.recruitersCard}
            </p>
            <h3 className="text-2xl font-black text-indigo-600 mt-0.5">{roleCounts.recruiters}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {t.admin.administratorsCard}
            </p>
            <h3 className="text-2xl font-black text-purple-600 mt-0.5">{roleCounts.admins}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl glass-card border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.admin.searchUsersPlaceholder}
            className="w-full ps-10 pe-8 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
          >
            <option value="all">{t.admin.allRoles}</option>
            <option value="applicant">{getRoleLabel("applicant", t)}</option>
            <option value="recruiter">{getRoleLabel("recruiter", t)}</option>
            <option value="admin">{getRoleLabel("admin", t)}</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
          >
            <option value="all">{t.pagination.filterByStatus}</option>
            <option value="active">{t.admin.activeStatus}</option>
            <option value="suspended">{t.admin.suspendedStatus}</option>
          </select>

          {(searchQuery || roleFilter !== "all" || statusFilter !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setRoleFilter("all");
                setStatusFilter("all");
              }}
              className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>{t.pagination.resetFilters}</span>
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="p-6 rounded-2xl glass-card border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900">
            {t.admin.registeredUsersTitle} ({filteredUsers.length})
          </h2>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">{t.common.loading}</div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-600">{t.pagination.noResults}</p>
          </div>
        ) : (
          <>
            <div className="w-full overflow-x-auto pb-2">
              <table className="w-full min-w-[950px] text-start text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider whitespace-nowrap">
                    <th className="py-3 px-3 text-start">{t.admin.userCol}</th>
                    <th className="py-3 px-3 text-start">{t.admin.emailContactCol}</th>
                    <th className="py-3 px-3 text-start">{t.admin.roleCol}</th>
                    <th className="py-3 px-3 text-start">{t.common.status}</th>
                    <th className="py-3 px-3 text-start">{t.admin.lastLoginCol}</th>
                    <th className="py-3 px-3 text-start">{t.admin.createdCol}</th>
                    <th className="py-3 px-3 text-end">{t.common.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedUsers.map((u) => {
                    const isSelf = u.user_id === currentUser?.user_id;
                    const isActive = (u.status || "active").toLowerCase() === "active";

                    return (
                      <tr key={u.user_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                              {(u.full_name || u.username || "U").substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                                <bdi>{u.full_name}</bdi>
                                {isSelf && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900 text-white font-bold">
                                    {t.admin.youBadge}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono" dir="ltr">
                                @{u.username} &bull; #{u.user_id}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <div className="text-slate-700 font-medium flex items-center gap-1.5" dir="ltr">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{u.email}</span>
                            </div>
                            {u.phone && (
                              <div className="text-[11px] text-slate-400 flex items-center gap-1.5" dir="ltr">
                                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{u.phone}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {renderRoleBadge(u.role_type)}
                        </td>

                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={isSelf}
                            title={isSelf ? undefined : t.admin.toggleStatusTooltip}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                              isSelf ? "cursor-default" : "cursor-pointer hover:opacity-80"
                            } ${
                              isActive
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {isActive ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>{t.admin.activeStatus}</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 text-rose-600" />
                                <span>{t.admin.suspendedStatus}</span>
                              </>
                            )}
                          </button>
                        </td>

                        <td className="py-3.5 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {u.last_login_at ? (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {new Date(u.last_login_at).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">{t.admin.neverLoggedIn}</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                        </td>

                        <td className="py-3.5 px-3 text-end whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(u)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-700 text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>{t.common.edit}</span>
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u)}
                              disabled={isSelf}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              title={t.common.delete}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalItems={filteredUsers.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              itemName={t.pagination.itemsUsers}
            />
          </>
        )}
      </div>

      {/* Create / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingUser
                  ? format(t.admin.editUserTitle, { username: editingUser.username })
                  : t.admin.createNewUser}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3 text-xs">
              {!editingUser && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t.auth.usernameLabel} *
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username_123"
                    required
                    minLength={3}
                    dir="ltr"
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t.auth.fullNameLabel} *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t.auth.emailLabel} *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                  dir="ltr"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t.admin.systemRoleLabel} *
                  </label>
                  <select
                    value={roleType}
                    onChange={(e) => setRoleType(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white font-semibold"
                  >
                    <option value="applicant">{getRoleLabel("applicant", t)}</option>
                    <option value="recruiter">{getRoleLabel("recruiter", t)}</option>
                    <option value="admin">{getRoleLabel("admin", t)}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t.common.status} *
                  </label>
                  <select
                    value={statusVal}
                    onChange={(e) => setStatusVal(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white font-semibold"
                  >
                    <option value="active">{t.admin.activeStatus}</option>
                    <option value="suspended">{t.admin.suspendedStatus}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t.auth.phoneLabel}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+966 5X XXX XXXX"
                  dir="ltr"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {editingUser
                    ? t.admin.newPasswordOptionalLabel
                    : `${t.auth.passwordLabel} *`}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!editingUser}
                  minLength={6}
                  placeholder={editingUser ? t.admin.keepPasswordPlaceholder : "••••••••"}
                  dir="ltr"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold cursor-pointer"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-sm transition-all disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? t.common.loading : t.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
