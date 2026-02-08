<template>
  <div class="flex flex-col h-screen bg-surface text-text-primary">

    <!-- 主体内容区 -->
    <div class="flex flex-1 overflow-hidden">
      <!-- 左侧动态视图区域 -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <component :is="activeTool.component" :title="activeTool.name" />
      </div>

      <!-- 右侧工具栏 -->
      <div class="w-16 border-l border-border flex flex-col items-center py-4 space-y-8 bg-background">
        <button
          v-for="tool in tools"
          :key="tool.id"
          @click="selectTab(tool.id)"
          :class="[
            'flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-colors',
            activeTab === tool.id ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-surface'
          ]"
        >
          <component :is="tool.icon" class="h-6 w-6" />
          <span class="text-xs mt-1">{{ tool.name }}</span>
        </button>

        <!-- 设置按钮 - 固定在底部 -->
        <button
          @click="openSettings"
          class="flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-colors text-text-secondary hover:bg-surface mt-auto"
        >
          <Cog6ToothIcon class="h-6 w-6" />
          <span class="text-xs mt-1">设置</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, markRaw } from 'vue';
import {
  ChatBubbleLeftRightIcon,
  PencilSquareIcon,
  LanguageIcon,
  DocumentMagnifyingGlassIcon,
  CheckBadgeIcon,
  WrenchScrewdriverIcon,
  Cog6ToothIcon,
} from '@heroicons/vue/24/outline';
import ChatView from '@shared/ui/views/chat/index.vue';
import PlaceholderView from './views/PlaceholderView.vue';
import { useTheme } from '@shared/composables/useTheme';

useTheme();

const activeTab = ref('chat');

const tools = markRaw([
  {
    id: 'chat',
    name: '聊天',
    icon: ChatBubbleLeftRightIcon,
    component: ChatView
  },
  {
    id: 'write',
    name: '写作',
    icon: PencilSquareIcon,
    component: PlaceholderView
  },
  {
    id: 'translate',
    name: '翻译',
    icon: LanguageIcon,
    component: PlaceholderView
  },
  {
    id: 'ocr',
    name: 'OCR',
    icon: DocumentMagnifyingGlassIcon,
    component: PlaceholderView
  },
  {
    id: 'grammar',
    name: '语法',
    icon: CheckBadgeIcon,
    component: PlaceholderView
  },
  {
    id: 'tools',
    name: '工具',
    icon: WrenchScrewdriverIcon,
    component: PlaceholderView
  }
]);

const activeTool = computed(() => tools.find(tool => tool.id === activeTab.value) || tools[0]);

function selectTab(tabId: string) {
  activeTab.value = tabId;
}

function openSettings() {
  chrome.runtime.openOptionsPage();
}
</script> 