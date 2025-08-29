<template>
  <div class="compbutton flex flex-row gap-[10px]">
    <UIcon name="i-lucide-rocket" />
    <span class="font-sans text-[24px] font-bold text-center leading-[24px] text-[#00a94f]">{{ 字 }}</span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  字: string
  btnState: string
  btnHover: string
}

const props = defineProps<Props>()
</script>

<style scoped>
.compbutton {
  /* 自定義樣式 */
}
</style>
