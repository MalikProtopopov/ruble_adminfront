export interface Pagination {
  next_cursor: string | null;
  has_more: boolean;
  total: null;
}

export interface Paginated<T> {
  data: T[];
  pagination: Pagination;
}

export type FoundationStatus =
  | "pending_verification"
  | "active"
  | "suspended";

export interface Foundation {
  id: string;
  name: string;
  legal_name: string;
  inn: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  status: FoundationStatus;
  yookassa_shop_id: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export type CampaignStatus =
  | "draft"
  | "active"
  | "paused"
  | "completed"
  | "archived";

export interface CampaignDocument {
  id: string;
  title: string;
  file_url: string;
  sort_order: number;
}

export interface ThanksContent {
  id: string;
  type: "video" | "audio";
  media_url: string;
  title: string | null;
  description: string | null;
  sort_order?: number;
}

export interface Campaign {
  id: string;
  foundation_id: string;
  foundation_name?: string;
  title: string;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  goal_amount: number | null;
  collected_amount: number;
  urgency_level: number;
  is_permanent: boolean;
  ends_at: string | null;
  sort_order: number;
  status: CampaignStatus;
  closed_early?: boolean;
  close_note?: string | null;
  donors_count?: number;
  documents?: CampaignDocument[];
  thanks_contents?: ThanksContent[];
  created_at?: string;
  updated_at?: string;
}

export interface OfflinePayment {
  id: string;
  campaign_id: string;
  amount_kopecks: number;
  payment_method: string;
  description: string | null;
  external_reference: string | null;
  payment_date: string;
  recorded_by_admin_id: string;
  created_at: string;
}

export interface AdminUserList {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  total_donated_kopecks: number;
  total_donations_count: number;
  current_streak_days: number;
  created_at: string;
}

export interface UserDetail extends AdminUserList {
  phone: string | null;
  avatar_url: string | null;
  timezone: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  subscriptions: Array<{
    id: string;
    amount_kopecks: number;
    billing_period: string;
    status: string;
    next_billing_at: string | null;
  }>;
  recent_donations: Array<{
    id: string;
    campaign_title: string;
    amount_kopecks: number;
    status: string;
    created_at: string;
  }>;
}

export interface StatsOverview {
  gmv_kopecks: number;
  platform_fee_kopecks: number;
  active_subscriptions: number;
  total_donors: number;
  new_donors_period: number;
  retention_30d: number;
  retention_90d: number;
  period_from: string | null;
  period_to: string | null;
}

export interface CampaignStats {
  campaign_id: string;
  campaign_title: string;
  collected_amount: number;
  donors_count: number;
  average_check_kopecks: number;
  subscriptions_count: number;
  donations_count: number;
  offline_payments_amount: number;
}

export interface PayoutRecord {
  id: string;
  foundation_id: string;
  foundation_name: string;
  amount_kopecks: number;
  period_from: string;
  period_to: string;
  transfer_reference: string | null;
  note: string | null;
  created_by_admin_id: string;
  created_at: string;
}

export interface PayoutBalanceRow {
  foundation_id: string;
  foundation_name: string;
  collected_nco_kopecks: number;
  paid_kopecks: number;
  due_kopecks: number;
}

export interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string | null;
  icon_url: string | null;
  condition_type: string;
  condition_value: number;
  is_active: boolean;
  created_at: string;
}

export interface AllocationLog {
  id: string;
  subscription_id: string;
  from_campaign_id: string | null;
  from_campaign_title: string | null;
  to_campaign_id: string | null;
  to_campaign_title: string | null;
  reason: string;
  notified_at: string | null;
  created_at: string;
}

export interface NotificationLog {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  body: string;
  status: string;
  created_at: string;
}

export interface AdminAccount {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type DocumentStatus = "draft" | "published" | "archived";

export interface LegalDocument {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  status: DocumentStatus;
  document_version: string | null;
  document_date: string | null;
  published_at: string | null;
  file_url: string | null;
  sort_order: number;
  version: number;
  created_at: string;
  updated_at: string;
}

export type MediaUploadKind = "video" | "document" | "audio" | "image";

export interface MediaAsset {
  id: string;
  key: string;
  url: string;
  filename: string;
  size_bytes: number;
  content_type: string;
  type?: MediaUploadKind;
  uploaded_by_admin_id?: string;
  created_at?: string;
}
