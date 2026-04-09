const multer = require('multer')
const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const UPLOADS_DIR = path.join(__dirname, '../../public/uploads')

// Stockage en mémoire — sharp s'occupe du fichier final
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Format non supporté (jpeg, png, webp uniquement)'))
  },
})

// Middleware upload + resize produit
const uploadProductImage = [
  upload.single('image'),
  async (req, res, next) => {
    if (!req.file) return res.status(400).json({ error: 'Aucune image fournie' })

    try {
      const filename = `product_${req.params.id}_${Date.now()}.webp`
      const filepath = path.join(UPLOADS_DIR, filename)

      await sharp(req.file.buffer)
        .resize(800, 600, { fit: 'cover', position: 'centre' })
        .webp({ quality: 85 })
        .toFile(filepath)

      req.uploadedFilename = filename
      next()
    } catch (err) {
      next(err)
    }
  },
]

// Middleware upload + resize formule
const uploadFormulaImage = [
  upload.single('image'),
  async (req, res, next) => {
    if (!req.file) return res.status(400).json({ error: 'Aucune image fournie' })

    try {
      const filename = `formula_${req.params.id}_${Date.now()}.webp`
      const filepath = path.join(UPLOADS_DIR, filename)

      await sharp(req.file.buffer)
        .resize(800, 500, { fit: 'cover', position: 'centre' })
        .webp({ quality: 85 })
        .toFile(filepath)

      req.uploadedFilename = filename
      next()
    } catch (err) {
      next(err)
    }
  },
]

// Supprime l'ancienne image si elle existe
const deleteOldImage = (imageUrl) => {
  if (!imageUrl) return
  const filename = path.basename(imageUrl)
  const filepath = path.join(UPLOADS_DIR, filename)
  if (fs.existsSync(filepath)) fs.unlinkSync(filepath)
}

module.exports = { uploadProductImage, uploadFormulaImage, deleteOldImage }
