/**
 * UI 组件库统一导出
 * 
 * 用途：集中导出所有 UI 组件，简化导入路径
 * 输入：无
 * 输出：所有 UI 组件的命名导出
 * 交互：无
 */

// ==================== SemanticButton 语义按钮 ====================
export {
  SemanticButton,
  CreateButton,
  DeleteButton,
  SaveButton,
  UpdateButton,
  CancelButton,
  EditButton,
  ViewButton,
  ExportButton,
  ImportButton,
  RefreshButton,
  SearchButton,
  SubmitButton,
  type SemanticButtonProps,
} from './SemanticButton';

// ==================== MetricCard 指标卡片 ====================
export {
  MetricCard,
  MetricCardGrid,
  type MetricCardProps,
  type MetricCardGridProps,
} from './MetricCard';

// ==================== TrendIndicator 趋势指示器 ====================
export {
  TrendIndicator,
  TrendBadge,
  type TrendIndicatorProps,
  type TrendBadgeProps,
} from './TrendIndicator';

// ==================== EmptyState 空状态 ====================
export {
  EmptyState,
  TableEmptyState,
  type EmptyStateProps,
  type TableEmptyStateProps,
} from './EmptyState';

// ==================== Skeleton 骨架屏 ====================
export {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonTable,
  SkeletonMetricCard,
  SkeletonList,
  SkeletonPage,
  type SkeletonProps,
  type SkeletonTextProps,
  type SkeletonAvatarProps,
  type SkeletonCardProps,
  type SkeletonTableProps,
  type SkeletonMetricCardProps,
  type SkeletonListProps,
  type SkeletonPageProps,
} from './Skeleton';

// ==================== Modal 对话框 ====================
export {
  Modal,
  ConfirmModal,
  AlertModal,
  DeleteConfirmModal,
  FormModal,
  DrawerModal,
  type ModalProps,
  type ConfirmModalProps,
  type AlertModalProps,
  type DeleteConfirmModalProps,
  type FormModalProps,
  type DrawerModalProps,
} from './Modal';
