#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const args = process.argv.slice(2)
const inputFile = args[0] || path.resolve(process.cwd(), 'downloaded-components.txt')
const targetApp = path.resolve(process.cwd(), 'my-vue-app')

function readFileSafe(p) {
  try {
    return fs.readFileSync(p, 'utf8')
  } catch (e) {
    return null
  }
}

function safeMkdir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function sanitizeName(name) {
  return name
    .replace(/[^a-zA-Z0-9\-\_ ]/g, '')
    .trim()
    .replace(/\s+/g, '_') || 'Generated'
}

function parseBlocks(content) {
  const lines = content.split(/\r?\n/)
  const comps = []
  let cur = null
  let curSection = null

  const compRe = /^\/\/\s*=====\s*Component:\s*(.*)\s*=====\s*$/
  const secRe = /^\/\/\s*----\s*(.*)\s*\((.*)\)\s*----\s*$/

  for (const raw of lines) {
    const line = raw.replace(/\t/g, '')
    const m = line.match(compRe)
    if (m) {
      if (cur) comps.push(cur)
      cur = { name: m[1].trim(), sections: [] }
      curSection = null
      continue
    }

    const s = line.match(secRe)
    if (s && cur) {
      cur.sections.push({ title: s[1].trim(), lang: s[2].trim().toLowerCase(), code: '' })
      curSection = cur.sections[cur.sections.length - 1]
      continue
    }

    if (curSection) {
      curSection.code += raw + '\n'
    }
  }

  if (cur) comps.push(cur)
  return comps
}

