// ─── Connectors Data Layer ────────────────────────────────────────────────────

export type ConnectorCategory = "Source Control" | "AI Models" | "Databases" | "Deployment" | "Payments" | "Communication" | "Design" | "Storage" | "Project Management"

export type ConnectorHealth = "healthy" | "degraded" | "offline"
export type ConnectorAuthType = "oauth" | "api-key" | "token"

export interface ConnectorActivity {
  id: string
  action: string
  timestamp: string
  level: "info" | "success" | "warn"
}

export interface Connector {
  id: string
  name: string
  monogram: string // 2-char abbreviation for icon
  description: string // What SHANGO gains from this connection
  category: ConnectorCategory
  authType: ConnectorAuthType
  featured: boolean
  tags: string[]
  permissions: string[] // What the connector can access
  scopes: string[] // OAuth scopes or API key capabilities
  requiredSkills: string[] // Skill IDs that activate this connector's full potential
  recommendedSkills: string[]
  usageCount: number
  health: ConnectorHealth
  securityInfo: string // Trust language for the user
  activityLog: ConnectorActivity[]
  mockAccount?: string // Shown when connected (fake account handle)
  mockLastSync?: string
  soon?: boolean
}

export const CONNECTOR_CATEGORIES: ConnectorCategory[] = [
  "Source Control",
  "AI Models",
  "Databases",
  "Deployment",
  "Payments",
  "Communication",
  "Design",
  "Storage",
  "Project Management",
]

