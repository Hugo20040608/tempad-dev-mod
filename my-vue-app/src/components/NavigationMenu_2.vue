<!-- Generated from Figma export: NavigationMenu -->
<template>

<div :style="inlineStyle">

<UNavigationMenu
  :items="[
    {
      label: '樹造幸福',
      to: '/樹造幸福',
      active: true
    },
    {
      label: '愛的報報',
      to: '/愛的報報'
    },
    {
      label: '大樹扎根',
      to: '/大樹扎根'
    },
    {
      label: '聯絡我們',
      to: '/聯絡我們'
    }
  ]"
  color="neutral"
  variant="link"
/>




</div>

</template>

<script setup>
const inlineStyle = {
  display: 'flex',
  width: '344px',
  height: '48px',
  alignItems: 'center',
  flexShrink: '0'
}

</script>

<style scoped>

display: flex;
width: 344px;
height: 48px;
align-items: center;
flex-shrink: 0;



</style>
