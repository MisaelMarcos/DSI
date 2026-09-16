// Tokens travados — ver docs/design-referencias.md
// Não alterar valores sem alinhar com o time.

export const theme = {
  colors: {
    background: "#FFFFFF",
    card: "#FFFFFF",
    primary: "#3366FF",
    text: "#111827",
    secondary: "#6B7280",
    border: "#DCE3F0",
    alert: "#F59E0B",
  },
  radius: {
    input: 12,
    card: 16,
    button: 6,
  },
  spacing: {
    screen: 32,
    gap: 12,
  },
} as const;

export type Theme = typeof theme;
