export type SignatureRole = "employee" | "customer";
export type SignatureVariant = "reference" | "brand";

export interface SignatureTheme {
  background: string;
  surface: string;
  accent: string;
  accentSoft: string;
  action: string;
  border: string;
  ink: string;
  muted: string;
  exportBackground: string;
}

export const SIGNATURE_COMPLETE_EVENT: string;
export const SIGNATURE_EXPORT_SCALE: number;
export const SIGNATURE_THEMES: Record<
  SignatureVariant,
  Record<SignatureRole, SignatureTheme>
>;

export function getSignatureTheme(
  role: SignatureRole,
  variant?: SignatureVariant,
): SignatureTheme;
