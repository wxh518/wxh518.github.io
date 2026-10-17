import Ajv, { type ErrorObject } from 'ajv'
import addFormats from 'ajv-formats'
import homepageSchema from '../content/schemas/homepage.schema.json'
import postsSchema from '../content/schemas/posts.schema.json'
import type { HomepageContent, Post } from '../src/types/content'

// 仅在 Node.js 开发工具中运行，Ajv 和 Schema 不进入浏览器或 Worker 产物。
const ajv = new Ajv({ allErrors: true, strict: true })
addFormats(ajv)
const validateHomepage = ajv.compile<HomepageContent>(homepageSchema)
const validatePosts = ajv.compile<{ schemaVersion: 1; posts: Post[] }>(postsSchema)

function formatErrors(file: string, errors: ErrorObject[] | null | undefined) {
  return (errors ?? []).map(error => {
    const field = error.keyword === 'required' ? error.params.missingProperty
      : error.keyword === 'additionalProperties' ? error.params.additionalProperty : undefined
    const path = `${error.instancePath}${field ? `/${field}` : ''}` || '/'
    return `${file}${path}：${error.message}`
  })
}

/** 同时检查结构和跨字段约束；返回所有错误，方便一次修完。 */
export function validateContent(homepage: unknown, postsFile: unknown): string[] {
  const errors: string[] = []
  const homepageValid = validateHomepage(homepage)
  errors.push(...formatErrors('content/homepage.json', validateHomepage.errors))
  const postsValid = validatePosts(postsFile)
  errors.push(...formatErrors('content/posts.json', validatePosts.errors))

  function unique(values: string[], path: string) {
    const seen = new Set<string>()
    for (const [index, value] of values.entries()) {
      if (seen.has(value)) errors.push(`${path}/${index}：标识或名称重复「${value}」`)
      seen.add(value)
    }
  }

  if (homepageValid) {
    unique(homepage.sections.map(section => section.id), 'content/homepage.json/sections')
    unique(homepage.profile.socials.map(social => social.id), 'content/homepage.json/profile/socials')
    unique(Object.values(homepage.projects).flat().map(project => project.id), 'content/homepage.json/projects（合并各组）')
    unique(homepage.skills.map(skill => skill.tag), 'content/homepage.json/skills')
    unique(homepage.books.map(book => book.title), 'content/homepage.json/books')

    const enabledSections = new Set(homepage.sections.filter(section => section.enabled).map(section => section.id))
    for (const [index, role] of homepage.profile.roles.entries()) {
      if (!enabledSections.has(role.target)) errors.push(`content/homepage.json/profile/roles/${index}/target：目标板块「${role.target}」不存在或未启用`)
    }

    const { ages, time, movies, music } = homepage.statistics
    if (ages.some((age, index) => index > 0 && age <= ages[index - 1])) {
      errors.push('content/homepage.json/statistics/ages：年龄必须严格递增')
    }
    unique(time.map(series => series.label), 'content/homepage.json/statistics/time')
    for (const [index, series] of time.entries()) {
      if (series.values.length !== ages.length) errors.push(`content/homepage.json/statistics/time/${index}/values：数值个数必须与 ages 一致`)
    }
    for (const [index, age] of ages.entries()) {
      const total = time.reduce((sum, series) => sum + (series.values[index] ?? 0), 0)
      if (Math.abs(total - 100) > 0.000001) errors.push(`content/homepage.json/statistics/time：${age} 岁的时间占比合计为 ${total}，应为 100`)
    }
    for (const [name, items] of Object.entries({ movies, music })) {
      unique(items.map(item => item.label), `content/homepage.json/statistics/${name}`)
      if (items.reduce((sum, item) => sum + item.value, 0) <= 0) errors.push(`content/homepage.json/statistics/${name}：雷达图数值合计必须大于零`)
    }
  }
  if (postsValid) unique(postsFile.posts.map(post => post.slug), 'content/posts.json/posts')
  return errors
}
