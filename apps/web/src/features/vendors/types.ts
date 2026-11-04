export type VendorStatus = "draft" | "contracted" | "confirmed" | "completed";

export interface Vendor {
  id: string;
  event_id: string;
  name: string;
  category: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  cost_kobo: number;
  deposit_kobo: number;
  status: VendorStatus;
  created_at: string;
  updated_at: string;
}

export interface VendorTask {
  id: string;
  vendor_id: string;
  event_id: string;
  task: string;
  due_date: string | null;
  is_done: boolean;
  created_at: string;
  updated_at: string;
}

export interface VendorWithTasks extends Vendor {
  tasks: VendorTask[];
}

export interface VendorFinancialStats {
  contractedKobo: number;
  depositsPaidKobo: number;
  balanceDueKobo: number;
  overdueTasksCount: number;
  completedTasksCount: number;
  totalTasksCount: number;
}

export interface VendorsData {
  vendors: VendorWithTasks[];
  stats: VendorFinancialStats;
}