export const ALL_CONNECTORS: Connector[] = [
  // ── Source Control ─────────────────────────────────────────────────────────
  {
    id: "github",
    name: "GitHub",
    monogram: "Gh",
    description:
      "Connect SHANGO to your repositories. Import existing codebases, push generated code, trigger CI/CD, and stay in sync with every commit.",
    category: "Source Control",
    authType: "oauth",
    featured: true,
    tags: ["git", "repositories", "ci", "collaboration"],
    permissions: [
      "Read repositories",
      "Write code",
      "Manage pull requests",
      "Read organisation members",
      "Trigger workflows",
    ],
    scopes: ["repo", "workflow", "read:org", "read:user"],
    requiredSkills: [],
    recommendedSkills: ["nodejs", "docker", "cicd"],
    usageCount: 29400,
    health: "healthy",
    securityInfo:
      "OAuth 2.0 via GitHub. SHANGO never stores your password. Access is scoped and revocable from your GitHub settings at any time.",
    activityLog: [
      {
        id: "a1",
        action: "Repository synced — main branch",
        timestamp: "2 minutes ago",
        level: "success",
      },
      {
        id: "a2",
        action: "Pull request opened — feat/auth-flow",
        timestamp: "1 hour ago",
        level: "info",
      },
      {
        id: "a3",
        action: "Workflow triggered — ci.yml",
        timestamp: "3 hours ago",
        level: "info",
      },
    ],
    mockAccount: "@your-username",
    mockLastSync: "2 min ago",
  },
  {
    id: "gitlab",
    name: "GitLab",
    monogram: "Gl",
    description:
      "Bring GitLab's full DevOps platform into SHANGO. Manage merge requests, pipelines, and issues without leaving your workspace.",
    category: "Source Control",
    authType: "oauth",
    featured: false,
    tags: ["git", "devops", "pipelines", "ci"],
    permissions: [
      "Read repositories",
      "Create merge requests",
      "Trigger pipelines",
      "Read projects",
    ],
    scopes: ["read_repository", "write_repository", "api"],
    requiredSkills: [],
    recommendedSkills: ["docker", "cicd"],
    usageCount: 8200,
    health: "healthy",
    securityInfo:
      "OAuth 2.0 via GitLab. Tokens are short-lived and auto-refreshed. Revoke access at any time from GitLab → Settings → Applications.",
    activityLog: [
      {
        id: "a1",
        action: "Pipeline completed — production deploy",
        timestamp: "30 minutes ago",
        level: "success",
      },
    ],
    mockAccount: "@your-gitlab",
    mockLastSync: "30 min ago",
  },
  {
    id: "bitbucket",
    name: "Bitbucket",
    monogram: "Bb",
    description:
      "Connect Bitbucket workspaces and repositories. SHANGO reads your code, manages pull requests, and triggers Bitbucket Pipelines on your behalf.",
    category: "Source Control",
    authType: "oauth",
    featured: false,
    tags: ["git", "atlassian", "pipelines"],
    permissions: [
      "Read repositories",
      "Create pull requests",
      "Trigger pipelines",
    ],
    scopes: ["repository", "pullrequest", "pipeline"],
    requiredSkills: [],
    recommendedSkills: [],
    usageCount: 3100,
    health: "healthy",
    securityInfo:
      "OAuth 2.0 via Atlassian. SHANGO receives only the permissions you grant. Revoke from Bitbucket → Account → OAuth.",
    activityLog: [],
    mockAccount: "@your-workspace",
    mockLastSync: "1 hour ago",
  },

  // ── AI Models ──────────────────────────────────────────────────────────────
  {
    id: "openrouter",
    name: "OpenRouter",
    monogram: "Or",
    description:
      "Access 200+ AI models through a single unified API. SHANGO routes generation tasks to the optimal model based on your capability preference.",
    category: "AI Models",
    authType: "api-key",
    featured: true,
    tags: ["llm", "models", "routing", "generation"],
    permissions: [
      "Send generation requests",
      "Read model list",
      "Access usage analytics",
    ],
    scopes: ["chat", "completions", "embeddings"],
    requiredSkills: [],
    recommendedSkills: ["ai-rag", "ai-agents"],
    usageCount: 11200,
    health: "healthy",
    securityInfo:
      "API key stored encrypted in your local session. Never transmitted to SHANGO servers. Rotate from OpenRouter → Settings → API Keys.",
    activityLog: [
      {
        id: "a1",
        action: "1,200 tokens generated — claude-3-5-sonnet",
        timestamp: "5 minutes ago",
        level: "info",
      },
      {
        id: "a2",
        action: "Model switched — deep mode activated",
        timestamp: "1 hour ago",
        level: "info",
      },
    ],
    mockAccount: "sk-or-v1-••••••••",
    mockLastSync: "5 min ago",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    monogram: "An",
    description:
      "Direct access to Claude models. Use your own Anthropic API key for higher rate limits, priority access, and full control over model selection.",
    category: "AI Models",
    authType: "api-key",
    featured: true,
    tags: ["claude", "anthropic", "llm"],
    permissions: ["Send messages to Claude", "Access usage metrics"],
    scopes: ["messages", "completions"],
    requiredSkills: [],
    recommendedSkills: ["ai-agents", "ai-mcp"],
    usageCount: 9800,
    health: "healthy",
    securityInfo:
      "Your Anthropic API key is encrypted locally. It bypasses SHANGO's shared quota entirely. Manage limits at console.anthropic.com.",
    activityLog: [
      {
        id: "a1",
        action: "Claude 3.5 Sonnet request completed",
        timestamp: "12 minutes ago",
        level: "success",
      },
    ],
    mockAccount: "sk-ant-••••••••",
    mockLastSync: "12 min ago",
  },
  {
    id: "openai",
    name: "OpenAI",
    monogram: "Oa",
    description:
      "Connect GPT-4o and other OpenAI models. SHANGO can generate code, embeddings, and structured data using your own account and billing.",
    category: "AI Models",
    authType: "api-key",
    featured: false,
    tags: ["gpt", "openai", "llm", "embeddings"],
    permissions: [
      "Chat completions",
      "Embeddings generation",
      "Fine-tuning access",
    ],
    scopes: ["chat", "embeddings"],
    requiredSkills: [],
    recommendedSkills: ["ai-rag"],
    usageCount: 14300,
    health: "healthy",
    securityInfo:
      "API key stored locally and encrypted. Never sent to SHANGO servers. Revoke any time from platform.openai.com.",
    activityLog: [],
    mockAccount: "sk-••••••••",
    mockLastSync: "1 hour ago",
  },
  {
    id: "google-ai",
    name: "Google AI",
    monogram: "Ga",
    description:
      "Access Gemini and Vertex AI models directly. SHANGO routes multimodal tasks, long-context reasoning, and code generation to the right Google model.",
    category: "AI Models",
    authType: "api-key",
    featured: false,
    tags: ["gemini", "vertex", "google", "llm"],
    permissions: ["Generate content", "Embeddings", "Code generation"],
    scopes: ["generativelanguage", "aiplatform"],
    requiredSkills: [],
    recommendedSkills: ["ai-rag"],
    usageCount: 6400,
    health: "healthy",
    securityInfo:
      "API key encrypted locally. Managed at aistudio.google.com. Each request goes directly to Google's infrastructure.",
    activityLog: [],
    mockAccount: "AIza••••••••",
    mockLastSync: "3 hours ago",
  },

  // ── Databases ──────────────────────────────────────────────────────────────
  {
    id: "supabase",
    name: "Supabase",
    monogram: "Sb",
    description:
      "Give SHANGO a real backend. Postgres database, auth, storage, and real-time subscriptions — all accessible from generated code without manual wiring.",
    category: "Databases",
    authType: "api-key",
    featured: true,
    tags: ["postgres", "auth", "storage", "realtime"],
    permissions: [
      "Read and write database",
      "Manage auth users",
      "Access storage buckets",
      "Read project settings",
    ],
    scopes: ["database", "auth", "storage", "realtime"],
    requiredSkills: ["database-postgres"],
    recommendedSkills: ["auth", "react", "nodejs"],
    usageCount: 18600,
    health: "healthy",
    securityInfo:
      "Service role key stored encrypted. Row Level Security (RLS) is recommended for all generated tables. Revoke from Supabase → Project → API.",
    activityLog: [
      {
        id: "a1",
        action: "Migration applied — add_users_table",
        timestamp: "1 hour ago",
        level: "success",
      },
      {
        id: "a2",
        action: "342 rows written — events table",
        timestamp: "2 hours ago",
        level: "info",
      },
      {
        id: "a3",
        action: "Auth user created",
        timestamp: "4 hours ago",
        level: "info",
      },
    ],
    mockAccount: "proj-••••••••.supabase.co",
    mockLastSync: "1 hour ago",
  },
  {
    id: "firebase",
    name: "Firebase",
    monogram: "Fb",
    description:
      "Real-time database, authentication, and hosting from Google. SHANGO generates Firebase-native code — rules, SDK calls, and security configuration included.",
    category: "Databases",
    authType: "api-key",
    featured: false,
    tags: ["nosql", "realtime", "google", "auth"],
    permissions: [
      "Read and write Firestore",
      "Manage auth",
      "Deploy hosting",
      "Read project config",
    ],
    scopes: ["firestore", "auth", "hosting"],
    requiredSkills: [],
    recommendedSkills: ["react", "react-native"],
    usageCount: 9200,
    health: "healthy",
    securityInfo:
      "Firebase admin SDK key encrypted locally. Firestore Security Rules are generated for each collection SHANGO creates.",
    activityLog: [
      {
        id: "a1",
        action: "Firestore rules deployed",
        timestamp: "6 hours ago",
        level: "success",
      },
    ],
    mockAccount: "your-project.firebaseapp.com",
    mockLastSync: "6 hours ago",
  },
  {
    id: "neon",
    name: "Neon",
    monogram: "Ne",
    description:
      "Serverless Postgres with branching. SHANGO creates schema branches per feature and generates migrations — keeping your database in sync with every build.",
    category: "Databases",
    authType: "api-key",
    featured: false,
    tags: ["postgres", "serverless", "branching"],
    permissions: [
      "Create and query databases",
      "Manage branches",
      "Run migrations",
    ],
    scopes: ["database", "branches"],
    requiredSkills: ["database-postgres"],
    recommendedSkills: ["nodejs", "auth"],
    usageCount: 4300,
    health: "healthy",
    securityInfo:
      "Connection string stored encrypted. Branch names never contain sensitive data. Revoke from Neon → Project → Settings.",
    activityLog: [],
    mockAccount: "ep-••••••.us-east-2.aws.neon.tech",
    mockLastSync: "2 hours ago",
  },
  {
    id: "planetscale",
    name: "PlanetScale",
    monogram: "Ps",
    description:
      "MySQL-compatible, infinitely scalable databases. SHANGO generates Prisma schemas and branching workflows that match PlanetScale's non-blocking deploy model.",
    category: "Databases",
    authType: "api-key",
    featured: false,
    tags: ["mysql", "vitess", "branching", "prisma"],
    permissions: [
      "Read and write databases",
      "Create branches",
      "Deploy migrations",
    ],
    scopes: ["database", "deploy-requests"],
    requiredSkills: ["database-postgres"],
    recommendedSkills: ["nodejs"],
    usageCount: 3100,
    health: "healthy",
    securityInfo:
      "Service token scoped to your organization. Revoke from PlanetScale → Settings → Service Tokens.",
    activityLog: [],
    mockAccount: "your-org/your-db",
    mockLastSync: "4 hours ago",
  },

  // ── Deployment ─────────────────────────────────────────────────────────────
  {
    id: "vercel",
    name: "Vercel",
    monogram: "Vc",
    description:
      "Deploy to the edge in seconds. SHANGO configures your Vercel project, manages environment variables, and triggers deploys when builds complete.",
    category: "Deployment",
    authType: "token",
    featured: true,
    tags: ["edge", "cdn", "serverless", "preview"],
    permissions: [
      "Create deployments",
      "Manage projects",
      "Set environment variables",
      "View deploy logs",
    ],
    scopes: ["deployments", "projects", "env"],
    requiredSkills: ["react", "nextjs"],
    recommendedSkills: ["typescript", "docker"],
    usageCount: 21400,
    health: "healthy",
    securityInfo:
      "API token scoped to your Vercel account. Never stored server-side. Revoke from Vercel → Settings → Tokens.",
    activityLog: [
      {
        id: "a1",
        action: "Deployed to production — shango-app.vercel.app",
        timestamp: "20 minutes ago",
        level: "success",
      },
      {
        id: "a2",
        action: "Preview deployment — pr-12 branch",
        timestamp: "1 hour ago",
        level: "info",
      },
      {
        id: "a3",
        action: "Environment variable updated — NEXT_PUBLIC_API_URL",
        timestamp: "2 hours ago",
        level: "info",
      },
    ],
    mockAccount: "your-team.vercel.app",
    mockLastSync: "20 min ago",
  },
  {
    id: "netlify",
    name: "Netlify",
    monogram: "Nl",
    description:
      "Instant static deploys and serverless functions. SHANGO configures your netlify.toml, manages redirects, and deploys each build automatically.",
    category: "Deployment",
    authType: "token",
    featured: false,
    tags: ["static", "functions", "edge", "cdn"],
    permissions: [
      "Create deploys",
      "Manage sites",
      "Configure redirects",
      "Set environment variables",
    ],
    scopes: ["sites", "deploys", "env"],
    requiredSkills: [],
    recommendedSkills: ["react", "vue"],
    usageCount: 7800,
    health: "healthy",
    securityInfo:
      "Personal access token stored encrypted locally. Scope to specific sites for least-privilege access. Revoke from Netlify → User Settings → Applications.",
    activityLog: [
      {
        id: "a1",
        action: "Site published — your-site.netlify.app",
        timestamp: "3 hours ago",
        level: "success",
      },
    ],
    mockAccount: "your-site.netlify.app",
    mockLastSync: "3 hours ago",
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    monogram: "Cf",
    description:
      "Deploy Workers, Pages, and R2. SHANGO generates Cloudflare-native code — KV bindings, Durable Objects, and edge middleware — deployed in milliseconds worldwide.",
    category: "Deployment",
    authType: "api-key",
    featured: false,
    tags: ["workers", "edge", "kv", "r2", "pages"],
    permissions: [
      "Deploy Workers",
      "Manage Pages",
      "Access KV namespaces",
      "Manage R2 buckets",
    ],
    scopes: ["workers", "pages", "kv", "r2"],
    requiredSkills: [],
    recommendedSkills: ["typescript"],
    usageCount: 8900,
    health: "healthy",
    securityInfo:
      "API token scoped per zone or account. Use zone-restricted tokens where possible. Revoke from Cloudflare → My Profile → API Tokens.",
    activityLog: [],
    mockAccount: "account-••••••••.cloudflare.com",
    mockLastSync: "5 hours ago",
  },
  {
    id: "docker",
    name: "Docker",
    monogram: "Dk",
    description:
      "Generate production-ready Dockerfiles, docker-compose configurations, and multi-stage builds. SHANGO containerises your app correctly the first time.",
    category: "Deployment",
    authType: "token",
    featured: false,
    tags: ["containers", "compose", "registry", "build"],
    permissions: [
      "Push to registry",
      "Pull base images",
      "Read repository metadata",
    ],
    scopes: ["registry", "images"],
    requiredSkills: ["docker"],
    recommendedSkills: ["cicd", "nodejs"],
    usageCount: 5600,
    health: "healthy",
    securityInfo:
      "Docker access token is read/write scoped. Use repository-specific tokens where possible. Revoke from hub.docker.com → Security.",
    activityLog: [],
    mockAccount: "your-dockerhub-username",
    mockLastSync: "1 day ago",
  },

  // ── Payments ───────────────────────────────────────────────────────────────
  {
    id: "stripe",
    name: "Stripe",
    monogram: "St",
    description:
      "Payments, subscriptions, and financial flows. SHANGO generates Stripe-native checkout pages, webhook handlers, and subscription management — all wired correctly.",
    category: "Payments",
    authType: "api-key",
    featured: true,
    tags: ["payments", "subscriptions", "checkout", "webhooks"],
    permissions: [
      "Create payment intents",
      "Read customer data",
      "Manage subscriptions",
      "Configure webhooks",
    ],
    scopes: ["read_write", "webhooks"],
    requiredSkills: ["nodejs"],
    recommendedSkills: ["auth", "database-postgres"],
    usageCount: 12800,
    health: "healthy",
    securityInfo:
      "Secret key stored encrypted. Only the publishable key appears in client-side code. Stripe never requires your password. Revoke from Stripe → Developers → API Keys.",
    activityLog: [
      {
        id: "a1",
        action: "Webhook registered — payment_intent.succeeded",
        timestamp: "2 hours ago",
        level: "success",
      },
    ],
    mockAccount: "acct_••••••••",
    mockLastSync: "2 hours ago",
  },
  {
    id: "paystack",
    name: "Paystack",
    monogram: "Pk",
    description:
      "Accept payments across Africa. SHANGO generates Paystack checkout flows, handles NGN/GHS/KES/ZAR conversions, and wires webhook verification automatically.",
    category: "Payments",
    authType: "api-key",
    featured: false,
    tags: ["payments", "africa", "ngn", "subscriptions"],
    permissions: [
      "Initiate transactions",
      "Verify payments",
      "Manage plans",
      "Configure webhooks",
    ],
    scopes: ["transaction", "plan", "subscription"],
    requiredSkills: ["nodejs"],
    recommendedSkills: ["auth"],
    usageCount: 4100,
    health: "healthy",
    securityInfo:
      "Secret key encrypted locally. Only the public key is exposed in frontend code. Revoke from Paystack → Settings → API Keys & Webhooks.",
    activityLog: [],
    mockAccount: "your-business.paystack.com",
    mockLastSync: "1 day ago",
  },
  {
    id: "flutterwave",
    name: "Flutterwave",
    monogram: "Fw",
    description:
      "Global payment gateway tailored for Africa. Build seamless checkout experiences, handle multi-currency logic, and process mobile money, cards, and bank transfers.",
    category: "Payments",
    authType: "api-key",
    featured: true,
    tags: ["payments", "africa", "multi-currency", "mobile-money"],
    permissions: [
      "Initiate transactions",
      "Verify payments",
      "Configure webhooks",
      "Create virtual cards",
    ],
    scopes: ["transaction", "webhooks", "virtual_cards"],
    requiredSkills: ["nodejs"],
    recommendedSkills: ["auth"],
    usageCount: 3800,
    health: "healthy",
    securityInfo:
      "Secret API key securely encrypted. Only the public key is exposed in the frontend. Revoke access from Flutterwave Dashboard → Settings → API.",
    activityLog: [],
    mockAccount: "your-merchant.flutterwave.com",
    mockLastSync: "2 days ago",
  },
  {
    id: "mpesa",
    name: "M-Pesa (Daraja API)",
    monogram: "Mp",
    description:
      "Integrate East Africa's leading mobile money service. SHANGO generates Daraja API STK Push payloads, C2B callback handlers, and auto-verifies transactions.",
    category: "Payments",
    authType: "token",
    featured: false,
    tags: ["mobile-money", "africa", "kenya", "daraja"],
    permissions: [
      "Initiate STK Push",
      "Register C2B URLs",
      "Query transaction status",
    ],
    scopes: ["c2b", "stk_push", "b2c"],
    requiredSkills: ["nodejs"],
    recommendedSkills: ["auth"],
    usageCount: 5100,
    health: "healthy",
    securityInfo:
      "Consumer Key and Secret stored encrypted. OAuth token generated on demand. Revoke from Safaricom Daraja Portal → My Apps.",
    activityLog: [],
    mockAccount: "your-paybill",
    mockLastSync: "4 hours ago",
  },
  {
    id: "lemonsqueezy",
    name: "Lemon Squeezy",
    monogram: "Ls",
    description:
      "SaaS billing without the complexity. SHANGO generates Lemon Squeezy checkout overlays, license key validation, and subscription webhooks — ready for your SaaS.",
    category: "Payments",
    authType: "api-key",
    featured: false,
    tags: ["saas", "billing", "license-keys", "subscriptions"],
    permissions: [
      "Create checkouts",
      "Read orders",
      "Manage subscriptions",
      "Access license keys",
    ],
    scopes: ["store", "orders", "subscriptions"],
    requiredSkills: [],
    recommendedSkills: ["nodejs", "auth"],
    usageCount: 2200,
    health: "healthy",
    securityInfo:
      "API key stored encrypted locally. Webhook signatures are verified on every request. Rotate from Lemon Squeezy → Settings → API.",
    activityLog: [],
    mockAccount: "your-store.lemonsqueezy.com",
    mockLastSync: "2 days ago",
  },

  // ── Communication ──────────────────────────────────────────────────────────
  {
    id: "resend",
    name: "Resend",
    monogram: "Rs",
    description:
      "Email infrastructure built for developers. SHANGO generates beautiful transactional emails with React Email templates, proper DKIM setup, and bounce handling.",
    category: "Communication",
    authType: "api-key",
    featured: true,
    tags: ["email", "transactional", "templates", "dns"],
    permissions: ["Send emails", "Manage domains", "View analytics"],
    scopes: ["emails", "domains", "audiences"],
    requiredSkills: ["react", "nodejs"],
    recommendedSkills: ["auth"],
    usageCount: 7600,
    health: "healthy",
    securityInfo:
      "API key stored encrypted. Sending domains are verified via DNS records SHANGO helps you configure. Revoke from Resend → API Keys.",
    activityLog: [
      {
        id: "a1",
        action: "Welcome email sent — 1 recipient",
        timestamp: "30 minutes ago",
        level: "success",
      },
      {
        id: "a2",
        action: "Domain verified — yourdomain.com",
        timestamp: "1 day ago",
        level: "success",
      },
    ],
    mockAccount: "re_••••••••",
    mockLastSync: "30 min ago",
  },
  {
    id: "twilio",
    name: "Twilio",
    monogram: "Tw",
    description:
      "SMS, voice, and WhatsApp for your application. SHANGO wires Twilio into your auth flows — OTP verification, password reset SMS, and notification pipelines.",
    category: "Communication",
    authType: "api-key",
    featured: false,
    tags: ["sms", "otp", "voice", "whatsapp"],
    permissions: [
      "Send SMS",
      "Make calls",
      "Manage phone numbers",
      "Access message logs",
    ],
    scopes: ["Messages", "Calls", "PhoneNumbers"],
    requiredSkills: ["nodejs"],
    recommendedSkills: ["auth"],
    usageCount: 5400,
    health: "healthy",
    securityInfo:
      "Account SID and Auth Token stored encrypted. Use API keys (not master Auth Token) in production. Rotate from Twilio → Console → API Keys.",
    activityLog: [],
    mockAccount: "AC••••••••",
    mockLastSync: "2 hours ago",
  },
  {
    id: "slack",
    name: "Slack",
    monogram: "Sl",
    description:
      "Real-time notifications and alerts in Slack. SHANGO sends build updates, deployment status, error alerts, and custom messages to any channel or DM.",
    category: "Communication",
    authType: "oauth",
    featured: false,
    tags: ["notifications", "alerts", "bot", "webhooks"],
    permissions: [
      "Send messages to channels",
      "Read workspace info",
      "Access file metadata",
    ],
    scopes: ["chat:write", "channels:read", "users:read"],
    requiredSkills: [],
    recommendedSkills: ["cicd"],
    usageCount: 9100,
    health: "healthy",
    securityInfo:
      "OAuth 2.0 via Slack. SHANGO never reads your message history. Only explicit send permissions are requested. Revoke from Slack → Apps → Manage.",
    activityLog: [
      {
        id: "a1",
        action: "Message sent — #deployments channel",
        timestamp: "1 hour ago",
        level: "success",
      },
    ],
    mockAccount: "your-workspace.slack.com",
    mockLastSync: "1 hour ago",
  },
  {
    id: "discord",
    name: "Discord",
    monogram: "Dc",
    description:
      "Build bots and post automated updates to Discord servers. SHANGO generates Discord.js bot code, slash commands, and webhook integrations for your community.",
    category: "Communication",
    authType: "token",
    featured: false,
    tags: ["bot", "webhooks", "community", "notifications"],
    permissions: ["Send messages", "Read channel history", "Manage webhooks"],
    scopes: ["bot", "applications.commands"],
    requiredSkills: ["nodejs"],
    recommendedSkills: [],
    usageCount: 4200,
    health: "healthy",
    securityInfo:
      "Bot token stored encrypted. Keep your token private — never commit it to repositories. Regenerate from Discord → Developer Portal → Bot.",
    activityLog: [],
    mockAccount: "YourBot#0000",
    mockLastSync: "3 hours ago",
  },

  // ── Design ─────────────────────────────────────────────────────────────────
  {
    id: "figma",
    name: "Figma",
    monogram: "Fg",
    description:
      "Import designs directly into SHANGO. Read component specs, extract design tokens, generate pixel-accurate React components, and stay in sync as designs evolve.",
    category: "Design",
    authType: "oauth",
    featured: true,
    tags: ["design", "components", "tokens", "specs"],
    permissions: [
      "Read files",
      "Read prototypes",
      "Access team libraries",
      "Read comments",
    ],
    scopes: ["file_read", "library_analytics:read"],
    requiredSkills: ["react", "design-system"],
    recommendedSkills: ["tailwind", "typescript"],
    usageCount: 13200,
    health: "healthy",
    securityInfo:
      "OAuth 2.0 via Figma. Read-only by default. SHANGO never modifies your files. Revoke from Figma → Settings → Third-party apps.",
    activityLog: [
      {
        id: "a1",
        action: "Design tokens synced — Brand v2.1",
        timestamp: "2 hours ago",
        level: "success",
      },
      {
        id: "a2",
        action: "3 components imported — Button, Card, Modal",
        timestamp: "4 hours ago",
        level: "info",
      },
    ],
    mockAccount: "your-team@figma.com",
    mockLastSync: "2 hours ago",
  },

  // ── Project Management ─────────────────────────────────────────────────────
  {
    id: "linear",
    name: "Linear",
    monogram: "Ln",
    description:
      "Issue tracking wired into your build flow. SHANGO reads your Linear backlog, links builds to issues, and creates new issues when errors are detected.",
    category: "Project Management",
    authType: "api-key",
    featured: false,
    tags: ["issues", "sprint", "tracking", "backlog"],
    permissions: [
      "Read issues",
      "Create issues",
      "Update issue status",
      "Read project metadata",
    ],
    scopes: ["read", "issues:create"],
    requiredSkills: [],
    recommendedSkills: ["cicd", "github"],
    usageCount: 6800,
    health: "healthy",
    securityInfo:
      "Personal API key scoped to your workspace. Keys are not logged or cached. Revoke from Linear → Settings → API.",
    activityLog: [
      {
        id: "a1",
        action: "Issue updated — SHANGO-142 marked done",
        timestamp: "4 hours ago",
        level: "success",
      },
    ],
    mockAccount: "your-workspace.linear.app",
    mockLastSync: "4 hours ago",
  },
  {
    id: "jira",
    name: "Jira",
    monogram: "Jr",
    description:
      "Atlassian Jira sprint management inside SHANGO. Browse your backlog, link commits to Jira tickets, and move issues through your workflow as builds progress.",
    category: "Project Management",
    authType: "oauth",
    featured: false,
    tags: ["issues", "sprint", "atlassian", "agile"],
    permissions: [
      "Read projects",
      "Read and create issues",
      "Transition issues",
    ],
    scopes: ["read:jira-user", "read:jira-work", "write:jira-work"],
    requiredSkills: [],
    recommendedSkills: ["github", "cicd"],
    usageCount: 5200,
    health: "healthy",
    securityInfo:
      "OAuth 2.0 via Atlassian. Scoped to the projects you select during authorisation. Revoke from Atlassian → Account → Security → Third-party app access.",
    activityLog: [],
    mockAccount: "your-team.atlassian.net",
    mockLastSync: "6 hours ago",
  },

  // ── Storage ────────────────────────────────────────────────────────────────
  {
    id: "notion",
    name: "Notion",
    monogram: "No",
    description:
      "Connect your Notion workspace. SHANGO reads your documentation, generates structured notes from builds, and keeps your team wiki in sync with your codebase.",
    category: "Storage",
    authType: "oauth",
    featured: false,
    tags: ["docs", "wiki", "notes", "database"],
    permissions: [
      "Read pages",
      "Create pages",
      "Update databases",
      "Read workspace structure",
    ],
    scopes: ["read_content", "update_content", "insert_content"],
    requiredSkills: [],
    recommendedSkills: [],
    usageCount: 7400,
    health: "healthy",
    securityInfo:
      "OAuth 2.0 via Notion. Access is page-scoped — SHANGO can only read and write pages you explicitly share. Revoke from Notion → Settings → Connections.",
    activityLog: [
      {
        id: "a1",
        action: "Documentation page created — API Reference",
        timestamp: "1 day ago",
        level: "success",
      },
    ],
    mockAccount: "your-workspace.notion.so",
    mockLastSync: "1 day ago",
  },
  {
    id: "google-drive",
    name: "Google Drive",
    monogram: "Gd",
    description:
      "Read files, export documents, and store build artefacts in Google Drive. SHANGO generates Google Docs/Sheets exports from data models and stores project specs.",
    category: "Storage",
    authType: "oauth",
    featured: false,
    tags: ["storage", "docs", "sheets", "google"],
    permissions: [
      "Read files",
      "Create documents",
      "Upload files",
      "Access shared drives",
    ],
    scopes: ["drive.file", "drive.readonly"],
    requiredSkills: [],
    recommendedSkills: [],
    usageCount: 4800,
    health: "healthy",
    securityInfo:
      "OAuth 2.0 via Google. Access is scoped to files SHANGO creates unless you grant broader access. Revoke from myaccount.google.com → Security → Third-party apps.",
    activityLog: [],
    mockAccount: "you@gmail.com",
    mockLastSync: "2 days ago",
  },
  {
    id: "dropbox",
    name: "Dropbox",
    monogram: "Db",
    description:
      "Store and retrieve project assets from Dropbox. SHANGO accesses your asset library, syncs build outputs, and generates pre-signed download links.",
    category: "Storage",
    authType: "oauth",
    featured: false,
    tags: ["storage", "assets", "files", "sync"],
    permissions: ["Read files", "Write files", "Access shared folders"],
    scopes: ["files.content.read", "files.content.write"],
    requiredSkills: [],
    recommendedSkills: [],
    usageCount: 2100,
    health: "healthy",
    securityInfo:
      "OAuth 2.0 via Dropbox. Access is scoped to your app folder by default. Revoke from dropbox.com → Account → Connected apps.",
    activityLog: [],
    mockAccount: "your@email.com",
    mockLastSync: "3 days ago",
  },
  {
    id: "onedrive",
    name: "OneDrive",
    monogram: "Od",
    description:
      "Microsoft OneDrive and SharePoint integration. SHANGO reads documents, stores exports, and syncs project files across your Microsoft 365 environment.",
    category: "Storage",
    authType: "oauth",
    featured: false,
    tags: ["storage", "microsoft", "sharepoint", "files"],
    permissions: ["Read files", "Write files", "Access SharePoint sites"],
    scopes: ["Files.ReadWrite", "Sites.Read.All"],
    requiredSkills: [],
    recommendedSkills: [],
    usageCount: 1800,
    health: "healthy",
    securityInfo:
      "OAuth 2.0 via Microsoft. Tokens are short-lived and auto-refreshed. Revoke from account.microsoft.com → Privacy → Apps and services.",
    activityLog: [],
    mockAccount: "you@outlook.com",
    mockLastSync: "5 days ago",
  },
]

// ── Default connected state ────────────────────────────────────────────────

export const DEFAULT_CONNECTED_CONNECTOR_IDS: string[] = []

// ── Helpers ───────────────────────────────────────────────────────────────

export function getConnectorById(id: string): Connector | undefined {
  return ALL_CONNECTORS.find((c) => c.id === id)
}

export function getConnectorsByCategory(
  category: ConnectorCategory,
): Connector[] {
  return ALL_CONNECTORS.filter((c) => c.category === category)
}

export function getFeaturedConnectors(): Connector[] {
  return ALL_CONNECTORS.filter((c) => c.featured)
}

export function searchConnectors(query: string): Connector[] {
  const q = query.toLowerCase()
  return ALL_CONNECTORS.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.tags.some((t) => t.includes(q)) ||
      c.category.toLowerCase().includes(q),
  )
}
