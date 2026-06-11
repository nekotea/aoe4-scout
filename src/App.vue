<script setup lang="ts">
import { ref } from 'vue'
import ScoutPage from './components/ScoutPage.vue'
import AlliesPage from './components/AlliesPage.vue'

const tab = ref('scout')
</script>

<template>
  <v-app>
    <v-app-bar density="compact" flat>
      <v-app-bar-title class="font-weight-bold">
        <v-icon class="mr-1">mdi-binoculars</v-icon>AoE4 Scout
      </v-app-bar-title>
      <v-tabs v-model="tab">
        <v-tab value="scout">侦查</v-tab>
        <v-tab value="allies">友军</v-tab>
      </v-tabs>
    </v-app-bar>

    <v-main>
      <v-container fluid>
        <v-window v-model="tab">
          <v-window-item value="scout"><ScoutPage /></v-window-item>
          <v-window-item value="allies"><AlliesPage /></v-window-item>
        </v-window>
      </v-container>
    </v-main>
  </v-app>
</template>
