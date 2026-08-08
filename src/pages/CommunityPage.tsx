import { useState, useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  ChevronLeftIcon,
  SearchIcon,
  AwardIcon,
  BookOpenIcon,
  GlobeIcon,
  ForkIcon,
} from "../components/icons"
import BuilderProfileSheet from "../components/BuilderProfileSheet"
import ProjectShowcaseSheet from "../components/ProjectShowcaseSheet"
import PublishProjectModal from "../components/PublishProjectModal"
import { useApp } from "../store/AppContext"
import { formatRelativeTime } from "../lib/communityTypes"
import type {
  Builder,
  ShowcaseProject,
  KnowledgeType,
  Knowledge,
  Challenge,
  Team,
  CommunityFeedItem,
} from "../lib/communityTypes"
import { useCommunityData } from "../lib/communityHooks"
import {
  getPublishedProjects,
  getPublishedProjectById,
  remixPublishedProject,
  getBuilderProfile,
  getBuilderPortfolio,
  updateBuilderProfile,
  type PublishedProject,
  type BuilderProfile,
} from "../lib/community"
import { ensureProjectInList } from "../lib/store"

type MainTab = "home" | "explore" | "projects" | "builders" | "knowledge" | "teams" | "events"
type ExploreFilter = "all" | "projects" | "builders" | "skills" | "templates"
type ProjectFilter = "all" | "featured" | "trending" | "new"
type KnowledgeFilter = "all" | KnowledgeType

