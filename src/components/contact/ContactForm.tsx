"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactFormSchema, type ContactFormValues } from "@/types/contact";
import { env } from "@/lib/env";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Button from "@/components/ui/button";

type SubmissionState = "idle" | "submitting" | "success" | "error";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}

function FormField({ label, htmlFor, error, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={htmlFor}
        className="font-mono text-xs uppercase tracking-[0.15em] text-text-muted"
      >
        {label}
      </label>
      {children}
      {error && <p className="font-body text-xs text-accent">{error}</p>}
    </div>
  );
}

/*
  Contact form. React Hook Form + Zod (schema is the source of truth) posting to
  Formspree — there's no backend in this project. Submission state drives the
  button label and the success/error messages.
*/
export default function ContactForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
  });
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");

  const onSubmit = async (values: ContactFormValues) => {
    setSubmissionState("submitting");
    try {
      const response = await fetch(env.formspreeEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        throw new Error("Submission failed");
      }
      setSubmissionState("success");
      reset();
    } catch {
      setSubmissionState("error");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
      noValidate
    >
      <FormField label="Name" htmlFor="fullName" error={errors.fullName?.message}>
        <Input
          id="fullName"
          autoComplete="name"
          placeholder="Your name"
          {...register("fullName")}
        />
      </FormField>

      <FormField label="Email" htmlFor="email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          {...register("email")}
        />
      </FormField>

      <FormField
        label="Company (optional)"
        htmlFor="companyName"
        error={errors.companyName?.message}
      >
        <Input
          id="companyName"
          autoComplete="organization"
          placeholder="Company name"
          {...register("companyName")}
        />
      </FormField>

      <FormField label="Message" htmlFor="message" error={errors.message?.message}>
        <Textarea
          id="message"
          rows={5}
          placeholder="Tell us about your product and where you want it to go."
          {...register("message")}
        />
      </FormField>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={submissionState === "submitting"}>
          {submissionState === "submitting" ? "Sending…" : "Send message"}
        </Button>
        {submissionState === "success" && (
          <p className="font-body text-sm text-accent">
            Thanks — we&apos;ll be in touch shortly.
          </p>
        )}
        {submissionState === "error" && (
          <p className="font-body text-sm text-text-muted">
            Something went wrong. Please try again.
          </p>
        )}
      </div>
    </form>
  );
}
