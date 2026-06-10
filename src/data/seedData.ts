import type {
  Customer,
  ProjectCategory,
  Project,
  Technician,
  Schedule,
  Appointment,
  CardType,
  MembershipCard,
  Transaction,
} from '@/types';

export const seedCustomers: Customer[] = [
  {
    id: 'c1',
    name: '张三',
    phone: '13800138001',
    gender: 'female',
    birthday: '1990-05-15',
    note: '对艾草过敏',
    createdAt: '2026-01-10T09:00:00.000Z',
  },
  {
    id: 'c2',
    name: '李四',
    phone: '13900139002',
    gender: 'male',
    createdAt: '2026-02-15T10:30:00.000Z',
  },
  {
    id: 'c3',
    name: '王五',
    phone: '13700137003',
    gender: 'female',
    note: 'VIP客户，偏好下午时段',
    createdAt: '2026-03-01T14:00:00.000Z',
  },
];

export const seedProjectCategories: ProjectCategory[] = [
  { id: 'pc1', name: '中式推拿', description: '传统中医按摩疗法', sort: 1 },
  { id: 'pc2', name: '足浴足疗', description: '足部护理保健', sort: 2 },
  { id: 'pc3', name: '艾灸理疗', description: '艾草热疗调理', sort: 3 },
  { id: 'pc4', name: '刮痧拔罐', description: '传统理疗排毒', sort: 4 },
];

export const seedProjects: Project[] = [
  {
    id: 'p1', name: '全身推拿', categoryId: 'pc1', price: 168, duration: 60, description: '60分钟全身中式推拿', sort: 1, isActive: true,
  },
  {
    id: 'p2', name: '肩颈推拿', categoryId: 'pc1', price: 98, duration: 30, description: '30分钟肩颈专项按摩', sort: 2, isActive: true,
  },
  {
    id: 'p3', name: '中药足浴', categoryId: 'pc2', price: 88, duration: 60, description: '60分钟中药泡脚+足底按摩', sort: 1, isActive: true,
  },
  {
    id: 'p4', name: '精油开背', categoryId: 'pc3', price: 128, duration: 45, description: '45分钟精油艾灸背部调理', sort: 1, isActive: true,
  },
  {
    id: 'p5', name: '刮痧拔罐套餐', categoryId: 'pc4', price: 68, duration: 30, description: '刮痧+拔罐组合', sort: 1, isActive: true,
  },
];

export const seedTechnicians: Technician[] = [
  {
    id: 't1', name: '王师傅', phone: '13600136001', gender: 'male',
    position: '高级技师',
    projectIds: ['p1', 'p2', 'p5'],
    workDays: [1, 2, 3, 4, 5, 6],
    startTime: '09:00', endTime: '21:00',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 't2', name: '李师傅', phone: '13600136002', gender: 'female',
    position: '技师主管',
    projectIds: ['p1', 'p2', 'p3', 'p4'],
    workDays: [0, 1, 2, 3, 4, 6],
    startTime: '10:00', endTime: '22:00',
    isActive: true,
    createdAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 't3', name: '赵师傅', phone: '13600136003', gender: 'female',
    position: '资深技师',
    projectIds: ['p3', 'p4'],
    workDays: [1, 2, 3, 4, 5],
    startTime: '13:00', endTime: '21:00',
    note: '擅长足部护理',
    isActive: true,
    createdAt: '2026-01-03T00:00:00.000Z',
  },
];

const today = new Date();
const dateStr = (d: Date) => d.toISOString().split('T')[0];
const addDays = (days: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return dateStr(d);
};

export const seedSchedules: Schedule[] = [
  ...Array.from({ length: 7 }, (_, i) => addDays(i)).flatMap((date) => [
    { id: `s-${date}-t1-1`, technicianId: 't1', date, startTime: '10:00', endTime: '11:00', isAvailable: true },
    { id: `s-${date}-t1-2`, technicianId: 't1', date, startTime: '14:00', endTime: '15:00', isAvailable: true },
    { id: `s-${date}-t1-3`, technicianId: 't1', date, startTime: '19:00', endTime: '20:00', isAvailable: true },
    { id: `s-${date}-t2-1`, technicianId: 't2', date, startTime: '11:00', endTime: '12:00', isAvailable: true },
    { id: `s-${date}-t2-2`, technicianId: 't2', date, startTime: '15:00', endTime: '16:00', isAvailable: true },
    { id: `s-${date}-t2-3`, technicianId: 't2', date, startTime: '20:00', endTime: '21:00', isAvailable: true },
    { id: `s-${date}-t3-1`, technicianId: 't3', date, startTime: '14:00', endTime: '15:00', isAvailable: true },
    { id: `s-${date}-t3-2`, technicianId: 't3', date, startTime: '18:00', endTime: '19:00', isAvailable: true },
  ]),
];

