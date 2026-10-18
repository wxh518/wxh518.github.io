import type { ErrorObject } from 'ajv'
import { homepage as validateHomepage, posts as validatePosts } from '../generated/validators.js'
import type { HomepageContent, Post } from '../types/content'

/** 草稿预览允许工作台暂存的栅格图片，公开配置仍必须使用正式图片路径。 */
export function validateDraftHomepage(homepage: unknown): string[] {
  try {
    const normalized = JSON.parse(JSON.stringify(homepage).replace(/data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}/g, './images/draft-preview.webp'))
    return validateContent(normalized, { schemaVersion: 1, posts: [] })
  } catch { return ['主页草稿格式不完整，无法预览。'] }
}

function formatErrors(file: string, errors: ErrorObject[] | null | undefined) {
  return (errors ?? []).map(error => {
    const field = error.keyword === 'required' ? error.params.missingProperty
      : error.keyword === 'additionalProperties' ? error.params.additionalProperty : undefined
    const path = `${error.instancePath}${field ? `/${field}` : ''}` || '/'
    return `${file}${path}：${error.message}`
  })
}

/** 同时检查结构和跨字段约束；返回所有错误，方便一次修完。 */
export function validateContent(homepageInput: unknown, postsInput: unknown): string[] {
  const errors: string[] = []
  const homepageValid = validateHomepage(homepageInput)
  errors.push(...formatErrors('content/homepage.json', validateHomepage.errors))
  const postsValid = validatePosts(postsInput)
  errors.push(...formatErrors('content/posts.json', validatePosts.errors))

  function unique(values: string[], path: string) {
    const seen = new Set<string>()
    for (const [index, value] of values.entries()) {
      if (seen.has(value)) errors.push(`${path}/${index}：标识或名称重复「${value}」`)
      seen.add(value)
    }
  }

  if (homepageValid) {
    const homepage = homepageInput as HomepageContent
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
    const space = homepage.statistics.space
    if (space && (space.bounds || space.currentLocation || space.visitedPlaces)) {
      if (!space.bounds || !space.currentLocation) errors.push('content/homepage.json/statistics/space：城市足迹需同时配置地图范围和当前位置')
      if (space.bounds) {
        const { west, east, south, north } = space.bounds
        if (west >= east || south >= north) errors.push('content/homepage.json/statistics/space/bounds：最东经度须大于最西经度，最北纬度须大于最南纬度')
        for (const place of [...(space.currentLocation ? [space.currentLocation] : []), ...(space.visitedPlaces || [])]) {
          if (place.longitude < west || place.longitude > east || place.latitude < south || place.latitude > north) errors.push(`content/homepage.json/statistics/space：${place.name} 的坐标超出底图范围`)
        }
      }
      unique((space.visitedPlaces || []).map(place => place.name), 'content/homepage.json/statistics/space/visitedPlaces')
    }
  }
  if (postsValid) unique((postsInput as { posts: Post[] }).posts.map(post => post.slug), 'content/posts.json/posts')
  return errors
}
