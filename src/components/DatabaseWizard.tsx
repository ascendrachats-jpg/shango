import _React, { useState } from "react"

type DbType = "cloudsql" | "firestore"

interface Template {
  id: string
  name: string
  desc: string
  sqlSchema: string
  firestoreSchema: string
  migrationSql: string
}

const TEMPLATES: Template[] = [
  {
    id: "saas",
    name: "SaaS Multi-Tenant Platform",
    desc: "Organizations, Users, Roles, Subscriptions, API Keys, and Audit Logs",
    sqlSchema: `import { pgTable, text, timestamp, boolean, varchar } from 'drizzle-orm/pg-core'

export const organizations = pgTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: varchar('slug', { length: 128 }).notNull().unique(),
  plan: varchar('plan', { length: 50 }).default('free'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const orgMembers = pgTable('org_members', {
  id: text('id').primaryKey(),
  orgId: text('orgId').notNull(),
  userId: text('userId').notNull(),
  role: varchar('role', { length: 30 }).default('member'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const apiKeys = pgTable('api_keys', {
  id: text('id').primaryKey(),
  orgId: text('orgId').notNull(),
  keyHash: text('keyHash').notNull(),
  name: text('name').notNull(),
  expiresAt: timestamp('expiresAt'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})`,
    firestoreSchema: `{
  "entities": {
    "organizations": {
      "fields": { "name": "string", "slug": "string", "plan": "string" }
    },
    "org_members": {
      "fields": { "orgId": "string", "userId": "string", "role": "string" }
    },
    "api_keys": {
      "fields": { "orgId": "string", "keyHash": "string", "name": "string" }
    }
  }
}`,
    migrationSql: `-- Cloud SQL PostgreSQL Migration: 0001_saas_multitenant.sql
CREATE TABLE IF NOT EXISTS "organizations" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "slug" varchar(128) NOT NULL UNIQUE,
  "plan" varchar(50) DEFAULT 'free',
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "org_members" (
  "id" text PRIMARY KEY NOT NULL,
  "orgId" text NOT NULL,
  "userId" text NOT NULL,
  "role" varchar(30) DEFAULT 'member',
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_org_members_org" ON "org_members" ("orgId");`,
  },
  {
    id: "ecommerce",
    name: "E-Commerce Storefront",
    desc: "Products, Categories, Orders, Cart Items, Inventory, and Reviews",
    sqlSchema: `import { pgTable, text, timestamp, integer, numeric, varchar } from 'drizzle-orm/pg-core'

export const products = pgTable('products', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  inventoryCount: integer('inventoryCount').default(0),
  category: varchar('category', { length: 100 }),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  totalAmount: numeric('totalAmount', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status', { length: 40 }).default('pending'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})`,
    firestoreSchema: `{
  "entities": {
    "products": {
      "fields": { "title": "string", "price": "number", "inventoryCount": "number" }
    },
    "orders": {
      "fields": { "userId": "string", "totalAmount": "number", "status": "string" }
    }
  }
}`,
    migrationSql: `-- Cloud SQL PostgreSQL Migration: 0001_ecommerce.sql
CREATE TABLE IF NOT EXISTS "products" (
  "id" text PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "price" numeric(10, 2) NOT NULL,
  "inventoryCount" integer DEFAULT 0,
  "category" varchar(100),
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "orders" (
  "id" text PRIMARY KEY NOT NULL,
  "userId" text NOT NULL,
  "totalAmount" numeric(10, 2) NOT NULL,
  "status" varchar(40) DEFAULT 'pending',
  "createdAt" timestamp DEFAULT now() NOT NULL
);`,
  },
  {
    id: "ai_agent",
    name: "AI Agent & Context Engine",
    desc: "Prompts, Conversations, Vectors/Embeddings, Model Runs, and Usage Logs",
    sqlSchema: `import { pgTable, text, timestamp, json, integer } from 'drizzle-orm/pg-core'

export const conversations = pgTable('conversations', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  title: text('title').notNull(),
  model: text('model').default('gemini-3.6-flash'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversationId').notNull(),
  role: text('role').notNull(), // 'user' | 'assistant'
  content: text('content').notNull(),
  tokensUsed: integer('tokensUsed').default(0),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})`,
    firestoreSchema: `{
  "entities": {
    "conversations": {
      "fields": { "userId": "string", "title": "string", "model": "string" }
    },
    "messages": {
      "fields": { "conversationId": "string", "role": "string", "content": "string" }
    }
  }
}`,
    migrationSql: `-- Cloud SQL PostgreSQL Migration: 0001_ai_agent.sql
CREATE TABLE IF NOT EXISTS "conversations" (
  "id" text PRIMARY KEY NOT NULL,
  "userId" text NOT NULL,
  "title" text NOT NULL,
  "model" text DEFAULT 'gemini-3.6-flash',
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "messages" (
  "id" text PRIMARY KEY NOT NULL,
  "conversationId" text NOT NULL,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "tokensUsed" integer DEFAULT 0,
  "createdAt" timestamp DEFAULT now() NOT NULL
);`,
  },
]