export const seedAppointments: Appointment[] = [
  {
    id: 'a1',
    customerId: 'c1',
    projectId: 'p1',
    technicianId: 't1',
    scheduleId: `s-${addDays(1)}-t1-1`,
    date: addDays(1),
    startTime: '10:00',
    endTime: '11:00',
    status: 'confirmed',
    price: 168,
    paidAmount: 168,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'a2',
    customerId: 'c2',
    projectId: 'p3',
    technicianId: 't2',
    scheduleId: `s-${addDays(2)}-t2-1`,
    date: addDays(2),
    startTime: '11:00',
    endTime: '12:00',
    status: 'pending',
    price: 88,
    paidAmount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const seedCardTypes: CardType[] = [
  {
    id: 'ct1', name: '1000元储值卡', category: 'recharge', type: 'stored',
    value: 1200, price: 1000, description: '充1000送200', isActive: true, sort: 1,
  },
  {
    id: 'ct2', name: '3000元储值卡', category: 'recharge', type: 'stored',
    value: 3800, price: 3000, description: '充3000送800', validDays: 365, isActive: true, sort: 2,
  },
  {
    id: 'ct3', name: '10次推拿卡', category: 'times', type: 'count',
    value: 10, price: 1500, description: '全身推拿10次卡', validDays: 180, isActive: true, sort: 3,
  },
  {
    id: 'ct4', name: '8折会员卡', category: 'discount', type: 'percent',
    value: 80, price: 2800, description: '所有项目8折', validDays: 365, isActive: true, sort: 4,
  },
];

export const seedMembershipCards: MembershipCard[] = [
  {
    id: 'mc1',
    customerId: 'c1',
    cardTypeId: 'ct1',
    name: '1000元储值卡',
    category: 'recharge',
    type: 'stored',
    balance: 1200,
    isActive: true,
    createdAt: '2026-01-15T00:00:00.000Z',
  },
  {
    id: 'mc2',
    customerId: 'c3',
    cardTypeId: 'ct4',
    name: '8折会员卡',
    category: 'discount',
    type: 'percent',
    discountPercent: 80,
    expireDate: `${today.getFullYear() + 1}-12-31`,
    isActive: true,
    createdAt: '2026-02-20T00:00:00.000Z',
  },
];

export const seedTransactions: Transaction[] = [
  {
    id: 'tx1',
    customerId: 'c1',
    membershipCardId: 'mc1',
    type: 'recharge',
    paymentMethod: 'wechat',
    amount: 1000,
    remark: '首次开卡1000元',
    createdAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'tx2',
    customerId: 'c3',
    membershipCardId: 'mc2',
    type: 'recharge',
    paymentMethod: 'alipay',
    amount: 2800,
    remark: '购买8折会员卡',
    createdAt: '2026-02-20T14:00:00.000Z',
  },
  {
    id: 'tx3',
    customerId: 'c2',
    type: 'consume',
    paymentMethod: 'cash',
    amount: 88,
    remark: '中药足浴消费',
    createdAt: '2026-03-10T15:00:00.000Z',
  },
];

export interface SeedData {
  customers: Customer[];
  projectCategories: ProjectCategory[];
  projects: Project[];
  technicians: Technician[];
  schedules: Schedule[];
  appointments: Appointment[];
  cardTypes: CardType[];
  membershipCards: MembershipCard[];
  transactions: Transaction[];
}

export const seedData: SeedData = {
  customers: seedCustomers,
  projectCategories: seedProjectCategories,
  projects: seedProjects,
  cardTypes: seedCardTypes,
  technicians: seedTechnicians,
  schedules: seedSchedules,
  appointments: seedAppointments,
  membershipCards: seedMembershipCards,
  transactions: seedTransactions,
};

export default seedData;
