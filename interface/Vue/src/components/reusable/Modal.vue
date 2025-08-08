<template>
  <div class="modal-overlay">
    <div class="modal-card">
      <template v-if="$slots.header">
        <div class="modal-card-header">
          <slot name="header" />
        </div>
      </template>
      <template v-if="$slots.content">
        <div class="modal-card-content">
          <slot name="content" />
        </div>
      </template>
      <template v-if="$slots.footer">
        <div class="modal-card-footer">
          <slot name="footer" />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
/* decorative divider under icon */
.modal-card::before {
  content: '';
  position: absolute;
  top: 6rem;
  left: 50%;
  transform: translateX(-50%);
  width: 3rem;
  height: 0.15rem;
  background: var(--modal-divider-color, #e0e0e0);
  border-radius: 1px;
}
.modal-overlay {
  position: fixed;
  z-index: 99999;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--modal-overlay-background-color);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeInBg 0.22s;
}
@keyframes fadeInBg {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.modal-card {
  background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.9));
  position: relative;
  /* multi-layer soft shadow + legacy depth */
  box-shadow:
    0 4px 6px rgba(0, 0, 0, 0.1),
    0 10px 20px rgba(0, 0, 0, 0.05),
    0 4px 40px 0 var(--modal-card-box-shadow-color);
  background: var(--modal-card-background-color);
  transition:
    opacity 0.3s ease-out,
    transform 0.3s ease-out;
  border-radius: 1rem;
  backdrop-filter: blur(10px);
  min-width: 320px;
  max-width: 98vw;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: popIn 0.23s cubic-bezier(0.6, 1.5, 0.6, 1.01);
}
.modal-card:hover {
  transform: translateY(-5px);
}
.modal-card-header {
  width: 100%;
  background: linear-gradient(270deg, #a65fe8, #784fca, #7932fc, #a65fe8);
  background-size: 400% 400%;
  animation: gradientFlow 15s ease-in-out infinite;
  color: #fff;
  font-family: 'Inter', sans-serif;
  font-size: 1em;
  font-weight: 600;
  letter-spacing: 0.01em;
  border-top-left-radius: 0.8rem;
  border-top-right-radius: 0.8rem;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  padding-left: 1rem;
  padding-right: 0rem;
  min-height: 1em;
  text-align: start;
  box-shadow: 0 2px 8px 0 #a259e612;
}
.modal-card-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  margin: 1rem;
}
.modal-card-footer {
  width: 100%;
  background: linear-gradient(90deg, #a259e6 0%, #6c47b6 100%);
  color: #fff;
  font-family: 'Inter', sans-serif;
  font-size: 1em;
  font-weight: 500;
  border-bottom-left-radius: 0.8rem;
  border-bottom-right-radius: 0.8rem;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  padding: 1.2em 2em 1.3em 2em;
  text-align: center;
  min-height: 3em;
  box-shadow: 0 -2px 8px 0 #a259e612;
}
@keyframes gradientFlow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

</style>
