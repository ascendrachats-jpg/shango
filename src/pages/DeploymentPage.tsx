import React, { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useApp } from "../store/AppContext"
import {
  formatDuration,
  formatTimestamp,
  getTargetById,
  type DeploymentRecord,
  type DeployTargetId,
} from "../lib/deployments"
import { ChevronLeftIcon } from "../components/icons"
import ContainerLogStream from "../components/ContainerLogStream"
import DatabaseWizard from "../components/DatabaseWizard"

type Tab = "overview" | "container-logs" | "database" | "history" | "domains" | "variables" | "performance"

export default function DeploymentPage() {
  const navigate = useNavigate()
  const { deploymentRecords, addToast } = useApp()
  const [tab, setTab] = useState<Tab>("overview")
  const [selectedRecord, setSelectedRecord] = useState<DeploymentRecord | null>(
    null,
  )
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  const liveCount = useMemo(
    () =>
      deploymentRecords.filter((r) => r.status === "live" && !r.isPreview)
        .length,
    [deploymentRecords],
  )
  const latestRecord = useMemo(
    () =>
      [...deploymentRecords].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )[0] ?? null,
    [deploymentRecords],
  )

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "container-logs", label: "Container Logs (Live)" },
    { id: "database", label: "Database Provisioning" },
    { id: "history", label: "History" },
    { id: "domains", label: "Domains" },
    { id: "variables", label: "Variables" },
    { id: "performance", label: "Performance" },
  ]

  return (
    <div
      className="min-h-screen flex flex-col shango-page-arrive"
      style={{ background: "var(--surface-0)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs py-1.5 px-2 rounded-lg"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-geist)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--surface-2)"
              e.currentTarget.style.color = "var(--text-secondary)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent"
              e.currentTarget.style.color = "var(--text-muted)"
            }}
          >
            <ChevronLeftIcon size={12} />
            Back
          </button>
          <div
            style={{ width: 1, height: 14, background: "var(--border-subtle)" }}
          />
          <div>
            <h1
              className="text-sm font-semibold"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-geist)",
                letterSpacing: "-0.01em",
              }}
            >
              Deployments
            </h1>
          </div>
        </div>

        {/* Live indicator */}
        {liveCount > 0 && (
          <div className="flex items-center gap-1.5">
            <span
              className="rounded-full"
              style={{
                width: 5,
                height: 5,
                background: "#4ade80",
                boxShadow: "0 0 5px rgba(74,222,128,0.6)",
                display: "inline-block",
                animation: "live-pulse 2.4s ease-in-out infinite",
              }}
            />
            <span
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                fontFamily: "var(--font-geist)",
              }}
            >
              {liveCount} live
            </span>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div
        className="flex items-center gap-0 px-6 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="py-3 px-3 text-xs relative"
            style={{
              color: tab === t.id ? "var(--text-primary)" : "var(--text-muted)",
              fontFamily: "var(--font-geist)",
              background: "transparent",
              transition: "color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (tab !== t.id)
                e.currentTarget.style.color = "var(--text-secondary)"
            }}
            onMouseLeave={(e) => {
              if (tab !== t.id)
                e.currentTarget.style.color = "var(--text-muted)"
            }}
          >
            {t.label}
            {tab === t.id && (
              <div
                className="absolute bottom-0 left-0 right-0 h-px"
                style={{ background: "rgba(255,255,255,0.5)" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* ── Overview ── */}
        {tab === "overview" && (
          <div
            className="px-6 py-6 max-w-3xl flex flex-col gap-6"
            style={{
              animation: "shango-fade-up 0.22s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            {deploymentRecords.length === 0 ? (
              <EmptyState onDeploy={() => navigate(-1)} />
            ) : (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-3">
                  <MetricCard label="Live Projects" value={String(liveCount)} />
                  <MetricCard
                    label="Deployment Records"
                    value={String(deploymentRecords.length)}
                  />
                  <MetricCard
                    label="Last Deploy"
                    value={
                      latestRecord
                        ? formatTimestamp(latestRecord.timestamp)
                        : "—"
                    }
                  />
                </div>

                {/* Latest deployment */}
                {latestRecord && (
                  <div>
                    <p
                      style={{
                        fontSize: 9,
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-mono-jetbrains)",
                        letterSpacing: "0.1em",
                        marginBottom: 10,
                      }}
                    >
                      LATEST
                    </p>
                    <DeployCard
                      record={latestRecord}
                      onExpand={() => setSelectedRecord(latestRecord)}
                    />
                  </div>
                )}

                {/* All projects */}
                {deploymentRecords.length > 1 && (
                  <div>
                    <p
                      style={{
                        fontSize: 9,
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-mono-jetbrains)",
                        letterSpacing: "0.1em",
                        marginBottom: 10,
                      }}
                    >
                      ALL DEPLOYMENTS
                    </p>
                    <div className="flex flex-col gap-2">
                      {[...deploymentRecords]
                        .sort(
                          (a, b) =>
                            new Date(b.timestamp).getTime() -
                            new Date(a.timestamp).getTime(),
                        )
                        .map((r) => (
                          <DeployCard
                            key={r.id}
                            record={r}
                            onExpand={() => setSelectedRecord(r)}
                          />
                        ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── History ── */}
        {tab === "history" && (
          <div
            className="px-6 py-6 max-w-3xl"
            style={{
              animation: "shango-fade-up 0.22s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            {deploymentRecords.length === 0 ? (
              <EmptyState onDeploy={() => navigate(-1)} />
            ) : (
              <div className="flex flex-col gap-0 relative">
                <div
                  className="absolute left-[9px] top-3 bottom-3 w-px"
                  style={{ background: "var(--border-subtle)" }}
                />
                {[...deploymentRecords]
                  .sort(
                    (a, b) =>
                      new Date(b.timestamp).getTime() -
                      new Date(a.timestamp).getTime(),
                  )
                  .map((r, i) => (
                    <HistoryItem
                      key={r.id}
                      record={r}
                      isFirst={i === 0}
                      logsExpanded={expandedLog === r.id}
                      onToggleLogs={() =>
                        setExpandedLog(expandedLog === r.id ? null : r.id)
                      }
                    />
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ── Domains ── */}
        {tab === "domains" && (
          <div
            className="px-6 py-6 max-w-3xl flex flex-col gap-5"
            style={{
              animation: "shango-fade-up 0.22s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            {deploymentRecords.length === 0 ? (
              <EmptyState onDeploy={() => navigate(-1)} />
            ) : (
              deploymentRecords.map((r) => (
                <div key={r.id}>
                  <p
                    className="text-xs font-medium mb-3"
                    style={{
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-geist)",
                    }}
                  >
                    {r.projectName}
                  </p>
                  {r.domains.map((d) => (
                    <DomainRow key={d.domain} domain={d} />
                  ))}
                </div>
              ))
            )}
            {/* Add domain CTA */}
            <button
              className="w-full py-3 rounded-xl text-xs border-dashed"
              style={{
                border: "1px dashed var(--border-default)",
                color: "var(--text-muted)",
                fontFamily: "var(--font-geist)",
                background: "transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text-secondary)"
                e.currentTarget.style.borderColor = "var(--border-strong)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-muted)"
                e.currentTarget.style.borderColor = "var(--border-default)"
              }}
            >
              + Add custom domain
            </button>
          </div>
        )}

        {/* ── Variables ── */}
        {tab === "variables" && (
          <div
            className="px-6 py-6 max-w-3xl flex flex-col gap-6"
            style={{
              animation: "shango-fade-up 0.22s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            {deploymentRecords.length === 0 ? (
              <EmptyState onDeploy={() => navigate(-1)} />
            ) : (
              deploymentRecords.map((r) => (
                <div key={r.id}>
                  <p
                    className="text-xs font-medium mb-3"
                    style={{
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-geist)",
                    }}
                  >
                    {r.projectName}
                  </p>
                  <div
                    className="rounded-xl overflow-hidden"
                    style={{ border: "1px solid var(--border-default)" }}
                  >
                    {r.envVars.length === 0 ? (
                      <div
                        className="px-4 py-3 text-xs"
                        style={{
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-geist)",
                        }}
                      >
                        No variables set
                      </div>
                    ) : (
                      r.envVars.map((ev, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 px-4 py-3"
                          style={{
                            borderTop:
                              i > 0 ? "1px solid var(--border-subtle)" : "none",
                            background: "var(--surface-1)",
                          }}
                        >
                          <span
                            className="flex-shrink-0"
                            style={{
                              fontSize: 10,
                              color: "var(--text-secondary)",
                              fontFamily: "var(--font-mono-jetbrains)",
                              minWidth: 160,
                            }}
                          >
                            {ev.key}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              color: ev.secret
                                ? "var(--text-muted)"
                                : "var(--text-muted)",
                              fontFamily: "var(--font-mono-jetbrains)",
                              flex: 1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {ev.secret ? "••••••••••••" : ev.value}
                          </span>
                          {ev.secret && (
                            <span
                              style={{
                                fontSize: 9,
                                color: "var(--text-disabled)",
                                fontFamily: "var(--font-mono-jetbrains)",
                                background: "var(--surface-3)",
                                padding: "1px 5px",
                                borderRadius: 3,
                                letterSpacing: "0.06em",
                              }}
                            >
                              SECRET
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Container Logs ── */}
        {tab === "container-logs" && (
          <div className="px-6 py-6 max-w-4xl">
            <ContainerLogStream />
          </div>
        )}

        {/* ── Database Provisioning Wizard ── */}
        {tab === "database" && (
          <div className="px-6 py-6 max-w-4xl">
            <DatabaseWizard onApplied={(msg) => addToast(msg, "success")} />
          </div>
        )}

        {/* ── Performance ── */}
        {tab === "performance" && (
          <div
            className="px-6 py-6 max-w-3xl flex flex-col gap-6"
            style={{
              animation: "shango-fade-up 0.22s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            {deploymentRecords.length === 0 ? (
              <EmptyState onDeploy={() => navigate(-1)} />
            ) : (
              deploymentRecords
                .filter((r) => r.performance)
                .map((r) => (
                  <div key={r.id}>
                    <div className="flex items-center justify-between mb-4">
                      <p
                        className="text-xs font-medium"
                        style={{
                          color: "var(--text-secondary)",
                          fontFamily: "var(--font-geist)",
                        }}
                      >
                        {r.projectName}
                      </p>
                      <TargetBadge targetId={r.target} />
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <PerfCard
                        label="Availability"
                        value={`${r.performance!.availability}%`}
                        sub="30d average"
                        good
                      />
                      <PerfCard
                        label="Response Time"
                        value={`${r.performance!.responseTime}ms`}
                        sub="p95 latency"
                        good={r.performance!.responseTime < 200}
                      />
                      <PerfCard
                        label="Requests / 24h"
                        value={String(
                          r.performance!.requests24h.toLocaleString(),
                        )}
                        sub="total hits"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <PerfCard
                        label="Build Size"
                        value={r.performance!.buildSize}
                        sub="compressed"
                      />
                      <ScoreCard
                        label="Bundle Score"
                        score={r.performance!.bundleScore}
                      />
                      <ScoreCard
                        label="Lighthouse"
                        score={r.performance!.lighthouseScore}
                      />
                    </div>
                  </div>
                ))
            )}
          </div>
        )}
      </div>

      {/* ── Record Detail Side Sheet ── */}
      {selectedRecord && (
        <RecordSheet
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </div>
  )
}

// ── Deploy Card ───────────────────────────────────────────────────────────────

function DeployCard({
  record,
  onExpand,
}: {
  record: DeploymentRecord
  onExpand: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const target = getTargetById(record.target)

  return (
    <div
      className="rounded-xl p-4 cursor-pointer"
      style={{
        background: hovered ? "var(--surface-2)" : "var(--surface-1)",
        border: `1px solid ${
          hovered ? "var(--border-default)" : "var(--border-subtle)"
        }`,
        transition: "all 0.15s ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onExpand}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Monogram */}
          <div
            className="flex items-center justify-center rounded-lg flex-shrink-0"
            style={{
              width: 28,
              height: 28,
              background: "var(--surface-3)",
              border: "1px solid var(--border-default)",
            }}
          >
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "var(--text-secondary)",
                fontFamily: "var(--font-mono-jetbrains)",
              }}
            >
              {target?.monogram ?? "??"}
            </span>
          </div>
          <div>
            <p
              className="text-xs font-medium"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-geist)",
              }}
            >
              {record.projectName}
            </p>
            <p
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                fontFamily: "var(--font-geist)",
                marginTop: 2,
              }}
            >
              {target?.name} · {formatTimestamp(record.timestamp)}
            </p>
          </div>
        </div>
        <StatusChip status={record.status} isPreview={record.isPreview} />
      </div>

      <div className="flex items-center gap-4">
        <span
          style={{
            fontSize: 10,
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono-jetbrains)",
          }}
        >
          {record.shortUrl}
        </span>
        <span
          style={{
            fontSize: 10,
            color: "var(--text-disabled)",
            fontFamily: "var(--font-geist)",
          }}
        >
          {formatDuration(record.duration)} build · v{record.version}
        </span>
      </div>
    </div>
  )
}

// ── History Item ──────────────────────────────────────────────────────────────

function HistoryItem({
  record,
  isFirst,
  logsExpanded,
  onToggleLogs,
}: {
  record: DeploymentRecord
  isFirst: boolean
  logsExpanded: boolean
  onToggleLogs: () => void
}) {
  const target = getTargetById(record.target)

  return (
    <div className="flex gap-4 pb-6">
      {/* Timeline dot */}
      <div
        className="flex-shrink-0 flex flex-col items-center"
        style={{ width: 20 }}
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 20,
            height: 20,
            background:
              record.status === "live" && !record.isPreview
                ? "rgba(74,222,128,0.1)"
                : "var(--surface-2)",
            border: `1px solid ${
              record.status === "live" && !record.isPreview
                ? "rgba(74,222,128,0.3)"
                : "var(--border-default)"
            }`,
            position: "relative",
            zIndex: 1,
            flexShrink: 0,
          }}
        >
          {record.status === "live" && !record.isPreview ? (
            <div
              className="rounded-full"
              style={{ width: 6, height: 6, background: "#4ade80" }}
            />
          ) : (
            <div
              className="rounded-full"
              style={{
                width: 5,
                height: 5,
                background: "var(--text-disabled)",
              }}
            />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-0">
        <div className="flex items-start justify-between mb-2 pt-0.5">
          <div>
            <p
              className="text-xs font-medium"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-geist)",
              }}
            >
              {record.projectName}
              {isFirst && (
                <span
                  className="ml-2 text-xs"
                  style={{ color: "var(--text-disabled)", fontWeight: 400 }}
                >
                  — latest
                </span>
              )}
            </p>
            <p
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                fontFamily: "var(--font-geist)",
                marginTop: 2,
              }}
            >
              {target?.name} · {formatTimestamp(record.timestamp)} ·{" "}
              {formatDuration(record.duration)}
            </p>
          </div>
          <StatusChip status={record.status} isPreview={record.isPreview} />
        </div>

        {/* URL */}
        <p
          style={{
            fontSize: 10,
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono-jetbrains)",
            marginBottom: 10,
          }}
        >
          {record.shortUrl}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <ActionButton disabled>No live URL</ActionButton>
          <ActionButton onClick={onToggleLogs}>
            {logsExpanded ? "Hide logs" : "View logs"}
          </ActionButton>
          <ActionButton disabled>Rollback unavailable</ActionButton>
          <ActionButton disabled>Redeploy unavailable</ActionButton>
        </div>

        {/* Build logs */}
        {logsExpanded && (
          <div
            className="mt-3 rounded-lg p-3 overflow-y-auto"
            style={{
              background: "var(--surface-0)",
              border: "1px solid var(--border-subtle)",
              maxHeight: 200,
            }}
          >
            {record.buildLogs.map((line, i) => (
              <p
                key={i}
                style={{
                  fontSize: 10,
                  color:
                    line.includes("✓") || line.includes("done")
                      ? "rgba(74,222,128,0.75)"
                      : line.includes("[warn]")
                        ? "#f59e0b"
                        : "var(--text-muted)",
                  fontFamily: "var(--font-mono-jetbrains)",
                  lineHeight: 1.7,
                }}
              >
                {line}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Domain Row ────────────────────────────────────────────────────────────────

function DomainRow({
  domain,
}: {
  domain: { domain: string; status: string; sslStatus: string; isPrimary: boolean }
}) {
  const [hovered, setHovered] = useState(false)
  const isActive = domain.status === "active"
  const sslActive = domain.sslStatus === "active"

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl mb-2"
      style={{
        background: hovered ? "var(--surface-2)" : "var(--surface-1)",
        border: "1px solid var(--border-subtle)",
        transition: "all 0.15s ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="rounded-full flex-shrink-0"
        style={{
          width: 6,
          height: 6,
          background: isActive ? "#4ade80" : "#ef4444",
          animation: isActive ? "live-pulse 2.4s ease-in-out infinite" : "none",
        }}
      />
      <span
        className="flex-1 text-xs"
        style={{
          color: "var(--text-primary)",
          fontFamily: "var(--font-mono-jetbrains)",
        }}
      >
        {domain.domain}
      </span>
      {domain.isPrimary && (
        <span
          style={{
            fontSize: 9,
            color: "var(--text-disabled)",
            fontFamily: "var(--font-mono-jetbrains)",
            background: "var(--surface-3)",
            padding: "1px 5px",
            borderRadius: 3,
            letterSpacing: "0.06em",
          }}
        >
          PRIMARY
        </span>
      )}
      <div className="flex items-center gap-1">
        <svg width={10} height={10} viewBox="0 0 10 10" fill="none">
          <rect
            x="1"
            y="3"
            width="8"
            height="6"
            rx="1.2"
            stroke={sslActive ? "rgba(74,222,128,0.6)" : "var(--text-disabled)"}
            strokeWidth="1"
          />
          <path
            d="M3 3V2.4a2 2 0 014 0V3"
            stroke={sslActive ? "rgba(74,222,128,0.6)" : "var(--text-disabled)"}
            strokeWidth="1"
            strokeLinecap="round"
          />
        </svg>
        <span
          style={{
            fontSize: 9,
            color: sslActive ? "rgba(74,222,128,0.7)" : "var(--text-disabled)",
            fontFamily: "var(--font-mono-jetbrains)",
          }}
        >
          SSL
        </span>
      </div>
    </div>
  )
}

// ── Record Detail Sheet ───────────────────────────────────────────────────────

function RecordSheet({
  record,
  onClose,
}: {
  record: DeploymentRecord
  onClose: () => void
}) {
  const target = getTargetById(record.target)

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.4)" }}
        onClick={onClose}
      />
      <div
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col overflow-hidden"
        style={{
          width: 420,
          background: "rgba(12,12,12,0.97)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          animation: "slideInFromRight 0.24s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Sheet header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-lg"
              style={{
                width: 32,
                height: 32,
                background: "var(--surface-3)",
                border: "1px solid var(--border-default)",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-mono-jetbrains)",
                }}
              >
                {target?.monogram}
              </span>
            </div>
            <div>
              <p
                className="text-sm font-medium"
                style={{
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-geist)",
                }}
              >
                {record.projectName}
              </p>
              <p
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-geist)",
                  marginTop: 1,
                }}
              >
                {target?.name} · v{record.version}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--surface-3)"
              e.currentTarget.style.color = "var(--text-secondary)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent"
              e.currentTarget.style.color = "var(--text-muted)"
            }}
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
          {/* Status + URL */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <StatusChip status={record.status} isPreview={record.isPreview} />
              <span
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-geist)",
                }}
              >
                {formatTimestamp(record.timestamp)} ·{" "}
                {formatDuration(record.duration)}
              </span>
            </div>
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border-default)",
              }}
            >
              {record.status === "live" && !record.isPreview && (
                <div
                  className="rounded-full"
                  style={{
                    width: 5,
                    height: 5,
                    background: "#4ade80",
                    animation: "live-pulse 2.4s ease-in-out infinite",
                    flexShrink: 0,
                  }}
                />
              )}
              <span
                className="flex-1 text-xs truncate"
                style={{
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-mono-jetbrains)",
                  fontSize: 11,
                }}
              >
                {record.shortUrl}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: "var(--text-disabled)",
                  fontFamily: "var(--font-geist)",
                }}
              >
                No live URL
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-3 gap-2">
            {["Pause", "Rollback", "Redeploy"].map((a) => (
              <button
                key={a}
                disabled
                className="py-2 rounded-lg text-xs"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-geist)",
                  cursor: "not-allowed",
                  opacity: 0.65,
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--surface-2)"
                  e.currentTarget.style.color = "var(--text-muted)"
                }}
              >
                {`${a} unavailable`}
              </button>
            ))}
          </div>

          {/* Performance */}
          {record.performance && (
            <Section title="PERFORMANCE">
              <div className="grid grid-cols-2 gap-2">
                <MiniMetric
                  label="Availability"
                  value={`${record.performance.availability}%`}
                />
                <MiniMetric
                  label="Response"
                  value={`${record.performance.responseTime}ms`}
                />
                <MiniMetric
                  label="Bundle"
                  value={record.performance.buildSize}
                />
                <MiniMetric
                  label="Lighthouse"
                  value={`${record.performance.lighthouseScore}/100`}
                />
              </div>
            </Section>
          )}

          {/* Domains */}
          {record.domains.length > 0 && (
            <Section title="DOMAINS">
              {record.domains.map((d) => (
                <div key={d.domain} className="flex items-center gap-2 py-1.5">
                  <div
                    className="rounded-full"
                    style={{
                      width: 5,
                      height: 5,
                      background: d.status === "active" ? "#4ade80" : "#ef4444",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: 11,
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-mono-jetbrains)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {d.domain}
                  </span>
                  {d.isPrimary && (
                    <span
                      style={{
                        fontSize: 9,
                        color: "var(--text-disabled)",
                        fontFamily: "var(--font-mono-jetbrains)",
                      }}
                    >
                      PRIMARY
                    </span>
                  )}
                </div>
              ))}
            </Section>
          )}

          {/* Build logs */}
          <Section title="BUILD LOG">
            <div
              className="rounded-lg p-3 overflow-y-auto"
              style={{
                background: "var(--surface-0)",
                border: "1px solid var(--border-subtle)",
                maxHeight: 200,
              }}
            >
              {record.buildLogs.map((line, i) => (
                <p
                  key={i}
                  style={{
                    fontSize: 10,
                    color:
                      line.includes("✓") || line.includes("done")
                        ? "rgba(74,222,128,0.75)"
                        : line.includes("[warn]")
                          ? "#f59e0b"
                          : "var(--text-muted)",
                    fontFamily: "var(--font-mono-jetbrains)",
                    lineHeight: 1.7,
                  }}
                >
                  {line}
                </p>
              ))}
            </div>
          </Section>

          {/* Danger zone */}
          <div
            className="rounded-xl p-4"
            style={{
              background: "rgba(239,68,68,0.03)",
              border: "1px solid rgba(239,68,68,0.1)",
            }}
          >
            <p
              style={{
                fontSize: 9,
                color: "rgba(239,68,68,0.5)",
                fontFamily: "var(--font-mono-jetbrains)",
                letterSpacing: "0.08em",
                marginBottom: 8,
              }}
            >
              DANGER ZONE
            </p>
            <div className="flex gap-2">
              {["Archive", "Delete"].map((a) => (
                <button
                  key={a}
                  className="flex-1 py-2 rounded-lg text-xs"
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(239,68,68,0.15)",
                    color: "rgba(239,68,68,0.5)",
                    fontFamily: "var(--font-geist)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(239,68,68,0.05)"
                    e.currentTarget.style.color = "#ef4444"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent"
                    e.currentTarget.style.color = "rgba(239,68,68,0.5)"
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p
        style={{
          fontSize: 9,
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono-jetbrains)",
          letterSpacing: "0.1em",
          marginBottom: 8,
        }}
      >
        {title}
      </p>
      {children}
    </div>
  )
}

function StatusChip({
  status,
  isPreview = false,
}: {
  status: string
  isPreview?: boolean
}) {
  const isLive = status === "live" && !isPreview
  const isFailed = status === "failed"
  const label = isPreview ? "PREVIEW" : status.toUpperCase()
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-md"
      style={{
        background: isLive
          ? "rgba(74,222,128,0.08)"
          : isFailed
            ? "rgba(239,68,68,0.08)"
            : "var(--surface-3)",
        border: `1px solid ${
          isLive
            ? "rgba(74,222,128,0.2)"
            : isFailed
              ? "rgba(239,68,68,0.2)"
              : "var(--border-default)"
        }`,
      }}
    >
      <div
        className="rounded-full flex-shrink-0"
        style={{
          width: 5,
          height: 5,
          background: isLive
            ? "#4ade80"
            : isFailed
              ? "#ef4444"
              : "var(--text-disabled)",
          animation: isLive ? "live-pulse 2.4s ease-in-out infinite" : "none",
        }}
      />
      <span
        style={{
          fontSize: 9,
          color: isLive
            ? "rgba(74,222,128,0.8)"
            : isFailed
              ? "rgba(239,68,68,0.7)"
              : "var(--text-muted)",
          fontFamily: "var(--font-mono-jetbrains)",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </span>
    </div>
  )
}

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <p
        style={{
          fontSize: 9,
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono-jetbrains)",
          letterSpacing: "0.08em",
          marginBottom: 6,
        }}
      >
        {label.toUpperCase()}
      </p>
      <p
        className="text-xl font-semibold"
        style={{
          color: "var(--text-primary)",
          fontFamily: "var(--font-geist)",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </p>
      {sub && (
        <p
          style={{
            fontSize: 10,
            color: "var(--text-disabled)",
            fontFamily: "var(--font-geist)",
            marginTop: 3,
          }}
        >
          {sub}
        </p>
      )}
    </div>
  )
}

function PerfCard({
  label,
  value,
  sub,
  good,
}: {
  label: string
  value: string
  sub?: string
  good?: boolean
}) {
  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <p
        style={{
          fontSize: 9,
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono-jetbrains)",
          letterSpacing: "0.08em",
          marginBottom: 4,
        }}
      >
        {label.toUpperCase()}
      </p>
      <p
        className="text-base font-semibold"
        style={{
          color:
            good === undefined
              ? "var(--text-primary)"
              : good
                ? "#4ade80"
                : "#f59e0b",
          fontFamily: "var(--font-geist)",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </p>
      {sub && (
        <p
          style={{
            fontSize: 9,
            color: "var(--text-disabled)",
            fontFamily: "var(--font-geist)",
            marginTop: 2,
          }}
        >
          {sub}
        </p>
      )}
    </div>
  )
}

function ScoreCard({ label, score }: { label: string; score: number }) {
  const color = score >= 90 ? "#4ade80" : score >= 75 ? "#f59e0b" : "#ef4444"
  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <p
        style={{
          fontSize: 9,
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono-jetbrains)",
          letterSpacing: "0.08em",
          marginBottom: 4,
        }}
      >
        {label.toUpperCase()}
      </p>
      <p
        className="text-base font-semibold"
        style={{
          color,
          fontFamily: "var(--font-geist)",
          letterSpacing: "-0.02em",
        }}
      >
        {score}
      </p>
      <div
        className="mt-2 rounded-full overflow-hidden"
        style={{ height: 3, background: "var(--surface-3)" }}
      >
        <div
          style={{
            width: `${score}%`,
            height: "100%",
            background: color,
            borderRadius: 99,
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-lg px-3 py-2.5"
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <p
        style={{
          fontSize: 9,
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono-jetbrains)",
          marginBottom: 2,
        }}
      >
        {label}
      </p>
      <p
        className="text-xs font-medium"
        style={{
          color: "var(--text-primary)",
          fontFamily: "var(--font-geist)",
        }}
      >
        {value}
      </p>
    </div>
  )
}

function ActionButton({
  children,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs"
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border-default)",
        color: "var(--text-muted)",
        fontFamily: "var(--font-geist)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.65 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = "var(--surface-3)"
          e.currentTarget.style.color = "var(--text-secondary)"
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--surface-2)"
        e.currentTarget.style.color = "var(--text-muted)"
      }}
    >
      {children}
    </button>
  )
}

