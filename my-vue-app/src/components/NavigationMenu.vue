<!-- Generated from Figma export: NavigationMenu -->
<template>

<div :style="inlineStyle">

<UNavigationMenu
  :items="[
    {
      label: 'Label',
      icon: 'i-lucide-book-open',
      to: '/label',
      badge: {
        label: '10',
        size: 'xs'
      },
      active: true
    },
    {
      label: 'Label',
      icon: 'i-lucide-book-open',
      to: '/label',
      badge: {
        label: '10',
        size: 'xs'
      }
    },
    {
      label: 'Label',
      icon: 'i-lucide-book-open',
      to: '/label',
      badge: {
        label: '10',
        size: 'xs'
      }
    },
    {
      label: 'Label',
      icon: 'i-lucide-book-open',
      to: '/label',
      badge: {
        label: '10',
        size: 'xs'
      }
    }
  ]"
  color="neutral"
  variant="link"
/>




</div>

</template>

<script setup>
const inlineStyle = {
  display: 'inline-flex',
  alignItems: 'center'
}

</script>

<style scoped>

display: inline-flex;
align-items: center;



</style>
