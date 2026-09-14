"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api, Skill } from "@/lib/api";
import { 
  Sparkles, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Search, 
  Layers, 
  CheckCircle2, 
  X 
} from "lucide-react";
import { useConfirm } from "@/lib/confirm-context";

export default function SkillsTaxonomyPage() {
  const { confirm, showAlert } = useConfirm();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [filterType, setFilterType] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillType, setNewSkillType] = useState("technical");
  const [newSkillDesc, setNewSkillDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSkills();
  }, []);

  async function loadSkills() {
    setLoading(true);
    try {
      const data = await api.getSkills();
      setSkills(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createSkill({
        skill_name: newSkillName,
        skill_type: newSkillType,
        description: newSkillDesc || `${newSkillName} skill competency`,
        is_active: true
      });
      setIsAddOpen(false);
      setNewSkillName("");
      setNewSkillDesc("");
      loadSkills();
    } catch (err: any) {
      await showAlert({
        title: "Failed to Add Skill",
        message: err.message || "Failed to add skill to the taxonomy",
        variant: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    const targetSkill = skills.find(s => s.skill_id === id);
    const skillName = targetSkill ? `"${targetSkill.skill_name}"` : "this skill";

    const ok = await confirm({
      title: "Delete Taxonomy Skill",
      message: `Are you sure you want to delete ${skillName} from the verified taxonomy? Candidate profile mappings with this skill may be affected.`,
      confirmText: "Delete Skill",
      cancelText: "Cancel",
      variant: "danger",
    });
    if (!ok) return;

    try {
      await api.deleteSkill(id);
      loadSkills();
    } catch (err: any) {
      await showAlert({
        title: "Delete Failed",
        message: err.message || "Failed to delete skill from taxonomy",
        variant: "danger",
      });
    }
  };

  const filteredSkills = skills.filter(s => {
    const matchesType = !filterType || s.skill_type === filterType;
    const matchesSearch = !searchQuery || s.skill_name.toLowerCase().includes(searchQuery.toLowerCase()) || s.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="space-y-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin Panel
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Skills Taxonomy Governance</h1>
            <p className="text-xs text-slate-500">
              Master repository of 100+ recognized technical, soft, tool, and domain competencies.
            </p>
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all"
          >
            <Plus className="w-4 h-4" /> Add New Skill
          </button>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="p-4 rounded-2xl glass-card border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search taxonomy by skill name or description..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="p-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-purple-500 bg-white font-medium"
          >
            <option value="">All Categories</option>
            <option value="technical">Technical</option>
            <option value="soft">Soft Skill</option>
            <option value="tool">Tools & DevOps</option>
            <option value="domain">Domain Knowledge</option>
          </select>
        </div>
      </div>

      {/* Skills Grid */}
      <div className="p-6 rounded-2xl glass-card border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900">
            Registered Skills ({filteredSkills.length})
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredSkills.map((skill) => (
            <div
              key={skill.skill_id}
              className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between space-y-2 hover:border-purple-300 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-1 mb-1">
                  <h4 className="text-xs font-bold text-slate-900">{skill.skill_name}</h4>
                  <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                    skill.skill_type === "technical"
                      ? "bg-indigo-50 text-indigo-700"
                      : skill.skill_type === "soft"
                      ? "bg-emerald-50 text-emerald-700"
                      : skill.skill_type === "tool"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-purple-50 text-purple-700"
                  }`}>
                    {skill.skill_type}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2">{skill.description || "Active taxonomy skill"}</p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Active
                </span>
                <button
                  onClick={() => handleDelete(skill.skill_id)}
                  className="text-slate-400 hover:text-rose-600 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Skill Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">Add Skill to Taxonomy</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSkill} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Skill Name</label>
                <input
                  type="text"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="e.g. Kubernetes, PyTorch"
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={newSkillType}
                  onChange={(e) => setNewSkillType(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
                >
                  <option value="technical">Technical</option>
                  <option value="soft">Soft</option>
                  <option value="tool">Tool</option>
                  <option value="domain">Domain</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newSkillDesc}
                  onChange={(e) => setNewSkillDesc(e.target.value)}
                  placeholder="Short description..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold"
                >
                  {submitting ? "Adding..." : "Add Skill"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
