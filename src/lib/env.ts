/**
 * Typed access to public environment variables. Never read process.env.X
 * inline elsewhere — import from here so missing config fails loudly in one
 * place and types stay accurate.
 */

function readRequiredPublicVar(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Add it to .env.local.`
    );
  }
  return value;
}

export const env = {
  // Formspree form endpoint the contact form POSTs to (no backend in this project).
  formspreeEndpoint: readRequiredPublicVar(
    "NEXT_PUBLIC_FORMSPREE_ENDPOINT",
    process.env.NEXT_PUBLIC_FORMSPREE_ENDPOINT
  ),
} as const;
