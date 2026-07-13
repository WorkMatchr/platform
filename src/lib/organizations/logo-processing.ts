import sharp from 'sharp'
import { logLogoDevelopment, logoErrorDetails } from './logo-development-log'

export const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024
export const MAX_LOGO_DIMENSION = 10_000
export const OUTPUT_LOGO_DIMENSION = 1024
const ALLOWED_FORMATS = new Set(['png', 'jpeg', 'webp'])
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const FORMAT_MIME_TYPES = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' } as const

export class LogoValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LogoValidationError'
  }
}

export type ProcessedLogo = {
  data: Buffer
  mimeType: 'image/webp'
  sizeBytes: number
  width: number
  height: number
}

export async function processOrganizationLogo(data: Buffer, declaredMimeType: string): Promise<ProcessedLogo> {
  if (data.length === 0) throw new LogoValidationError('Selecteer een afbeeldingsbestand.')
  if (data.length > MAX_LOGO_SIZE_BYTES) throw new LogoValidationError('Het logo mag maximaal 2 MB groot zijn.')
  if (!ALLOWED_MIME_TYPES.has(declaredMimeType.toLowerCase())) {
    throw new LogoValidationError('Alleen PNG, JPG en WebP zijn toegestaan.')
  }

  try {
    logLogoDevelopment('processing', 'sharp-started')
    const image = sharp(data, { failOn: 'error', limitInputPixels: MAX_LOGO_DIMENSION * MAX_LOGO_DIMENSION })
    const metadata = await image.metadata()
    logLogoDevelopment('processing', 'metadata-read', {
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      channels: metadata.channels,
      hasAlpha: metadata.hasAlpha,
    })
    if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
      throw new LogoValidationError('De werkelijke bestandsinhoud is geen toegestane afbeelding.')
    }
    if (FORMAT_MIME_TYPES[metadata.format as keyof typeof FORMAT_MIME_TYPES] !== declaredMimeType.toLowerCase()) {
      throw new LogoValidationError('Het bestandstype komt niet overeen met de werkelijke afbeeldingsinhoud.')
    }
    if (!metadata.width || !metadata.height || metadata.width > MAX_LOGO_DIMENSION || metadata.height > MAX_LOGO_DIMENSION) {
      throw new LogoValidationError('De afmetingen van het logo zijn niet toegestaan.')
    }

    const { data: output, info } = await image
      .rotate()
      .resize({ width: OUTPUT_LOGO_DIMENSION, height: OUTPUT_LOGO_DIMENSION, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, alphaQuality: 90 })
      .toBuffer({ resolveWithObject: true })

    logLogoDevelopment('processing', 'webp-conversion-succeeded', {
      width: info.width,
      height: info.height,
      sizeBytes: output.length,
    })

    return { data: output, mimeType: 'image/webp', sizeBytes: output.length, width: info.width, height: info.height }
  } catch (error) {
    logLogoDevelopment('processing', 'failed', logoErrorDetails(error))
    if (error instanceof LogoValidationError) throw error
    throw new LogoValidationError('Het afbeeldingsbestand kon niet veilig worden verwerkt.')
  }
}
