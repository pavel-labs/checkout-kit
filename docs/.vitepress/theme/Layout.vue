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
  hash: computed(() => (isSharedApi.value ? '' : data.hash.value)),
})
</script>

<template>
  <Layout />
</template>
