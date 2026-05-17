"use client";

import { useState } from "react";
import Image from "next/image";
import { Settings, Building2, Lock, Bell, CreditCard, Upload } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mockBusiness } from "@/data/mock";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

const sections = [
  { id: "general", label: "General", icon: Building2 },
  { id: "security", label: "Security", icon: Lock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "banking", label: "Banking", icon: CreditCard },
];

export default function SettingsPage() {
  const [active, setActive] = useState("general");

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title="Settings" description="Manage your business profile, security, and preferences" icon={Settings} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Nav */}
        <nav className="space-y-1">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                active === s.id
                  ? "bg-farumasi-50 text-farumasi-700 font-medium"
                  : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"
              )}
            >
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="lg:col-span-3 space-y-6">
          {active === "general" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 className="w-4 h-4" /> Business Profile</CardTitle>
                <CardDescription>Your public business identity on the FARUMASI platform</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pharmacy logo */}
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden border bg-white shrink-0">
                    {mockBusiness.logoUrl ? (
                      <Image src={mockBusiness.logoUrl} alt="Pharmacy logo" fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Building2 className="w-7 h-7" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{mockBusiness.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Pharmacy logo shown on listings &amp; invoices</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1.5 text-xs"
                    onClick={() => toast.info("Image upload coming soon")}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Change Logo
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Business Name</Label>
                    <Input defaultValue={mockBusiness.name} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email Address</Label>
                    <Input defaultValue={mockBusiness.email} type="email" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone Number</Label>
                    <Input defaultValue={mockBusiness.phone} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Website</Label>
                    <Input defaultValue={mockBusiness.website} />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Address</Label>
                    <Input defaultValue={`${mockBusiness.address}, ${mockBusiness.city}`} />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button size="sm" className="text-xs" onClick={() => toast.success("Business profile saved successfully")}>Save Changes</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {active === "security" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Lock className="w-4 h-4" /> Security</CardTitle>
                <CardDescription>Password and access control settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Current Password</Label>
                    <Input type="password" placeholder="••••••••" />
                  </div>
                  <div />
                  <div className="space-y-1.5">
                    <Label>New Password</Label>
                    <Input type="password" placeholder="••••••••" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Confirm Password</Label>
                    <Input type="password" placeholder="••••••••" />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => toast.success("Password updated successfully")}>Update Password</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {active === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bell className="w-4 h-4" /> Notification Preferences</CardTitle>
                <CardDescription>Choose what you want to be notified about</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "New Orders", description: "Get notified when a customer places an order", defaultChecked: true },
                  { label: "Order Status Updates", description: "Notify me when order status changes", defaultChecked: true },
                  { label: "Low Stock Alerts", description: "Alert when products fall below reorder threshold", defaultChecked: true },
                  { label: "Withdrawal Processed", description: "Confirm when a withdrawal is approved and sent", defaultChecked: true },
                  { label: "Product Request Updates", description: "Updates on product approval requests", defaultChecked: false },
                  { label: "Platform Announcements", description: "News and feature updates from FARUMASI", defaultChecked: false },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <input type="checkbox" defaultChecked={item.defaultChecked} className="w-4 h-4 accent-farumasi-600 cursor-pointer" />
                  </div>
                ))}
                <div className="flex justify-end pt-2">
                  <Button size="sm" className="text-xs" onClick={() => toast.success("Notification preferences saved")}>Save Preferences</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {active === "banking" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CreditCard className="w-4 h-4" /> Banking Details</CardTitle>
                <CardDescription>Where FARUMASI sends your withdrawal payouts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Bank Name</Label>
                    <Input defaultValue="Bank of Kigali" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Account Number</Label>
                    <Input defaultValue="00040-00082660-51" />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Account Holder Name</Label>
                    <Input defaultValue="Inyange Pharmacy Ltd" />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button size="sm" className="text-xs" onClick={() => toast.success("Banking details saved successfully")}>Save Banking Details</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