function TargetBadge({
  targetId,
}: {
  targetId: DeployTargetId | string | undefined
}) {
  const t = getTargetById(targetId)
  if (!t) return null
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="flex items-center justify-center rounded"
        style={{
          width: 18,
          height: 18,
          background: "var(--surface-3)",
          border: "1px solid var(--border-default)",
        }}
      >
        <span
          style={{
            fontSize: 7,
            fontWeight: 700,
            color: "var(--text-secondary)",
            fontFamily: "var(--font-mono-jetbrains)",
          }}
        >
          {t.monogram}
        </span>
      </div>
      <span
        style={{
          fontSize: 10,
          color: "var(--text-muted)",
          fontFamily: "var(--font-geist)",
        }}
      >
        {t.name}
      </span>
    </div>
  )
}

function EmptyState({ onDeploy }: { onDeploy: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5">
      {/* Rocket illustration */}
      <div style={{ position: "relative", width: 80, height: 80 }}>
        <svg width={80} height={80} viewBox="0 0 80 80" fill="none">
          {/* Launch pad */}
          <ellipse
            cx="40"
            cy="68"
            rx="22"
            ry="4"
            fill="rgba(255,255,255,0.04)"
          />
          {/* Exhaust trails */}
          <path
            d="M30 60 Q28 70 25 76"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M40 64 Q40 72 40 78"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M50 60 Q52 70 55 76"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Fins */}
          <path d="M32 52 L24 64 L34 58 Z" fill="rgba(255,255,255,0.1)" />
          <path d="M48 52 L56 64 L46 58 Z" fill="rgba(255,255,255,0.1)" />
          {/* Body */}
          <rect
            x="32"
            y="30"
            width="16"
            height="30"
            rx="4"
            fill="rgba(255,255,255,0.12)"
          />
          {/* Window */}
          <circle
            cx="40"
            cy="40"
            r="5"
            fill="rgba(255,255,255,0.06)"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1"
          />
          {/* Nose cone */}
          <path d="M32 30 Q40 8 48 30 Z" fill="rgba(255,255,255,0.16)" />
          {/* Stars */}
          <circle cx="14" cy="18" r="1" fill="rgba(255,255,255,0.25)" />
          <circle cx="66" cy="12" r="1.2" fill="rgba(255,255,255,0.2)" />
          <circle cx="72" cy="30" r="0.8" fill="rgba(255,255,255,0.15)" />
          <circle cx="8" cy="36" r="0.8" fill="rgba(255,255,255,0.15)" />
        </svg>
      </div>
      <div className="flex flex-col items-center gap-1.5 text-center">
        <p
          className="text-sm font-medium"
          style={{
            color: "var(--text-secondary)",
            fontFamily: "var(--font-geist)",
            letterSpacing: "-0.01em",
          }}
        >
          Nothing deployed yet
        </p>
        <p
          className="text-xs"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-geist)",
            lineHeight: 1.6,
            maxWidth: 240,
          }}
        >
          Record a deployment preview to preserve handoff details here. Live
          status and performance appear only after a verified provider release.
        </p>
      </div>
      <button
        onClick={onDeploy}
        className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium mt-1"
        style={{
          background: "rgba(255,255,255,0.92)",
          color: "#080808",
          fontFamily: "var(--font-geist)",
          fontWeight: 500,
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.background = "white"
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.background =
            "rgba(255,255,255,0.92)"
        }}
      >
        Deploy a project →
      </button>
    </div>
  )
}
