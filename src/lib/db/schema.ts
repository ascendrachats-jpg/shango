import {
  pgTable,
  text,
  timestamp,
  boolean,
  json,
  serial,
  varchar,
} from "drizzle-orm/pg-core"

// --- Better Auth required tables -------------------------------------------
// Column names are camelCase to match Better Auth's defaults. Do not rename.

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
})

// --- App tables ------------------------------------------------------------
// Add your app tables below. Always include a plain `userId` column so queries
// can be scoped per user — the security model depends on this column existing,
// not on a foreign key. Do NOT add a foreign key constraint
// (`.references(() => user.id, ...)`) unless the user explicitly asks for
// foreign keys or referential integrity; FK constraints make iterating on the
// schema harder.
//
// SHANGO project and file management tables

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  templateId: text("templateId"),
  artifact: json("artifact"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  lastGeneration: json("lastGeneration"),
})

export const projectFiles = pgTable("projectFiles", {
  id: text("id").primaryKey(),
  projectId: text("projectId").notNull(),
  userId: text("userId").notNull(),
  path: varchar("path", { length: 1024 }).notNull(),
  content: text("content").notNull(),
  language: varchar("language", { length: 50 }).default("typescript"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const projectVersions = pgTable("projectVersions", {
  id: text("id").primaryKey(),
  projectId: text("projectId").notNull(),
  userId: text("userId").notNull(),
  number: serial("number"),
  prompt: text("prompt").notNull(),
  artifact: json("artifact"),
  assistantMessage: text("assistantMessage"),
  isCurrent: boolean("isCurrent").notNull().default(false),
  label: varchar("label", { length: 256 }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  provenance: json("provenance"),
})

export const deployments = pgTable("deployments", {
  id: text("id").primaryKey(),
  projectId: text("projectId").notNull(),
  userId: text("userId").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  url: text("url"),
  buildLog: text("buildLog"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// Phase 5: Real-time collaboration tables
export const projectCollaborators = pgTable("projectCollaborators", {
  id: text("id").primaryKey(),
  projectId: text("projectId").notNull(),
  userId: text("userId").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("editor"), // owner, editor, viewer
  invitedBy: text("invitedBy"),
  inviteToken: text("inviteToken").unique(),
  inviteExpiresAt: timestamp("inviteExpiresAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const collaborationEvents = pgTable("collaborationEvents", {
  id: text("id").primaryKey(),
  projectId: text("projectId").notNull(),
  userId: text("userId").notNull(),
  eventType: varchar("eventType", { length: 50 }).notNull(), // fileChange, presence, comment, etc.
  fileId: text("fileId"),
  filePath: varchar("filePath", { length: 1024 }),
  content: json("content"), // Event payload
  versionVector: json("versionVector"), // Causal ordering vector
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const presenceState = pgTable("presenceState", {
  id: text("id").primaryKey(),
  projectId: text("projectId").notNull(),
  userId: text("userId").notNull(),
  sessionId: text("sessionId").notNull(),
  cursorPosition: json("cursorPosition"), // {line, column}
  selectedFile: text("selectedFile"),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, idle, offline
  lastHeartbeat: timestamp("lastHeartbeat").notNull().defaultNow(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// Phase 6: Advanced features - Component libraries
export const components = pgTable("components", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).default("utility"), // button, form, layout, etc.
  code: text("code").notNull(),
  language: varchar("language", { length: 50 }).default("typescript"),
  props: json("props"), // Component prop definitions
  preview: json("preview"), // Preview artifact
  isPublic: boolean("isPublic").notNull().default(false),
  tags: json("tags"), // Array of tags
  downloads: serial("downloads").default(0),
  rating: json("rating"), // {average, count}
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const componentInstances = pgTable("componentInstances", {
  id: text("id").primaryKey(),
  projectId: text("projectId").notNull(),
  userId: text("userId").notNull(),
  componentId: text("componentId").notNull(),
  path: varchar("path", { length: 1024 }).notNull(),
  props: json("props"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// Phase 6: AI Agent framework
export const agents = pgTable("agents", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  systemPrompt: text("systemPrompt").notNull(),
  capabilities: json("capabilities"), // Array of capabilities
  isEnabled: boolean("isEnabled").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const agentTasks = pgTable("agentTasks", {
  id: text("id").primaryKey(),
  agentId: text("agentId").notNull(),
  userId: text("userId").notNull(),
  projectId: text("projectId"),
  prompt: text("prompt").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, running, completed, failed
  result: json("result"),
  error: text("error"),
  executedAt: timestamp("executedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// Phase 6: Design system management
export const designSystems = pgTable("designSystems", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  version: varchar("version", { length: 50 }).default("1.0.0"),
  colors: json("colors"),
  typography: json("typography"),
  spacing: json("spacing"),
  borderRadius: json("borderRadius"),
  shadows: json("shadows"),
  isDefault: boolean("isDefault").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const designTokens = pgTable("designTokens", {
  id: text("id").primaryKey(),
  designSystemId: text("designSystemId").notNull(),
  userId: text("userId").notNull(),
  name: text("name").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // color, size, font, etc.
  value: text("value").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})
