import { readFileSync } from 'node:fs'
import { validateContent } from './content-validation'

function readJson(name: string): unknown {
  try {
    return JSON.parse(readFileSync(new URL(`../content/${name}.json`, import.meta.url), 'utf8'))
  } catch (error) {
    throw new Error(`无法读取 content/${name}.json，请检查文件是否存在及 JSON 语法是否正确`, { cause: error })
  }
}

try {
  const errors = validateContent(readJson('homepage'), readJson('posts'))
  if (errors.length) {
    console.error(`内容配置校验失败（${errors.length} 项）：\n${errors.map(error => `- ${error}`).join('\n')}`)
    process.exitCode = 1
  } else {
    console.log('内容配置校验通过：主页、文章、字段格式及关联约束均有效。')
  }
} catch (error) {
  console.error(error)
  process.exitCode = 1
}
