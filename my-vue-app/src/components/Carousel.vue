<!-- Generated from Figma export: Carousel -->
<template>

<div :style="inlineStyle">

<UCarousel
  :items="[]"
  arrows
  dots
  :prev="{
    variant: 'outline',
    square: true
  }"
  :next="{
    variant: 'outline',
    square: true
  }"
/>




</div>

</template>

<script setup>
const inlineStyle = {
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 'var(--6, 24px)'
}

</script>

<style scoped>

display: inline-flex;
flex-direction: column;
align-items: center;
gap: var(--6, 24px);



</style>
