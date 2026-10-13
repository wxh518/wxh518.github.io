export type Artwork = 'forest' | 'cats' | 'space' | 'mountain' | 'tiles' | 'waves' | 'shapes' | 'code' | 'studio'
export interface Project {
  id: string
  title: string
  subtitle: string
  description: string
  tags: string[]
  art: Artwork
  url?: string
  image?: string
}
export interface Social {
  id: string
  name: string
  handle: string
  metric: number
  unit: string
  color: string
  description: string
  url: string
}
export interface Profile {
  name: string
  names: string[]
  tagline: string
  roles: { label: string; target: SectionId }[]
  city: string
  email: string
  intro: string
  statement: string
  contact: string
  socials: Social[]
}
export interface Skill { name: string; tag: string; level: number; note: string }
export interface Book { title: string; author: string; color: string; category: string; subtitle: string }
export type SectionId = 'influencer' | 'code' | 'game' | 'video' | 'music' | 'statistics' | 'books'
export interface SectionConfig { id: SectionId; label: string; enabled: boolean; inNavigation: boolean }
export interface HomepageContent {
  schemaVersion: 1
  isDemo: boolean
  profile: Profile
  sections: SectionConfig[]
  projects: { work: Project[]; games: Project[]; essays: Project[]; music: Project[] }
  skills: Skill[]
  books: Book[]
  copy: {
    stories: { title: string; description: string }
    work: { title: string; introduction: string; openSourceTitle: string; openSourceLead: string; openSourceDescription: string }
    essays: { title: string; name: string; introduction: string; description: string; topics: string[] }
    music: { introduction: string; description: string; gear: string[] }
    reading: { introduction: string; description: string }
  }
  statistics: {
    time: { label: string; values: number[]; color: string }[]
    ages: number[]
    movies: { label: string; value: number; color: string }[]
    music: { label: string; value: number; color: string }[]
  }
}
export interface PostSummary {
  slug: string
  title: string
  description: string
  publishedAt: string
  tags: string[]
  readingMinutes: number
}
export interface Post extends PostSummary { body: string }
export interface ContentService {
  getHomepage(signal?: AbortSignal): Promise<HomepageContent>
  getPosts(signal?: AbortSignal): Promise<PostSummary[]>
  getPost(slug: string, signal?: AbortSignal): Promise<Post | null>
}
