"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, Camera, FileText, Image, CheckCircle, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/translations";
import { GuestGate } from "@/components/shared/guest-gate";

type UploadState = "idle" | "preview" | "success";

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  preview: string | null;
}

export default function PrescriptionsPage() {
  const t = useTranslation();
  const [state, setState] = useState<UploadState>("idle");
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (f: File) => {
    const isImage = f.type.startsWith("image/");
    const preview = isImage ? URL.createObjectURL(f) : null;
    setFile({ name: f.name, size: f.size, type: f.type, preview });
    setState("preview");
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const handleUpload = () => {
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      setState("success");
    }, 2000);
  };

  const handleReset = () => {
    setState("idle");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <GuestGate feature="prescriptions">
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t.rx_title}</h1>
        <p className="text-slate-500 text-sm mt-0.5">{t.rx_subtitle}</p>
      </div>

      {state === "success" ? (
        <SuccessState onReset={handleReset} />
      ) : state === "preview" && file ? (
        <PreviewState
          file={file}
          uploading={uploading}
          onUpload={handleUpload}
          onRemove={handleReset}
        />
      ) : (
        <IdleState
          dragging={dragging}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onBrowse={() => fileInputRef.current?.click()}
          fileInputRef={fileInputRef}
          onFileChange={handleFileChange}
        />
      )}

      {/* Tips */}
      <div className="mt-6 bg-farumasi-50 border border-farumasi-100 rounded-3xl p-5">
        <h3 className="text-sm font-bold text-farumasi-800 mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-farumasi-600" />
          {t.rx_tips_title}
        </h3>
        <ul className="space-y-1.5 text-xs text-farumasi-700">
          <li>• {t.rx_tip_1}</li>
          <li>• {t.rx_tip_2}</li>
          <li>• {t.rx_tip_3}</li>
          <li>• {t.rx_tip_4}</li>
        </ul>
      </div>
    </div>
    </GuestGate>
  );
}

function IdleState({ dragging, onDragOver, onDragLeave, onDrop, onBrowse, fileInputRef, onFileChange }: {
  dragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onBrowse: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const t = useTranslation();
  return (
    <div>
      {/* Drop zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "border-2 border-dashed rounded-3xl flex flex-col items-center justify-center py-16 px-8 text-center transition-all cursor-pointer bg-white",
          dragging ? "border-farumasi-500 bg-farumasi-50 scale-[1.01]" : "border-slate-200 hover:border-farumasi-300 hover:bg-slate-50"
        )}
        onClick={onBrowse}
      >
        <div className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors",
          dragging ? "bg-farumasi-100" : "bg-slate-100"
        )}>
          <Upload className={cn("w-8 h-8", dragging ? "text-farumasi-600" : "text-slate-400")} />
        </div>
        <p className="text-base font-bold text-slate-800 mb-1">
          {dragging ? t.rx_drop_here : t.rx_drop_title}
        </p>
        <p className="text-sm text-slate-500">{t.rx_or} <span className="text-farumasi-600 font-medium">{t.rx_or_browse}</span></p>
        <p className="text-xs text-slate-400 mt-3">{t.rx_formats}</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={onFileChange}
      />

      {/* Or take photo */}
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-100" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[#F6F8FB] px-3 text-xs text-slate-400">{t.rx_or}</span>
        </div>
      </div>

      <button className="w-full h-12 rounded-2xl border-2 border-farumasi-200 text-farumasi-700 font-bold text-sm flex items-center justify-center gap-2 hover:bg-farumasi-50 transition-colors">
        <Camera className="w-5 h-5" />
        {t.rx_take_photo}
      </button>
    </div>
  );
}

function PreviewState({ file, uploading, onUpload, onRemove }: {
  file: UploadedFile;
  uploading: boolean;
  onUpload: () => void;
  onRemove: () => void;
}) {
  const t = useTranslation();
  const isImage = file.type.startsWith("image/");
  const sizeKb = Math.round(file.size / 1024);

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-start gap-4 mb-5">
        <div className="w-20 h-20 rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
          {isImage && file.preview ? (
            <img src={file.preview} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <FileText className="w-10 h-10 text-slate-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 truncate">{file.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">{sizeKb} KB</p>
          {isImage && (
            <div className="flex items-center gap-1 mt-2 text-xs text-farumasi-700 bg-farumasi-50 rounded-xl px-2 py-1 w-fit">
              <Image className="w-3 h-3" />
              Image detected
            </div>
          )}
        </div>
        <button onClick={onRemove} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-slate-500 bg-slate-50 rounded-2xl p-3 mb-4">
        Please verify all prescription details are clearly visible before uploading.
      </p>

      <div className="flex gap-3">
        <button onClick={onRemove} className="flex-1 h-11 rounded-2xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
          {t.rx_remove}
        </button>
        <button
          onClick={onUpload}
          disabled={uploading}
          className="flex-1 h-11 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 text-white text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {uploading ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t.rx_uploading}</>
          ) : (
            <><Upload className="w-4 h-4" />{t.rx_upload_btn}</>
          )}
        </button>
      </div>
    </div>
  );
}

function SuccessState({ onReset }: { onReset: () => void }) {
  const t = useTranslation();
  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm py-16 flex flex-col items-center text-center px-8">
      <div className="w-20 h-20 rounded-full bg-farumasi-100 flex items-center justify-center mb-4">
        <CheckCircle className="w-10 h-10 text-farumasi-600" />
      </div>
      <h2 className="text-xl font-extrabold text-slate-900 mb-2">{t.rx_success_title}</h2>
      <p className="text-sm text-slate-500 max-w-xs">
        {t.rx_success_sub}
      </p>
      <button
        onClick={onReset}
        className="mt-6 px-6 py-2.5 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 text-white font-bold text-sm transition-colors"
      >
        {t.rx_upload_another}
      </button>
    </div>
  );
}
