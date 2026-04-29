// Run once with: node generate-icons.mjs
// Requires: npm install sharp
// Then delete this file.
import sharp from 'sharp'
import { readFileSync } from 'fs'

const svg = readFileSync('./public/icons/icon.svg')

await sharp(svg).resize(192, 192).png().toFile('./public/icons/icon-192.png')
await sharp(svg).resize(512, 512).png().toFile('./public/icons/icon-512.png')

console.log('Icons generated.')