function buildSFC(component, idx) {
  const nameBase = sanitizeName(component.name || `Component_${idx + 1}`)
  const compName = nameBase.replace(/[^A-Za-z0-9_]/g, '')

  const htmlParts = []
  const cssParts = []
  const jsParts = []

  for (const sec of component.sections) {
    if (!sec || !sec.lang) continue
  if (sec.lang.includes('css')) cssParts.push(sec.code)
  else if (sec.lang === 'html' || sec.lang === 'vue' || sec.lang === 'template' || sec.lang === 'component') htmlParts.push(sec.code)
  else if (sec.lang === 'js' || sec.lang === 'jsx' || sec.lang === 'tsx') jsParts.push(sec.code)
    else {
      // unknown, push into template as preformatted
      htmlParts.push(`<pre>${escapeHtml(sec.code)}</pre>`) 
    }
  }

  let template = ''
  if (htmlParts.length) {
    // preserve Nuxt UI template markup as-is
    template = htmlParts.join('\n')
  } else {
    // fallback template
    template = `\n<div class="generated-root">\n  <!-- generated component: ${component.name} -->\n  <div>${component.name}</div>\n</div>\n`
  }

  let script = ''
  let scriptSetup = ''

  // helper: convert CSS declarations to JS style object literal string
  function cssDeclsToJsObject(cssText) {
    const lines = cssText.split(/;\s*\n?/).map(l => l.trim()).filter(Boolean)
    const obj = {}
    for (const ln of lines) {
      const idx = ln.indexOf(':')
      if (idx === -1) continue
      const prop = ln.slice(0, idx).trim()
      const val = ln.slice(idx + 1).trim()
      const key = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
      obj[key] = val
    }
    // stringify values
    const entries = Object.entries(obj).map(([k, v]) => {
      // ensure string quoting
      const safe = v.replace(/'/g, "\\'")
      return `  ${k}: '${safe}'`
    })
    return `{\n${entries.join(',\n')}\n}`
  }

  if (jsParts.length) {
    const first = jsParts[0].trim()
    if (/^\{[\s\S]*\}$/.test(first)) {
      // treat as style object (prefer JS style if present)
      scriptSetup += `const inlineStyle = ${first}\n`
      if (!template.includes(':style')) {
        template = `\n<div :style=\"inlineStyle\">\n${template}\n</div>\n`
      }
    } else {
      // include raw js into script setup
      scriptSetup += jsParts.join('\n') + '\n'
    }
  } else if (cssParts.length) {
    // try to detect if cssParts are raw declarations (no selectors)
    const joined = cssParts.join('\n')
    const looksLikeDecls = /^\s*[a-zA-Z-]+\s*:/m.test(joined)
    if (looksLikeDecls) {
      const objLit = cssDeclsToJsObject(joined)
      scriptSetup += `const inlineStyle = ${objLit}\n`
      if (!template.includes(':style')) {
        template = `\n<div :style=\"inlineStyle\">\n${template}\n</div>\n`
      }
      // leave cssParts out of <style> since applied inline
      cssParts.length = 0
    }
  }

  if (scriptSetup) {
    script = `<script setup>\n${scriptSetup}\n</script>\n`
  } else {
    script = `<script>\nexport default { name: '${compName}' }\n</script>\n`
  }

  const style = cssParts.length ? `<style scoped>\n${cssParts.join('\n')}\n</style>\n` : ''

  const sfc = `<!-- Generated from Figma export: ${component.name} -->\n<template>\n${template}\n</template>\n\n${script}\n${style}`

  return { filename: `${compName}.vue`, content: sfc }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function backupTarget(targetPath) {
  if (!fs.existsSync(targetPath)) return null
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const backup = `${targetPath}-backup-${ts}`
  console.log('Backing up', targetPath, '→', backup)
  // use recursive copy
  fs.cpSync(targetPath, backup, { recursive: true })
  return backup
}

function updateAppVueWithTemplates(templates) {
  const appVuePath = path.join(targetApp, 'src', 'App.vue')

  // Build App.vue with Nuxt UI wrapper and NuxtPage; inject templates inside NuxtPage
  const joined = templates.map(t => t.trim()).filter(Boolean).join('\n\n')

  const newApp = `<!-- Auto-generated App.vue: injected Figma components -->\n<template>\n  <UApp>\n    <NuxtPage>\n${joined.split('\n').map(l => '      ' + l).join('\n')}\n    </NuxtPage>\n  </UApp>\n</template>\n\n<script setup lang=\"ts\">\n// Nuxt UI components are expected to be globally available in this project\n</script>\n\n<style scoped>\n/* Generated styles are not included; keep your project's styles and Tailwind config */\n</style>\n`

  fs.writeFileSync(appVuePath, newApp, 'utf8')
  console.log('Overwrote', appVuePath)
}

function writeComponentsToApp(comps) {
  const compDir = path.join(targetApp, 'src', 'components')
  safeMkdir(compDir)

  const files = []
  const used = new Map()
  comps.forEach((c, i) => {
    // only generate if there is a vue/template section
    const tplSection = c.sections.find(s => ['vue', 'template', 'component'].includes(s.lang))
    if (!tplSection || !tplSection.code || !tplSection.code.trim()) {
      return
    }

    let sfc = buildSFC(c, i)
    let filename = sfc.filename
    const base = filename.replace(/\.vue$/i, '')

    if (used.has(base)) {
      const count = used.get(base) + 1
      used.set(base, count)
      const newBase = `${base}_${count}`
      filename = `${newBase}.vue`

      // update component name inside SFC content (export default { name: 'Old' })
      sfc.content = sfc.content.replace(/export default \{\s*name:\s*'[^']*'\s*\}/, `export default { name: '${newBase}' }`)
      // also update header comment if present
      sfc.content = sfc.content.replace(/<!-- Generated from Figma export: [^>]*-->/, `<!-- Generated from Figma export: ${c.name} -->`)
    } else {
      used.set(base, 1)
    }

    const p = path.join(compDir, filename)
    fs.writeFileSync(p, sfc.content, 'utf8')
    files.push(filename)
    console.log('Wrote', p)
  })

  return files
}

function updateAppVue(files) {
  const appVuePath = path.join(targetApp, 'src', 'App.vue')

  const imports = files.map((f, i) => {
    const name = path.basename(f, '.vue')
    return `import ${name} from './components/${f}'`
  }).join('\n')

  const uses = files.map((f) => {
    const name = path.basename(f, '.vue')
    return `  <section class="generated-section">\n    <h3>${name}</h3>\n    <${name} />\n  </section>`
  }).join('\n')

  const newApp = `<!-- Auto-generated App.vue: shows generated Figma components -->\n<template>\n  <UApp>\n    <NuxtPage>\n${uses.split('\n').map(l => '      ' + l).join('\n')}\n    </NuxtPage>\n  </UApp>\n</template>\n\n<script setup lang=\"ts\">\n${imports}\n</script>\n\n<style>\n#app { padding: 20px }\n.generated-section { margin-bottom: 24px }\n</style>\n`

  fs.writeFileSync(appVuePath, newApp, 'utf8')
  console.log('Overwrote', appVuePath)
}

function main() {
  if (!fs.existsSync(inputFile)) {
    console.error('Input file not found:', inputFile)
    process.exit(1)
  }

  if (!fs.existsSync(targetApp)) {
    console.error('Target my-vue-app not found at', targetApp)
    process.exit(1)
  }

  const content = fs.readFileSync(inputFile, 'utf8')
  const comps = parseBlocks(content)

  if (!comps.length) {
    console.error('No components found in input file')
    process.exit(1)
  }

  // write per-component .vue files for components that have template sections
  const files = writeComponentsToApp(comps)

  if (!files.length) {
    console.error('No components with Vue template sections were generated')
    process.exit(1)
  }

  // update App.vue to import and display generated components
  updateAppVue(files)

  console.log('\nDone. Review the generated components in my-vue-app/src/components')
  console.log('Then:')
  console.log('  cd my-vue-app')
  console.log('  pnpm install (or npm install)')
  console.log('  pnpm dev (or npm run dev)')
}

main()
