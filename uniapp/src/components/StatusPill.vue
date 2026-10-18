<script setup lang="ts">
import { computed } from "vue";
import { statusLabel, statusTone } from "../utils/present";

const props = defineProps<{
  status: string;
}>();

const label = computed(() => statusLabel(props.status));
const tone = computed(() => statusTone(props.status));
</script>

<template>
  <text class="status-pill" :class="`status-${tone}`">{{ label }}</text>
</template>
