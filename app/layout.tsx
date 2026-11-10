import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "09 AI Agency | Central de Operações",
  description: "Sistema operacional inteligente da 09 Comunicação Integrada.",
  applicationName: "09 AI Agency",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