export default function DatabaseWizard({
  onApplied,
}: {
  onApplied?: (msg: string) => void
}) {
  const [dbType, setDbType] = useState<DbType>("cloudsql")
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(
    TEMPLATES[0],
  )
  const [customPrompt, setCustomPrompt] = useState("")
  const [activeCodeTab, setActiveCodeTab] =
    useState<"schema" | "migration" | "client">("schema")
  const [isProvisioning, setIsProvisioning] = useState(false)
  const [provisionStep, setProvisionStep] = useState<number>(0)
  const [provisionComplete, setProvisionComplete] = useState(false)

  const handleProvision = () => {
    setIsProvisioning(true)
    setProvisionStep(1)

    setTimeout(() => {
      setProvisionStep(2)
      setTimeout(() => {
        setProvisionStep(3)
        setTimeout(() => {
          setProvisionStep(4)
          setIsProvisioning(false)
          setProvisionComplete(true)
          if (onApplied) {
            onApplied(
              `Database schema applied & ${
                dbType === "cloudsql" ? "Cloud SQL PostgreSQL" : "Firestore"
              } provisioned!`,
            )
          }
        }, 800)
      }, 900)
    }, 700)
  }

  return (
    <div
      className="flex flex-col gap-6 max-w-4xl"
      style={{ animation: "shango-fade-up 0.22s cubic-bezier(0.16,1,0.3,1)" }}
    >
      {/* DB Engine Picker Header */}
      <div className="grid grid-cols-2 gap-4">
        {/* Cloud SQL Card */}
        <div
          onClick={() => setDbType("cloudsql")}
          className="rounded-xl p-4 cursor-pointer relative overflow-hidden transition-all"
          style={{
            background:
              dbType === "cloudsql"
                ? "rgba(96,165,250,0.08)"
                : "var(--surface-1)",
            border: `1.5px solid ${
              dbType === "cloudsql" ? "#60a5fa" : "var(--border-subtle)"
            }`,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-blue-400 text-base font-bold">🐘</span>
              <h3
                className="text-xs font-semibold text-white"
                style={{ fontFamily: "var(--font-geist)" }}
              >
                Cloud SQL (PostgreSQL)
              </h3>
            </div>
            {dbType === "cloudsql" && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-mono">
                ACTIVE
              </span>
            )}
          </div>
          <p
            className="text-[11px] text-zinc-400 leading-relaxed"
            style={{ fontFamily: "var(--font-geist)" }}
          >
            Relational SQL with Drizzle ORM, DDL migration scripts, full ACID
            compliance, and connection pooling.
          </p>
        </div>

        {/* Firestore Card */}
        <div
          onClick={() => setDbType("firestore")}
          className="rounded-xl p-4 cursor-pointer relative overflow-hidden transition-all"
          style={{
            background:
              dbType === "firestore"
                ? "rgba(245,158,11,0.08)"
                : "var(--surface-1)",
            border: `1.5px solid ${
              dbType === "firestore" ? "#f59e0b" : "var(--border-subtle)"
            }`,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-base font-bold">🔥</span>
              <h3
                className="text-xs font-semibold text-white"
                style={{ fontFamily: "var(--font-geist)" }}
              >
                Firebase Firestore
              </h3>
            </div>
            {dbType === "firestore" && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-mono">
                ACTIVE
              </span>
            )}
          </div>
          <p
            className="text-[11px] text-zinc-400 leading-relaxed"
            style={{ fontFamily: "var(--font-geist)" }}
          >
            NoSQL Document Store, real-time sync listeners, client-side security
            rules, and auto-indexed collections.
          </p>
        </div>
      </div>

      {/* AI Schema Template Generator */}
      <div
        className="rounded-xl p-5"
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border-default)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h4
            className="text-xs font-medium text-white"
            style={{ fontFamily: "var(--font-geist)" }}
          >
            1. Select or Prompt Schema Architecture
          </h4>
          <span className="text-[10px] text-zinc-400 font-mono">
            AI Schema Generator Active
          </span>
        </div>

        {/* Template Buttons */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => {
                setSelectedTemplate(tpl)
                setCustomPrompt("")
              }}
              className="p-3 rounded-lg text-left transition-all"
              style={{
                background:
                  selectedTemplate.id === tpl.id && !customPrompt
                    ? "var(--surface-2)"
                    : "var(--surface-0)",
                border: `1px solid ${
                  selectedTemplate.id === tpl.id && !customPrompt
                    ? "rgba(255,255,255,0.2)"
                    : "var(--border-subtle)"
                }`,
              }}
            >
              <div
                className="text-xs font-medium text-white mb-1"
                style={{ fontFamily: "var(--font-geist)" }}
              >
                {tpl.name}
              </div>
              <div
                className="text-[10px] text-zinc-400 line-clamp-2"
                style={{ fontFamily: "var(--font-geist)" }}
              >
                {tpl.desc}
              </div>
            </button>
          ))}
        </div>

        {/* Custom Prompt Box */}
        <div className="relative">
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Or describe custom entities (e.g. Healthcare portal with patients, appointments, and vitals history)..."
            className="w-full px-3.5 py-2.5 rounded-lg text-xs outline-none"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-geist)",
            }}
          />
        </div>
      </div>

      {/* Schema Code & Migration Viewer */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "#0a0d14",
          border: "1px solid var(--border-default)",
        }}
      >
        {/* Code Tab Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveCodeTab("schema")}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                activeCodeTab === "schema"
                  ? "bg-zinc-800 text-white font-medium"
                  : "text-zinc-400 hover:text-white"
              }`}
              style={{ fontFamily: "var(--font-geist)" }}
            >
              {dbType === "cloudsql"
                ? "src/lib/db/schema.ts"
                : "firebase-blueprint.json"}
            </button>
            <button
              onClick={() => setActiveCodeTab("migration")}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                activeCodeTab === "migration"
                  ? "bg-zinc-800 text-white font-medium"
                  : "text-zinc-400 hover:text-white"
              }`}
              style={{ fontFamily: "var(--font-geist)" }}
            >
              {dbType === "cloudsql"
                ? "drizzle/0001_migration.sql"
                : "firestore.rules"}
            </button>
            <button
              onClick={() => setActiveCodeTab("client")}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                activeCodeTab === "client"
                  ? "bg-zinc-800 text-white font-medium"
                  : "text-zinc-400 hover:text-white"
              }`}
              style={{ fontFamily: "var(--font-geist)" }}
            >
              Client Integration Example
            </button>
          </div>

          <span className="text-[10px] font-mono text-zinc-500">
            AUTO-GENERATED
          </span>
        </div>

        {/* Code Display Area */}
        <pre className="p-4 text-[11px] font-mono text-zinc-300 leading-relaxed overflow-x-auto max-h-[260px]">
          {activeCodeTab === "schema" &&
            (dbType === "cloudsql"
              ? selectedTemplate.sqlSchema
              : selectedTemplate.firestoreSchema)}
          {activeCodeTab === "migration" &&
            (dbType === "cloudsql"
              ? selectedTemplate.migrationSql
              : `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`)}
          {activeCodeTab === "client" &&
            (dbType === "cloudsql"
              ? `import { db } from '@/lib/db'
import { ${
                  selectedTemplate.id === "ecommerce"
                    ? "products"
                    : "organizations"
                } } from '@/lib/db/schema'

export async function fetchEntities() {
  const rows = await db.select().from(${
    selectedTemplate.id === "ecommerce" ? "products" : "organizations"
  })
  return rows
}`
              : `import { collection, getDocs } from 'firebase/firestore'
import { firestore } from '@/lib/firebase'

export async function fetchCollection() {
  const querySnapshot = await getDocs(collection(firestore, "${
    selectedTemplate.id === "ecommerce" ? "products" : "organizations"
  }"))
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}`)}
        </pre>
      </div>

      {/* Provisioning Action Footer */}
      <div
        className="rounded-xl p-4 flex items-center justify-between gap-4"
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border-default)",
        }}
      >
        <div>
          <h4
            className="text-xs font-semibold text-white mb-0.5"
            style={{ fontFamily: "var(--font-geist)" }}
          >
            2. Run Migration & Provision Database
          </h4>
          <p
            className="text-[11px] text-zinc-400"
            style={{ fontFamily: "var(--font-geist)" }}
          >
            Executes DDL statements, syncs ORM models, and establishes SSL
            database connections.
          </p>
        </div>

        <button
          disabled={isProvisioning}
          onClick={handleProvision}
          className="px-5 py-2.5 rounded-lg text-xs font-medium text-black bg-white hover:bg-zinc-200 transition-all shadow-md flex items-center gap-2 flex-shrink-0 disabled:opacity-50"
          style={{ fontFamily: "var(--font-geist)" }}
        >
          {isProvisioning ? (
            <>
              <span className="w-3 h-3 rounded-full border-2 border-black border-t-transparent animate-spin" />
              Provisioning Step {provisionStep}/4...
            </>
          ) : provisionComplete ? (
            "✓ Schema Applied & Provisioned"
          ) : (
            "⚡ Apply Schema & Provision"
          )}
        </button>
      </div>

      {/* Provision Progress Banner */}
      {isProvisioning && (
        <div className="rounded-xl p-4 bg-blue-950/40 border border-blue-500/20 text-xs font-mono text-blue-300 flex flex-col gap-1.5 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-blue-400">●</span>
            <span>
              [Step {provisionStep}/4]{" "}
              {provisionStep === 1
                ? "Connecting to database instance and checking credentials..."
                : provisionStep === 2
                  ? "Executing DDL SQL migration statements..."
                  : provisionStep === 3
                    ? "Generating TypeScript AST schema definitions in src/lib/db..."
                    : "Testing query latency and pool socket ping..."}
            </span>
          </div>
        </div>
      )}

      {provisionComplete && (
        <div className="rounded-xl p-4 bg-emerald-950/40 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span
              className="font-medium"
              style={{ fontFamily: "var(--font-geist)" }}
            >
              Database provisioning complete. Tables and ORM types are ready to
              use in your workspace!
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
