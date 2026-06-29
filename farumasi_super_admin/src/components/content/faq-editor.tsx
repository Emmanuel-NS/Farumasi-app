"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface FaqItem {
  id: string;
  q: string;
  a: string;
}

function newId() {
  return `faq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function faqFromApi(faq?: Array<{ q: string; a: string }>): FaqItem[] {
  return (faq ?? []).map((item) => ({ id: newId(), q: item.q, a: item.a }));
}

export function faqToApi(items: FaqItem[]): Array<{ q: string; a: string }> {
  return items
    .map((item) => ({ q: item.q.trim(), a: item.a.trim() }))
    .filter((item) => item.q || item.a);
}

interface FaqEditorProps {
  items: FaqItem[];
  onChange: (items: FaqItem[]) => void;
}

export function FaqEditor({ items, onChange }: FaqEditorProps) {
  const [expanded, setExpanded] = useState<string | null>(items[0]?.id ?? null);

  function updateItem(id: string, patch: Partial<Pick<FaqItem, "q" | "a">>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeItem(id: string) {
    onChange(items.filter((item) => item.id !== id));
    if (expanded === id) setExpanded(null);
  }

  function moveItem(id: string, direction: -1 | 1) {
    const index = items.findIndex((item) => item.id === id);
    if (index < 0) return;
    const next = index + direction;
    if (next < 0 || next >= items.length) return;
    const copy = [...items];
    [copy[index], copy[next]] = [copy[next]!, copy[index]!];
    onChange(copy);
  }

  function addItem() {
    const item: FaqItem = { id: newId(), q: "", a: "" };
    onChange([...items, item]);
    setExpanded(item.id);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase text-slate-500">FAQ entries</p>
        <Button type="button" size="xs" variant="outline" onClick={addItem}>
          <Plus className="w-3.5 h-3.5" /> Add question
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-400 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
          No FAQ entries yet. Add questions patients see on the Help page.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => {
            const isOpen = expanded === item.id;
            return (
              <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-slate-100">
                  <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
                  <button
                    type="button"
                    className="flex-1 text-left text-sm font-semibold text-slate-800 truncate"
                    onClick={() => setExpanded(isOpen ? null : item.id)}
                  >
                    {item.q.trim() || `Question ${index + 1}`}
                  </button>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      title="Move up"
                      disabled={index === 0}
                      onClick={() => moveItem(item.id, -1)}
                      className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Move down"
                      disabled={index === items.length - 1}
                      onClick={() => moveItem(item.id, 1)}
                      className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 rounded hover:bg-red-50 text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className={cn("px-3 pb-3 pt-3 space-y-2", !isOpen && "hidden")}>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Question</label>
                    <Input
                      value={item.q}
                      onChange={(e) => updateItem(item.id, { q: e.target.value })}
                      placeholder="How do I order medicine?"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Answer</label>
                    <textarea
                      value={item.a}
                      onChange={(e) => updateItem(item.id, { a: e.target.value })}
                      rows={4}
                      placeholder="Write a clear answer for patients…"
                      className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-farumasi-500 mt-1"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
