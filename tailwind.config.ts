import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                whatsapp: {
                    green: "#25D366",
                    dark: "#075E54",
                    light: "#128C7E",
                    blue: "#34B7F1",
                    teal: "#008069",
                    bg: "#f0f2f5",
                    "chat-bg": "#ece5dd"
                }
            },
            backgroundImage: {
                "whatsapp-pattern": "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
            }
        },
    },
    plugins: [],
};
export default config;
