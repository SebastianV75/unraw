const config = {
  app: {
    name: "Unraw",
    description: "Un sistema simple para organizar todo lo que tienes en mente.",
    domain: "",
    locale: "es",
    defaultUrl: "http://localhost:3000",
  },
  brand: {
    primary: "#0ea5e9",
    logoText: "Unraw",
    logoSrc: null,
    radius: "1rem",
  },
  ai: {
    structuredModel: "gpt-4o-mini",
    maxTokens: 1500,
    temperature: 0.4,
  },
  email: {
    from: "Unraw <onboarding@resend.dev>",
    replyTo: "onboarding@resend.dev",
    supportEmail: "onboarding@resend.dev",
  },
  auth: {
    loginUrl: "/login",
    afterLoginUrl: "/overview",
    afterLogoutUrl: "/",
  },
}

export default config
