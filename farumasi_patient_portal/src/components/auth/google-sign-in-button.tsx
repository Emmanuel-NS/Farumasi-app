"use client";

import { useCallback, useEffect, useState } from "react";
import { GoogleOAuthProvider, GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { decodeGoogleCredential, resolveGoogleClientId } from "@/lib/google-client-id";
import { getApiError } from "@/lib/api-error";
import { toast } from "sonner";

interface GoogleSignInButtonProps {
  disabled?: boolean;
  onSuccess: (params: { email: string; full_name: string; google_id: string }) => Promise<void>;
}

function GoogleButtonInner({
  disabled,
  onSuccess,
}: GoogleSignInButtonProps) {
  const handleSuccess = useCallback(
    async (response: CredentialResponse) => {
      if (!response.credential) {
        toast.error("Google sign-in did not return a credential");
        return;
      }
      try {
        const { email, name, sub } = decodeGoogleCredential(response.credential);
        await onSuccess({ email, full_name: name, google_id: sub });
      } catch (err) {
        toast.error(getApiError(err, "Google sign-in failed"));
      }
    },
    [onSuccess],
  );

  return (
    <div className={disabled ? "pointer-events-none opacity-50" : ""}>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => toast.error("Google sign-in was cancelled or failed")}
        theme="outline"
        size="large"
        shape="rectangular"
        text="continue_with"
        width={384}
        locale="en"
      />
    </div>
  );
}

/** Loads client ID from env or API, then renders Google Sign-In. */
export function GoogleSignInButton(props: GoogleSignInButtonProps) {
  const [clientId, setClientId] = useState<string | null>(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || null,
  );
  const [loading, setLoading] = useState(!clientId);

  useEffect(() => {
    if (clientId) return;
    let cancelled = false;
    resolveGoogleClientId().then((id) => {
      if (!cancelled) {
        setClientId(id);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (loading) {
    return (
      <div className="h-12 rounded-2xl border border-slate-200 bg-slate-50 animate-pulse" />
    );
  }

  if (!clientId) {
    return null;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <GoogleButtonInner {...props} />
    </GoogleOAuthProvider>
  );
}