export default function CommunityPage() {
  const navigate = useNavigate()
  const { id, username } = useParams<{ id?: string; username?: string }>()
  const { addToast, setProjects, setActiveProject } = useApp()
  const {
    builders: ALL_BUILDERS,
    projects: ALL_SHOWCASE_PROJECTS,
    teams: ALL_TEAMS,
    knowledge: ALL_KNOWLEDGE,
    challenges: ALL_CHALLENGES,
    feed: COMMUNITY_FEED,
    loading: _loading,
  } = useCommunityData()

  const [tab, setTab] = useState<MainTab>("home")
  const [query, setQuery] = useState("")
  const [exploreFilter, setExploreFilter] = useState<ExploreFilter>("all")
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>("all")
  const [knowledgeFilter, setKnowledgeFilter] = useState<KnowledgeFilter>("all")
  const [selectedBuilder, setSelectedBuilder] = useState<Builder | null>(null)
  const [selectedProject, setSelectedProject] =
    useState<ShowcaseProject | null>(null)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [showEditProfileModal, setShowEditProfileModal] = useState(false)

  const publishedList = useMemo(() => getPublishedProjects(), [])
  const detailProject = useMemo(() => {
    if (!id) return null
    return getPublishedProjectById(id)
  }, [id])

  const activeBuilderProfile = useMemo(() => {
    if (!username) return null
    return getBuilderProfile(username)
  }, [username])

  const activeBuilderPortfolio = useMemo(() => {
    if (!username) return []
    return getBuilderPortfolio(username)
  }, [username])

  const handleRemixPublished = (publishedId: string) => {
    try {
      const remixed = remixPublishedProject(publishedId)
      setProjects((prev) => ensureProjectInList(prev, remixed))
      setActiveProject(remixed.id)
      addToast("Project remixed — starting in Builder", "success")
      navigate(`/project/${remixed.id}`)
    } catch {
      addToast("Failed to remix project", "error")
    }
  }

  const stats = useMemo(
    () => ({
      builders: ALL_BUILDERS.length,
      projects: ALL_SHOWCASE_PROJECTS.length,
      liveProjects: ALL_SHOWCASE_PROJECTS.filter((p) => p.status === "live")
        .length,
      teams: ALL_TEAMS.length,
    }),
    [ALL_BUILDERS.length, ALL_SHOWCASE_PROJECTS, ALL_TEAMS.length],
  )

  const filteredProjects = useMemo(() => {
    let list = ALL_SHOWCASE_PROJECTS
    if (projectFilter === "featured") list = list.filter((p) => p.featured)
    else if (projectFilter === "trending") list = list.filter((p) => p.trending)
    else if (projectFilter === "new")
      list = [...list].sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      )
    if (query)
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.tags.some((t) => t.toLowerCase().includes(query.toLowerCase())),
      )
    return list
  }, [projectFilter, query])

  const filteredBuilders = useMemo(() => {
    let list = ALL_BUILDERS
    if (query)
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(query.toLowerCase()) ||
          b.bio.toLowerCase().includes(query.toLowerCase()),
      )
    return list
  }, [query])

  const filteredKnowledge = useMemo(() => {
    let list = ALL_KNOWLEDGE
    if (knowledgeFilter !== "all")
      list = list.filter((k) => k.type === knowledgeFilter)
    if (query)
      list = list.filter(
        (k) =>
          k.title.toLowerCase().includes(query.toLowerCase()) ||
          k.tags.some((t) => t.toLowerCase().includes(query.toLowerCase())),
      )
    return list
  }, [knowledgeFilter, query])

  const searchResults = useMemo(() => {
    if (!query) return null
    return {
      projects: ALL_SHOWCASE_PROJECTS.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase()),
      ),
      builders: ALL_BUILDERS.filter((b) =>
        b.name.toLowerCase().includes(query.toLowerCase()),
      ),
      knowledge: ALL_KNOWLEDGE.filter((k) =>
        k.title.toLowerCase().includes(query.toLowerCase()),
      ),
      teams: ALL_TEAMS.filter((t) =>
        t.name.toLowerCase().includes(query.toLowerCase()),
      ),
    }
  }, [query, ALL_SHOWCASE_PROJECTS, ALL_BUILDERS, ALL_KNOWLEDGE, ALL_TEAMS])

  const TABS: { id: MainTab; label: string }[] = [
    { id: "home", label: "Home" },
    { id: "explore", label: "Explore" },
    { id: "projects", label: "Projects" },
    { id: "builders", label: "Builders" },
    { id: "knowledge", label: "Knowledge" },
    { id: "teams", label: "Teams" },
    { id: "events", label: "Events" },
  ]

  return (
    <div
      className="min-h-screen flex flex-col shango-page-arrive"
      style={{ background: "var(--surface-0)" }}
    >
      {/* ── Page Header ── */}
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
              className="text-sm font-semibold flex items-center gap-2"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-geist)",
                letterSpacing: "-0.01em",
              }}
            >
              <span style={{ color: "var(--color-terracotta)" }}>✦</span> Shango
              Showcase & Community
            </h1>
            <p
              className="text-[10px] mt-0.5"
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-geist)",
              }}
            >
              Empowering global products built for Africa & beyond
            </p>
          </div>
        </div>

        {/* Community stats strip & Publish Button */}
        <div className="flex items-center gap-4">
          <StatChip value={stats.builders} label="global builders" />
          <StatChip value={stats.projects} label="showcase projects" />
          <StatChip value={stats.teams} label="active teams" />

          <button
            onClick={() => setShowPublishModal(true)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-zinc-200 transition-all shadow flex items-center gap-1.5"
            style={{
              fontFamily: "var(--font-geist)",
              background: "var(--color-savannah-gold)",
              color: "#1a1a1a",
            }}
          >
            🚀 Publish Build to Showcase
          </button>
        </div>
      </div>

      <div
        className="px-6 py-2.5 flex-shrink-0"
        style={{
          background: "rgba(255,255,255,0.025)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <p
          className="text-xs"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-geist)",
            lineHeight: 1.55,
          }}
        >
          Community preview: this local catalog is illustrative and does not
          represent live builders, activity, projects, or events. Publishing and
          moderation arrive with the verified community service.
        </p>
      </div>

      {/* ── Tab bar + Search ── */}
      <div
        className="flex items-center justify-between px-6 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="py-3 px-3 text-xs relative"
              style={{
                color:
                  tab === t.id ? "var(--text-primary)" : "var(--text-muted)",
                fontFamily: "var(--font-geist)",
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

        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border-default)",
            width: 220,
          }}
        >
          <SearchIcon
            size={11}
            style={{ color: "var(--text-muted)", flexShrink: 0 }}
          />
          <input
            placeholder="Search builders, projects…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-xs outline-none bg-transparent"
            style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-geist)",
            }}
          />
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        {username && activeBuilderProfile ? (
          <BuilderPortfolioView
            profile={activeBuilderProfile}
            portfolio={activeBuilderPortfolio}
            onRemix={handleRemixPublished}
            onOpenProject={(pid) => navigate(`/community/${pid}`)}
            onEditProfile={() => setShowEditProfileModal(true)}
          />
        ) : (
          <>
        {/* Search overlay results */}
        {query && searchResults && (tab === "explore" || tab === "home") && (
          <div className="px-6 py-4 max-w-5xl">
            <p
              style={{
                fontSize: 9,
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono-jetbrains)",
                letterSpacing: "0.1em",
                marginBottom: 12,
              }}
            >
              RESULTS FOR "{query.toUpperCase()}"
            </p>
            {searchResults.builders.length > 0 && (
              <div className="mb-6">
                <p
                  style={{
                    fontSize: 9,
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono-jetbrains)",
                    letterSpacing: "0.08em",
                    marginBottom: 8,
                  }}
                >
                  BUILDERS
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {searchResults.builders.map((b) => (
                    <BuilderCard
                      key={b.id}
                      builder={b}
                      onClick={() => setSelectedBuilder(b)}
                    />
                  ))}
                </div>
              </div>
            )}
            {searchResults.projects.length > 0 && (
              <div>
                <p
                  style={{
                    fontSize: 9,
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono-jetbrains)",
                    letterSpacing: "0.08em",
                    marginBottom: 8,
                  }}
                >
                  PROJECTS
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {searchResults.projects.map((p) => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      onClick={() => setSelectedProject(p)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ HOME ═══ */}
        {tab === "home" && !query && (
          <div
            className="px-6 py-6"
            style={{
              maxWidth: 1100,
              animation: "shango-fade-up 0.22s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            {/* Magazine layout — asymmetric two-column */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 320px",
                gap: 32,
                alignItems: "start",
              }}
            >
              {/* ── Left column ── */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: 28 }}
              >
                {/* Featured hero project */}
                <div>
                  <SectionHeader
                    title="FEATURED"
                    action={{
                      label: "See all",
                      onClick: () => setTab("projects"),
                    }}
                  />
                  {ALL_SHOWCASE_PROJECTS.filter((p) => p.featured)
                    .slice(0, 1)
                    .map((p) => (
                      <FeaturedHeroCard
                        key={p.id}
                        project={p}
                        onClick={() => setSelectedProject(p)}
                      />
                    ))}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                      marginTop: 10,
                    }}
                  >
                    {ALL_SHOWCASE_PROJECTS.filter((p) => p.featured)
                      .slice(1, 3)
                      .map((p) => (
                        <ProjectCard
                          key={p.id}
                          project={p}
                          onClick={() => setSelectedProject(p)}
                        />
                      ))}
                  </div>
                </div>

                {/* Trending ranked list */}
                <div>
                  <SectionHeader
                    title="TRENDING"
                    action={{
                      label: "See all",
                      onClick: () => {
                        setTab("projects")
                        setProjectFilter("trending")
                      },
                    }}
                  />
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 6 }}
                  >
                    {ALL_SHOWCASE_PROJECTS.filter((p) => p.trending)
                      .slice(0, 6)
                      .map((p, i) => (
                        <TrendingRow
                          key={p.id}
                          project={p}
                          rank={i + 1}
                          onClick={() => setSelectedProject(p)}
                        />
                      ))}
                  </div>
                </div>
              </div>

              {/* ── Right column ── */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 28,
                  position: "sticky",
                  top: 0,
                }}
              >
                {/* Live activity */}
                <div>
                  <SectionHeader title="SAMPLE ACTIVITY" />
                  <div style={{ borderTop: "1px solid var(--border-subtle)" }}>
                    {COMMUNITY_FEED.slice(0, 6).map((entry) => (
                      <FeedRow
                        key={entry.id}
                        entry={entry}
                        onBuilderClick={(bid) => {
                          const b = ALL_BUILDERS.find((x) => x.id === bid)
                          if (b) setSelectedBuilder(b)
                        }}
                        onProjectClick={(pid) => {
                          const p = ALL_SHOWCASE_PROJECTS.find(
                            (x) => x.id === pid,
                          )
                          if (p) setSelectedProject(p)
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Featured builders — compact */}
                <div>
                  <SectionHeader
                    title="BUILDERS"
                    action={{
                      label: "See all",
                      onClick: () => setTab("builders"),
                    }}
                  />
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 6 }}
                  >
                    {ALL_BUILDERS.filter((b) => b.featured)
                      .slice(0, 3)
                      .map((b) => (
                        <BuilderCompactRow
                          key={b.id}
                          builder={b}
                          onClick={() => setSelectedBuilder(b)}
                        />
                      ))}
                  </div>
                </div>

                {/* Open challenges */}
                <div>
                  <SectionHeader
                    title="CATALOG HIGHLIGHTS"
                    action={{
                      label: "Event catalog",
                      onClick: () => setTab("events"),
                    }}
                  />
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    {ALL_CHALLENGES.filter((c) => c.status === "open")
                      .slice(0, 2)
                      .map((c) => (
                        <ChallengeCard key={c.id} challenge={c} />
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ EXPLORE ═══ */}
        {tab === "explore" && !query && (
          <div
            className="px-6 py-6 max-w-5xl flex flex-col gap-8"
            style={{
              animation: "shango-fade-up 0.22s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            {/* Filter row */}
            <FilterBar
              options={[
                { id: "all", label: "All" },
                { id: "projects", label: "Projects" },
                { id: "builders", label: "Builders" },
                { id: "skills", label: "Skills" },
                { id: "templates", label: "Templates" },
              ]}
              active={exploreFilter}
              onChange={(v) => setExploreFilter(v as ExploreFilter)}
            />

            {(exploreFilter === "all" || exploreFilter === "projects") && (
              <div>
                <SectionHeader
                  title="PROJECTS"
                  action={
                    exploreFilter === "all"
                      ? { label: "See all", onClick: () => setTab("projects") }
                      : undefined
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  {ALL_SHOWCASE_PROJECTS.slice(
                    0,
                    exploreFilter === "all" ? 4 : 8,
                  ).map((p) => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      onClick={() => setSelectedProject(p)}
                    />
                  ))}
                </div>
              </div>
            )}

            {(exploreFilter === "all" || exploreFilter === "builders") && (
              <div>
                <SectionHeader
                  title="BUILDERS"
                  action={
                    exploreFilter === "all"
                      ? { label: "See all", onClick: () => setTab("builders") }
                      : undefined
                  }
                />
                <div className="grid grid-cols-3 gap-3">
                  {ALL_BUILDERS.slice(0, exploreFilter === "all" ? 6 : 12).map(
                    (b) => (
                      <BuilderCard
                        key={b.id}
                        builder={b}
                        onClick={() => setSelectedBuilder(b)}
                      />
                    ),
                  )}
                </div>
              </div>
            )}

            {(exploreFilter === "all" || exploreFilter === "skills") && (
              <div>
                <SectionHeader title="COMMUNITY SKILLS" />
                <div className="grid grid-cols-3 gap-2">
                  {[
                    "React",
                    "TypeScript",
                    "Python",
                    "Flutter",
                    "Node.js",
                    "Docker",
                    "Supabase",
                    "D3.js",
                    "Solidity",
                  ].map((skill) => (
                    <SkillExploreCard key={skill} name={skill} />
                  ))}
                </div>
              </div>
            )}

            {(exploreFilter === "all" || exploreFilter === "templates") && (
              <div>
                <SectionHeader title="COMMUNITY TEMPLATES" />
                <div className="grid grid-cols-2 gap-3">
                  {ALL_SHOWCASE_PROJECTS.filter((p) => p.forkCount > 30)
                    .slice(0, 4)
                    .map((p) => (
                      <ProjectCard
                        key={p.id}
                        project={p}
                        onClick={() => setSelectedProject(p)}
                        label="Template"
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ PROJECTS ═══ */}
        {tab === "projects" && (
          <div
            className="px-6 py-6 max-w-5xl flex flex-col gap-6"
            style={{
              animation: "shango-fade-up 0.22s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            <FilterBar
              options={[
                { id: "all", label: "All" },
                { id: "featured", label: "Featured" },
                { id: "trending", label: "Trending" },
                { id: "new", label: "New" },
              ]}
              active={projectFilter}
              onChange={(v) => setProjectFilter(v as ProjectFilter)}
            />
            {filteredProjects.length === 0 ? (
              <EmptyState message="No projects match this filter" />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredProjects.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    onClick={() => setSelectedProject(p)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ BUILDERS ═══ */}
        {tab === "builders" && (
          <div
            className="px-6 py-6 max-w-5xl flex flex-col gap-6"
            style={{
              animation: "shango-fade-up 0.22s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            {/* Featured */}
            <div>
              <SectionHeader title="FEATURED BUILDERS" />
              <div className="grid grid-cols-3 gap-3">
                {ALL_BUILDERS.filter((b) => b.featured).map((b) => (
                  <BuilderCard
                    key={b.id}
                    builder={b}
                    onClick={() => setSelectedBuilder(b)}
                    large
                  />
                ))}
              </div>
            </div>

            {/* All builders */}
            <div>
              <SectionHeader title="ALL BUILDERS" />
              <div className="grid grid-cols-3 gap-3">
                {filteredBuilders
                  .filter((b) => !b.featured)
                  .map((b) => (
                    <BuilderCard
                      key={b.id}
                      builder={b}
                      onClick={() => setSelectedBuilder(b)}
                    />
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ KNOWLEDGE ═══ */}
        {tab === "knowledge" && (
          <div
            className="px-6 py-6 max-w-5xl flex flex-col gap-6"
            style={{
              animation: "shango-fade-up 0.22s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            <FilterBar
              options={[
                { id: "all", label: "All" },
                { id: "guide", label: "Guides" },
                { id: "tutorial", label: "Tutorials" },
                { id: "learning-path", label: "Learning Paths" },
                { id: "best-practice", label: "Best Practices" },
                { id: "example", label: "Examples" },
                { id: "tip", label: "Tips" },
              ]}
              active={knowledgeFilter}
              onChange={(v) => setKnowledgeFilter(v as KnowledgeFilter)}
            />

            {/* Featured knowledge */}
            {knowledgeFilter === "all" && (
              <div>
                <SectionHeader title="FEATURED" />
                <div className="grid grid-cols-2 gap-3 mb-8">
                  {ALL_KNOWLEDGE.filter((k) => k.featured).map((k) => (
                    <KnowledgeCard key={k.id} entry={k} featured />
                  ))}
                </div>
                <SectionHeader title="ALL RESOURCES" />
              </div>
            )}

            <div className="flex flex-col gap-2">
              {filteredKnowledge.map((k) => (
                <KnowledgeCard key={k.id} entry={k} />
              ))}
            </div>

            {/* Challenges + Events section */}
            <div className="mt-6">
              <SectionHeader title="ILLUSTRATIVE OPPORTUNITIES" />
              <div className="grid grid-cols-2 gap-3">
                {ALL_CHALLENGES.map((c) => (
                  <ChallengeCard key={c.id} challenge={c} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ TEAMS ═══ */}
        {tab === "teams" && (
          <div
            className="px-6 py-6 max-w-5xl flex flex-col gap-8"
            style={{
              animation: "shango-fade-up 0.22s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            {/* Organizations */}
            <div>
              <SectionHeader title="ORGANIZATIONS" />
              <div className="flex flex-col gap-3">
                {ALL_TEAMS.filter((t) => t.type === "organization").map(
                  (team) => (
                    <TeamCard
                      key={team.id}
                      team={team}
                      builders={ALL_BUILDERS}
                      onBuilderClick={(id) => {
                        const b = ALL_BUILDERS.find((x) => x.id === id)
                        if (b) setSelectedBuilder(b)
                      }}
                    />
                  ),
                )}
              </div>
            </div>

            {/* Teams */}
            <div>
              <SectionHeader title="TEAMS" />
              <div className="flex flex-col gap-3">
                {ALL_TEAMS.filter((t) => t.type === "team").map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    builders={ALL_BUILDERS}
                    onBuilderClick={(id) => {
                      const b = ALL_BUILDERS.find((x) => x.id === id)
                      if (b) setSelectedBuilder(b)
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Create team CTA */}
            <button
              disabled
              className="w-full py-3 rounded-xl text-xs border-dashed"
              style={{
                border: "1px dashed var(--border-default)",
                color: "var(--text-muted)",
                fontFamily: "var(--font-geist)",
                background: "transparent",
                cursor: "not-allowed",
                opacity: 0.7,
              }}
            >
              Team creation unavailable
            </button>
          </div>
        )}

        {tab === "events" && <EventsTab />}
          </>
        )}
      </div>

      {/* ── Detail Sheets ── */}
      {selectedBuilder && (
        <BuilderProfileSheet
          builder={selectedBuilder}
          projects={ALL_SHOWCASE_PROJECTS.filter(
            (p) => p.creatorId === selectedBuilder.id,
          )}
          onClose={() => setSelectedBuilder(null)}
          onProjectClick={setSelectedProject}
        />
      )}
      {selectedProject && (
        <ProjectShowcaseSheet
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onBuilderClick={(id) => {
            const b = ALL_BUILDERS.find((x) => x.id === id)
            if (b) {
              setSelectedProject(null)
              setTimeout(() => setSelectedBuilder(b), 50)
            }
          }}
        />
      )}
      {showPublishModal && (
        <PublishProjectModal
          open={showPublishModal}
          onClose={() => setShowPublishModal(false)}
          onPublished={(newProj) => setSelectedProject(newProj)}
        />
      )}
      {detailProject && (
        <PublishedProjectDetailModal
          project={detailProject}
          onClose={() => navigate("/community")}
          onRemix={handleRemixPublished}
        />
      )}
      {showEditProfileModal && activeBuilderProfile && (
        <EditProfileModal
          profile={activeBuilderProfile}
          onClose={() => setShowEditProfileModal(false)}
          onSave={(updates) => {
            updateBuilderProfile(activeBuilderProfile.id, updates)
            addToast("Profile updated", "success")
          }}
        />
      )}
    </div>
  )
}

function BuilderPortfolioView({
  profile,
  portfolio,
  onRemix,
  onOpenProject,
  onEditProfile,
}: {
  profile: BuilderProfile
  portfolio: PublishedProject[]
  onRemix: (id: string) => void
  onOpenProject: (id: string) => void
  onEditProfile?: () => void
}) {
  return (
    <div className="px-6 py-8 max-w-4xl mx-auto flex flex-col gap-8">
      {/* Profile Header */}
      <div
        className="rounded-2xl p-6 flex flex-col gap-4"
        style={{
          background: "rgba(14,14,16,0.8)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h1
              className="text-xl font-bold tracking-tight text-white"
              style={{ fontFamily: "var(--font-geist)" }}
            >
              {profile.displayName}
            </h1>
            <p
              className="text-xs mt-0.5"
              style={{ color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-mono-jetbrains)" }}
            >
              @{profile.username}
            </p>
          </div>
          {onEditProfile && (
            <button
              onClick={onEditProfile}
              className="px-3 py-1.5 rounded-lg text-xs"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.8)",
                fontFamily: "var(--font-geist)",
              }}
            >
              Edit Profile
            </button>
          )}
        </div>

        {profile.bio && (
          <p
            className="text-sm"
            style={{ color: "rgba(255,255,255,0.75)", fontFamily: "var(--font-geist)", lineHeight: 1.5 }}
          >
            {profile.bio}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-geist)" }}>
          {profile.school && (
            <span>
              🎓 Student Builder · {profile.school}
            </span>
          )}
          {profile.location && <span>📍 {profile.location}</span>}
          <span>📅 Joined {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
        </div>
      </div>

      {/* Projects Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-xs tracking-widest text-zinc-400 uppercase"
            style={{ fontFamily: "var(--font-mono-jetbrains)" }}
          >
            PUBLISHED PROJECTS ({portfolio.length})
          </h2>
        </div>

        {portfolio.length === 0 ? (
          <div
            className="rounded-xl p-8 text-center"
            style={{
              background: "rgba(14,14,16,0.4)",
              border: "1px dashed rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.4)",
              fontFamily: "var(--font-geist)",
              fontSize: 13,
            }}
          >
            Nothing published yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {portfolio.map((project) => (
              <div
                key={project.id}
                className="rounded-xl p-5 flex flex-col justify-between"
                style={{
                  background: "rgba(16,16,18,0.9)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  transition: "all 0.16s ease",
                }}
              >
                <div>
                  <h3
                    className="text-sm font-semibold text-white mb-1"
                    style={{ fontFamily: "var(--font-geist)" }}
                  >
                    {project.title}
                  </h3>
                  <p
                    className="text-xs line-clamp-2 mb-4"
                    style={{ color: "rgba(255,255,255,0.55)", fontFamily: "var(--font-geist)", lineHeight: 1.5 }}
                  >
                    {project.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <button
                    onClick={() => onOpenProject(project.id)}
                    className="text-xs text-zinc-400 hover:text-white"
                    style={{ fontFamily: "var(--font-geist)" }}
                  >
                    Open
                  </button>
                  <button
                    onClick={() => onRemix(project.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{
                      background: "rgba(255,255,255,0.9)",
                      color: "#0a0a0a",
                      fontFamily: "var(--font-geist)",
                    }}
                  >
                    ✦ Remix
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="text-center pt-8 text-xs text-zinc-600 font-mono">
        Built with Shango
      </footer>
    </div>
  )
}

// ── Components ────────────────────────────────────────────────────────────────

function SectionHeader({
  title,
  action,
}: {
  title: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <p
        style={{
          fontSize: 9,
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono-jetbrains)",
          letterSpacing: "0.1em",
        }}
      >
        {title}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="text-xs"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-geist)",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "var(--text-secondary)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--text-muted)")
          }
        >
          {action.label} →
        </button>
      )}
    </div>
  )
}

function FilterBar({
  options,
  active,
  onChange,
}: {
  options: { id: string; label: string }[]
  active: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className="px-3 py-1.5 rounded-lg text-xs"
          style={{
            background:
              active === opt.id ? "rgba(255,255,255,0.08)" : "var(--surface-1)",
            border: `1px solid ${
              active === opt.id
                ? "rgba(255,255,255,0.18)"
                : "var(--border-default)"
            }`,
            color:
              active === opt.id ? "var(--text-primary)" : "var(--text-muted)",
            fontFamily: "var(--font-geist)",
            transition: "all 0.15s ease",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function StatChip({
  value,
  label,
  dot,
}: {
  value: number
  label: string
  dot?: boolean
}) {
  return (
    <div className="flex items-center gap-1.5">
      {dot && (
        <div
          className="rounded-full"
          style={{
            width: 5,
            height: 5,
            background: "#4ade80",
            animation: "live-pulse 2.4s ease-in-out infinite",
          }}
        />
      )}
      <span
        className="text-xs font-semibold"
        style={{
          color: "var(--text-secondary)",
          fontFamily: "var(--font-geist)",
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: 10,
          color: "var(--text-muted)",
          fontFamily: "var(--font-geist)",
        }}
      >
        {label}
      </span>
    </div>
  )
}

function FeedRow({
  entry,
  onBuilderClick,
  onProjectClick,
}: {
  entry: CommunityFeedItem
  onBuilderClick: (id: string) => void
  onProjectClick: (id: string) => void
}) {
  const typeIcon: Record<string, string> = {
    deploy: "↑",
    version: "⎇",
    template: "◻",
    skill: "⊕",
    fork: "⎇",
    team: "◯",
    challenge: "◈",
  }

  return (
    <div
      className="flex items-center gap-3 py-3"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <span style={{ fontSize: 12, flexShrink: 0, opacity: 0.5 }}>
        {typeIcon[entry.type] ?? "·"}
      </span>
      <p
        className="flex-1 text-xs"
        style={{
          color: "var(--text-secondary)",
          fontFamily: "var(--font-geist)",
          lineHeight: 1.5,
        }}
      >
        <button
          className="font-medium"
          style={{ color: "var(--text-primary)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.textDecoration = "underline")
          }
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
          onClick={() => entry.builderId && onBuilderClick(entry.builderId)}
        >
          {entry.subject}
        </button>{" "}
        <button
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={(e) => {
            if (entry.projectId)
              e.currentTarget.style.textDecoration = "underline"
          }}
          onMouseLeave={(e) => {
            if (entry.projectId) e.currentTarget.style.textDecoration = "none"
          }}
          onClick={() => entry.projectId && onProjectClick(entry.projectId)}
        >
          {entry.action}
        </button>
        {entry.detail && (
          <span style={{ color: "var(--text-muted)" }}> {entry.detail}</span>
        )}
      </p>
      <span
        style={{
          fontSize: 10,
          color: "var(--text-disabled)",
          fontFamily: "var(--font-geist)",
          flexShrink: 0,
        }}
      >
        SAMPLE
      </span>
    </div>
  )
}

function ProjectCard({
  project,
  onClick,
  label,
}: {
  project: ShowcaseProject
  onClick: () => void
  label?: string
}) {
  const navigate = useNavigate()
  const { addToast, createProject } = useApp()
  const [hovered, setHovered] = useState(false)

  const handleQuickRemix = (e: React.MouseEvent) => {
    e.stopPropagation()
    createProject(`Remix — ${project.name}`)
    addToast(
      `⚡ Remixed "${project.name}" into a fresh workspace iteration!`,
      "success",
    )
    navigate("/builder")
  }

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="p-4 rounded-xl text-left flex flex-col gap-3 cursor-pointer relative group"
      style={{
        background: hovered ? "var(--surface-2)" : "var(--surface-1)",
        border: `1px solid ${
          hovered ? "var(--border-default)" : "var(--border-subtle)"
        }`,
        transition: "all 0.15s ease",
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
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
              {project.monogram}
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
              {project.name}
            </p>
            {label && (
              <p
                style={{
                  fontSize: 9,
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-geist)",
                  marginTop: 1,
                }}
              >
                {label}
              </p>
            )}
          </div>
        </div>
        <span
          style={{
            fontSize: 8,
            color: "var(--text-disabled)",
            fontFamily: "var(--font-mono-jetbrains)",
            letterSpacing: "0.06em",
          }}
        >
          SHOWCASE
        </span>
      </div>

      <p
        className="text-xs leading-relaxed"
        style={{
          color: "var(--text-muted)",
          fontFamily: "var(--font-geist)",
          lineHeight: 1.55,
        }}
      >
        {project.description}
      </p>

      <div className="flex items-center justify-between pt-1">
        <div className="flex flex-wrap gap-1">
          {project.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 9,
                color: "var(--text-muted)",
                fontFamily: "var(--font-geist)",
                background: "var(--surface-3)",
                padding: "1px 5px",
                borderRadius: 4,
                border: "1px solid var(--border-subtle)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleQuickRemix}
            className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex items-center gap-1 transition-all"
            title="1-Click Remix into fresh workspace"
          >
            <ForkIcon size={9} />
            Remix
          </button>
          <span
            style={{
              fontSize: 10,
              color: "var(--text-disabled)",
              fontFamily: "var(--font-mono-jetbrains)",
            }}
          >
            ⎇ {project.forkCount}
          </span>
        </div>
      </div>
    </div>
  )
}

function TrendingRow({
  project,
  rank,
  onClick,
}: {
  project: ShowcaseProject
  rank: number
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-4 px-4 py-3 rounded-xl text-left"
      style={{
        background: hovered ? "var(--surface-2)" : "var(--surface-1)",
        border: `1px solid ${
          hovered ? "var(--border-default)" : "var(--border-subtle)"
        }`,
        transition: "all 0.15s ease",
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--text-disabled)",
          fontFamily: "var(--font-mono-jetbrains)",
          minWidth: 16,
          textAlign: "right",
        }}
      >
        {rank}
      </span>
      <div
        className="flex items-center justify-center rounded-lg flex-shrink-0"
        style={{
          width: 24,
          height: 24,
          background: "var(--surface-3)",
          border: "1px solid var(--border-default)",
        }}
      >
        <span
          style={{
            fontSize: 8,
            fontWeight: 700,
            color: "var(--text-secondary)",
            fontFamily: "var(--font-mono-jetbrains)",
          }}
        >
          {project.monogram}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-xs font-medium truncate"
          style={{
            color: "var(--text-primary)",
            fontFamily: "var(--font-geist)",
          }}
        >
          {project.name}
        </p>
        <p
          style={{
            fontSize: 10,
            color: "var(--text-muted)",
            fontFamily: "var(--font-geist)",
            marginTop: 1,
          }}
        >
          {project.tags.slice(0, 2).join(" · ")}
        </p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {project.status === "live" && (
          <div
            className="rounded-full"
            style={{
              width: 5,
              height: 5,
              background: "#4ade80",
              animation: "live-pulse 2.4s ease-in-out infinite",
            }}
          />
        )}
        <span
          style={{
            fontSize: 10,
            color: "var(--text-disabled)",
            fontFamily: "var(--font-mono-jetbrains)",
          }}
        >
          {formatCount(project.viewCount)} views
        </span>
        <span
          style={{
            fontSize: 10,
            color: "var(--text-disabled)",
            fontFamily: "var(--font-mono-jetbrains)",
          }}
        >
          v{project.version}
        </span>
      </div>
    </button>
  )
}

function BuilderCard({
  builder,
  onClick,
  large,
}: {
  builder: Builder
  onClick: () => void
  large?: boolean
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="p-4 rounded-xl text-left flex flex-col gap-3 relative"
      style={{
        background: hovered ? "var(--surface-2)" : "var(--surface-1)",
        border: `1px solid ${
          hovered ? "var(--border-default)" : "var(--border-subtle)"
        }`,
        transition: "all 0.15s ease",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex items-center justify-center rounded-xl flex-shrink-0"
          style={{
            width: large ? 40 : 32,
            height: large ? 40 : 32,
            background: "var(--surface-3)",
            border: "1px solid var(--border-default)",
          }}
        >
          <span
            style={{
              fontSize: large ? 13 : 10,
              fontWeight: 700,
              color: "var(--text-primary)",
              fontFamily: "var(--font-mono-jetbrains)",
              letterSpacing: "-0.02em",
            }}
          >
            {builder.monogram}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-xs font-medium truncate"
            style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-geist)",
            }}
          >
            {builder.name}
          </p>
          <p
            style={{
              fontSize: 10,
              color: "var(--text-muted)",
              fontFamily: "var(--font-geist)",
              marginTop: 1,
            }}
          >
            {builder.location}
          </p>
        </div>
      </div>

      {large && (
        <p
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            fontFamily: "var(--font-geist)",
            lineHeight: 1.55,
          }}
        >
          {builder.bio.slice(0, 80)}
          {builder.bio.length > 80 ? "…" : ""}
        </p>
      )}

      <div className="flex items-center gap-2">
        {builder.reputation.slice(0, 1).map((rep) => (
          <div key={rep} className="flex items-center gap-1">
            <AwardIcon size={9} style={{ color: "var(--text-disabled)" }} />
            <span
              style={{
                fontSize: 9,
                color: "var(--text-muted)",
                fontFamily: "var(--font-geist)",
              }}
            >
              {rep}
            </span>
          </div>
        ))}
        <div className="flex-1" />
        <span
          className="text-xs px-2 py-0.5 rounded-md"
          style={{
            background: "var(--surface-3)",
            border: "1px solid var(--border-default)",
            color: "var(--text-muted)",
            fontFamily: "var(--font-geist)",
            opacity: 0.7,
          }}
        >
          Follow unavailable
        </span>
      </div>
    </button>
  )
}

function KnowledgeCard({
  entry,
  featured,
}: {
  entry: Knowledge
  featured?: boolean
}) {
  const [hovered, setHovered] = useState(false)

  const typeColors: Record<string, string> = {
    guide: "rgba(255,255,255,0.04)",
    tutorial: "rgba(255,255,255,0.04)",
    "learning-path": "rgba(255,255,255,0.04)",
    "best-practice": "rgba(255,255,255,0.04)",
    example: "rgba(255,255,255,0.04)",
    tip: "rgba(255,255,255,0.04)",
  }

  const difficultyColor: Record<string, string> = {
    beginner: "var(--text-muted)",
    intermediate: "var(--text-secondary)",
    advanced: "var(--text-primary)",
  }

  return (
    <div
      className={`rounded-xl p-4 cursor-pointer flex flex-col gap-2.5 ${
        featured ? "" : "flex-row items-start gap-4"
      }`}
      style={{
        background: hovered
          ? "var(--surface-2)"
          : featured
            ? (typeColors[entry.type] ?? "var(--surface-1)")
            : "var(--surface-1)",
        border: `1px solid ${
          hovered ? "var(--border-default)" : "var(--border-subtle)"
        }`,
        transition: "all 0.15s ease",
        flexDirection: featured ? "column" : "row",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {!featured && (
        <div className="flex-shrink-0 mt-0.5">
          <BookOpenIcon size={12} style={{ color: "var(--text-muted)" }} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            style={{
              fontSize: 9,
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono-jetbrains)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {entry.type.replace("-", " ")}
          </span>
          <span
            style={{
              fontSize: 9,
              color: difficultyColor[entry.difficulty],
              fontFamily: "var(--font-geist)",
            }}
          >
            {entry.difficulty}
          </span>
        </div>
        <p
          className="text-xs font-medium"
          style={{
            color: "var(--text-primary)",
            fontFamily: "var(--font-geist)",
            lineHeight: 1.4,
          }}
        >
          {entry.title}
        </p>
        {featured && (
          <p
            className="text-xs mt-1.5"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-geist)",
              lineHeight: 1.55,
            }}
          >
            {entry.summary}
          </p>
        )}
        <div className="flex items-center gap-3 mt-2">
          <span
            style={{
              fontSize: 10,
              color: "var(--text-disabled)",
              fontFamily: "var(--font-geist)",
            }}
          >
            {entry.readTimeMinutes} min read
          </span>
          <span
            style={{
              fontSize: 10,
              color: "var(--text-disabled)",
              fontFamily: "var(--font-mono-jetbrains)",
            }}
          >
            {formatCount(entry.viewCount)} views
          </span>
        </div>
      </div>
    </div>
  )
}

function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const [hovered, setHovered] = useState(false)

  const typeLabel: Record<string, string> = {
    hackathon: "HACKATHON",
    challenge: "CHALLENGE",
    event: "EVENT",
    mentorship: "MENTORSHIP",
    announcement: "ANNOUNCEMENT",
  }

  return (
    <div
      className="p-4 rounded-xl cursor-pointer flex flex-col gap-3"
      style={{
        background: hovered ? "var(--surface-2)" : "var(--surface-1)",
        border: `1px solid ${
          hovered ? "var(--border-default)" : "var(--border-subtle)"
        }`,
        transition: "all 0.15s ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p
            style={{
              fontSize: 9,
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono-jetbrains)",
              letterSpacing: "0.06em",
              marginBottom: 4,
            }}
          >
            {typeLabel[challenge.type]}
          </p>
          <p
            className="text-xs font-medium"
            style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-geist)",
              lineHeight: 1.4,
            }}
          >
            {challenge.title}
          </p>
        </div>
        <span
          style={{
            fontSize: 8,
            color: "var(--text-disabled)",
            fontFamily: "var(--font-mono-jetbrains)",
            letterSpacing: "0.06em",
            flexShrink: 0,
          }}
        >
          ILLUSTRATIVE
        </span>
      </div>

      <p
        style={{
          fontSize: 11,
          color: "var(--text-muted)",
          fontFamily: "var(--font-geist)",
          lineHeight: 1.55,
        }}
      >
        {challenge.description.slice(0, 100)}
        {challenge.description.length > 100 ? "…" : ""}
      </p>

      <p
        style={{
          fontSize: 10,
          color: "var(--text-disabled)",
          fontFamily: "var(--font-geist)",
        }}
      >
        Live applications and programme details are not available in this
        preview.
      </p>
    </div>
  )
}

function TeamCard({
  team,
  onBuilderClick,
  builders,
}: {
  team: Team
  onBuilderClick: (id: string) => void
  builders: Builder[]
}) {
  const [hovered, setHovered] = useState(false)
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: hovered ? "var(--surface-2)" : "var(--surface-1)",
        border: `1px solid ${
          hovered ? "var(--border-default)" : "var(--border-subtle)"
        }`,
        transition: "background 0.15s ease, border-color 0.15s ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="p-4 flex items-start gap-4">
        <div
          className="flex items-center justify-center rounded-xl flex-shrink-0"
          style={{
            width: 40,
            height: 40,
            background: "var(--surface-3)",
            border: "1px solid var(--border-default)",
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text-primary)",
              fontFamily: "var(--font-mono-jetbrains)",
              letterSpacing: "-0.02em",
            }}
          >
            {team.monogram}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p
              className="text-sm font-medium"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-geist)",
              }}
            >
              {team.name}
            </p>
            {team.isVerified && (
              <div
                className="flex items-center gap-1 px-1.5 py-0.5 rounded"
                style={{
                  background: "var(--surface-3)",
                  border: "1px solid var(--border-default)",
                }}
              >
                <GlobeIcon size={9} style={{ color: "var(--text-muted)" }} />
                <span
                  style={{
                    fontSize: 8,
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono-jetbrains)",
                    letterSpacing: "0.06em",
                  }}
                >
                  VERIFIED
                </span>
              </div>
            )}
          </div>
          <p
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              fontFamily: "var(--font-geist)",
              lineHeight: 1.55,
            }}
          >
            {team.description}
          </p>
          <div className="flex items-center gap-4 mt-2">
            <span
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                fontFamily: "var(--font-geist)",
              }}
            >
              {team.memberCount} members
            </span>
            <span
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                fontFamily: "var(--font-geist)",
              }}
            >
              {team.projectCount} projects
            </span>
            <span
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                fontFamily: "var(--font-geist)",
              }}
            >
              {team.location}
            </span>
          </div>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs px-2 py-1 rounded-lg flex-shrink-0"
          style={{
            background: "var(--surface-3)",
            border: "1px solid var(--border-default)",
            color: "var(--text-muted)",
            fontFamily: "var(--font-geist)",
          }}
        >
          {expanded ? "−" : "+"}
        </button>
      </div>

      {expanded && (
        <div
          className="px-4 pb-4 flex flex-col gap-3"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <p
            style={{
              fontSize: 9,
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono-jetbrains)",
              letterSpacing: "0.08em",
              marginTop: 10,
            }}
          >
            MEMBERS
          </p>
          <div className="flex flex-wrap gap-2">
            {team.members.map((m) => {
              const b = builders.find((x) => x.id === m.builderId)
              if (!b) return null
              return (
                <button
                  key={m.builderId}
                  onClick={() => onBuilderClick(m.builderId)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                  style={{
                    background: "var(--surface-3)",
                    border: "1px solid var(--border-default)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(255,255,255,0.05)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "var(--surface-3)")
                  }
                >
                  <div
                    className="flex items-center justify-center rounded"
                    style={{
                      width: 18,
                      height: 18,
                      background: "var(--surface-2)",
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
                      {b.monogram}
                    </span>
                  </div>
                  <span
                    className="text-xs"
                    style={{
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-geist)",
                    }}
                  >
                    {b.name}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      color: "var(--text-disabled)",
                      fontFamily: "var(--font-geist)",
                    }}
                  >
                    {m.role}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Recent activity */}
          {team.activity.length > 0 && (
            <>
              <p
                style={{
                  fontSize: 9,
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono-jetbrains)",
                  letterSpacing: "0.08em",
                  marginTop: 4,
                }}
              >
                RECENT ACTIVITY
              </p>
              {team.activity.slice(0, 3).map((a) => (
                <p
                  key={a.id}
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-geist)",
                    lineHeight: 1.5,
                  }}
                >
                  {a.description} ·{" "}
                  <span style={{ color: "var(--text-disabled)" }}>
                    {formatRelativeTime(a.timestamp)}
                  </span>
                </p>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function SkillExploreCard({ name }: { name: string }) {
  const [hovered, setHovered] = useState(false)
  const monogram = name.slice(0, 2).toUpperCase()
  return (
    <div
      className="p-3 rounded-xl flex items-center gap-3 cursor-pointer"
      style={{
        background: hovered ? "var(--surface-2)" : "var(--surface-1)",
        border: `1px solid ${
          hovered ? "var(--border-default)" : "var(--border-subtle)"
        }`,
        transition: "all 0.15s ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="flex items-center justify-center rounded"
        style={{
          width: 22,
          height: 22,
          background: "var(--surface-3)",
          border: "1px solid var(--border-default)",
        }}
      >
        <span
          style={{
            fontSize: 8,
            fontWeight: 700,
            color: "var(--text-secondary)",
            fontFamily: "var(--font-mono-jetbrains)",
          }}
        >
          {monogram}
        </span>
      </div>
      <span
        className="text-xs font-medium"
        style={{
          color: "var(--text-secondary)",
          fontFamily: "var(--font-geist)",
        }}
      >
        {name}
      </span>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <p
        className="text-xs"
        style={{
          color: "var(--text-disabled)",
          fontFamily: "var(--font-geist)",
        }}
      >
        {message}
      </p>
    </div>
  )
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function FeaturedHeroCard({
  project,
  onClick,
}: {
  project: ShowcaseProject
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full text-left rounded-xl overflow-hidden"
      style={{
        background: hovered ? "var(--surface-2)" : "var(--surface-1)",
        border: `1px solid ${
          hovered ? "rgba(255,255,255,0.1)" : "var(--border-default)"
        }`,
        transition: "all 0.18s ease",
      }}
    >
      {/* Top: dot grid header strip */}
      <div
        style={{
          height: 64,
          background:
            "linear-gradient(135deg, var(--surface-0) 0%, rgba(255,255,255,0.025) 100%)",
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "var(--surface-3)",
              border: "1px solid var(--border-default)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--text-primary)",
                fontFamily: "var(--font-mono-jetbrains)",
                letterSpacing: "-0.02em",
              }}
            >
              {project.monogram}
            </span>
          </div>
          <span
            style={{
              fontSize: 9,
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono-jetbrains)",
              letterSpacing: "0.06em",
            }}
          >
            FEATURED
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span
            style={{
              fontSize: 9,
              color: "var(--text-disabled)",
              fontFamily: "var(--font-mono-jetbrains)",
              letterSpacing: "0.06em",
            }}
          >
            CATALOG
          </span>
          <span
            style={{
              fontSize: 9,
              color: "var(--text-disabled)",
              fontFamily: "var(--font-mono-jetbrains)",
            }}
          >
            v{project.version}
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "16px 16px 14px" }}>
        <p
          className="text-sm font-semibold mb-2"
          style={{
            color: "var(--text-primary)",
            fontFamily: "var(--font-geist)",
            letterSpacing: "-0.01em",
          }}
        >
          {project.name}
        </p>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            fontFamily: "var(--font-geist)",
            lineHeight: 1.6,
            marginBottom: 12,
          }}
        >
          {project.description}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {project.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 9,
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-geist)",
                  background: "var(--surface-3)",
                  padding: "2px 7px",
                  borderRadius: 5,
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <span
              style={{
                fontSize: 10,
                color: "var(--text-disabled)",
                fontFamily: "var(--font-mono-jetbrains)",
              }}
            >
              ⎇ {project.forkCount}
            </span>
            <span
              style={{
                fontSize: 10,
                color: "var(--text-disabled)",
                fontFamily: "var(--font-mono-jetbrains)",
              }}
            >
              {formatCount(project.viewCount)} views
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}

function BuilderCompactRow({
  builder,
  onClick,
}: {
  builder: Builder
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer"
      style={{
        background: hovered ? "var(--surface-2)" : "transparent",
        border: `1px solid ${
          hovered ? "var(--border-default)" : "transparent"
        }`,
        transition: "all 0.14s ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          flexShrink: 0,
          background: "var(--surface-3)",
          border: "1px solid var(--border-default)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: "var(--text-primary)",
            fontFamily: "var(--font-mono-jetbrains)",
            letterSpacing: "-0.02em",
          }}
        >
          {builder.monogram}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--text-primary)",
            fontFamily: "var(--font-geist)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {builder.name}
        </p>
        <p
          style={{
            fontSize: 10,
            color: "var(--text-muted)",
            fontFamily: "var(--font-geist)",
            marginTop: 1,
          }}
        >
          {builder.location}
        </p>
      </div>
      <button
        disabled
        style={{
          fontSize: 10,
          padding: "3px 8px",
          borderRadius: 6,
          flexShrink: 0,
          background: "var(--surface-3)",
          border: "1px solid var(--border-default)",
          color: "var(--text-muted)",
          fontFamily: "var(--font-geist)",
          cursor: "not-allowed",
          opacity: 0.7,
        }}
      >
        Follow unavailable
      </button>
    </div>
  )
}

// ── Events Tab ────────────────────────────────────────────────────────────────

interface CommunityEvent {
  id: string
  title: string
  date: string
  month: string
  day: string
  location: string
  type: "online" | "in-person" | "hybrid"
  attendees: number
  description: string
  host: string
}

const ALL_EVENTS: CommunityEvent[] = [
  {
    id: "e1",
    title: "SHANGO Builders Hackathon — East Africa",
    date: "Aug 2, 2026",
    month: "AUG",
    day: "02",
    location: "Nairobi, Kenya",
    type: "in-person",
    attendees: 284,
    description:
      "48-hour hackathon. Build anything with SHANGO. Prizes in M-Pesa credits + server credits.",
    host: "SHANGO Africa",
  },
  {
    id: "e2",
    title: "AI Product Launch Workshop",
    date: "Aug 9, 2026",
    month: "AUG",
    day: "09",
    location: "Online",
    type: "online",
    attendees: 1402,
    description:
      "Ship your AI product from zero to live in one afternoon. Walkthrough of deploy, custom domains, and auth.",
    host: "Amara O.",
  },
  {
    id: "e3",
    title: "Community AMA — The SHANGO Roadmap",
    date: "Aug 14, 2026",
    month: "AUG",
    day: "14",
    location: "Discord",
    type: "online",
    attendees: 892,
    description:
      "Open session with the SHANGO team. Ask anything. Roadmap preview, Q&A, live demos.",
    host: "SHANGO Team",
  },
  {
    id: "e4",
    title: "FinTech Apps on SHANGO",
    date: "Aug 21, 2026",
    month: "AUG",
    day: "21",
    location: "Lagos, Nigeria",
    type: "hybrid",
    attendees: 341,
    description:
      "Building payment systems, dashboards, and mobile-first apps for African financial markets.",
    host: "Chidi A.",
  },
  {
    id: "e5",
    title: "Healthcare Builders Meetup",
    date: "Sep 4, 2026",
    month: "SEP",
    day: "04",
    location: "Accra, Ghana",
    type: "in-person",
    attendees: 117,
    description:
      "Builders using SHANGO for hospital systems, patient intake, appointment management, and health tracking.",
    host: "Kwame B.",
  },
  {
    id: "e6",
    title: "SHANGO × Open Source Summit",
    date: "Sep 18, 2026",
    month: "SEP",
    day: "18",
    location: "Cape Town, SA",
    type: "hybrid",
    attendees: 560,
    description:
      "Export your SHANGO project to a full open-source repo. Workshop on GitHub integration and CI/CD.",
    host: "Lerato M.",
  },
]

function EventsTab() {
  const TYPE_COLORS: Record<CommunityEvent["type"], string> = {
    online: "#60a5fa",
    "in-person": "#4ade80",
    hybrid: "#a78bfa",
  }

  return (
    <div
      className="px-6 py-6 max-w-3xl flex flex-col gap-4"
      style={{ animation: "shango-fade-up 0.22s cubic-bezier(0.16,1,0.3,1)" }}
    >
      <div className="flex items-center justify-between">
        <SectionHeader title="UPCOMING EVENTS" />
      </div>

      <p
        className="text-xs"
        style={{
          color: "var(--text-muted)",
          fontFamily: "var(--font-geist)",
          lineHeight: 1.55,
        }}
      >
        Illustrative event catalog only. Registration, attendee counts, and
        calendar delivery will appear here once verified community events are
        available.
      </p>

      {ALL_EVENTS.map((ev) => {
        return (
          <div
            key={ev.id}
            className="flex gap-4 rounded-xl p-4"
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border-subtle)",
              transition: "border-color 0.16s ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "var(--border-default)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "var(--border-subtle)")
            }
          >
            {/* Date pill */}
            <div
              className="flex-shrink-0 flex flex-col items-center justify-center rounded-lg"
              style={{
                width: 52,
                height: 52,
                background: "var(--surface-3)",
                border: "1px solid var(--border-default)",
              }}
            >
              <span
                style={{
                  fontSize: 8,
                  fontFamily: "var(--font-mono-jetbrains)",
                  color: "var(--text-muted)",
                  letterSpacing: "0.1em",
                }}
              >
                {ev.month}
              </span>
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-geist)",
                  lineHeight: 1.1,
                }}
              >
                {ev.day}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 mb-1">
                <p
                  className="text-sm font-medium flex-1 min-w-0"
                  style={{
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-geist)",
                    lineHeight: 1.3,
                  }}
                >
                  {ev.title}
                </p>
                <span
                  className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full"
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.06em",
                    background: `${TYPE_COLORS[ev.type]}18`,
                    color: TYPE_COLORS[ev.type],
                    fontFamily: "var(--font-mono-jetbrains)",
                    border: `1px solid ${TYPE_COLORS[ev.type]}30`,
                  }}
                >
                  {ev.type.toUpperCase()}
                </span>
              </div>

              <p
                className="text-xs mb-2 line-clamp-2"
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-geist)",
                  lineHeight: 1.55,
                }}
              >
                {ev.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs"
                    style={{
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-geist)",
                    }}
                  >
                    📍 {ev.location}
                  </span>
                  <span
                    className="text-xs"
                    style={{
                      color: "var(--text-disabled)",
                      fontFamily: "var(--font-mono-jetbrains)",
                      fontSize: 9,
                      letterSpacing: "0.06em",
                    }}
                  >
                    ILLUSTRATIVE
                  </span>
                </div>

                <button
                  disabled
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg"
                  style={{
                    background: "var(--surface-3)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-geist)",
                    fontWeight: 500,
                    cursor: "not-allowed",
                    opacity: 0.7,
                  }}
                >
                  Registration unavailable
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PublishedProjectDetailModal({
  project,
  onClose,
  onRemix,
}: {
  project: PublishedProject
  onClose: () => void
  onRemix: (id: string) => void
}) {
  const navigate = useNavigate()
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
      />
      <div
        className="relative rounded-2xl overflow-hidden w-full flex flex-col"
        style={{
          maxWidth: 600,
          maxHeight: "85vh",
          background: "rgba(14,14,14,0.97)",
          backdropFilter: "blur(28px)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 40px 100px rgba(0,0,0,0.75)",
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div>
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-geist)" }}
            >
              {project.title}
            </h2>
            <p
              className="text-xs mt-0.5 flex items-center gap-2"
              style={{ color: "var(--text-muted)", fontFamily: "var(--font-geist)" }}
            >
              <span>Published by {project.ownerName || "Community Builder"}</span>
              <button
                onClick={() => {
                  onClose()
                  navigate(`/community/builder/${project.ownerId === "builder-lagos" ? "tobi" : project.ownerId === "builder-nairobi" ? "sarah" : "amara"}`)
                }}
                className="text-xs text-amber-400 hover:underline font-mono"
              >
                [View Portfolio]
              </button>
              <span>• {project.remixCount} remix{project.remixCount === 1 ? "" : "es"}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ color: "var(--text-muted)" }}
          >
            ✕
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-4">
          <div>
            <label
              className="text-xs mb-1 block"
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono-jetbrains)",
                fontSize: 9,
                letterSpacing: "0.12em",
              }}
            >
              DESCRIPTION
            </label>
            <p
              className="text-sm"
              style={{ color: "var(--text-secondary)", fontFamily: "var(--font-geist)" }}
            >
              {project.description}
            </p>
          </div>

          <div>
            <label
              className="text-xs mb-1 block"
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono-jetbrains)",
                fontSize: 9,
                letterSpacing: "0.12em",
              }}
            >
              APPLICATION SNAPSHOT FILES ({project.snapshotFiles.length})
            </label>
            <div
              className="rounded-lg p-3"
              style={{
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,255,255,0.06)",
                fontFamily: "var(--font-mono-jetbrains)",
                fontSize: 11,
              }}
            >
              {project.snapshotFiles.map((f) => (
                <div key={f.path} style={{ color: "rgba(255,255,255,0.7)", padding: "2px 0" }}>
                  📄 {f.path}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          className="px-6 py-4 flex items-center justify-end gap-3 flex-shrink-0"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-geist)" }}
          >
            Close
          </button>
          <button
            onClick={() => onRemix(project.id)}
            className="px-5 py-2 rounded-lg text-xs font-semibold"
            style={{
              background: "rgba(255,255,255,0.92)",
              color: "#0a0a0a",
              fontFamily: "var(--font-geist)",
            }}
          >
            ✦ Remix Project
          </button>
        </div>
      </div>
    </div>
  )
}

function EditProfileModal({
  profile,
  onClose,
  onSave,
}: {
  profile: BuilderProfile
  onClose: () => void
  onSave: (updates: Partial<BuilderProfile>) => void
}) {
  const [displayName, setDisplayName] = useState(profile.displayName)
  const [bio, setBio] = useState(profile.bio || "")
  const [school, setSchool] = useState(profile.school || "")
  const [location, setLocation] = useState(profile.location || "")
  const [visibility, setVisibility] = useState(profile.visibility)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ displayName, bio, school, location, visibility })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative rounded-2xl overflow-hidden w-full max-w-md shadow-2xl flex flex-col"
        style={{
          background: "rgba(14,16,22,0.96)",
          backdropFilter: "blur(28px)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-white" style={{ fontFamily: "var(--font-geist)" }}>
            Edit Builder Profile
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 text-xs">
          <div>
            <label className="block text-zinc-400 mb-1 font-mono text-[10px]">DISPLAY NAME</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-xs outline-none text-white bg-zinc-900 border border-zinc-800"
              required
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-mono text-[10px]">BIO / TAGLINE</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-xs outline-none text-white bg-zinc-900 border border-zinc-800 resize-none"
              placeholder="Building tools for students..."
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-mono text-[10px]">SCHOOL (OPTIONAL)</label>
            <input
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-xs outline-none text-white bg-zinc-900 border border-zinc-800"
              placeholder="e.g. University of Lagos"
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-mono text-[10px]">LOCATION</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-xs outline-none text-white bg-zinc-900 border border-zinc-800"
              placeholder="e.g. Lagos, Nigeria"
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-mono text-[10px]">PORTFOLIO VISIBILITY</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as "public" | "private")}
              className="w-full px-3 py-2 rounded-lg text-xs outline-none text-white bg-zinc-900 border border-zinc-800"
            >
              <option value="public">Public (Discoverable & visible)</option>
              <option value="private">Private (Only visible to you)</option>
            </select>
          </div>

          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs text-zinc-400">Cancel</button>
            <button type="submit" className="px-5 py-2 rounded-lg text-xs font-semibold bg-white text-black">Save Profile</button>
          </div>
        </form>
      </div>
    </div>
  )
}
