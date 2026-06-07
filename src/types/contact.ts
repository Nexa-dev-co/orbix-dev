import { z } from "zod";

// Zod schema is the source of truth; the TS type is inferred from it.
export const contactFormSchema = z.object({
  fullName: z.string().min(2, "Please enter your name."),
  email: z.string().email("Please enter a valid email."),
  companyName: z.string().optional(),
  message: z.string().min(10, "Tell us a little more (10+ characters)."),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;
