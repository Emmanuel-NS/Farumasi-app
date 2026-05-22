"use client";
import { useState } from "react";
import { toast } from "sonner";
import {
  User, Phone, Mail, MapPin, GraduationCap, Award,
  Building2, Clock, Camera, Save,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuthStore } from "@/store/auth-store";
import { getInitials } from "@/lib/utils";

type DoctorProfile = {
  name: string;
  email: string;
  phone: string;
  specialty: string;
  subSpecialty: string;
  licenseNumber: string;
  facility: string;
  department: string;
  isVerified: boolean;
  yearsExperience: number;
};

export default function ProfilePage() {
  const authUser = useAuthStore((s) => s.user);
  const [doctor, setDoctor] = useState<DoctorProfile>({
    name: authUser?.full_name ?? "Doctor",
    email: authUser?.email ?? "",
    phone: authUser?.phone ?? "",
    specialty: "General Medicine",
    subSpecialty: "",
    licenseNumber: "RW-MED-0001",
    facility: "FARUMASI Health",
    department: "General Practice",
    isVerified: true,
    yearsExperience: 0,
  });
  const [editing, setEditing] = useState(false);

  const handleSave = () => {
    toast.success("Profile updated successfully");
    setEditing(false);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <PageHeader
        title="My Profile"
        subtitle="Manage your clinical profile and credentials"
        icon={<User className="w-5 h-5" />}
        actions={
          <button
            onClick={() => editing ? handleSave() : setEditing(true)}
            className={`inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
              editing
                ? "bg-farumasi-600 text-white hover:bg-farumasi-700"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {editing ? <><Save className="w-4 h-4" /> Save Changes</> : "Edit Profile"}
          </button>
        }
      />

      {/* Avatar card */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-farumasi-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-farumasi-700">{getInitials(doctor.name)}</span>
            </div>
            {editing && (
              <button className="absolute bottom-0 right-0 w-7 h-7 bg-farumasi-600 rounded-full flex items-center justify-center shadow-sm">
                <Camera className="w-3.5 h-3.5 text-white" />
              </button>
            )}
          </div>
          <div className="flex-1">
            {editing ? (
              <input
                type="text"
                value={doctor.name}
                onChange={(e) => setDoctor({ ...doctor, name: e.target.value })}
                className="text-xl font-bold text-slate-900 border-b border-farumasi-300 bg-transparent outline-none w-full mb-1"
              />
            ) : (
              <h2 className="text-xl font-bold text-slate-900">{doctor.name}</h2>
            )}
            <p className="text-sm text-farumasi-600 font-medium">{doctor.specialty}</p>
            <p className="text-sm text-slate-500">{doctor.facility}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs bg-farumasi-50 text-farumasi-700 font-medium px-2 py-0.5 rounded-full">
                Reg: {doctor.licenseNumber}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-farumasi-100 text-farumasi-700">
                {doctor.isVerified ? "Verified" : "Unverified"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Contact Information</h3>
        <div className="space-y-4">
          <ProfileField icon={Mail} label="Email" value={doctor.email} editing={editing}
            onChange={(v) => setDoctor({ ...doctor, email: v })} />
          <ProfileField icon={Phone} label="Phone" value={doctor.phone} editing={editing}
            onChange={(v) => setDoctor({ ...doctor, phone: v })} />
          <ProfileField icon={Building2} label="Facility" value={doctor.facility} editing={editing}
            onChange={(v) => setDoctor({ ...doctor, facility: v })} />
          <ProfileField icon={MapPin} label="Department" value={doctor.department} editing={editing}
            onChange={(v) => setDoctor({ ...doctor, department: v })} />
        </div>
      </div>

      {/* Specialty */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Clinical Specialization</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-farumasi-50 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-4 h-4 text-farumasi-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">{doctor.specialty}</p>
              {doctor.subSpecialty && <p className="text-xs text-slate-500">{doctor.subSpecialty}</p>}
              <p className="text-xs text-slate-400 mt-0.5">License: {doctor.licenseNumber}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileField({
  icon: Icon, label, value, editing, onChange,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-slate-500" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-slate-400 mb-0.5">{label}</p>
        {editing ? (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="text-sm text-slate-800 border-b border-farumasi-300 bg-transparent outline-none w-full"
          />
        ) : (
          <p className="text-sm text-slate-800">{value}</p>
        )}
      </div>
    </div>
  );
}
