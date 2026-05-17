"use client";
import { useState } from "react";
import Link from "next/link";
import {
  NotebookPen, Plus, Search, FilePlus, ChevronRight,
  Calendar, User,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { mockClinicalNotes, mockPatients } from "@/data/mock";
import { formatDateTime, getInitials } from "@/lib/utils";

const NOTE_TYPE_COLORS: Record<string, string> = {
  SOAP: "bg-blue-50 text-blue-700",
  Progress: "bg-green-50 text-green-700",
  Discharge: "bg-purple-50 text-purple-700",
  Referral: "bg-orange-50 text-orange-700",
  Consultation: "bg-teal-50 text-teal-700",
  Procedure: "bg-rose-50 text-rose-700",
};

export default function NotesPage() {
  const [search, setSearch] = useState("");

  const filtered = mockClinicalNotes.filter((n) => {
    const q = search.toLowerCase();
    return (
      !q ||
      n.title.toLowerCase().includes(q) ||
      n.patientName.toLowerCase().includes(q) ||
      n.noteType.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Clinical Notes"
        subtitle="SOAP notes and clinical documentation"
        icon={<NotebookPen className="w-5 h-5" />}
        actions={
          <button className="inline-flex items-center gap-2 text-sm font-medium bg-farumasi-600 text-white px-4 py-2 rounded-lg hover:bg-farumasi-700 transition-colors">
            <Plus className="w-4 h-4" />
            New Note
          </button>
        }
      />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search notes by patient, title, type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-500"
        />
      </div>

      {/* Notes list */}
      <div className="space-y-4">
        {filtered.map((note) => (
          <div key={note.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-farumasi-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-farumasi-700">{getInitials(note.patientName)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <Link href={`/patients/${note.patientId}`} className="text-sm font-semibold text-slate-900 hover:text-farumasi-600 transition-colors">
                      {note.patientName}
                    </Link>
                    <p className="text-sm text-slate-700 mt-0.5">{note.title}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${NOTE_TYPE_COLORS[note.noteType] ?? "bg-slate-100 text-slate-600"}`}>
                      {note.noteType}
                    </span>
                    <span className="text-xs text-slate-400">{formatDateTime(note.createdAt)}</span>
                  </div>
                </div>

                {/* SOAP display */}
                {(note.subjective || note.objective || note.assessment || note.plan) && (
                  <div className="mt-3 space-y-1.5">
                    {[
                      { key: "S", content: note.subjective },
                      { key: "O", content: note.objective },
                      { key: "A", content: note.assessment },
                      { key: "P", content: note.plan },
                    ].filter((s) => s.content).map((s) => {
                      const bg = { S: "bg-blue-50 text-blue-800", O: "bg-slate-100 text-slate-700", A: "bg-amber-50 text-amber-800", P: "bg-green-50 text-green-800" }[s.key] ?? "";
                      return (
                        <div key={s.key} className="flex gap-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${bg}`}>{s.key}</span>
                          <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{s.content}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {note.content && !note.subjective && (
                  <p className="text-xs text-slate-600 mt-2 line-clamp-3">{note.content}</p>
                )}

                {/* Vitals chips */}
                {note.vitals && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {note.vitals.bp && <VChip label="BP" val={note.vitals.bp} />}
                    {note.vitals.temp && <VChip label="T" val={note.vitals.temp} />}
                    {note.vitals.pulse && <VChip label="HR" val={`${note.vitals.pulse} bpm`} />}
                    {note.vitals.spo2 && <VChip label="SpO2" val={`${note.vitals.spo2}%`} />}
                    {note.vitals.glucose && <VChip label="BGL" val={`${note.vitals.glucose} mmol/L`} />}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="py-16 text-center bg-white rounded-xl border border-slate-100">
            <NotebookPen className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No clinical notes found</p>
          </div>
        )}
      </div>
    </div>
  );
}

function VChip({ label, val }: { label: string; val: string }) {
  return (
    <span className="text-[10px] bg-slate-50 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
      {label}: <strong>{val}</strong>
    </span>
  );
}
