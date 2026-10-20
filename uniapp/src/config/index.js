// @ts-check

export const SIGNATURE_COMPLETE_EVENT = "pco:signature-complete";
export const SIGNATURE_EXPORT_SCALE = 2;

export const SIGNATURE_THEMES = {
  reference: {
    employee: {
      background: "#d3e3fd",
      surface: "#ffffff",
      accent: "#4e79a7",
      accentSoft: "#eaf2ff",
      action: "#ff8c89",
      border: "#111111",
      ink: "#111111",
      muted: "#999999",
      exportBackground: "#ffffff",
    },
    customer: {
      background: "#f9e4e3",
      surface: "#ffffff",
      accent: "#b86683",
      accentSoft: "#fdeff2",
      action: "#ff8c89",
      border: "#111111",
      ink: "#111111",
      muted: "#999999",
      exportBackground: "#ffffff",
    },
  },
  brand: {
    employee: {
      background: "#dfeee6",
      surface: "#f8fcf9",
      accent: "#176b52",
      accentSoft: "#e7f3ed",
      action: "#ff8c89",
      border: "#c5ded1",
      ink: "#17211d",
      muted: "#65736c",
      exportBackground: "#ffffff",
    },
    customer: {
      background: "#eef5f0",
      surface: "#fbfdfb",
      accent: "#346b56",
      accentSoft: "#edf6f1",
      action: "#ff8c89",
      border: "#d3e2d8",
      ink: "#20332b",
      muted: "#6b7a72",
      exportBackground: "#ffffff",
    },
  },
};

/**
 * @param {"employee" | "customer"} role
 * @param {"reference" | "brand"} variant
 */
export function getSignatureTheme(role, variant = "reference") {
  const themeSet = SIGNATURE_THEMES[variant] || SIGNATURE_THEMES.reference;
  return themeSet[role] || themeSet.employee;
}
