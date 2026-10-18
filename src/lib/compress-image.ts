/** 写作工作台与云端工作台共用压缩规则，避免大图阻塞发布。 */
export async function compressImage(file: File): Promise<Blob> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('请选择 PNG、JPEG 或 WebP 图片。')
  if (file.size > 20 * 1024 * 1024) throw new Error('原图请控制在 20 MB 以内。')
  const image = await createImageBitmap(file)
  try {
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('浏览器暂不支持图片处理。')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    for (const quality of [.85, .7, .5, .35]) {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', quality))
      if (blob && blob.size <= 512 * 1024) return blob
    }
    throw new Error('压缩后仍超过 512 KB，请裁剪图片后重试。')
  } finally { image.close() }
}
