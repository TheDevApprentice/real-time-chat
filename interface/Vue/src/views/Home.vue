<template>
    <Suspense>
        <template #default>
            <PageTemplate>
                <h1>Home</h1>
            </PageTemplate>
        </template>
        <template #fallback>
            <LoadingOverlay />
        </template>
    </Suspense>
</template>

<script setup lang="ts">
import PageTemplate from "../components/PageTemplate.vue";
import LoadingOverlay from "../components/LoadingOverlay.vue";
</script>

<style scoped>

</style>