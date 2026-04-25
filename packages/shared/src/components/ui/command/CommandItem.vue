<script setup lang="ts">
import type { ListboxItemEmits, ListboxItemProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit, useCurrentElement } from '@vueuse/core'
import { ListboxItem, useForwardPropsEmits, useId } from 'reka-ui'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { cn } from '#/lib/utils'
import { useCommand, useCommandGroup } from '.'

const props = defineProps<ListboxItemProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<ListboxItemEmits>()

const delegatedProps = reactiveOmit(props, 'class')

const forwarded = useForwardPropsEmits(delegatedProps, emits)

const id = useId()
const { filterState, allItems, allGroups } = useCommand()
const groupContext = useCommandGroup()

const isRender = computed(() => {
  if (!filterState.search) {
    return true
  } else {
    const filteredCurrentItem = filterState.filtered.items.get(id)
    // If the filtered items is undefined means not in the all times map yet
    // Do the first render to add into the map
    if (filteredCurrentItem === undefined) {
      return true
    }

    // Check with filter
    return filteredCurrentItem > 0
  }
})

const itemRef = ref()
const currentElement = useCurrentElement(itemRef)
onMounted(() => {
  if (!(currentElement.value instanceof HTMLElement)) return

  // textValue to perform filter
  allItems.value.set(id, currentElement.value.textContent ?? props.value?.toString() ?? '')

  const groupId = groupContext?.id
  if (groupId) {
    if (!allGroups.value.has(groupId)) {
      allGroups.value.set(groupId, new Set([id]))
    } else {
      allGroups.value.get(groupId)?.add(id)
    }
  }
})
onUnmounted(() => {
  allItems.value.delete(id)
})
</script>

<template>
  <ListboxItem
    v-if="isRender"
    v-bind="forwarded"
    :id="id"
    ref="itemRef"
    data-slot="command-item"
    :class="
      cn(
        'data-[highlighted]:bg-accent/70 data-[highlighted]:text-foreground data-[highlighted]:[&_svg:not([class*=\'text-\'])]:text-foreground/80 data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground data-[state=checked]:font-medium data-[state=checked]:[&_svg:not([class*=\'text-\'])]:text-accent-foreground data-[state=checked]:data-[highlighted]:bg-accent hover:bg-accent/45 hover:text-foreground hover:[&_svg:not([class*=\'text-\'])]:text-foreground/80 data-[state=checked]:hover:bg-accent data-[state=checked]:hover:text-accent-foreground data-[state=checked]:hover:[&_svg:not([class*=\'text-\'])]:text-accent-foreground [&_svg:not([class*=\'text-\'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden transition-colors select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-4',
        props.class,
      )
    "
    @select="
      () => {
        filterState.search = ''
      }
    "
  >
    <slot />
  </ListboxItem>
</template>
