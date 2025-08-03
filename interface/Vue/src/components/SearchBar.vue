<template>
  <div class="search-bar">
    <span class="icon">
      <!-- Loupe SVG -->
      <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="7"/>
        <line x1="17" y1="17" x2="21" y2="21"/>
      </svg>
    </span>
    <input
      class="search-input"
      :placeholder="placeholder"
      :value="modelValue"
      @input="event => $emit('update:modelValue', event.target.value)"
      @keydown.enter="$emit('search', modelValue)"
      :disabled="disabled"
    />
    <button v-if="modelValue" class="clear-btn" @click="$emit('update:modelValue', '')" type="button">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <line x1="6" y1="6" x2="18" y2="18"/>
        <line x1="6" y1="18" x2="18" y2="6"/>
      </svg>
    </button>
    <!-- Slot pour résultats de recherche -->
    <div v-if="$slots.results" class="search-results-dropdown">
      <slot name="results" />
    </div>
    <div v-if="$slots['no-result']" class="search-results-dropdown">
      <slot name="no-result" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string,
  placeholder?: string,
  disabled?: boolean
}>()
defineEmits(['update:modelValue', 'search'])
</script>

<style scoped>
.search-bar {
  display: flex;
  align-items: center;

  border-radius: 1.3rem;
  padding: 0.15rem 1rem 0.15rem 0.7rem;
  background: rgba(255,255,255,0.06);
  box-shadow: 0px 0.5px 8px 3px rgba(68, 102, 214, 0.242);
  transition: box-shadow 0.18s, background 0.18s, color 0.18s;
  width: 100%;
  max-width: 340px;
  position: relative;
}
.search-bar:focus-within {
  box-shadow: 1px 0.5px 8px 3px rgba(68, 75, 214, 0.57);
}
.search-bar:hover {
  box-shadow: 0px 0.5px 8px 2px rgba(68, 102, 214, 0.57);
}
.icon {
  color: #8ea6d6;
  margin-right: 0.45em;
  display: flex;
  align-items: center;
}
.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--color-text);
  font-size: 1.07em;
  padding: 0.5em 0;
  border-radius: 1rem;
  transition: background 0.18s;
}
.search-input::placeholder {
  color: #b4b4c2;
  opacity: 1;
  font-style: italic;
  letter-spacing: 0.01em;
}
.clear-btn {
  background: none;
  border: none;
  color: #8ea6d6;
  cursor: pointer;
  padding: 0 0.2em;
  display: flex;
  align-items: center;
  margin-left: 0.2em;
  border-radius: 50%;
  transition: background 0.16s;
}
.clear-btn:hover {
  background: rgba(68, 102, 214, 0.13);
}
.search-results-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  z-index: 20;
  background: var(--color-background);
  box-shadow: 0 6px 18px 0 rgba(68, 102, 214, 0.13);
  border-radius: 1.1rem;
  margin-top: 0.32rem;
  padding: 0.15rem 0.08rem 0.19rem 0.08rem;
  max-height: 260px;
  overflow-y: auto;
  min-width: 180px;
}
</style>
