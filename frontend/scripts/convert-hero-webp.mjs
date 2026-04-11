// Convertit les images hero PNG en WebP pour optimisation
// Usage : node scripts/convert-hero-webp.mjs
import sharp from 'sharp'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(__dirname, '../public')

const HERO_IMAGES = ['formule.png', 'banhh.png', 'about.png']

for (const file of HERO_IMAGES) {
  const input  = resolve(publicDir, file)
  const output = resolve(publicDir, file.replace('.png', '.webp'))
  await sharp(input).webp({ quality: 82 }).toFile(output)
  console.log(`✓ ${file} → ${file.replace('.png', '.webp')}`)
}
