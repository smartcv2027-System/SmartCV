"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Plus, Sparkles, Tag } from "lucide-react";
import { api, Skill } from "@/lib/api";

interface SkillTagInputProps {
  value: string[];
  onChange: (skills: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  quickSuggestions?: string[];
}

const DEFAULT_QUICK_SUGGESTIONS = [
  "Python",
  "FastAPI",
  "React",
  "Docker",
  "SQL",
  "PostgreSQL",
  "Machine Learning",
  "Git",
  "REST APIs",
  "Problem Solving",
  "Communication"
];

export default function SkillTagInput({
  value = [],
  onChange,
  placeholder = "Type a skill and press Enter or comma...",
  disabled = false,
  quickSuggestions = DEFAULT_QUICK_SUGGESTIONS
}: SkillTagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [taxonomySkills, setTaxonomySkills] = useState<Skill[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<Skill[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;
    api
      .getSkills()
      .then((skills) => {
        if (mounted && Array.isArray(skills)) {
          setTaxonomySkills(skills);
        }
      })
      .catch(() => {
        // Fallback gracefully if endpoint fails
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const trimmed = inputValue.trim().toLowerCase();
    if (!trimmed) {
      setFilteredSuggestions([]);
      setIsOpen(false);
      return;
    }

    const currentLower = new Set(value.map((v) => v.toLowerCase()));
    const matches = taxonomySkills
      .filter(
        (s) =>
          s.skill_name.toLowerCase().includes(trimmed) &&
          !currentLower.has(s.skill_name.toLowerCase())
      )
      .slice(0, 8);

    setFilteredSuggestions(matches);
    setIsOpen(true);
    setHighlightedIndex(0);
  }, [inputValue, taxonomySkills, value]);

  // Click outside to dismiss suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addSkill = (skillName: string) => {
    const trimmed = skillName.trim();
    if (!trimmed) return;
    const exists = value.some(
      (s) => s.toLowerCase() === trimmed.toLowerCase()
    );
    if (!exists) {
      onChange([...value, trimmed]);
    }
    setInputValue("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const removeSkill = (indexToRemove: number) => {
    if (disabled) return;
    onChange(value.filter((_, idx) => idx !== indexToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (isOpen && filteredSuggestions.length > 0 && highlightedIndex >= 0) {
        const selected = filteredSuggestions[highlightedIndex];
        if (selected) {
          addSkill(selected.skill_name);
          return;
        }
      }
      if (inputValue.trim()) {
        addSkill(inputValue);
      }
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeSkill(value.length - 1);
    } else if (e.key === "ArrowDown" && isOpen) {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp" && isOpen) {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredSuggestions.length - 1
      );
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const getSkillCategoryClass = (name: string) => {
    const match = taxonomySkills.find(
      (s) => s.skill_name.toLowerCase() === name.toLowerCase()
    );
    const type = (match?.skill_type || "").toLowerCase();

    if (type.includes("soft") || type.includes("interpersonal")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100";
    }
    if (type.includes("tool") || type.includes("devops") || type.includes("cloud")) {
      return "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100";
    }
    if (type.includes("domain") || type.includes("eng")) {
      return "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100";
    }
    return "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100";
  };

  const unusedQuickSuggestions = quickSuggestions.filter(
    (q) => !value.some((s) => s.toLowerCase() === q.toLowerCase())
  );

  return (
    <div className="w-full space-y-2" ref={containerRef}>
      {/* Interactive Tag Container */}
      <div
        onClick={() => inputRef.current?.focus()}
        className={`min-h-[50px] p-2 bg-slate-50 border rounded-xl flex flex-wrap items-center gap-1.5 transition-all focus-within:ring-2 focus-within:ring-emerald-500 focus-within:bg-white focus-within:border-emerald-500 ${
          disabled
            ? "opacity-60 bg-slate-100 cursor-not-allowed"
            : "cursor-text hover:border-slate-300"
        }`}
      >
        {/* Rendered Chips */}
        {value.map((skill, idx) => (
          <span
            key={`${skill}-${idx}`}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all animate-fadeIn ${getSkillCategoryClass(
              skill
            )}`}
          >
            <Tag className="w-3 h-3 opacity-60 shrink-0" />
            <bdi>{skill}</bdi>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeSkill(idx);
                }}
                className="hover:opacity-75 p-0.5 rounded focus:outline-none transition-transform hover:scale-110 cursor-pointer"
                title="Remove skill"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          disabled={disabled}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (inputValue.trim()) setIsOpen(true);
          }}
          placeholder={value.length === 0 ? placeholder : "Add more..."}
          className="flex-1 min-w-[140px] bg-transparent outline-none text-xs text-slate-800 placeholder-slate-400 py-1 px-1"
        />

        {value.length > 0 && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
              inputRef.current?.focus();
            }}
            className="text-[11px] text-slate-400 hover:text-rose-500 font-medium px-2 py-0.5 ml-auto transition-colors cursor-pointer"
            title="Clear all skills"
          >
            Clear all ({value.length})
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="relative z-50">
          <div className="absolute top-0 start-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
            {filteredSuggestions.map((item, idx) => (
              <button
                key={item.skill_id}
                type="button"
                onClick={() => addSkill(item.skill_name)}
                className={`w-full text-start px-3.5 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                  highlightedIndex === idx
                    ? "bg-emerald-50 text-emerald-900 font-semibold"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  <span>{item.skill_name}</span>
                </div>
                {item.skill_type && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 capitalize">
                    {item.skill_type}
                  </span>
                )}
              </button>
            ))}

            {/* Custom Skill Option */}
            {inputValue.trim() &&
              !filteredSuggestions.some(
                (s) =>
                  s.skill_name.toLowerCase() === inputValue.trim().toLowerCase()
              ) && (
                <button
                  type="button"
                  onClick={() => addSkill(inputValue)}
                  className="w-full text-start px-3.5 py-2.5 text-xs text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 flex items-center gap-2 border-t border-slate-100 cursor-pointer font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    Add custom skill: <strong className="font-bold">"{inputValue.trim()}"</strong>
                  </span>
                </button>
              )}
          </div>
        </div>
      )}

      {/* Quick Add Suggestions Row */}
      {unusedQuickSuggestions.length > 0 && !disabled && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1 font-medium text-slate-400">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Quick suggestions:
          </span>
          {unusedQuickSuggestions.slice(0, 6).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => addSkill(suggestion)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition-colors text-[10px] font-medium border border-transparent hover:border-emerald-200 cursor-pointer"
            >
              <Plus className="w-2.5 h-2.5 opacity-60" />
              <span>{suggestion}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

