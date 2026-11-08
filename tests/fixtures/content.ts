import type { ContentDocument } from '../../src/types/admin'
import type { HomepageContent, Post, Project, Social } from '../../src/types/content'

// 测试数据不读取站主的文章和主页配置，避免正常编辑内容时改变测试前提。
const project = (id: string): Project => ({ id, title: id, subtitle: '', description: '', tags: [], art: 'code' })
const social = (id: string): Social => ({ id, name: id, handle: '', metric: 0, unit: '', color: '#334155', description: '', url: '' })
const chartItems = () => ['First', 'Second', 'Third'].map(label => ({ label, value: 1, color: '#334155' }))
const homepage: HomepageContent & { $schema: string } = {
  $schema: './schemas/homepage.schema.json',
  schemaVersion: 1,
  isDemo: true,
  profile: {
    name: 'Test author', names: ['Test author'], tagline: '', roles: [{ label: 'Code', target: 'code' }],
    city: '', email: '', intro: '', statement: '', contact: '', socials: [social('github'), social('bilibili')],
  },
  sections: [
    { id: 'code', label: 'Code', enabled: true, inNavigation: true },
    { id: 'game', label: 'Games', enabled: true, inNavigation: true },
  ],
  projects: { work: [project('test-work')], games: [project('test-game')], essays: [], music: [] },
  skills: [
    { name: 'TypeScript', tag: 'typescript', level: 5, note: '' },
    { name: 'CSS', tag: 'css', level: 5, note: '' },
  ],
  books: [],
  copy: {
    stories: { title: 'Stories', description: '' },
    work: { title: 'Work', introduction: '', openSourceTitle: 'Open source', openSourceLead: '', openSourceDescription: '' },
    essays: { title: 'Essays', name: 'Test author', introduction: '', description: '', topics: [] },
    music: { introduction: '', description: '', gear: [] },
    reading: { introduction: '', description: '' },
  },
  statistics: {
    ages: [20, 30],
    time: [
      { label: 'Study', values: [60, 40], color: '#86efac' },
      { label: 'Work', values: [40, 60], color: '#93c5fd' },
    ],
    movies: chartItems(),
    music: chartItems(),
    space: {
      mapImage: './images/test-map.svg', mapAlt: 'Test map', marker: { x: 40, y: 40 },
      bounds: { west: 100, east: 140, south: 22, north: 52 },
      currentLocation: { name: 'Current city', latitude: 40, longitude: 116 },
      visitedPlaces: [
        { name: 'First city', latitude: 30, longitude: 120 },
        { name: 'Second city', latitude: 36, longitude: 119 },
      ],
    },
  },
}
const firstPost: Post = {
  slug: 'test-article', title: 'Test article', description: 'An example for tests',
  publishedAt: '2026-01-01', tags: ['test'], readingMinutes: 1, body: '# Test body',
}
const posts = [firstPost, { ...firstPost, slug: 'second-test-article', title: 'Second test article' }]

export function createConfigFixture() {
  return {
    homepage: structuredClone(homepage),
    articles: { schemaVersion: 1, posts: structuredClone(posts) },
  }
}

export function createContentFixture(): ContentDocument {
  const { homepage: { $schema: _schema, ...homepage }, articles } = createConfigFixture()
  return { homepage, posts: articles.posts }
}
