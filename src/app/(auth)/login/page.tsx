"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { GraduationCap, Shield, BookOpen, Users } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setServerError("Invalid email or password.");
        return;
      }

      router.refresh();
      router.push("/");
    } catch {
      setServerError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left brand panel */}
      <div className="gradient-hero relative hidden w-[48%] flex-col justify-between p-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight">DIS ONLINE</p>
            <p className="text-xs text-white/70">Doorbell International School</p>
            <p className="text-[11px] italic text-white/60">Christ is our light</p>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight">
            Manage your school with clarity and control
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-white/75">
            Fees in Ghana Cedis, role-based access, invoices, payments, and SMS
            receipts — for Doorbell International School — Christ is our light.
          </p>
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { icon: Users, label: "Users & roles" },
              { icon: BookOpen, label: "Academics" },
              { icon: Shield, label: "Secure access" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-white/10 p-3 backdrop-blur"
              >
                <Icon className="mb-2 h-4 w-4 text-amber-300" />
                <p className="text-xs font-medium text-white/90">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/50">
          © {new Date().getFullYear()} DIS ONLINE · Doorbell International School · Christ is our light
        </p>
      </div>

      {/* Right form */}
      <div className="flex flex-1 items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-semibold">DIS ONLINE</span>
              <p className="text-[11px] text-muted-foreground">Doorbell International School · Christ is our light</p>
            </div>
          </div>

          <div className="mb-8 space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to your school account to continue
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@school.edu.gh"
                className="flex h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="flex h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
              <div className="text-right">
                <a
                  href="/forgot-password"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Forgot password?
                </a>
              </div>
            </div>

            {serverError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-95 disabled:opacity-60"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Use the administrator account created during setup.
          </p>
        </div>
      </div>
    </div>
  );
}
