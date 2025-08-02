<template>
  <div class="chat-bar-image-row">
    <button type="button" class="image-btn" aria-label="Envoyer une image" disabled>
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="5" width="16" height="12" rx="2.5" stroke="currentColor" stroke-width="1.7" />
        <circle cx="7.5" cy="9.5" r="1.2" fill="currentColor" />
        <path d="M4 15L9 10L13.5 14L16 11L18 13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      </svg>
    </button>
    <div class="chat-bar chat-bar-redesign">
      <input
        type="text"
        class="chat-input"
        placeholder="Message"
        disabled
      />
      <button type="submit" class="send-btn send-btn-redesign" aria-label="Envoyer" disabled>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M2 11L20 2L11 20L10 13L2 11Z" fill="currentColor" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
// Pour l'instant, composant purement visuel (preview)
</script>

<style scoped>
.chat-bar-image-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-top: 0.7rem;
}

.image-btn {
  margin-top: 0.6rem;
  margin-right: 0.1rem;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255,255,255,0.12);
  color: #77aaff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px 0 rgba(68,102,214,0.09);
  border: none;
  transition: background 0.16s, color 0.13s, transform 0.13s;
  cursor: not-allowed;
  opacity: 0.8;
}
.image-btn svg {
  display: block;
}

.chat-bar.chat-bar-redesign {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255,255,255,0.08);
  border-radius: 1.2rem;
  padding: 0.22rem 0.36rem 0.22rem 0.8rem;
  box-shadow: 0 2px 8px 0 rgba(68,102,214,0.10);
}

.chat-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #eee;
  font-size: 1.03em;
  padding: 0.7em 0.2em;
  border-radius: 1.1rem;
  box-shadow: none;
  transition: background 0.18s;
}
.chat-input:focus {
  background: rgba(255,255,255,0.12);
}
.chat-input::placeholder {
  color: #bbb;
  opacity: 1;
  font-style: italic;
  letter-spacing: 0.01em;
  text-shadow: 0 1px 2px rgba(0,0,0,0.09);
}

.send-btn.send-btn-redesign {
  margin-left: 0.15rem;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4466d6 60%, #5b7fff 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px 0 rgba(68, 102, 214, 0.18);
  border: none;
  transition: background 0.18s, transform 0.13s;
  cursor: not-allowed;
  opacity: 0.75;
}
.send-btn-redesign svg {
  display: block;
}
</style>
