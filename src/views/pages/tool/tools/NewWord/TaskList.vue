<template>
  <el-dialog v-model="visible" title="选择或载入已有任务" width="60%" @close="handleClose">
    <div class="task-list-container p-4">
      <div class="mb-4 text-right">
        <el-button type="primary" @click="fetchTasks" :loading="loadingTasks">
          <el-icon><refresh /></el-icon>
          刷新任务列表
        </el-button>
      </div>
      <el-table v-if="tasks.length > 0" :data="tasks" stripe style="width: 100%" @row-click="handleRowClick" empty-text="没有任务" height="400px">
        <el-table-column prop="taskId" label="任务ID" width="280" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="180" />
        <el-table-column prop="sourceVideo.videoInfo.title" label="视频标题" show-overflow-tooltip>
          <template #default="scope">
            {{ scope.row.sourceVideo?.videoInfo?.title || scope.row.sourceVideo?.originalName || 'N/A' }}
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="200">
          <template #default="scope">
            {{ formatDisplayTime(scope.row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="200">
          <template #default="scope">
            {{ formatDisplayTime(scope.row.updatedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="scope">
            <el-button size="small" type="primary" @click.stop="loadTask(scope.row)">
              <el-icon><document-checked /></el-icon>
              载入
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-else-if="!loadingTasks" description="没有可用的任务。您可以上传新视频或从链接获取来创建新任务。"></el-empty>
      <div v-if="loadingTasks" class="text-center p-8">
        <el-icon class="is-loading el-icon--large"><loading /></el-icon>
        <p>正在加载任务列表...</p>
      </div>
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, defineEmits, defineProps, onMounted } from 'vue';
import { ElMessage, ElTable, ElTableColumn, ElButton, ElDialog, ElEmpty, ElIcon } from 'element-plus';
import { Loading, Refresh, DocumentChecked } from '@element-plus/icons-vue';
// 假设 api.ts 文件与此组件在同一目录下或通过正确路径引用
// 确保 getAllTasksAPI 函数在 api.ts 中定义并导出
// 例如: export const getAllTasksAPI = async () => { /* ... */ };
import { getAllTasksAPI } from './api';

const props = defineProps({
  modelValue: Boolean, // 用于 v-model 控制对话框的显示/隐藏
});

const emit = defineEmits(['update:modelValue', 'task-selected']);

const visible = ref(props.modelValue);
const tasks = ref([]);
const loadingTasks = ref(false);

watch(() => props.modelValue, (newValue) => {
  visible.value = newValue;
  if (newValue && tasks.value.length === 0) {
    fetchTasks();
  }
});

const fetchTasks = async () => {
  loadingTasks.value = true;
  try {
    // 根据您的API文档，GET /tasks 返回 { tasks: [...] }
    const response = await getAllTasksAPI();
    if (response && Array.isArray(response.tasks)) {
      tasks.value = response.tasks.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)); // 按更新时间降序排序
    } else {
      tasks.value = [];
      ElMessage.warning('未能获取任务列表，或返回格式不正确。');
    }
  } catch (error) {
    console.error('获取任务列表失败:', error);
    ElMessage.error('获取任务列表失败: ' + (error.message || '未知错误'));
    tasks.value = [];
  } finally {
    loadingTasks.value = false;
  }
};

const loadTask = (task) => {
  emit('task-selected', task.taskId);
  handleClose(); // 选择后关闭对话框
};

// 可选：如果希望单击行直接加载
const handleRowClick = (row) => {
  // loadTask(row); // 取消注释以启用单击行加载
};

const handleClose = () => {
  emit('update:modelValue', false);
};

const formatDisplayTime = (dateTimeString) => {
  if (!dateTimeString) return 'N/A';
  try {
    return new Date(dateTimeString).toLocaleString('zh-CN', { hour12: false });
  } catch (e) {
    return dateTimeString;
  }
};

// 组件挂载时，如果初始设置为可见，则加载任务
onMounted(() => {
  if (visible.value) {
    fetchTasks();
  }
});
</script>

<style scoped>
.task-list-container {
  min-height: 300px; /* 确保在加载时有最小高度 */
}
.el-icon--large {
  font-size: 28px;
}
/* 使表格单元格文本能正确显示省略号 */
.el-table .cell {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style> 