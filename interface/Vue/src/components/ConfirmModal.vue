<template>
  <Transition name="modal">
    <div
      id="confirm-modal"
      href="#confirm-modal"
      ref="modalRef"
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        class="fixed inset-0 bg-black/50 backdrop-blur-sm"
        @click="close"
      ></div>
      <div
        class="relative bg-white rounded-xl shadow-xl max-w-md w-full dark:bg-gray-800 overflow-hidden mx-4 my-8"
      >
        <!-- Header coloré selon le type -->
        <div
          class="h-2 w-full"
          :class="{
            'bg-green-500': type === 'success',
            'bg-red-500': type === 'danger',
            'bg-indigo-500': type === 'info',
          }"
        ></div>

        <div class="p-6">
          <div class="flex items-start gap-4">
            <!-- Icône -->
            <div
              class="flex-shrink-0 p-3 rounded-full"
              :class="{
                'bg-green-100 text-green-600': type === 'success',
                'bg-red-100 text-red-600': type === 'danger',
                'bg-indigo-100 text-indigo-600': type === 'info',
              }"
            >
              <svg
                v-if="icon === 'check'"
                class="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <svg
                v-else-if="icon === 'trash'"
                class="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <svg
                v-else
                class="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            <div>
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                {{ title }}
              </h3>
              <div class="mt-2">
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ message }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          class="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700"
        >
          <button
            @click="close"
            class="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            {{ cancelText }}
          </button>
          <button
            @click="confirm"
            class="px-4 py-2 text-sm font-medium rounded-lg text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2"
            :class="{
              'bg-green-600 hover:bg-green-700 focus:ring-green-500':
                type === 'success',
              'bg-red-600 hover:bg-red-700 focus:ring-red-500':
                type === 'danger',
              'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500':
                type === 'info',
            }"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps({
  show: Boolean,
  title: String,
  message: String,
  confirmText: { type: String, default: "Confirmer" },
  cancelText: { type: String, default: "Annuler" },
  type: {
    type: String as () => "success" | "danger" | "info",
    default: "info",
  },
  icon: { type: String, default: "" },
});

const emit = defineEmits(["confirm", "cancel", "update:show"]);

const confirm = () => {
  emit("confirm");
  emit("update:show", false);
};

const close = () => {
  emit("cancel");
  emit("update:show", false);
};
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
