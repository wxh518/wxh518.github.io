import assert from 'node:assert/strict'
import { test } from 'node:test'
import homepageFile from '../content/homepage.json'
import postsFile from '../content/posts.json'
import { validateContent } from '../scripts/content-validation'
import { createConfigContentService } from '../src/services/config-content-service'
import type { HomepageContent } from '../src/types/content'

function fixture() {
  return { homepage: structuredClone(homepageFile), articles: structuredClone(postsFile) }
}

test('JSON configuration satisfies schemas and cross-field constraints', () => {
  assert.deepEqual(validateContent(homepageFile, postsFile), [])
})

test('schema validation rejects unknown fields, invalid levels and impossible dates', () => {
  const { homepage, articles } = fixture()
  homepage.skills[0].level = 11
  articles.posts[0].publishedAt = '2026-02-30'
  const errors = validateContent({ ...homepage, typo: 'unexpected' }, articles).join('\n')
  assert.match(errors, /homepage\.json\/typo/)
  assert.match(errors, /\/skills\/0\/level/)
  assert.match(errors, /posts\.json\/posts\/0\/publishedAt/)
  assert.ok(validateContent({ ...homepage, schemaVersion: 2 }, articles).some(error => error.includes('/schemaVersion')))
})

test('stable IDs, article slugs and skill tags cannot be duplicated', () => {
  const { homepage, articles } = fixture()
  homepage.projects.games[0].id = homepage.projects.work[0].id
  homepage.sections[1].id = homepage.sections[0].id
  homepage.profile.socials[1].id = homepage.profile.socials[0].id
  homepage.skills[1].tag = homepage.skills[0].tag
  articles.posts[1].slug = articles.posts[0].slug
  const errors = validateContent(homepage, articles).join('\n')
  for (const field of ['projects', 'sections', 'socials', 'skills', 'posts.json/posts']) {
    assert.ok(errors.includes(field), `缺少重复标识校验：${field}`)
  }
})

test('role links must point to an existing enabled section', () => {
  const { homepage, articles } = fixture()
  homepage.sections.find(section => section.id === 'code')!.enabled = false
  assert.ok(validateContent(homepage, articles).some(error => error.includes('/roles/0/target')))
  homepage.sections = homepage.sections.filter(section => section.id !== 'code')
  assert.ok(validateContent(homepage, articles).some(error => error.includes('/roles/0/target')))
})

test('charts reject mismatched series, unsorted ages, incorrect percentages and empty totals', () => {
  const { homepage, articles } = fixture()
  homepage.statistics.ages.reverse()
  homepage.statistics.time[0].values.pop()
  homepage.statistics.time[1].values[0] = 0
  homepage.statistics.movies.forEach(item => { item.value = 0 })
  const errors = validateContent(homepage, articles).join('\n')
  assert.match(errors, /\/ages/)
  assert.match(errors, /\/time\/0\/values/)
  assert.match(errors, /应为 100/)
  assert.match(errors, /\/movies/)
})

test('optional project links are validated and empty blog lists are supported', () => {
  const { homepage, articles } = fixture()
  const first = homepage.projects.work[0]
  homepage.projects.work[0] = { ...first, url: 'https://example.com/project', image: './images/project.webp' } as typeof first
  articles.posts = []
  assert.deepEqual(validateContent(homepage, articles), [])
  homepage.projects.work[0] = { ...first, url: 'javascript:alert(1)' } as typeof first
  assert.ok(validateContent(homepage, articles).some(error => error.includes('/projects/work/0/url')))
})

test('configuration adapter isolates input and output mutations and preserves public contracts', async () => {
  const { homepage, articles } = fixture()
  const { $schema: _schema, ...data } = homepage
  const source = { homepage: data as HomepageContent, posts: articles.posts }
  const service = createConfigContentService(source)
  const originalName = source.homepage.profile.name
  const originalTitle = source.posts[0].title
  source.homepage.profile.name = 'changed input'
  source.posts[0].title = 'changed input'
  const result = await service.getHomepage()
  assert.equal(result.profile.name, originalName)
  assert.equal('$schema' in result, false)
  result.profile.name = 'changed output'
  assert.equal((await service.getHomepage()).profile.name, originalName)
  const summaries = await service.getPosts()
  assert.equal(summaries[0].title, originalTitle)
  assert.equal('body' in summaries[0], false)
  summaries[0].tags.push('changed output')
  assert.equal((await service.getPosts())[0].tags.includes('changed output'), false)
  const post = (await service.getPost(articles.posts[0].slug))!
  post.body = 'changed output'
  assert.notEqual((await service.getPost(post.slug))!.body, post.body)
  assert.equal(await service.getPost('not-found'), null)
})
