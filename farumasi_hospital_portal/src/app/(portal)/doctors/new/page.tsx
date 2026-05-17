"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button, Card, CardHeader, CardTitle, CardContent, Input } from "@/components/ui";
import { mockDepartments } from "@/data/mock";

const schema = z.object({
  name: z.string().min(4, "Full name required"),
  specialty: z.string().min(3, "Specialty required"),
  departmentId: z.string().min(1, "Select a department"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(9, "Valid phone number required"),
  licenseNumber: z.string().min(6, "License number required"),
  nationalId: z.string().min(10, "National ID required"),
  qualification: z.string().min(3, "Qualification required"),
});

type FormValues = z.infer<typeof schema>;

export default function NewDoctorPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    console.log("New doctor:", data);
    toast.success("Doctor account created — awaiting verification");
    reset();
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center gap-2">
        <Link href="/doctors">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" />Back</Button>
        </Link>
      </div>

      <PageHeader title="Add New Doctor" subtitle="Register a new doctor — status will be Pending Verification until reviewed" />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input label="Full Name *" placeholder="e.g. Dr. Jean-Pierre Habimana" {...register("name")} error={errors.name?.message} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Medical License Number *" placeholder="RW-MED-XXXXX" {...register("licenseNumber")} error={errors.licenseNumber?.message} />
              <Input label="National ID *" placeholder="1 19XX 8 XXXXXXX 4 XX" {...register("nationalId")} error={errors.nationalId?.message} />
            </div>
            <Input label="Qualification *" placeholder="e.g. MBChB, MMed Internal Medicine" {...register("qualification")} error={errors.qualification?.message} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Clinical Assignment</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input label="Specialty *" placeholder="e.g. Internal Medicine, Pediatrics..." {...register("specialty")} error={errors.specialty?.message} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Department *</label>
              <select
                {...register("departmentId")}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white outline-none focus:ring-2 focus:ring-farumasi-600/30 focus:border-farumasi-600 transition-all"
              >
                <option value="">Select department</option>
                {mockDepartments.filter((d) => d.code !== "PHR").map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {errors.departmentId && <p className="text-xs text-red-500">{errors.departmentId.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input label="Email Address *" type="email" placeholder="doctor@kuth.rw" {...register("email")} error={errors.email?.message} />
            <Input label="Phone Number *" placeholder="+250 788 XXX XXX" {...register("phone")} error={errors.phone?.message} />
          </CardContent>
        </Card>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            <UserPlus className="w-4 h-4" />
            {isSubmitting ? "Creating account..." : "Create Doctor Account"}
          </Button>
          <Link href="/doctors">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
