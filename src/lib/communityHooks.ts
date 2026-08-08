import { useState, useEffect } from "react"
import { db } from "./firebase/config"
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  } from "firebase/firestore"
import type {
  Builder,
  ShowcaseProject,
  Team,
  Knowledge,
  Challenge,
  CommunityFeedItem,
} from "./communityTypes"

export function useCommunityData() {
  const [builders, setBuilders] = useState<Builder[]>([])
  const [projects, setProjects] = useState<ShowcaseProject[]>([])
  const [teams, _setTeams] = useState<Team[]>([])
  const [knowledge, _setKnowledge] = useState<Knowledge[]>([])
  const [challenges, _setChallenges] = useState<Challenge[]>([])
  const [feed, setFeed] = useState<CommunityFeedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Listen to showcase projects
    const qProjects = query(
      collection(db, "showcase_projects"),
      orderBy("publishedAt", "desc"),
    )
    const unsubProjects = onSnapshot(qProjects, (snap) => {
      setProjects(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ShowcaseProject),
      )
      setLoading(false)
    })

    const qBuilders = query(collection(db, "builders"))
    const unsubBuilders = onSnapshot(qBuilders, (snap) => {
      setBuilders(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Builder))
    })

    const qFeed = query(
      collection(db, "community_feed"),
      orderBy("timestamp", "desc"),
    )
    const unsubFeed = onSnapshot(qFeed, (snap) => {
      setFeed(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CommunityFeedItem),
      )
    })

    return () => {
      unsubProjects()
      unsubBuilders()
      unsubFeed()
    }
  }, [])

  return { builders, projects, teams, knowledge, challenges, feed, loading }
}
