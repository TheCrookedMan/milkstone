<script setup lang="ts">
import { ref } from 'vue'
import ThemeModeSwitch from '../../components/ThemeModeSwitch.vue'
const count = ref(0)
</script>

<template>
  <main style="padding:40px;max-width:600px;margin:auto">
    <section class="panel" style="padding:30px">
      <ThemeModeSwitch/>
      <h1>纸上成形，触感有度。</h1>
      <p>以纸面为底，让高光与投影塑造层次。轻轻按下，感受细微的下沉与从容回位。</p>
      <button class="primary" @click="count++">已按下 {{ count }} 次</button>
    </section>
  </main>
</template>
