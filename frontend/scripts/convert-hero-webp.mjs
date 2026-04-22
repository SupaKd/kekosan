// Conversion automatique des images PNG hero en WebP au build
import sharp from 'sharp';
import { readdir } from 'fs/promises';
import { join, extname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const publicDir = join(__dirname, '../public');

const SOURCE_IMAGES = ['formule.png', 'banhh.png', 'about.png', 'herobanh.png', 'heroform.png'];

async function convertToWebp() {
  for (const filename of SOURCE_IMAGES) {
    const inputPath = join(publicDir, filename);
    const outputPath = join(publicDir, basename(filename, extname(filename)) + '.webp');

    try {
      await sharp(inputPath)
        .webp({ quality: 82 })
        .toFile(outputPath);

      console.log(`✓ Converti : ${filename} → ${basename(outputPath)}`);
    } catch (err) {
      console.warn(`⚠ Impossible de convertir ${filename} : ${err.message}`);
    }
  }
}

convertToWebp();
