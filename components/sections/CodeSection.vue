<script setup lang="ts">
import type { CodeBlock } from '@/codegen/types'

import Badge from '@/components/Badge.vue'
import Code from '@/components/Code.vue'
import IconButton from '@/components/IconButton.vue'
import Info from '@/components/icons/Info.vue'
import Preview from '@/components/icons/Preview.vue'
import Section from '@/components/Section.vue'
import { selection, selectedNode, options, selectedTemPadComponent, activePlugin } from '@/ui/state'
import { getDesignComponent, codegen } from '@/utils'

const componentCode = shallowRef('')
const componentLink = shallowRef('')
const codeBlocks = shallowRef<CodeBlock[]>([])
const warning = shallowRef('')

const playButtonTitle = computed(() =>
  componentLink.value
    ? 'Open in TemPad Playground'
    : 'The component is produced with older versions of TemPad that does not provide a link to TemPad playground.'
)

async function updateCode() {
  const node = selectedNode.value

  if (node == null || selection.value.length > 1) {
    codeBlocks.value = []
    return
  }

  const tempadComponent = selectedTemPadComponent.value
  componentCode.value = tempadComponent?.code || ''
  componentLink.value = tempadComponent?.link || ''

  const component = getDesignComponent(node)

  const style = await node.getCSSAsync()
  const { cssUnit, rootFontSize, scale } = options.value
  const serializeOptions = {
    useRem: cssUnit === 'rem',
    rootFontSize,
    scale
  }

  codeBlocks.value = (
    await codegen(style, component, serializeOptions, activePlugin.value?.code || undefined)
  ).codeBlocks

  if ('warning' in node) {
    warning.value = node.warning
  } else {
    warning.value = ''
  }
}

async function downloadAllFromFrame(frameNode: any) {
  try {
    const parts: string[] = []

    const children = Array.isArray(frameNode.children) ? frameNode.children : []
    const { cssUnit, rootFontSize, scale } = options.value
    const serializeOptions = {
      useRem: cssUnit === 'rem',
      rootFontSize,
      scale
    }

    for (const child of children) {
      // try to get a design component representation for each child
      const component = getDesignComponent(child)
      if (!component) continue

      const style = await child.getCSSAsync()

      const resp = await codegen(style, component, serializeOptions, activePlugin.value?.code || undefined)
      const blocks = resp.codeBlocks || []

      parts.push(`// ===== Component: ${child.name || child.id} =====\n`)
      for (const b of blocks) {
        parts.push(`// ---- ${b.title || b.name} (${b.lang}) ----\n`)
        parts.push(b.code)
        parts.push('\n')
      }
    }

    if (parts.length === 0) {
      // nothing to download
      return
    }

    const blob = new Blob([parts.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const filename = `${frameNode.name ? frameNode.name.replace(/\s+/g, '_') : 'frame'}-components-code.txt`
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (e) {
    // silent fail, could surface a toast in the future
    console.error('downloadAllFromFrame failed', e)
  }
}

watch(options, updateCode, {
  deep: true
})

watch([selectedNode, activePlugin], updateCode)

function open() {
  window.open(componentLink.value)
}
</script>

<template>
  <Section :collapsed="!selectedNode || !(componentCode || codeBlocks.length)">
    <template #header>
      <div class="tp-code-header tp-row tp-shrink tp-gap-l">
        Code
        <Badge v-if="activePlugin" title="Code in this section is transformed by this plugin">{{
          activePlugin.name
        }}</Badge>
      </div>
      <IconButton v-if="warning" variant="secondary" :title="warning" dull>
        <Info />
      </IconButton>
    </template>
    <Code
      v-if="componentCode"
      class="tp-code-code"
      title="Component"
      lang="js"
      :link="componentLink"
      :code="componentCode"
    >
      <template #actions>
        <IconButton
          :disabled="!componentLink"
          variant="secondary"
          :title="playButtonTitle"
          @click="open"
        >
          <Preview />
        </IconButton>
      </template>
    </Code>
    <Code
      v-for="{ name, title, lang, code } in codeBlocks"
      :key="name"
      class="tp-code-code"
      :title="title"
      :lang="lang"
      :code="code"
    />
    <div class="tp-row tp-row-justify" style="padding:8px 16px;">
      <IconButton
        :disabled="!(selectedNode && (selectedNode as any).type === 'FRAME')"
        variant="normal"
        title="Download all components in frame"
        @click="downloadAllFromFrame(selectedNode)"
      >
        Download components
      </IconButton>
    </div>
  </Section>
</template>

<style scoped>
[data-fpl-version='ui2'] .tp-code-header {
  gap: var(--spacer-l, 8px);
}

.tp-code-code {
  margin-bottom: 8px;
}
</style>
