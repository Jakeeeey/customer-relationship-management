// src/modules/customer-relationship-management/structure/task-management-approval/types.ts

export interface User {
    user_id: number;
    user_fname: string | null;
    user_lname: string | null;
    user_mname?: string | null;
    user_email: string | null;
    user_contact?: string | null;
    role?: string;
    is_deleted?: {
        type: string;
        data: number[];
    };
}

export interface Salesman {
    id: number;
    employee_id: number;
    salesman_name: string;
    salesman_code: string;
    branch_code?: number;
    isActive: number;
}

export interface SalesmanPerSupervisor {
    id: number;
    salesman_id: number;
    supervisor_per_division_id: number;
}

export interface SupervisorPerDivision {
    id: number;
    supervisor_id: number;
    division_id: number;
}

export interface TaskType {
    id: number;
    name: string;
    description?: string | null;
}

export interface Customer {
    id: number;
    customer_name: string;
    store_name: string;
    customer_code: string;
    city?: string | null;
    province?: string | null;
    barangay?: string | null;
}

export interface CustomerTarget {
    id: number;
    target_setting_id: number;
    customer_id: number;
    target_amount: number;
    created_at: string;
}

export interface CustomerAllocation extends CustomerTarget {
    customer_name: string;
    store_name: string;
    customer_code: string;
    assignedAmount: number;
    isFullyAllocated: boolean;
    remainingAmount: number;
}

export interface TargetSetting {
    id: number;
    salesman_id: number;
    date_range_from: string;
    date_range_to: string;
    created_at: string;
}

export interface MonthlyCoveragePlan {
    id: number;
    month: number;
    year: number;
    salesman_id: number;
    created_by: number;
    created_at: string;
    status: "pending" | "approved" | "rejected";
}

export interface Task {
    id: number;
    title?: string | null;
    name: string;
    description: string;
    completed: {
        type: string;
        data: number[];
    };
    created_at: string;
    created_by: number;
    task_type_id: number | null;
    customer_id?: number | null;
    salesman_id?: number | null;
    employee_id?: number | null;
    remarks?: string | null;
    isSalesman?: number | null;
}

export interface DailyActionPlan {
    id: number;
    mcp_id: number;
    task_id: number;
    priority_level: "high" | "mid" | "low";
    date: string;
    is_completed: number;
    approval_status: "pending" | "approved" | "rejected";
    reviewed_by?: number | null;
    reviewed_at?: string | null;
    additional_description: string | null;
    province: string | null;
    city: string | null;
    barangay: string | null;
    sales_amount: number | null;
    collection_amount: number | null;
    customer_id: number | null;
    salesman_id: number | null;
    employee_id?: number | null;
    employee_name?: string | null;
    employee_email?: string | null;
    created_by: number;
    created_at: string;
}

export interface DailyActionPlanAttachment {
    id: number;
    dap_id: number;
    attachment_address: string;
    latitude: string | number | null;
    longitude: string | number | null;
    created_by: number;
    created_at: string;
}

export interface TaskManagementData {
    users: User[];
    salesmen: Salesman[];
    mapping: SalesmanPerSupervisor[];
    supervisors: SupervisorPerDivision[];
    taskTypes: TaskType[];
    customers: Customer[];
    tasks: Task[];
    actionPlans: DailyActionPlan[];
    attachments: DailyActionPlanAttachment[];
    monthlyCoveragePlans: MonthlyCoveragePlan[];
    targetSettings: TargetSetting[];
    customerTargets: CustomerTarget[];
    currentUserId?: number;
}
