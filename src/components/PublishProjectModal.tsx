import React, { useState } from "react"
import { XIcon, GlobeIcon } from "./icons"
import { useApp } from "../store/AppContext"
import type { ShowcaseProject } from "../lib/communityTypes"
import { db } from "../lib/firebase/config"
import { doc, setDoc } from "firebase/firestore"

interface Props {
  open: boolean
  onClose: () => void
  onPublished?: (project: ShowcaseProject) => void
}

export default function PublishProjectModal({
  open,
  onClose,
  onPublished,
}: Props) {
  const { state, addToast } = useApp()
  const currentProject =
    state.projects.find((p) => p.id === state.activeProjectId) ?? null
  const [title, setTitle] = useState(
    currentProject?.name || "My SHANGO Application",
  )
  const [description, setDescription] = useState(
    "Full-stack web application built on Cloud Run with React, Tailwind, and AI capabilities.",
  )
  const [longDescription, setLongDescription] = useState(
    "An end-to-end full-stack application featuring responsive client views, server-side Gemini API routing, and containerized deployment.",
  )
  const [tagsInput, setTagsInput] = useState(
    "React, Tailwind, Cloud Run, Gemini AI",
  )
  const [liveUrl, setLiveUrl] = useState(window.location.origin)
  const [githubUrl, setGithubUrl] = useState(
    "https://github.com/shango-org/applet-export",
  )
  const [enableEmbed, setEnableEmbed] = useState(true)
  const [isPublishing, setIsPublishing] = useState(false)

  if (!open) return null

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      addToast("Please enter a project title", "error")
      return
    }

    setIsPublishing(true)

    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
      const monogram = title.slice(0, 2).toUpperCase()
      const newProjectId = "pub-" + Date.now()

      const newProject: ShowcaseProject = {
        id: newProjectId,
        name: title.trim(),
        description: description.trim(),
        longDescription: longDescription.trim(),
        monogram: monogram || "SH",
        creatorId: "b1", // Current builder
        status: "live",
        liveUrl: liveUrl.trim(),
        tags: tags.length ? tags : ["React", "Tailwind"],
        techStack: ["TypeScript", "React 18", "Tailwind v4", "Vite", "Express"],
        skillIds: ["gemini-api", "firebase-integration"],
        connectorIds: ["cloudrun", "github"],
        version: 1,
        changelog: "Initial v1.0 release published to SHANGO Showcase.",
        forkCount: 0,
        saveCount: 1,
        viewCount: 12,
        commentCount: 0,
        featured: true,
        trending: true,
        publishedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      }

      await setDoc(doc(db, "showcase_projects", newProjectId), newProject)

      setIsPublishing(false)
      addToast(
        `🎉 "${title}" successfully published to SHANGO Showcase!`,
        "success",
      )
      if (onPublished) onPublished(newProject)
      onClose()
    } catch (err) {
      setIsPublishing(false)
      addToast("Failed to publish project", "error")
    }
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="relative rounded-2xl overflow-hidden w-full max-w-lg shadow-2xl flex flex-col"
        style={{
          background: "rgba(14,16,22,0.96)",
          backdropFilter: "blur(28px)",
          border: "1px solid rgba(255,255,255,0.12)",
          animation: "shango-modal-enter 0.22s cubic-bezier(0.16,1,0.3,1) both",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 text-sm">✦</span>
            <h2
              className="text-sm font-semibold text-white"
              style={{ fontFamily: "var(--font-geist)" }}
            >
              Publish Project to SHANGO Showcase
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-white"
          >
            <XIcon size={14} />
          </button>
        </div>

        {/* Body Form */}
        <form
          onSubmit={handlePublish}
          className="p-6 flex flex-col gap-4 text-xs"
        >
          <div>
            <label className="block text-zinc-400 mb-1 font-mono text-[10px]">
              PROJECT TITLE
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-xs outline-none text-white"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border-default)",
                fontFamily: "var(--font-geist)",
              }}
              placeholder="e.g. HealthCare Portal & Doctor Queue"
              required
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-mono text-[10px]">
              SHORT SUMMARY / TAGLINE
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-xs outline-none text-white"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border-default)",
                fontFamily: "var(--font-geist)",
              }}
              placeholder="Brief tagline for showcase cards..."
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-mono text-[10px]">
              DETAILED DESCRIPTION & ARCHITECTURE
            </label>
            <textarea
              value={longDescription}
              onChange={(e) => setLongDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-xs outline-none text-white resize-none"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border-default)",
                fontFamily: "var(--font-geist)",
              }}
              placeholder="Describe system components, database schemas, API routes..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1 font-mono text-[10px]">
                TAGS (COMMA SEPARATED)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs outline-none text-white"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border-default)",
                  fontFamily: "var(--font-geist)",
                }}
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-mono text-[10px]">
                GITHUB REPOSITORY
              </label>
              <input
                type="text"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs outline-none text-white font-mono"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border-default)",
                  fontSize: 10,
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-mono text-[10px]">
              LIVE PREVIEW EMBED URL
            </label>
            <div className="flex items-center gap-2">
              <GlobeIcon size={12} className="text-zinc-500" />
              <input
                type="text"
                value={liveUrl}
                onChange={(e) => setLiveUrl(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg text-xs outline-none text-white font-mono"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border-default)",
                  fontSize: 10,
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="enableEmbed"
              checked={enableEmbed}
              onChange={(e) => setEnableEmbed(e.target.checked)}
              className="rounded text-blue-500"
            />
            <label
              htmlFor="enableEmbed"
              className="text-xs text-zinc-300 font-sans cursor-pointer"
            >
              Enable interactive live preview embed in Showcase Hub
            </label>
          </div>

          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPublishing}
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-white text-black hover:bg-zinc-200 transition-all shadow flex items-center gap-2"
            >
              {isPublishing ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-black border-t-transparent animate-spin" />
                  Publishing...
                </>
              ) : (
                "🚀 Publish to Showcase"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
