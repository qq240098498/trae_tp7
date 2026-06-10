export interface Customer {
  id: string;
  name: string;
  phone: string;
  gender?: 'male' | 'female' | 'other';
  birthday?: string;
  avatar?: string;
  note?: string;
  createdAt: string;
}

export interface ProjectCategory {
  id: string;
  name: string;
  description?: string;
  sort?: number;
}

export interface Project {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  duration: number;
  commissionRate: number;
  description?: string;
  image?: string;
  sort?: number;
  isActive: boolean;
}

export interface Technician {
  id: string;
  name: string;
  phone: string;
  gender?: 'male' | 'female' | 'other';
  avatar?: string;
  position?: string;
  projectIds: string[];
  workDays: number[];
  startTime: string;
  endTime: string;
  note?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Schedule {
  id: string;
  technicianId: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  appointmentId?: string;
}

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface Appointment {
  id: string;
  customerId: string;
  projectId: string;
  technicianId: string;
  scheduleId?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  price: number;
  useCardId?: string;
  useCardAmount?: number;
  paidAmount: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CardType {
  id: string;
  name: string;
  category: CardCategory;
  type: CardTypeType;
  value: number;
  price: number;
  description?: string;
  validDays?: number;
  isActive: boolean;
  sort?: number;
}

export type CardCategory = 'recharge' | 'times' | 'discount';
export type CardTypeType = 'stored' | 'count' | 'percent';

export interface MembershipCard {
  id: string;
  customerId: string;
  cardTypeId: string;
  name: string;
  category: CardCategory;
  type: CardTypeType;
  balance?: number;
  totalTimes?: number;
  remainingTimes?: number;
  discountPercent?: number;
  expireDate?: string;
  isActive: boolean;
  createdAt: string;
}

export type TransactionType = 'recharge' | 'consume' | 'refund';
export type PaymentMethod = 'cash' | 'wechat' | 'alipay' | 'card' | 'transfer' | 'other';

export interface Transaction {
  id: string;
  customerId: string;
  appointmentId?: string;
  membershipCardId?: string;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  amount: number;
  cardDeduction?: number;
  remark?: string;
  createdAt: string;
}

export type SalaryStatus = 'pending' | 'paid';

export interface SalaryPayment {
  id: string;
  technicianId: string;
  periodStart: string;
  periodEnd: string;
  baseSalary: number;
  totalCommission: number;
  totalServiceCount: number;
  totalAmount: number;
  deductions: number;
  bonus: number;
  netSalary: number;
  status: SalaryStatus;
  paidAt?: string;
  paidMethod?: PaymentMethod;
  remark?: string;
  items: SalaryItem[];
  createdAt: string;
}

export interface SalaryItem {
  appointmentId: string;
  projectId: string;
  projectName: string;
  serviceDate: string;
  servicePrice: number;
  commissionRate: number;
  commissionAmount: number;
}
