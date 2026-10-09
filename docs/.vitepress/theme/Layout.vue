<script setup lang="ts">
import { computed, provide } from 'vue'
import { dataSymbol, useData } from 'vitepress'
import DefaultTheme from 'vitepress/theme'

const data = useData()
const isSharedApi = computed(() => data.page.value.relativePath.startsWith('api/'))
const { Layout } = DefaultTheme

// The generated API is shared and English-only. Do not invent /ru/api/... pages.
provide(dataSymbol, {
  ...data,
  theme: computed(() =>
    isSharedApi.value ? { ...data.theme.value, i18nRouting: false } : data.theme.value,
  ),
  // Translated headings use different ids; switch guides at the top of the same page.
  hash: computed(() => ''),
})
</script>

<template>
  <Layout />
</template>
