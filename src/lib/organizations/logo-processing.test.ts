import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { MAX_LOGO_SIZE_BYTES, processOrganizationLogo } from './logo-processing'

async function image(format: 'png' | 'jpeg' | 'webp') {
  return sharp({ create: { width: 32, height: 24, channels: 4, background: { r: 20, g: 121, b: 166, alpha: 0.5 } } })[format]().toBuffer()
}

describe('logobeeldverwerking', () => {
  it.each([['png', 'image/png'], ['jpeg', 'image/jpeg'], ['webp', 'image/webp']] as const)('verwerkt geldig %s naar WebP', async (format, mimeType) => {
    const result = await processOrganizationLogo(await image(format), mimeType)
    expect(result.mimeType).toBe('image/webp')
    expect((await sharp(result.data).metadata()).format).toBe('webp')
    expect(result.width).toBe(32)
    expect(result.height).toBe(24)
  })

  it('weigert bestanden groter dan 2 MB', async () => {
    await expect(processOrganizationLogo(Buffer.alloc(MAX_LOGO_SIZE_BYTES + 1), 'image/png')).rejects.toThrow('maximaal 2 MB')
  })

  it('weigert verkeerde MIME en inhoud die niet bij de declaratie past', async () => {
    const png = await image('png')
    await expect(processOrganizationLogo(png, 'application/octet-stream')).rejects.toThrow('Alleen PNG')
    await expect(processOrganizationLogo(png, 'image/jpeg')).rejects.toThrow('komt niet overeen')
  })

  it('weigert SVG, ook wanneer de naam of declaratie PNG suggereert', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
    await expect(processOrganizationLogo(svg, 'image/png')).rejects.toThrow('veilig worden verwerkt')
  })

  it('weigert willekeurige uitvoerbare inhoud', async () => {
    await expect(processOrganizationLogo(Buffer.from('MZ executable'), 'image/png')).rejects.toThrow('veilig worden verwerkt')
  })
})
