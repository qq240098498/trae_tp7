import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  Edit2,
  Clock,
  Phone,
  X,
  Check,
  UserPlus,
  Calendar as CalendarIcon,
  Sparkles,
  Trophy,
  Medal,
  Award,
  BarChart3,
  Search,
  DollarSign,
  Users,
  Eye,
  TrendingUp,
  Star,
  Wallet,
  CreditCard,
  Send,
  FileText,
  PiggyBank,
  Coins,
  Receipt,
  Download,
  ChevronDown,
  Percent,
  ClipboardList,
} from 'lucide-react';
import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameDay,
  isToday,
  startOfMonth,
  endOfMonth,
  subDays,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import type { Technician, Schedule as ScheduleType, Appointment, SalaryPayment, SalaryItem, PaymentMethod } from '@/types';

type ShiftType = 'morning' | 'afternoon' | 'evening' | 'rest';
type ViewMode = 'week' | 'month';
type RankSortType = 'count' | 'revenue';
type DateRangePreset = 'today' | 'week' | 'month' | 'custom';
type PageTab = 'schedule' | 'salary';
type SalaryStatusFilter = 'all' | 'pending' | 'paid';

interface TechnicianStats {
  technicianId: string;
  technician: Technician;
  orderCount: number;
  totalRevenue: number;
  completedCount: number;
  avgOrderValue: number;
  uniqueCustomers: number;
}

interface DateRange {
  startDate: string;
  endDate: string;
  preset: DateRangePreset;
}

interface SalaryCalcItem {
  appointmentId: string;
  projectId: string;
  projectName: string;
  serviceDate: string;
  servicePrice: number;
  commissionRate: number;
  commissionAmount: number;
}

interface TechnicianSalaryCalc {
  technicianId: string;
  technician: Technician;
  totalServiceCount: number;
  totalAmount: number;
  totalCommission: number;
  items: SalaryCalcItem[];
}

interface GenerateSalaryForm {
  technicianIds: string[];
  periodStart: string;
  periodEnd: string;
  baseSalary: string;
  bonus: string;
  deductions: string;
}

interface PaySalaryForm {
  paidMethod: PaymentMethod;
  remark: string;
}

interface ShiftConfig {
  label: string;
  short: string;
  startTime: string;
  endTime: string;
  bg: string;
  text: string;
  border: string;
}

const SHIFT_CONFIG: Record<ShiftType, ShiftConfig> = {
  morning: {
    label: '早班',
    short: '早',
    startTime: '09:00',
    endTime: '17:00',
    bg: 'bg-jade-100',
    text: 'text-jade-700',
    border: 'border-jade-200',
  },
  afternoon: {
    label: '中班',
    short: '中',
    startTime: '13:00',
    endTime: '21:00',
    bg: 'bg-sandalwood-100',
    text: 'text-sandalwood-700',
    border: 'border-sandalwood-200',
  },
  evening: {
    label: '晚班',
    short: '晚',
    startTime: '17:00',
    endTime: '01:00',
    bg: 'bg-indigo-100',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
  },
  rest: {
    label: '休息',
    short: '休',
    startTime: '',
    endTime: '',
    bg: 'bg-ink-50',
    text: 'text-ink-400',
    border: 'border-ink-100',
  },
};

const AVATAR_GRADIENTS = [
  'from-jade-400 to-jade-600',
  'from-sandalwood-400 to-sandalwood-600',
  'from-gold-400 to-gold-600',
  'from-indigo-400 to-indigo-600',
  'from-rose-400 to-rose-600',
  'from-teal-400 to-teal-600',
];

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

const PROJECT_COLORS = [
  'bg-jade-500',
  'bg-sandalwood-500',
  'bg-gold-500',
  'bg-indigo-500',
  'bg-rose-500',
  'bg-teal-500',
  'bg-amber-500',
];

interface TechnicianFormData {
  name: string;
  phone: string;
  gender: 'male' | 'female' | 'other' | '';
  position: string;
  projectIds: string[];
  workDays: number[];
  startTime: string;
  endTime: string;
  note: string;
  isActive: boolean;
}

interface ScheduleEditData {
  technicianId: string;
  date: string;
  shift: ShiftType;
  note: string;
}

interface BatchScheduleData {
  technicianIds: string[];
  startDate: string;
  endDate: string;
  shift: ShiftType;
  note: string;
}

function getAvatarGradient(index: number) {
  return AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
}

function getProjectColor(projectId: string, projectIds: string[]) {
  const idx = projectIds.indexOf(projectId);
  return PROJECT_COLORS[idx >= 0 ? idx % PROJECT_COLORS.length : 0];
}

function getTechnicianStatus(technician: Technician, date: Date): {
  label: string;
  className: string;
} {
  const dayOfWeek = date.getDay();
  if (!technician.isActive) {
    return { label: '已停用', className: 'bg-ink-100 text-ink-400' };
  }
  if (!technician.workDays.includes(dayOfWeek)) {
    return { label: '休息', className: 'bg-ink-100 text-ink-400' };
  }
  return { label: '在岗', className: 'bg-jade-100 text-jade-700' };
}

function detectShift(startTime: string, endTime: string): ShiftType {
  const startHour = parseInt(startTime.split(':')[0], 10);
  if (startHour < 12) return 'morning';
  if (startHour < 16) return 'afternoon';
  return 'evening';
}

export default function TechnicianSchedule() {
  const {
    technicians,
    projects,
    schedules,
    appointments,
    customers,
    addTechnician,
    updateTechnician,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    salaryPayments,
    addSalaryPayment,
    updateSalaryPayment,
    markSalaryPaid,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<PageTab>('schedule');
  const [salaryStatusFilter, setSalaryStatusFilter] = useState<SalaryStatusFilter>('all');
  const [salaryDateRange, setSalaryDateRange] = useState<DateRange>(() => {
    const today = new Date();
    return {
      startDate: format(startOfMonth(today), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(today), 'yyyy-MM-dd'),
      preset: 'month',
    };
  });

  const [isGenerateSalaryModalOpen, setIsGenerateSalaryModalOpen] = useState(false);
  const [generateSalaryForm, setGenerateSalaryForm] = useState<GenerateSalaryForm>({
    technicianIds: [],
    periodStart: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    periodEnd: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    baseSalary: '0',
    bonus: '0',
    deductions: '0',
  });
  const [generateFormErrors, setGenerateFormErrors] = useState<Partial<Record<keyof GenerateSalaryForm, string>>>({});

  const [isPaySalaryModalOpen, setIsPaySalaryModalOpen] = useState(false);
  const [payingSalary, setPayingSalary] = useState<SalaryPayment | null>(null);
  const [paySalaryForm, setPaySalaryForm] = useState<PaySalaryForm>({
    paidMethod: 'wechat',
    remark: '',
  });

  const [isSalaryDetailModalOpen, setIsSalaryDetailModalOpen] = useState(false);
  const [viewingSalary, setViewingSalary] = useState<SalaryPayment | null>(null);

  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [viewMode, setViewMode] = useState<ViewMode>('week');

  const [isTechnicianModalOpen, setIsTechnicianModalOpen] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
  const [technicianForm, setTechnicianForm] = useState<TechnicianFormData>({
    name: '',
    phone: '',
    gender: '',
    position: '',
    projectIds: [],
    workDays: [1, 2, 3, 4, 5],
    startTime: '09:00',
    endTime: '18:00',
    note: '',
    isActive: true,
  });
  const [technicianFormErrors, setTechnicianFormErrors] = useState<
    Partial<Record<keyof TechnicianFormData, string>>
  >({});

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingScheduleContext, setEditingScheduleContext] = useState<{
    technician: Technician;
    date: Date;
    existingSchedule?: ScheduleType;
  } | null>(null);
  const [scheduleForm, setScheduleForm] = useState<ScheduleEditData>({
    technicianId: '',
    date: '',
    shift: 'morning',
    note: '',
  });

  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchScheduleForm, setBatchScheduleForm] = useState<BatchScheduleData>({
    technicianIds: [],
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 6), 'yyyy-MM-dd'),
    shift: 'morning',
    note: '',
  });
  const [batchFormErrors, setBatchFormErrors] = useState<
    Partial<Record<keyof BatchScheduleData, string>>
  >({});

  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const today = new Date();
    return {
      startDate: format(subDays(today, 29), 'yyyy-MM-dd'),
      endDate: format(today, 'yyyy-MM-dd'),
      preset: 'month',
    };
  });
  const [rankSortType, setRankSortType] = useState<RankSortType>('count');
  const [selectedTechnicianForStats, setSelectedTechnicianForStats] = useState<Technician | null>(null);
  const [isTechnicianStatsModalOpen, setIsTechnicianStatsModalOpen] = useState(false);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const weekDateRangeText = useMemo(() => {
    const start = weekDays[0];
    const end = weekDays[6];
    const sameMonth = start.getMonth() === end.getMonth();
    if (sameMonth) {
      return `${start.getMonth() + 1}月${start.getDate()}日 - ${end.getDate()}日`;
    }
    return `${start.getMonth() + 1}月${start.getDate()}日 - ${end.getMonth() + 1}月${end.getDate()}日`;
  }, [weekDays]);

  const goToPrevWeek = () => setCurrentWeekStart((d) => addDays(d, -7));
  const goToNextWeek = () => setCurrentWeekStart((d) => addDays(d, 7));
  const goToThisWeek = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const filteredAppointments = useMemo(() => {
    const start = dateRange.startDate;
    const end = dateRange.endDate;
    return appointments.filter((a) => {
      if (a.status === 'cancelled' || a.status === 'no_show') return false;
      return a.date >= start && a.date <= end;
    });
  }, [appointments, dateRange]);

  const technicianStatsList = useMemo<TechnicianStats[]>(() => {
    return technicians.map((tech) => {
      const techAppointments = filteredAppointments.filter(
        (a) => a.technicianId === tech.id
      );
      const completedCount = techAppointments.filter(
        (a) => a.status === 'completed'
      ).length;
      const orderCount = techAppointments.length;
      const totalRevenue = techAppointments.reduce((sum, a) => sum + a.price, 0);
      const uniqueCustomers = new Set(
        techAppointments.map((a) => a.customerId)
      ).size;
      return {
        technicianId: tech.id,
        technician: tech,
        orderCount,
        totalRevenue,
        completedCount,
        avgOrderValue: orderCount > 0 ? totalRevenue / orderCount : 0,
        uniqueCustomers,
      };
    });
  }, [technicians, filteredAppointments]);

  const overallStats = useMemo(() => {
    return technicianStatsList.reduce(
      (acc, stat) => {
        acc.totalOrders += stat.orderCount;
        acc.totalRevenue += stat.totalRevenue;
        acc.totalCompleted += stat.completedCount;
        acc.totalUniqueCustomers += stat.uniqueCustomers;
        return acc;
      },
      {
        totalOrders: 0,
        totalRevenue: 0,
        totalCompleted: 0,
        totalUniqueCustomers: 0,
      }
    );
  }, [technicianStatsList]);

  const rankedTechnicians = useMemo(() => {
    const sorted = [...technicianStatsList].sort((a, b) => {
      if (rankSortType === 'count') {
        return b.orderCount - a.orderCount;
      }
      return b.totalRevenue - a.totalRevenue;
    });
    return sorted;
  }, [technicianStatsList, rankSortType]);

  const maxRankValue = useMemo(() => {
    if (rankedTechnicians.length === 0) return 0;
    const max = rankSortType === 'count'
      ? rankedTechnicians[0].orderCount
      : rankedTechnicians[0].totalRevenue;
    return max > 0 ? max : 1;
  }, [rankedTechnicians, rankSortType]);

  const getAppointmentsForTechnician = (technicianId: string) => {
    return filteredAppointments.filter((a) => a.technicianId === technicianId);
  };

  const getCustomerName = (customerId: string) =>
    customers.find((c) => c.id === customerId)?.name ?? '未知客户';

  const handleDateRangePresetChange = (preset: DateRangePreset) => {
    const today = new Date();
    let start: Date;
    let end: Date;
    switch (preset) {
      case 'today':
        start = today;
        end = today;
        break;
      case 'week':
        start = subDays(today, 6);
        end = today;
        break;
      case 'month':
        start = subDays(today, 29);
        end = today;
        break;
      case 'custom':
      default:
        return;
    }
    setDateRange({
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
      preset,
    });
  };

  const handleOpenTechnicianStats = (technician: Technician) => {
    setSelectedTechnicianForStats(technician);
    setIsTechnicianStatsModalOpen(true);
  };

  const getRankBadge = (index: number) => {
    if (index === 0) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white shadow-md">
          <Trophy size={14} />
        </div>
      );
    }
    if (index === 1) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center text-white shadow-md">
          <Medal size={14} />
        </div>
      );
    }
    if (index === 2) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-md">
          <Award size={14} />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-ink-100 flex items-center justify-center text-ink-500 font-semibold text-sm">
        {index + 1}
      </div>
    );
  };

  const getSchedulesForCell = (technicianId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return schedules.filter(
      (s) => s.technicianId === technicianId && s.date === dateStr
    );
  };

  const getAppointmentsForCell = (technicianId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.filter(
      (a) =>
        a.technicianId === technicianId &&
        a.date === dateStr &&
        a.status !== 'cancelled' &&
        a.status !== 'no_show'
    );
  };

  const getShiftForCell = (technician: Technician, date: Date): ShiftType => {
    const dayOfWeek = date.getDay();
    if (!technician.workDays.includes(dayOfWeek)) return 'rest';
    return detectShift(technician.startTime, technician.endTime);
  };

  const resolveCellShift = (
    cellSchedules: ScheduleType[],
    technician: Technician,
    date: Date
  ): { shift: ShiftType; override: boolean } => {
    if (cellSchedules.length === 0) {
      return { shift: getShiftForCell(technician, date), override: false };
    }
    const active = cellSchedules.find((s) => s.isAvailable);
    if (!active) return { shift: 'rest', override: true };
    return { shift: detectShift(active.startTime, active.endTime), override: true };
  };

  const getProjectName = (projectId: string) =>
    projects.find((p) => p.id === projectId)?.name ?? '';

  const getProjectIdsList = () => projects.map((p) => p.id);

  const openAddTechnicianModal = () => {
    setEditingTechnician(null);
    setTechnicianForm({
      name: '',
      phone: '',
      gender: '',
      position: '',
      projectIds: [],
      workDays: [1, 2, 3, 4, 5],
      startTime: '09:00',
      endTime: '18:00',
      note: '',
      isActive: true,
    });
    setTechnicianFormErrors({});
    setIsTechnicianModalOpen(true);
  };

  const openEditTechnicianModal = (technician: Technician) => {
    setEditingTechnician(technician);
    setTechnicianForm({
      name: technician.name,
      phone: technician.phone,
      gender: technician.gender ?? '',
      position: technician.position ?? '',
      projectIds: [...technician.projectIds],
      workDays: [...technician.workDays],
      startTime: technician.startTime,
      endTime: technician.endTime,
      note: technician.note ?? '',
      isActive: technician.isActive,
    });
    setTechnicianFormErrors({});
    setIsTechnicianModalOpen(true);
  };

  const openQuickScheduleForTechnician = (technician: Technician) => {
    setEditingScheduleContext({ technician, date: new Date() });
    setScheduleForm({
      technicianId: technician.id,
      date: format(new Date(), 'yyyy-MM-dd'),
      shift: detectShift(technician.startTime, technician.endTime),
      note: '',
    });
    setIsScheduleModalOpen(true);
  };

  const validateTechnicianForm = () => {
    const errors: Partial<Record<keyof TechnicianFormData, string>> = {};
    if (!technicianForm.name.trim()) errors.name = '请输入技师姓名';
    if (!technicianForm.phone.trim()) {
      errors.phone = '请输入手机号';
    } else if (!/^1[3-9]\d{9}$/.test(technicianForm.phone.trim())) {
      errors.phone = '手机号格式不正确';
    }
    setTechnicianFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveTechnician = () => {
    if (!validateTechnicianForm()) return;

    const baseData = {
      name: technicianForm.name.trim(),
      phone: technicianForm.phone.trim(),
      gender: technicianForm.gender || undefined,
      position: technicianForm.position.trim() || undefined,
      projectIds: technicianForm.projectIds,
      workDays: technicianForm.workDays,
      startTime: technicianForm.startTime,
      endTime: technicianForm.endTime,
      note: technicianForm.note.trim() || undefined,
      isActive: technicianForm.isActive,
    };

    if (editingTechnician) {
      updateTechnician(editingTechnician.id, baseData);
    } else {
      addTechnician(baseData);
    }

    setIsTechnicianModalOpen(false);
  };

  const openScheduleModal = (
    technician: Technician,
    date: Date,
    existingSchedule?: ScheduleType
  ) => {
    setEditingScheduleContext({ technician, date, existingSchedule });
    let shift: ShiftType = getShiftForCell(technician, date);
    if (existingSchedule) {
      shift = detectShift(existingSchedule.startTime, existingSchedule.endTime);
    }
    setScheduleForm({
      technicianId: technician.id,
      date: format(date, 'yyyy-MM-dd'),
      shift,
      note: '',
    });
    setIsScheduleModalOpen(true);
  };

  const handleSaveSchedule = () => {
    const shiftCfg = SHIFT_CONFIG[scheduleForm.shift];
    const existingForDay = schedules.filter(
      (s) =>
        s.technicianId === scheduleForm.technicianId &&
        s.date === scheduleForm.date
    );

    if (scheduleForm.shift === 'rest') {
      existingForDay.forEach((s) =>
        updateSchedule(s.id, {
          startTime: '',
          endTime: '',
          isAvailable: false,
        })
      );
      if (existingForDay.length === 0) {
        addSchedule({
          technicianId: scheduleForm.technicianId,
          date: scheduleForm.date,
          startTime: '',
          endTime: '',
          isAvailable: false,
        });
      }
    } else {
      if (existingForDay.length === 1) {
        updateSchedule(existingForDay[0].id, {
          startTime: shiftCfg.startTime,
          endTime: shiftCfg.endTime,
          isAvailable: true,
        });
      } else {
        existingForDay.forEach((s) => deleteSchedule(s.id));
        addSchedule({
          technicianId: scheduleForm.technicianId,
          date: scheduleForm.date,
          startTime: shiftCfg.startTime,
          endTime: shiftCfg.endTime,
          isAvailable: true,
        });
      }
    }
    setIsScheduleModalOpen(false);
  };

  const openBatchScheduleModal = () => {
    setBatchScheduleForm({
      technicianIds: [],
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(addDays(new Date(), 6), 'yyyy-MM-dd'),
      shift: 'morning',
      note: '',
    });
    setBatchFormErrors({});
    setIsBatchModalOpen(true);
  };

  const validateBatchForm = () => {
    const errors: Partial<Record<keyof BatchScheduleData, string>> = {};
    if (batchScheduleForm.technicianIds.length === 0) {
      errors.technicianIds = '请至少选择一位技师';
    }
    if (!batchScheduleForm.startDate) errors.startDate = '请选择起始日期';
    if (!batchScheduleForm.endDate) errors.endDate = '请选择结束日期';
    if (
      batchScheduleForm.startDate &&
      batchScheduleForm.endDate &&
      batchScheduleForm.startDate > batchScheduleForm.endDate
    ) {
      errors.endDate = '结束日期不能早于起始日期';
    }
    setBatchFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveBatchSchedule = () => {
    if (!validateBatchForm()) return;

    const shiftCfg = SHIFT_CONFIG[batchScheduleForm.shift];
    const start = new Date(batchScheduleForm.startDate);
    const end = new Date(batchScheduleForm.endDate);

    batchScheduleForm.technicianIds.forEach((techId) => {
      for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
        const dateStr = format(d, 'yyyy-MM-dd');
        const existingForDay = schedules.filter(
          (s) => s.technicianId === techId && s.date === dateStr
        );
        if (batchScheduleForm.shift === 'rest') {
          if (existingForDay.length > 0) {
            existingForDay.forEach((s) =>
              updateSchedule(s.id, {
                startTime: '',
                endTime: '',
                isAvailable: false,
              })
            );
          } else {
            addSchedule({
              technicianId: techId,
              date: dateStr,
              startTime: '',
              endTime: '',
              isAvailable: false,
            });
          }
        } else {
          if (existingForDay.length === 1) {
            updateSchedule(existingForDay[0].id, {
              startTime: shiftCfg.startTime,
              endTime: shiftCfg.endTime,
              isAvailable: true,
            });
          } else {
            existingForDay.forEach((s) => deleteSchedule(s.id));
            addSchedule({
              technicianId: techId,
              date: dateStr,
              startTime: shiftCfg.startTime,
              endTime: shiftCfg.endTime,
              isAvailable: true,
            });
          }
        }
      }
    });

    setIsBatchModalOpen(false);
  };

  const projectIdsList = getProjectIdsList();

  const salaryAppointments = useMemo(() => {
    const start = salaryDateRange.startDate;
    const end = salaryDateRange.endDate;
    return appointments.filter((a) => {
      if (a.status !== 'completed') return false;
      return a.date >= start && a.date <= end;
    });
  }, [appointments, salaryDateRange]);

  const technicianSalaryCalcs = useMemo<TechnicianSalaryCalc[]>(() => {
    return technicians.map((tech) => {
      const techAppointments = salaryAppointments.filter(
        (a) => a.technicianId === tech.id
      );
      const items: SalaryCalcItem[] = techAppointments.map((appt) => {
        const project = projects.find((p) => p.id === appt.projectId);
        const rate = project?.commissionRate ?? 0;
        const commission = Math.round(appt.price * (rate / 100) * 100) / 100;
        return {
          appointmentId: appt.id,
          projectId: appt.projectId,
          projectName: project?.name ?? '未知项目',
          serviceDate: appt.date,
          servicePrice: appt.price,
          commissionRate: rate,
          commissionAmount: commission,
        };
      });
      const totalCommission = items.reduce((sum, i) => sum + i.commissionAmount, 0);
      const totalAmount = techAppointments.reduce((sum, a) => sum + a.price, 0);
      return {
        technicianId: tech.id,
        technician: tech,
        totalServiceCount: techAppointments.length,
        totalAmount,
        totalCommission: Math.round(totalCommission * 100) / 100,
        items,
      };
    });
  }, [technicians, salaryAppointments, projects]);

  const overallSalaryStats = useMemo(() => {
    return technicianSalaryCalcs.reduce(
      (acc, calc) => {
        acc.totalServiceCount += calc.totalServiceCount;
        acc.totalAmount += calc.totalAmount;
        acc.totalCommission += calc.totalCommission;
        return acc;
      },
      {
        totalServiceCount: 0,
        totalAmount: 0,
        totalCommission: 0,
      }
    );
  }, [technicianSalaryCalcs]);

  const filteredSalaryPayments = useMemo(() => {
    let list = [...salaryPayments];
    if (salaryStatusFilter !== 'all') {
      list = list.filter((p) => p.status === salaryStatusFilter);
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [salaryPayments, salaryStatusFilter]);

  const salaryPaymentStats = useMemo(() => {
    const pending = salaryPayments.filter((p) => p.status === 'pending');
    const paid = salaryPayments.filter((p) => p.status === 'paid');
    return {
      total: salaryPayments.length,
      pendingCount: pending.length,
      paidCount: paid.length,
      pendingTotal: pending.reduce((sum, p) => sum + p.netSalary, 0),
      paidTotal: paid.reduce((sum, p) => sum + p.netSalary, 0),
    };
  }, [salaryPayments]);

  const openGenerateSalaryModal = () => {
    setGenerateSalaryForm({
      technicianIds: technicians.map((t) => t.id),
      periodStart: salaryDateRange.startDate,
      periodEnd: salaryDateRange.endDate,
      baseSalary: '0',
      bonus: '0',
      deductions: '0',
    });
    setGenerateFormErrors({});
    setIsGenerateSalaryModalOpen(true);
  };

  const validateGenerateForm = () => {
    const errors: Partial<Record<keyof GenerateSalaryForm, string>> = {};
    if (generateSalaryForm.technicianIds.length === 0) {
      errors.technicianIds = '请至少选择一位技师';
    }
    if (!generateSalaryForm.periodStart) errors.periodStart = '请选择起始日期';
    if (!generateSalaryForm.periodEnd) errors.periodEnd = '请选择结束日期';
    if (
      generateSalaryForm.periodStart &&
      generateSalaryForm.periodEnd &&
      generateSalaryForm.periodStart > generateSalaryForm.periodEnd
    ) {
      errors.periodEnd = '结束日期不能早于起始日期';
    }
    setGenerateFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleGenerateSalary = () => {
    if (!validateGenerateForm()) return;

    const { technicianIds, periodStart, periodEnd, baseSalary, bonus, deductions } = generateSalaryForm;
    const bs = Number(baseSalary) || 0;
    const bn = Number(bonus) || 0;
    const dd = Number(deductions) || 0;

    const periodAppointments = appointments.filter((a) => {
      if (a.status !== 'completed') return false;
      return a.date >= periodStart && a.date <= periodEnd;
    });

    technicianIds.forEach((techId) => {
      const tech = technicians.find((t) => t.id === techId);
      if (!tech) return;

      const techAppointments = periodAppointments.filter((a) => a.technicianId === techId);
      const items: SalaryItem[] = techAppointments.map((appt) => {
        const project = projects.find((p) => p.id === appt.projectId);
        const rate = project?.commissionRate ?? 0;
        const commission = Math.round(appt.price * (rate / 100) * 100) / 100;
        return {
          appointmentId: appt.id,
          projectId: appt.projectId,
          projectName: project?.name ?? '未知项目',
          serviceDate: appt.date,
          servicePrice: appt.price,
          commissionRate: rate,
          commissionAmount: commission,
        };
      });

      const totalCommission = items.reduce((sum, i) => sum + i.commissionAmount, 0);
      const totalAmount = techAppointments.reduce((sum, a) => sum + a.price, 0);
      const netSalary = Math.round((bs + totalCommission + bn - dd) * 100) / 100;

      addSalaryPayment({
        technicianId: tech.id,
        periodStart,
        periodEnd,
        baseSalary: bs,
        totalCommission: Math.round(totalCommission * 100) / 100,
        totalServiceCount: techAppointments.length,
        totalAmount,
        deductions: dd,
        bonus: bn,
        netSalary: Math.max(0, netSalary),
        status: 'pending',
        items,
      });
    });

    setIsGenerateSalaryModalOpen(false);
  };

  const openPaySalaryModal = (payment: SalaryPayment) => {
    setPayingSalary(payment);
    setPaySalaryForm({
      paidMethod: 'wechat',
      remark: '',
    });
    setIsPaySalaryModalOpen(true);
  };

  const handlePaySalary = () => {
    if (!payingSalary) return;
    markSalaryPaid(payingSalary.id, paySalaryForm.paidMethod, paySalaryForm.remark || undefined);
    setIsPaySalaryModalOpen(false);
  };

  const openViewSalaryDetail = (payment: SalaryPayment) => {
    setViewingSalary(payment);
    setIsSalaryDetailModalOpen(true);
  };

  const handleSalaryDateRangePresetChange = (preset: DateRangePreset) => {
    const today = new Date();
    let start: Date;
    let end: Date;
    switch (preset) {
      case 'today':
        start = today;
        end = today;
        break;
      case 'week':
        start = subDays(today, 6);
        end = today;
        break;
      case 'month':
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case 'custom':
      default:
        return;
    }
    setSalaryDateRange({
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
      preset,
    });
  };

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    const labels: Record<PaymentMethod, string> = {
      cash: '现金',
      wechat: '微信',
      alipay: '支付宝',
      card: '刷卡',
      transfer: '转账',
      other: '其他',
    };
    return labels[method];
  };

  return (
    <div className="min-h-screen p-6 md:p-8 animate-fade-up">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题区 */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex-shrink-0">
            <h1 className="text-3xl font-bold text-ink-500 tracking-tight">
              技师管理
            </h1>
            <p className="text-ink-300 mt-1">管理技师信息、排班安排与工资发放</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              className={cn(
                'btn-primary flex items-center gap-2',
                activeTab === 'salary' && 'btn-outline'
              )}
              onClick={() =>
                activeTab === 'salary'
                  ? openGenerateSalaryModal()
                  : openAddTechnicianModal()
              }
            >
              {activeTab === 'salary' ? (
                <>
                  <FileText size={17} />
                  生成工资单
                </>
              ) : (
                <>
                  <UserPlus size={17} />
                  新增技师
                </>
              )}
            </button>
            {activeTab === 'schedule' && (
              <button
                className="btn-outline flex items-center gap-2"
                onClick={openBatchScheduleModal}
              >
                <CalendarDays size={17} />
                批量排班
              </button>
            )}
          </div>
        </div>

        {/* Tab切换 */}
        <div className="flex items-center bg-cream-100 rounded-xl p-1 mb-6 w-fit">
          <button
            onClick={() => setActiveTab('schedule')}
            className={cn(
              'px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2',
              activeTab === 'schedule'
                ? 'bg-white text-ink-500 shadow-card'
                : 'text-ink-400 hover:text-ink-500'
            )}
          >
            <CalendarDays size={16} />
            排班管理
          </button>
          <button
            onClick={() => setActiveTab('salary')}
            className={cn(
              'px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2',
              activeTab === 'salary'
                ? 'bg-white text-ink-500 shadow-card'
                : 'text-ink-400 hover:text-ink-500'
            )}
          >
            <Wallet size={16} />
            工资管理
          </button>
        </div>

        {activeTab === 'schedule' && (
          <>
            {/* 排班视图的日期导航和视图切换 */}
            <div className="flex flex-col sm:flex-row lg:items-center gap-3 lg:gap-4 mb-6">
              {/* 日期导航 */}
              <div className="flex items-center gap-2 bg-white rounded-xl border border-cream-200 px-3 py-2 shadow-card">
                <button
                  onClick={goToPrevWeek}
                  className="p-1.5 rounded-lg text-ink-400 hover:text-ink-600 hover:bg-cream-100 transition-colors"
                  title="上一周"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={goToThisWeek}
                  className="px-3 py-1 rounded-lg text-sm font-medium text-sandalwood-600 bg-sandalwood-50 hover:bg-sandalwood-100 transition-colors"
                >
                  本周
                </button>
                <span className="px-2 text-sm font-medium text-ink-500 whitespace-nowrap">
                  {weekDateRangeText}
                </span>
                <button
                  onClick={goToNextWeek}
                  className="p-1.5 rounded-lg text-ink-400 hover:text-ink-600 hover:bg-cream-100 transition-colors"
                  title="下一周"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* 视图切换 */}
              <div className="flex items-center bg-cream-100 rounded-xl p-1">
                {(['week', 'month'] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={cn(
                      'px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5',
                      viewMode === mode
                        ? 'bg-white text-ink-500 shadow-card'
                        : 'text-ink-400 hover:text-ink-500'
                    )}
                  >
                    {mode === 'week' ? (
                      <>
                        <CalendarDays size={15} />
                        周视图
                      </>
                    ) : (
                      <>
                        <CalendarIcon size={15} />
                        月视图
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* 技师档案卡片列表 */}
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-ink-500 flex items-center gap-2">
              <Sparkles size={18} className="text-gold-500" />
              技师档案
              <span className="text-sm font-normal text-ink-300 ml-1">
                ({technicians.length}位)
              </span>
            </h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-3 -mx-1 px-1">
            {technicians.length === 0 ? (
              <div className="flex-1 py-12 text-center text-ink-300">
                暂无技师数据，请点击右上角"新增技师"
              </div>
            ) : (
              technicians.map((tech, idx) => {
                const statusInfo = getTechnicianStatus(tech, new Date());
                const techProjects = tech.projectIds
                  .map((pid) => getProjectName(pid))
                  .filter(Boolean);
                const shownProjects = techProjects.slice(0, 2);
                const extraCount = techProjects.length - shownProjects.length;
                return (
                  <div
                    key={tech.id}
                    className="flex-shrink-0 w-64 bg-white rounded-xl border border-cream-200 p-4 transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 cursor-pointer group"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className={cn(
                          'w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md bg-gradient-to-br flex-shrink-0',
                          getAvatarGradient(idx)
                        )}
                      >
                        {tech.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-ink-500 truncate">
                            {tech.name}
                          </h3>
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0',
                              statusInfo.className
                            )}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                        {tech.position && (
                          <p className="text-xs text-ink-400 mt-0.5">
                            {tech.position}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 擅长项目标签 */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {shownProjects.map((pName) => (
                        <span
                          key={pName}
                          className="px-2 py-0.5 rounded-md bg-jade-50 text-jade-700 text-xs font-medium border border-jade-100"
                        >
                          {pName}
                        </span>
                      ))}
                      {extraCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-ink-50 text-ink-400 text-xs font-medium border border-ink-100">
                          +{extraCount}
                        </span>
                      )}
                      {techProjects.length === 0 && (
                        <span className="text-xs text-ink-300">暂未设置擅长项目</span>
                      )}
                    </div>

                    {/* 电话 */}
                    <div className="flex items-center gap-1.5 text-sm text-ink-400 mb-3">
                      <Phone size={13} />
                      <span>{tech.phone}</span>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex gap-2 pt-2 border-t border-cream-100 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-sandalwood-600 bg-sandalwood-50 hover:bg-sandalwood-100 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditTechnicianModal(tech);
                        }}
                      >
                        <Edit2 size={13} />
                        编辑
                      </button>
                      <button
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-jade-600 bg-jade-50 hover:bg-jade-100 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          openQuickScheduleForTechnician(tech);
                        }}
                      >
                        <Clock size={13} />
                        排班
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {activeTab === 'schedule' && (
          <>
        {/* 日期范围搜索 & 服务统计 */}
        <div className="card p-5 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
            <h2 className="text-lg font-semibold text-ink-500 flex items-center gap-2">
              <BarChart3 size={18} className="text-indigo-500" />
              技师服务统计
            </h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center bg-cream-100 rounded-xl p-1">
                {(['today', 'week', 'month'] as DateRangePreset[]).map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleDateRangePresetChange(preset)}
                    className={cn(
                      'px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                      dateRange.preset === preset
                        ? 'bg-white text-ink-500 shadow-card'
                        : 'text-ink-400 hover:text-ink-500'
                    )}
                  >
                    {preset === 'today' ? '今日' : preset === 'week' ? '近7天' : '近30天'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) =>
                      setDateRange((d) => ({
                        ...d,
                        startDate: e.target.value,
                        preset: 'custom',
                      }))
                    }
                    className="pl-9 pr-3 py-1.5 rounded-lg border border-cream-200 text-sm text-ink-500 focus:outline-none focus:ring-2 focus:ring-jade-100 focus:border-jade-300"
                  />
                </div>
                <span className="text-ink-300">至</span>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) =>
                    setDateRange((d) => ({
                      ...d,
                      endDate: e.target.value,
                      preset: 'custom',
                    }))
                  }
                  className="px-3 py-1.5 rounded-lg border border-cream-200 text-sm text-ink-500 focus:outline-none focus:ring-2 focus:ring-jade-100 focus:border-jade-300"
                />
              </div>
            </div>
          </div>

          {/* 总体统计卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-jade-50 to-jade-100/50 rounded-xl p-4 border border-jade-100">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-9 h-9 rounded-lg bg-jade-500 flex items-center justify-center shadow-sm">
                  <Users size={17} className="text-white" />
                </div>
                <span className="text-sm font-medium text-ink-500">总订单数</span>
              </div>
              <p className="text-2xl font-bold text-jade-700">
                {overallStats.totalOrders}
                <span className="text-sm font-normal text-ink-400 ml-1">单</span>
              </p>
            </div>
            <div className="bg-gradient-to-br from-gold-50 to-gold-100/50 rounded-xl p-4 border border-gold-100">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-9 h-9 rounded-lg bg-gold-500 flex items-center justify-center shadow-sm">
                  <DollarSign size={17} className="text-white" />
                </div>
                <span className="text-sm font-medium text-ink-500">总营业额</span>
              </div>
              <p className="text-2xl font-bold text-gold-700">
                ¥{overallStats.totalRevenue.toLocaleString()}
              </p>
            </div>
            <div className="bg-gradient-to-br from-sandalwood-50 to-sandalwood-100/50 rounded-xl p-4 border border-sandalwood-100">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-9 h-9 rounded-lg bg-sandalwood-500 flex items-center justify-center shadow-sm">
                  <Check size={17} className="text-white" />
                </div>
                <span className="text-sm font-medium text-ink-500">已完成</span>
              </div>
              <p className="text-2xl font-bold text-sandalwood-700">
                {overallStats.totalCompleted}
                <span className="text-sm font-normal text-ink-400 ml-1">单</span>
              </p>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-xl p-4 border border-indigo-100">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-9 h-9 rounded-lg bg-indigo-500 flex items-center justify-center shadow-sm">
                  <TrendingUp size={17} className="text-white" />
                </div>
                <span className="text-sm font-medium text-ink-500">服务人次</span>
              </div>
              <p className="text-2xl font-bold text-indigo-700">
                {overallStats.totalUniqueCustomers}
                <span className="text-sm font-normal text-ink-400 ml-1">人</span>
              </p>
            </div>
          </div>

          {/* 排行榜 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy size={18} className="text-gold-500" />
                <h3 className="font-semibold text-ink-500">技师排行榜</h3>
              </div>
              <div className="flex items-center bg-cream-100 rounded-xl p-1">
                <button
                  onClick={() => setRankSortType('count')}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1',
                    rankSortType === 'count'
                      ? 'bg-white text-ink-500 shadow-card'
                      : 'text-ink-400 hover:text-ink-500'
                  )}
                >
                  <Users size={12} />
                  按单数
                </button>
                <button
                  onClick={() => setRankSortType('revenue')}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1',
                    rankSortType === 'revenue'
                      ? 'bg-white text-ink-500 shadow-card'
                      : 'text-ink-400 hover:text-ink-500'
                  )}
                >
                  <DollarSign size={12} />
                  按金额
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {rankedTechnicians.length === 0 ? (
                <div className="py-12 text-center text-ink-300">暂无数据</div>
              ) : (
                rankedTechnicians.map((stat, idx) => {
                  const techIdx = technicians.findIndex(
                    (t) => t.id === stat.technicianId
                  );
                  const progressPct =
                    rankSortType === 'count'
                      ? (stat.orderCount / maxRankValue) * 100
                      : (stat.totalRevenue / maxRankValue) * 100;
                  const displayValue =
                    rankSortType === 'count'
                      ? `${stat.orderCount}单`
                      : `¥${stat.totalRevenue.toLocaleString()}`;
                  return (
                    <div
                      key={stat.technicianId}
                      onClick={() => handleOpenTechnicianStats(stat.technician)}
                      className={cn(
                        'flex items-center gap-4 p-3 rounded-xl border transition-all duration-200 cursor-pointer',
                        idx < 3
                          ? 'bg-gradient-to-r from-cream-50 to-white border-cream-200 hover:shadow-card-hover hover:-translate-y-0.5'
                          : 'bg-white border-cream-100 hover:border-cream-300 hover:shadow-sm'
                      )}
                    >
                      {getRankBadge(idx)}
                      <div
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shadow-sm bg-gradient-to-br flex-shrink-0',
                          getAvatarGradient(techIdx >= 0 ? techIdx : idx)
                        )}
                      >
                        {stat.technician.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-ink-500 truncate">
                              {stat.technician.name}
                            </span>
                            {stat.technician.position && (
                              <span className="text-xs text-ink-300 flex-shrink-0">
                                {stat.technician.position}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <span
                              className={cn(
                                'text-lg font-bold',
                                idx === 0
                                  ? 'text-yellow-600'
                                  : idx === 1
                                  ? 'text-slate-600'
                                  : idx === 2
                                  ? 'text-amber-700'
                                  : 'text-ink-600'
                              )}
                            >
                              {displayValue}
                            </span>
                            <Eye size={15} className="text-ink-300" />
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-cream-100 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-500',
                                idx === 0
                                  ? 'bg-gradient-to-r from-yellow-400 to-yellow-500'
                                  : idx === 1
                                  ? 'bg-gradient-to-r from-slate-300 to-slate-400'
                                  : idx === 2
                                  ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                                  : 'bg-gradient-to-r from-jade-400 to-jade-500'
                              )}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <div className="flex items-center gap-3 text-xs text-ink-400 flex-shrink-0">
                            <span className="flex items-center gap-1">
                              <Check size={11} className="text-jade-500" />
                              完成{stat.completedCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users size={11} className="text-indigo-500" />
                              {stat.uniqueCustomers}人
                            </span>
                            <span className="flex items-center gap-1">
                              <Star size={11} className="text-gold-500" />
                              ¥{stat.avgOrderValue.toFixed(0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 周视图排班日历 */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-cream-100 border-r border-cream-200 text-left px-4 py-3 w-44">
                    <span className="text-sm font-semibold text-ink-500">技师</span>
                  </th>
                  {weekDays.map((day) => {
                    const today = isToday(day);
                    return (
                      <th
                        key={day.toISOString()}
                        className={cn(
                          'px-2 py-3 text-center min-w-[110px]',
                          today
                            ? 'bg-gold-50 border-b border-gold-100'
                            : 'bg-cream-100 border-b border-cream-200'
                        )}
                      >
                        <div
                          className={cn(
                            'text-xs font-medium',
                            today ? 'text-gold-700' : 'text-ink-400'
                          )}
                        >
                          周{WEEKDAY_LABELS[day.getDay()]}
                        </div>
                        <div
                          className={cn(
                            'mt-1 inline-flex items-center justify-center w-8 h-8 rounded-full font-semibold',
                            today
                              ? 'bg-gold-500 text-white'
                              : 'text-ink-500'
                          )}
                        >
                          {day.getDate()}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {technicians.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-16 text-center text-ink-300 border-t border-cream-200"
                    >
                      暂无技师，无法生成排班表
                    </td>
                  </tr>
                ) : (
                  technicians.map((tech, techIdx) => {
                    const statusInfo = getTechnicianStatus(tech, new Date());
                    return (
                      <tr
                        key={tech.id}
                        className="border-t border-cream-100 hover:bg-cream-50/50 transition-colors"
                      >
                        {/* 技师信息列 */}
                        <td className="sticky left-0 z-10 bg-white border-r border-cream-200 px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                'w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm bg-gradient-to-br flex-shrink-0',
                                getAvatarGradient(techIdx)
                              )}
                            >
                              {tech.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-ink-500 truncate max-w-[90px]">
                                {tech.name}
                              </div>
                              <span
                                className={cn(
                                  'inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium',
                                  statusInfo.className
                                )}
                              >
                                {statusInfo.label}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 每天排班单元格 */}
                        {weekDays.map((day) => {
                          const cellSchedules = getSchedulesForCell(tech.id, day);
                          const { shift, override } = resolveCellShift(
                            cellSchedules,
                            tech,
                            day
                          );
                          const activeSchedule = cellSchedules.find((s) => s.isAvailable);
                          const effectiveCfg = SHIFT_CONFIG[shift];
                          const displayStartTime =
                            override && activeSchedule
                              ? activeSchedule.startTime
                              : effectiveCfg.startTime;
                          const displayEndTime =
                            override && activeSchedule
                              ? activeSchedule.endTime
                              : effectiveCfg.endTime;
                          const cellAppointments = getAppointmentsForCell(tech.id, day);
                          const today = isToday(day);

                          return (
                            <td
                              key={day.toISOString()}
                              className={cn(
                                'px-2 py-2 align-top cursor-pointer relative group',
                                today && 'bg-gold-50/40'
                              )}
                              onClick={() =>
                                openScheduleModal(
                                  tech,
                                  day,
                                  activeSchedule ?? cellSchedules[0]
                                )
                              }
                            >
                              <div
                                className={cn(
                                  'rounded-lg border p-2 min-h-[72px] transition-all duration-200',
                                  effectiveCfg.bg,
                                  effectiveCfg.border,
                                  'group-hover:shadow-md group-hover:scale-[1.02]'
                                )}
                              >
                                {shift !== 'rest' ? (
                                  <>
                                    <div
                                      className={cn(
                                        'text-xs font-semibold flex items-center gap-1',
                                        effectiveCfg.text
                                      )}
                                    >
                                      <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-white/60 text-[10px] font-bold">
                                        {effectiveCfg.short}
                                      </span>
                                      {displayStartTime}-{displayEndTime}
                                    </div>
                                    {/* 预约色块 */}
                                    {cellAppointments.length > 0 && (
                                      <div className="mt-1.5 flex flex-wrap gap-1">
                                        {cellAppointments.slice(0, 3).map(
                                          (appt) => (
                                            <div
                                              key={appt.id}
                                              className={cn(
                                                'w-3 h-3 rounded-full',
                                                getProjectColor(
                                                  appt.projectId,
                                                  projectIdsList
                                                )
                                              )}
                                              title={`${getProjectName(appt.projectId)} ${appt.startTime}`}
                                            />
                                          )
                                        )}
                                        {cellAppointments.length > 3 && (
                                          <span className="text-[10px] text-ink-500 font-medium">
                                            +{cellAppointments.length - 3}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="flex items-center justify-center h-full min-h-[48px]">
                                    <span className="text-xs font-medium text-ink-400">
                                      — 休息 —
                                    </span>
                                  </div>
                                )}
                              </div>
                              {/* 悬停提示 */}
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                <div className="bg-ink-500/80 text-white text-xs px-2 py-1 rounded shadow-md">
                                  点击排班
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 图例 */}
          <div className="border-t border-cream-200 bg-cream-50 px-6 py-3 flex flex-wrap items-center gap-4 text-xs text-ink-400">
            <span className="font-medium text-ink-500">图例：</span>
            {(Object.keys(SHIFT_CONFIG) as ShiftType[]).map((key) => {
              const cfg = SHIFT_CONFIG[key];
              return (
                <div key={key} className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      'w-4 h-4 rounded border',
                      cfg.bg,
                      cfg.border
                    )}
                  />
                  <span>{cfg.label}</span>
                </div>
              );
            })}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-jade-500" />
              <span>预约项目</span>
            </div>
          </div>
        </div>
          </>
        )}

        {activeTab === 'salary' && (
          <>
            {/* 工资管理总览卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-jade-50 to-jade-100/50 rounded-xl p-4 border border-jade-100">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-jade-500 flex items-center justify-center shadow-sm">
                    <FileText size={17} className="text-white" />
                  </div>
                  <span className="text-sm font-medium text-ink-500">工资单总数</span>
                </div>
                <p className="text-2xl font-bold text-jade-700">
                  {salaryPaymentStats.total}
                  <span className="text-sm font-normal text-ink-400 ml-1">单</span>
                </p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-4 border border-amber-100">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center shadow-sm">
                    <Clock size={17} className="text-white" />
                  </div>
                  <span className="text-sm font-medium text-ink-500">待发放</span>
                </div>
                <p className="text-2xl font-bold text-amber-700">
                  {salaryPaymentStats.pendingCount}
                  <span className="text-sm font-normal text-ink-400 ml-1">单</span>
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  ¥{salaryPaymentStats.pendingTotal.toLocaleString()}
                </p>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-4 border border-emerald-100">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center shadow-sm">
                    <Check size={17} className="text-white" />
                  </div>
                  <span className="text-sm font-medium text-ink-500">已发放</span>
                </div>
                <p className="text-2xl font-bold text-emerald-700">
                  {salaryPaymentStats.paidCount}
                  <span className="text-sm font-normal text-ink-400 ml-1">单</span>
                </p>
                <p className="text-xs text-emerald-600 mt-1">
                  ¥{salaryPaymentStats.paidTotal.toLocaleString()}
                </p>
              </div>
              <div className="bg-gradient-to-br from-rose-50 to-rose-100/50 rounded-xl p-4 border border-rose-100">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-rose-500 flex items-center justify-center shadow-sm">
                    <Percent size={17} className="text-white" />
                  </div>
                  <span className="text-sm font-medium text-ink-500">本期预计提成</span>
                </div>
                <p className="text-2xl font-bold text-rose-700">
                  ¥{overallSalaryStats.totalCommission.toLocaleString()}
                </p>
                <p className="text-xs text-rose-600 mt-1">
                  {overallSalaryStats.totalServiceCount}次服务
                </p>
              </div>
            </div>

            {/* 提成预览 - 按技师 */}
            <div className="card p-5 mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
                <h2 className="text-lg font-semibold text-ink-500 flex items-center gap-2">
                  <ClipboardList size={18} className="text-sandalwood-500" />
                  技师提成明细（实时预览）
                </h2>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex items-center bg-cream-100 rounded-xl p-1">
                    {(['week', 'month'] as const).map((preset) => (
                      <button
                        key={preset}
                        onClick={() => handleSalaryDateRangePresetChange(preset)}
                        className={cn(
                          'px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                          salaryDateRange.preset === preset
                            ? 'bg-white text-ink-500 shadow-card'
                            : 'text-ink-400 hover:text-ink-500'
                        )}
                      >
                        {preset === 'week' ? '本周' : '本月'}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
                      <input
                        type="date"
                        value={salaryDateRange.startDate}
                        onChange={(e) =>
                          setSalaryDateRange((d) => ({
                            ...d,
                            startDate: e.target.value,
                            preset: 'custom',
                          }))
                        }
                        className="pl-9 pr-3 py-1.5 rounded-lg border border-cream-200 text-sm text-ink-500 focus:outline-none focus:ring-2 focus:ring-jade-100 focus:border-jade-300"
                      />
                    </div>
                    <span className="text-ink-300">至</span>
                    <input
                      type="date"
                      value={salaryDateRange.endDate}
                      onChange={(e) =>
                        setSalaryDateRange((d) => ({
                          ...d,
                          endDate: e.target.value,
                          preset: 'custom',
                        }))
                      }
                      className="px-3 py-1.5 rounded-lg border border-cream-200 text-sm text-ink-500 focus:outline-none focus:ring-2 focus:ring-jade-100 focus:border-jade-300"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-cream-100">
                      <th className="text-left px-4 py-3 text-sm font-semibold text-ink-500 whitespace-nowrap">技师</th>
                      <th className="text-right px-4 py-3 text-sm font-semibold text-ink-500 whitespace-nowrap">服务人次</th>
                      <th className="text-right px-4 py-3 text-sm font-semibold text-ink-500 whitespace-nowrap">服务金额</th>
                      <th className="text-right px-4 py-3 text-sm font-semibold text-ink-500 whitespace-nowrap">提成金额</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-ink-500 whitespace-nowrap">提成占比</th>
                      <th className="text-center px-4 py-3 text-sm font-semibold text-ink-500 whitespace-nowrap">明细</th>
                    </tr>
                  </thead>
                  <tbody>
                    {technicianSalaryCalcs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-ink-300">
                          暂无数据
                        </td>
                      </tr>
                    ) : (
                      technicianSalaryCalcs.map((calc, idx) => {
                        const techIdx = technicians.findIndex((t) => t.id === calc.technicianId);
                        const commissionPct = calc.totalAmount > 0
                          ? ((calc.totalCommission / calc.totalAmount) * 100).toFixed(1)
                          : '0';
                        const totalMax = Math.max(...technicianSalaryCalcs.map((c) => c.totalCommission), 1);
                        const progressPct = (calc.totalCommission / totalMax) * 100;
                        return (
                          <tr
                            key={calc.technicianId}
                            className="border-t border-cream-200 transition-colors hover:bg-cream-50"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={cn(
                                    'w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm bg-gradient-to-br flex-shrink-0',
                                    getAvatarGradient(techIdx >= 0 ? techIdx : idx)
                                  )}
                                >
                                  {calc.technician.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-medium text-ink-500">{calc.technician.name}</div>
                                  {calc.technician.position && (
                                    <div className="text-xs text-ink-300">{calc.technician.position}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-medium text-ink-600">{calc.totalServiceCount}</span>
                              <span className="text-xs text-ink-300 ml-1">次</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-sandalwood-600 font-medium">
                                ¥{calc.totalAmount.toLocaleString()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-rose-600 font-bold text-lg">
                                ¥{calc.totalCommission.toLocaleString()}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-2 bg-cream-100 rounded-full overflow-hidden max-w-[120px]">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-rose-400 to-rose-500 transition-all duration-500"
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-ink-400 whitespace-nowrap">{commissionPct}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {calc.items.length > 0 ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                  {calc.items.length}条记录
                                </span>
                              ) : (
                                <span className="text-xs text-ink-300">暂无</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {technicianSalaryCalcs.length > 0 && (
                    <tfoot>
                      <tr className="bg-cream-50 border-t-2 border-cream-200">
                        <td className="px-4 py-3 font-semibold text-ink-500">合计</td>
                        <td className="px-4 py-3 text-right font-semibold text-jade-600">
                          {overallSalaryStats.totalServiceCount}次
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-sandalwood-600">
                          ¥{overallSalaryStats.totalAmount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-rose-600 text-lg">
                          ¥{overallSalaryStats.totalCommission.toLocaleString()}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* 工资单列表 */}
            <div className="card p-5">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
                <h2 className="text-lg font-semibold text-ink-500 flex items-center gap-2">
                  <Receipt size={18} className="text-indigo-500" />
                  工资单记录
                </h2>
                <div className="flex items-center bg-cream-100 rounded-xl p-1">
                  {(['all', 'pending', 'paid'] as SalaryStatusFilter[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSalaryStatusFilter(s)}
                      className={cn(
                        'px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5',
                        salaryStatusFilter === s
                          ? 'bg-white text-ink-500 shadow-card'
                          : 'text-ink-400 hover:text-ink-500'
                      )}
                    >
                      {s === 'all' ? (
                        <>
                          <FileText size={13} />
                          全部
                        </>
                      ) : s === 'pending' ? (
                        <>
                          <Clock size={13} />
                          待发放
                        </>
                      ) : (
                        <>
                          <Check size={13} />
                          已发放
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {filteredSalaryPayments.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-cream-100 flex items-center justify-center mb-4">
                      <Wallet size={28} className="text-ink-300" />
                    </div>
                    <p className="text-ink-400 mb-4">暂无工资单记录</p>
                    <button
                      className="btn-primary inline-flex items-center gap-2"
                      onClick={openGenerateSalaryModal}
                    >
                      <FileText size={16} />
                      生成第一份工资单
                    </button>
                  </div>
                ) : (
                  filteredSalaryPayments.map((payment) => {
                    const tech = technicians.find((t) => t.id === payment.technicianId);
                    const techIdx = technicians.findIndex((t) => t.id === payment.technicianId);
                    return (
                      <div
                        key={payment.id}
                        className="bg-white rounded-xl border border-cream-200 p-4 hover:shadow-md hover:border-cream-300 transition-all"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div
                              className={cn(
                                'w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shadow-sm bg-gradient-to-br flex-shrink-0',
                                getAvatarGradient(techIdx >= 0 ? techIdx : 0)
                              )}
                            >
                              {tech?.name.charAt(0) ?? '?'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-ink-500 truncate">
                                  {tech?.name ?? '未知技师'}
                                </h3>
                                <span
                                  className={cn(
                                    'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
                                    payment.status === 'paid'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  )}
                                >
                                  {payment.status === 'paid' ? '已发放' : '待发放'}
                                </span>
                              </div>
                              <p className="text-xs text-ink-300 mt-0.5">
                                周期：{payment.periodStart} ~ {payment.periodEnd}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
                            <div className="text-center">
                              <p className="text-xs text-ink-400 mb-0.5">服务次数</p>
                              <p className="font-semibold text-ink-600">
                                {payment.totalServiceCount}
                                <span className="text-xs text-ink-300 ml-0.5">次</span>
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-ink-400 mb-0.5">提成工资</p>
                              <p className="font-semibold text-rose-600">
                                ¥{payment.totalCommission.toLocaleString()}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-ink-400 mb-0.5">基本/奖金/扣款</p>
                              <p className="text-xs">
                                <span className="text-jade-600">¥{payment.baseSalary}</span>
                                <span className="text-ink-300 mx-1">/</span>
                                <span className="text-amber-600">+¥{payment.bonus}</span>
                                <span className="text-ink-300 mx-1">/</span>
                                <span className="text-red-500">-¥{payment.deductions}</span>
                              </p>
                            </div>
                            <div className="text-center border-l lg:border-l-0 lg:border-l-2 lg:pl-6 border-cream-200">
                              <p className="text-xs text-ink-400 mb-0.5">实发工资</p>
                              <p className="text-xl font-bold text-sandalwood-600">
                                ¥{payment.netSalary.toLocaleString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex lg:flex-col items-center lg:items-end gap-2 lg:gap-1.5">
                            <button
                              className="btn-outline flex items-center gap-1.5 text-sm"
                              onClick={() => openViewSalaryDetail(payment)}
                            >
                              <Eye size={14} />
                              查看明细
                            </button>
                            {payment.status === 'pending' && (
                              <button
                                className="btn-primary flex items-center gap-1.5 text-sm"
                                onClick={() => openPaySalaryModal(payment)}
                              >
                                <Send size={14} />
                                发放工资
                              </button>
                            )}
                            {payment.status === 'paid' && payment.paidMethod && (
                              <p className="text-xs text-ink-400">
                                {payment.paidAt && format(new Date(payment.paidAt), 'MM-dd HH:mm')}
                                <span className="mx-1">·</span>
                                {getPaymentMethodLabel(payment.paidMethod)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 新增/编辑技师 Modal */}
      {isTechnicianModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsTechnicianModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fade-up">
            <div className="flex items-center justify-between px-6 py-5 border-b border-cream-200">
              <h2 className="text-xl font-bold text-ink-500">
                {editingTechnician ? '编辑技师' : '新增技师'}
              </h2>
              <button
                onClick={() => setIsTechnicianModalOpen(false)}
                className="p-2 rounded-lg text-ink-300 hover:text-ink-500 hover:bg-cream-100 transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto max-h-[calc(90vh-160px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 姓名 */}
                <div>
                  <label className="block text-sm font-medium text-ink-500 mb-1.5">
                    姓名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={technicianForm.name}
                    onChange={(e) =>
                      setTechnicianForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="请输入技师姓名"
                    className={cn(
                      'input-field',
                      technicianFormErrors.name &&
                        'border-red-400 focus:border-red-400 focus:ring-red-100'
                    )}
                  />
                  {technicianFormErrors.name && (
                    <p className="text-red-500 text-xs mt-1">
                      {technicianFormErrors.name}
                    </p>
                  )}
                </div>

                {/* 手机号 */}
                <div>
                  <label className="block text-sm font-medium text-ink-500 mb-1.5">
                    手机号 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={technicianForm.phone}
                    onChange={(e) =>
                      setTechnicianForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    placeholder="请输入11位手机号"
                    maxLength={11}
                    className={cn(
                      'input-field',
                      technicianFormErrors.phone &&
                        'border-red-400 focus:border-red-400 focus:ring-red-100'
                    )}
                  />
                  {technicianFormErrors.phone && (
                    <p className="text-red-500 text-xs mt-1">
                      {technicianFormErrors.phone}
                    </p>
                  )}
                </div>

                {/* 性别 */}
                <div>
                  <label className="block text-sm font-medium text-ink-500 mb-1.5">
                    性别
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['male', 'female', 'other'] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() =>
                          setTechnicianForm((f) => ({
                            ...f,
                            gender: f.gender === g ? '' : g,
                          }))
                        }
                        className={cn(
                          'py-2 rounded-lg text-sm font-medium border transition-all duration-200',
                          technicianForm.gender === g
                            ? 'bg-sandalwood-50 border-sandalwood-300 text-sandalwood-700'
                            : 'bg-white border-cream-200 text-ink-400 hover:border-cream-300'
                        )}
                      >
                        {g === 'male' ? '男' : g === 'female' ? '女' : '其他'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 职位 */}
                <div>
                  <label className="block text-sm font-medium text-ink-500 mb-1.5">
                    职位
                  </label>
                  <input
                    type="text"
                    value={technicianForm.position}
                    onChange={(e) =>
                      setTechnicianForm((f) => ({
                        ...f,
                        position: e.target.value,
                      }))
                    }
                    placeholder="如：高级技师、主管"
                    className="input-field"
                  />
                </div>

                {/* 擅长项目 */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-ink-500 mb-2">
                    擅长项目
                  </label>
                  <div className="border border-cream-200 rounded-xl p-4 bg-cream-50 max-h-44 overflow-y-auto">
                    {projects.length === 0 ? (
                      <p className="text-sm text-ink-300 text-center py-4">
                        暂无项目数据
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {projects.map((proj) => {
                          const checked = technicianForm.projectIds.includes(
                            proj.id
                          );
                          return (
                            <label
                              key={proj.id}
                              className={cn(
                                'flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-all duration-200 border',
                                checked
                                  ? 'bg-jade-50 border-jade-200'
                                  : 'bg-white border-cream-200 hover:border-cream-300'
                              )}
                            >
                              <div
                                className={cn(
                                  'w-4 h-4 rounded border-2 flex items-center justify-center transition-all',
                                  checked
                                    ? 'bg-jade-500 border-jade-500'
                                    : 'border-ink-300'
                                )}
                              >
                                {checked && (
                                  <Check size={10} className="text-white" />
                                )}
                              </div>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const ids = e.target.checked
                                    ? [...technicianForm.projectIds, proj.id]
                                    : technicianForm.projectIds.filter(
                                        (id) => id !== proj.id
                                      );
                                  setTechnicianForm((f) => ({
                                    ...f,
                                    projectIds: ids,
                                  }));
                                }}
                                className="sr-only"
                              />
                              <span className="text-sm font-medium text-ink-500 truncate">
                                {proj.name}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* 工作时间 */}
                <div>
                  <label className="block text-sm font-medium text-ink-500 mb-1.5">
                    上班时间
                  </label>
                  <input
                    type="time"
                    value={technicianForm.startTime}
                    onChange={(e) =>
                      setTechnicianForm((f) => ({
                        ...f,
                        startTime: e.target.value,
                      }))
                    }
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-500 mb-1.5">
                    下班时间
                  </label>
                  <input
                    type="time"
                    value={technicianForm.endTime}
                    onChange={(e) =>
                      setTechnicianForm((f) => ({
                        ...f,
                        endTime: e.target.value,
                      }))
                    }
                    className="input-field"
                  />
                </div>

                {/* 工作日 */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-ink-500 mb-2">
                    工作日
                  </label>
                  <div className="grid grid-cols-7 gap-2">
                    {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
                      const checked = technicianForm.workDays.includes(dayIdx);
                      return (
                        <label
                          key={dayIdx}
                          className={cn(
                            'flex flex-col items-center gap-1 py-3 rounded-lg cursor-pointer transition-all duration-200 border',
                            checked
                              ? 'bg-jade-50 border-jade-200'
                              : 'bg-white border-cream-200 hover:border-cream-300'
                          )}
                        >
                          <div
                            className={cn(
                              'w-4 h-4 rounded border-2 flex items-center justify-center transition-all',
                              checked
                                ? 'bg-jade-500 border-jade-500'
                                : 'border-ink-300'
                            )}
                          >
                            {checked && (
                              <Check size={10} className="text-white" />
                            )}
                          </div>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const days = e.target.checked
                                ? [...technicianForm.workDays, dayIdx].sort(
                                    (a, b) => a - b
                                  )
                                : technicianForm.workDays.filter(
                                    (d) => d !== dayIdx
                                  );
                              setTechnicianForm((f) => ({
                                ...f,
                                workDays: days,
                              }));
                            }}
                            className="sr-only"
                          />
                          <span
                            className={cn(
                              'text-xs font-medium',
                              checked ? 'text-jade-700' : 'text-ink-400'
                            )}
                          >
                            {['日', '一', '二', '三', '四', '五', '六'][dayIdx]}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 备注 */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-ink-500 mb-1.5">
                    备注
                  </label>
                  <textarea
                    rows={2}
                    value={technicianForm.note}
                    onChange={(e) =>
                      setTechnicianForm((f) => ({ ...f, note: e.target.value }))
                    }
                    placeholder="请输入备注信息（可选）"
                    className="input-field resize-none"
                  />
                </div>

                {/* 是否启用 */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-ink-500 mb-2">
                    是否启用
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setTechnicianForm((f) => ({
                        ...f,
                        isActive: !f.isActive,
                      }))
                    }
                    className={cn(
                      'relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200',
                      technicianForm.isActive
                        ? 'bg-jade-500'
                        : 'bg-ink-200'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200',
                        technicianForm.isActive
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      )}
                    />
                  </button>
                  <span className="ml-3 text-sm text-ink-400">
                    {technicianForm.isActive ? '已启用' : '已停用'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-cream-200 bg-cream-50">
              <button
                className="btn-ghost"
                onClick={() => setIsTechnicianModalOpen(false)}
              >
                取消
              </button>
              <button className="btn-primary" onClick={handleSaveTechnician}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 排班编辑 Modal */}
      {isScheduleModalOpen && editingScheduleContext && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsScheduleModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-md overflow-hidden animate-fade-up">
            <div className="flex items-center justify-between px-6 py-5 border-b border-cream-200">
              <div>
                <h2 className="text-xl font-bold text-ink-500">编辑排班</h2>
                <p className="text-sm text-ink-300 mt-0.5">
                  {editingScheduleContext.technician.name} ·{' '}
                  {format(editingScheduleContext.date, 'M月d日 EEEE', {
                    locale: zhCN,
                  })}
                </p>
              </div>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="p-2 rounded-lg text-ink-300 hover:text-ink-500 hover:bg-cream-100 transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-5">
              {/* 日期 */}
              <div>
                <label className="block text-sm font-medium text-ink-500 mb-1.5">
                  日期
                </label>
                <input
                  type="date"
                  value={scheduleForm.date}
                  onChange={(e) =>
                    setScheduleForm((f) => ({ ...f, date: e.target.value }))
                  }
                  className="input-field"
                />
              </div>

              {/* 班次选择 */}
              <div>
                <label className="block text-sm font-medium text-ink-500 mb-2">
                  班次
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(SHIFT_CONFIG) as ShiftType[]).map((key) => {
                    const cfg = SHIFT_CONFIG[key];
                    const selected = scheduleForm.shift === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setScheduleForm((f) => ({ ...f, shift: key }))
                        }
                        className={cn(
                          'p-3 rounded-xl border-2 text-left transition-all duration-200',
                          selected
                            ? `${cfg.bg} ${cfg.border}`
                            : 'bg-white border-cream-200 hover:border-cream-300'
                        )}
                      >
                        <div
                          className={cn(
                            'text-sm font-semibold flex items-center gap-1.5',
                            selected ? cfg.text : 'text-ink-500'
                          )}
                        >
                          <span
                            className={cn(
                              'inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold',
                              selected
                                ? 'bg-white/70'
                                : `${cfg.bg} ${cfg.text}`
                            )}
                          >
                            {cfg.short}
                          </span>
                          {cfg.label}
                        </div>
                        {cfg.startTime && (
                          <div
                            className={cn(
                              'text-xs mt-1',
                              selected ? cfg.text : 'text-ink-300'
                            )}
                          >
                            {cfg.startTime} - {cfg.endTime}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 备注 */}
              <div>
                <label className="block text-sm font-medium text-ink-500 mb-1.5">
                  备注
                </label>
                <textarea
                  rows={2}
                  value={scheduleForm.note}
                  onChange={(e) =>
                    setScheduleForm((f) => ({ ...f, note: e.target.value }))
                  }
                  placeholder="请输入备注信息（可选）"
                  className="input-field resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-cream-200 bg-cream-50">
              <button
                className="btn-ghost"
                onClick={() => setIsScheduleModalOpen(false)}
              >
                取消
              </button>
              <button className="btn-primary" onClick={handleSaveSchedule}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 批量排班 Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsBatchModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fade-up">
            <div className="flex items-center justify-between px-6 py-5 border-b border-cream-200">
              <h2 className="text-xl font-bold text-ink-500">批量排班</h2>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="p-2 rounded-lg text-ink-300 hover:text-ink-500 hover:bg-cream-100 transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto max-h-[calc(90vh-160px)] space-y-5">
              {/* 选择技师 */}
              <div>
                <label className="block text-sm font-medium text-ink-500 mb-2">
                  选择技师 <span className="text-red-500">*</span>
                </label>
                <div
                  className={cn(
                    'border rounded-xl p-4 bg-cream-50 max-h-48 overflow-y-auto',
                    batchFormErrors.technicianIds
                      ? 'border-red-300'
                      : 'border-cream-200'
                  )}
                >
                  {technicians.length === 0 ? (
                    <p className="text-sm text-ink-300 text-center py-4">
                      暂无技师数据
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {technicians.map((tech) => {
                        const checked = batchScheduleForm.technicianIds.includes(
                          tech.id
                        );
                        return (
                          <label
                            key={tech.id}
                            className={cn(
                              'flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-all duration-200 border',
                              checked
                                ? 'bg-sandalwood-50 border-sandalwood-300'
                                : 'bg-white border-cream-200 hover:border-cream-300'
                            )}
                          >
                            <div
                              className={cn(
                                'w-4 h-4 rounded border-2 flex items-center justify-center transition-all',
                                checked
                                  ? 'bg-sandalwood-500 border-sandalwood-500'
                                  : 'border-ink-300'
                              )}
                            >
                              {checked && (
                                <Check size={10} className="text-white" />
                              )}
                            </div>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const ids = e.target.checked
                                  ? [
                                      ...batchScheduleForm.technicianIds,
                                      tech.id,
                                    ]
                                  : batchScheduleForm.technicianIds.filter(
                                      (id) => id !== tech.id
                                    );
                                setBatchScheduleForm((f) => ({
                                  ...f,
                                  technicianIds: ids,
                                }));
                              }}
                              className="sr-only"
                            />
                            <span className="text-sm font-medium text-ink-500 truncate">
                              {tech.name}
                              {tech.position && (
                                <span className="text-ink-300 ml-1 text-xs">
                                  ({tech.position})
                                </span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
                {batchFormErrors.technicianIds && (
                  <p className="text-red-500 text-xs mt-1">
                    {batchFormErrors.technicianIds}
                  </p>
                )}
              </div>

              {/* 日期范围 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-500 mb-1.5">
                    起始日期 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={batchScheduleForm.startDate}
                    onChange={(e) =>
                      setBatchScheduleForm((f) => ({
                        ...f,
                        startDate: e.target.value,
                      }))
                    }
                    className={cn(
                      'input-field',
                      batchFormErrors.startDate &&
                        'border-red-400 focus:border-red-400 focus:ring-red-100'
                    )}
                  />
                  {batchFormErrors.startDate && (
                    <p className="text-red-500 text-xs mt-1">
                      {batchFormErrors.startDate}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-500 mb-1.5">
                    结束日期 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={batchScheduleForm.endDate}
                    onChange={(e) =>
                      setBatchScheduleForm((f) => ({
                        ...f,
                        endDate: e.target.value,
                      }))
                    }
                    className={cn(
                      'input-field',
                      batchFormErrors.endDate &&
                        'border-red-400 focus:border-red-400 focus:ring-red-100'
                    )}
                  />
                  {batchFormErrors.endDate && (
                    <p className="text-red-500 text-xs mt-1">
                      {batchFormErrors.endDate}
                    </p>
                  )}
                </div>
              </div>

              {/* 班次 */}
              <div>
                <label className="block text-sm font-medium text-ink-500 mb-2">
                  选择班次
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(Object.keys(SHIFT_CONFIG) as ShiftType[]).map((key) => {
                    const cfg = SHIFT_CONFIG[key];
                    const selected = batchScheduleForm.shift === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setBatchScheduleForm((f) => ({ ...f, shift: key }))
                        }
                        className={cn(
                          'p-3 rounded-xl border-2 text-left transition-all duration-200',
                          selected
                            ? `${cfg.bg} ${cfg.border}`
                            : 'bg-white border-cream-200 hover:border-cream-300'
                        )}
                      >
                        <div
                          className={cn(
                            'text-sm font-semibold flex items-center gap-1.5',
                            selected ? cfg.text : 'text-ink-500'
                          )}
                        >
                          <span
                            className={cn(
                              'inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold',
                              selected
                                ? 'bg-white/70'
                                : `${cfg.bg} ${cfg.text}`
                            )}
                          >
                            {cfg.short}
                          </span>
                          {cfg.label}
                        </div>
                        {cfg.startTime && (
                          <div
                            className={cn(
                              'text-xs mt-1',
                              selected ? cfg.text : 'text-ink-300'
                            )}
                          >
                            {cfg.startTime}-{cfg.endTime}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 备注 */}
              <div>
                <label className="block text-sm font-medium text-ink-500 mb-1.5">
                  备注说明
                </label>
                <textarea
                  rows={2}
                  value={batchScheduleForm.note}
                  onChange={(e) =>
                    setBatchScheduleForm((f) => ({
                      ...f,
                      note: e.target.value,
                    }))
                  }
                  placeholder="请输入备注信息（可选）"
                  className="input-field resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-cream-200 bg-cream-50">
              <button
                className="btn-ghost"
                onClick={() => setIsBatchModalOpen(false)}
              >
                取消
              </button>
              <button className="btn-primary" onClick={handleSaveBatchSchedule}>
                批量应用
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 技师服务订单详情 Modal */}
      {isTechnicianStatsModalOpen && selectedTechnicianForStats && (() => {
        const techAppointments = getAppointmentsForTechnician(selectedTechnicianForStats.id);
        const techStats = technicianStatsList.find(
          (s) => s.technicianId === selectedTechnicianForStats.id
        );
        const techIdx = technicians.findIndex(
          (t) => t.id === selectedTechnicianForStats.id
        );
        const sortedAppointments = [...techAppointments].sort(
          (a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime)
        );

        const getStatusInfo = (status: Appointment['status']) => {
          switch (status) {
            case 'pending':
              return { label: '待确认', className: 'bg-amber-50 text-amber-700 border-amber-200' };
            case 'confirmed':
              return { label: '已确认', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
            case 'in_progress':
              return { label: '进行中', className: 'bg-sandalwood-50 text-sandalwood-700 border-sandalwood-200' };
            case 'completed':
              return { label: '已完成', className: 'bg-jade-50 text-jade-700 border-jade-200' };
            case 'cancelled':
              return { label: '已取消', className: 'bg-ink-50 text-ink-500 border-ink-200' };
            case 'no_show':
              return { label: '未到店', className: 'bg-rose-50 text-rose-700 border-rose-200' };
            default:
              return { label: status, className: 'bg-ink-50 text-ink-500 border-ink-200' };
          }
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm animate-fade-in"
              onClick={() => setIsTechnicianStatsModalOpen(false)}
            />
            <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-3xl max-h-[90vh] overflow-hidden animate-fade-up">
              <div className="flex items-center justify-between px-6 py-5 border-b border-cream-200">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md bg-gradient-to-br',
                      getAvatarGradient(techIdx >= 0 ? techIdx : 0)
                    )}
                  >
                    {selectedTechnicianForStats.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-ink-500">
                      {selectedTechnicianForStats.name}
                      <span className="text-sm font-normal text-ink-300 ml-2">
                        {selectedTechnicianForStats.position || '技师'}
                      </span>
                    </h2>
                    <p className="text-sm text-ink-300 mt-0.5">
                      服务时段：{dateRange.startDate} ~ {dateRange.endDate}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsTechnicianStatsModalOpen(false)}
                  className="p-2 rounded-lg text-ink-300 hover:text-ink-500 hover:bg-cream-100 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* 技师个人统计 */}
              {techStats && (
                <div className="px-6 py-4 bg-cream-50/80 border-b border-cream-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white rounded-xl p-3 border border-cream-100">
                      <p className="text-xs text-ink-400 mb-1">订单总数</p>
                      <p className="text-xl font-bold text-jade-600">{techStats.orderCount}<span className="text-sm font-normal ml-0.5">单</span></p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-cream-100">
                      <p className="text-xs text-ink-400 mb-1">总营业额</p>
                      <p className="text-xl font-bold text-gold-600">¥{techStats.totalRevenue.toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-cream-100">
                      <p className="text-xs text-ink-400 mb-1">已完成</p>
                      <p className="text-xl font-bold text-sandalwood-600">{techStats.completedCount}<span className="text-sm font-normal ml-0.5">单</span></p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-cream-100">
                      <p className="text-xs text-ink-400 mb-1">客单价</p>
                      <p className="text-xl font-bold text-indigo-600">¥{techStats.avgOrderValue.toFixed(0)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 订单列表 */}
              <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-320px)]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-ink-500 flex items-center gap-2">
                    <CalendarDays size={16} className="text-ink-400" />
                    服务订单明细
                    <span className="text-sm font-normal text-ink-300">({techAppointments.length}条)</span>
                  </h3>
                </div>

                {sortedAppointments.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-cream-100 flex items-center justify-center mb-4">
                      <CalendarDays size={28} className="text-ink-300" />
                    </div>
                    <p className="text-ink-400">该时段内暂无服务订单</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedAppointments.map((appt) => {
                      const statusInfo = getStatusInfo(appt.status);
                      const project = projects.find((p) => p.id === appt.projectId);
                      const customer = customers.find((c) => c.id === appt.customerId);
                      return (
                        <div
                          key={appt.id}
                          className="bg-white rounded-xl border border-cream-100 p-4 hover:border-cream-300 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <div
                                  className={cn(
                                    'w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-semibold shadow-sm',
                                    getProjectColor(appt.projectId, projectIdsList)
                                  )}
                                >
                                  {project?.name?.charAt(0) || '项'}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-ink-500 truncate">
                                    {project?.name || '未知项目'}
                                  </p>
                                  <p className="text-xs text-ink-300 mt-0.5 flex items-center gap-2">
                                    <span>
                                      {appt.date} {appt.startTime}-{appt.endTime}
                                    </span>
                                    <span>·</span>
                                    <span>{project?.duration || 0}分钟</span>
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="flex items-center gap-1.5 text-ink-400">
                                  <Users size={13} />
                                  {customer?.name || '未知客户'}
                                  {customer?.phone && (
                                    <span className="text-ink-300">({customer.phone})</span>
                                  )}
                                </span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span
                                className={cn(
                                  'inline-block px-2.5 py-1 rounded-md text-xs font-medium border',
                                  statusInfo.className
                                )}
                              >
                                {statusInfo.label}
                              </span>
                              <p className="text-lg font-bold text-ink-600 mt-2">
                                ¥{appt.price.toLocaleString()}
                              </p>
                              {appt.paidAmount > 0 && appt.paidAmount !== appt.price && (
                                <p className="text-xs text-ink-300 mt-0.5">
                                  已付 ¥{appt.paidAmount}
                                </p>
                              )}
                            </div>
                          </div>
                          {appt.note && (
                            <div className="mt-3 pt-3 border-t border-cream-100">
                              <p className="text-xs text-ink-400">
                                <span className="font-medium text-ink-500">备注：</span>
                                {appt.note}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end px-6 py-4 border-t border-cream-200 bg-cream-50">
                <button
                  className="btn-primary"
                  onClick={() => setIsTechnicianStatsModalOpen(false)}
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 生成工资单 Modal */}
      {isGenerateSalaryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsGenerateSalaryModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fade-up">
            <div className="flex items-center justify-between px-6 py-5 border-b border-cream-200">
              <div>
                <h2 className="text-xl font-bold text-ink-500">生成工资单</h2>
                <p className="text-sm text-ink-300 mt-0.5">按周期统计技师提成并生成工资单</p>
              </div>
              <button
                onClick={() => setIsGenerateSalaryModalOpen(false)}
                className="p-2 rounded-lg text-ink-300 hover:text-ink-500 hover:bg-cream-100 transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto max-h-[calc(90vh-160px)] space-y-5">
              {/* 选择技师 */}
              <div>
                <label className="block text-sm font-medium text-ink-500 mb-2">
                  选择技师 <span className="text-red-500">*</span>
                </label>
                <div
                  className={cn(
                    'border rounded-xl p-4 bg-cream-50 max-h-44 overflow-y-auto',
                    generateFormErrors.technicianIds
                      ? 'border-red-300'
                      : 'border-cream-200'
                  )}
                >
                  {technicians.length === 0 ? (
                    <p className="text-sm text-ink-300 text-center py-4">暂无技师数据</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {technicians.map((tech) => {
                        const checked = generateSalaryForm.technicianIds.includes(tech.id);
                        return (
                          <label
                            key={tech.id}
                            className={cn(
                              'flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-all duration-200 border',
                              checked
                                ? 'bg-jade-50 border-jade-300'
                                : 'bg-white border-cream-200 hover:border-cream-300'
                            )}
                          >
                            <div
                              className={cn(
                                'w-4 h-4 rounded border-2 flex items-center justify-center transition-all',
                                checked
                                  ? 'bg-jade-500 border-jade-500'
                                  : 'border-ink-300'
                              )}
                            >
                              {checked && <Check size={10} className="text-white" />}
                            </div>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const ids = e.target.checked
                                  ? [...generateSalaryForm.technicianIds, tech.id]
                                  : generateSalaryForm.technicianIds.filter(
                                      (id) => id !== tech.id
                                    );
                                setGenerateSalaryForm((f) => ({
                                  ...f,
                                  technicianIds: ids,
                                }));
                              }}
                              className="sr-only"
                            />
                            <span className="text-sm font-medium text-ink-500 truncate">
                              {tech.name}
                              {tech.position && (
                                <span className="text-ink-300 ml-1 text-xs">
                                  ({tech.position})
                                </span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
                {generateFormErrors.technicianIds && (
                  <p className="text-red-500 text-xs mt-1">{generateFormErrors.technicianIds}</p>
                )}
              </div>

              {/* 日期范围 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-500 mb-1.5">
                    起始日期 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={generateSalaryForm.periodStart}
                    onChange={(e) =>
                      setGenerateSalaryForm((f) => ({
                        ...f,
                        periodStart: e.target.value,
                      }))
                    }
                    className={cn(
                      'input-field',
                      generateFormErrors.periodStart &&
                        'border-red-400 focus:border-red-400 focus:ring-red-100'
                    )}
                  />
                  {generateFormErrors.periodStart && (
                    <p className="text-red-500 text-xs mt-1">{generateFormErrors.periodStart}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-500 mb-1.5">
                    结束日期 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={generateSalaryForm.periodEnd}
                    onChange={(e) =>
                      setGenerateSalaryForm((f) => ({
                        ...f,
                        periodEnd: e.target.value,
                      }))
                    }
                    className={cn(
                      'input-field',
                      generateFormErrors.periodEnd &&
                        'border-red-400 focus:border-red-400 focus:ring-red-100'
                    )}
                  />
                  {generateFormErrors.periodEnd && (
                    <p className="text-red-500 text-xs mt-1">{generateFormErrors.periodEnd}</p>
                  )}
                </div>
              </div>

              {/* 工资参数 */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-500 mb-1.5">
                    基本工资(¥)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={generateSalaryForm.baseSalary}
                    onChange={(e) =>
                      setGenerateSalaryForm((f) => ({
                        ...f,
                        baseSalary: e.target.value,
                      }))
                    }
                    placeholder="0"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-500 mb-1.5">
                    奖金(¥)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={generateSalaryForm.bonus}
                    onChange={(e) =>
                      setGenerateSalaryForm((f) => ({
                        ...f,
                        bonus: e.target.value,
                      }))
                    }
                    placeholder="0"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-500 mb-1.5">
                    扣款(¥)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={generateSalaryForm.deductions}
                    onChange={(e) =>
                      setGenerateSalaryForm((f) => ({
                        ...f,
                        deductions: e.target.value,
                      }))
                    }
                    placeholder="0"
                    className="input-field"
                  />
                </div>
              </div>

              {/* 工资预览说明 */}
              <div className="bg-cream-50 rounded-xl p-4 border border-cream-200">
                <h3 className="text-sm font-semibold text-ink-500 mb-2 flex items-center gap-1.5">
                  <Coins size={15} className="text-gold-500" />
                  工资计算说明
                </h3>
                <ul className="space-y-1 text-xs text-ink-400">
                  <li>• 提成工资 = Σ(项目价格 × 项目提成比例)</li>
                  <li>• 仅统计状态为「已完成」的服务订单</li>
                  <li>• 实发工资 = 基本工资 + 提成工资 + 奖金 - 扣款</li>
                  <li>• 提成比例可在「项目管理」中为每个项目设置</li>
                </ul>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-cream-200 bg-cream-50">
              <button
                className="btn-ghost"
                onClick={() => setIsGenerateSalaryModalOpen(false)}
              >
                取消
              </button>
              <button className="btn-primary" onClick={handleGenerateSalary}>
                生成工资单
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 发放工资 Modal */}
      {isPaySalaryModalOpen && payingSalary && (() => {
        const tech = technicians.find((t) => t.id === payingSalary.technicianId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm animate-fade-in"
              onClick={() => setIsPaySalaryModalOpen(false)}
            />
            <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-md overflow-hidden animate-fade-up">
              <div className="flex items-center justify-between px-6 py-5 border-b border-cream-200">
                <div>
                  <h2 className="text-xl font-bold text-ink-500">确认发放工资</h2>
                  <p className="text-sm text-ink-300 mt-0.5">
                    {tech?.name} · {payingSalary.periodStart} ~ {payingSalary.periodEnd}
                  </p>
                </div>
                <button
                  onClick={() => setIsPaySalaryModalOpen(false)}
                  className="p-2 rounded-lg text-ink-300 hover:text-ink-500 hover:bg-cream-100 transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="px-6 py-5 space-y-5">
                {/* 工资汇总 */}
                <div className="bg-gradient-to-br from-gold-50 to-sandalwood-50 rounded-xl p-4 border border-gold-100">
                  <p className="text-xs text-gold-600 mb-1">本次实发金额</p>
                  <p className="text-3xl font-bold text-gold-700">
                    ¥{payingSalary.netSalary.toLocaleString()}
                  </p>
                </div>

                {/* 明细 */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink-400">服务次数</span>
                    <span className="text-ink-600 font-medium">{payingSalary.totalServiceCount}次</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-400">提成工资</span>
                    <span className="text-rose-600 font-medium">¥{payingSalary.totalCommission.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-400">基本工资</span>
                    <span className="text-jade-600 font-medium">¥{payingSalary.baseSalary.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-400">奖金</span>
                    <span className="text-amber-600 font-medium">+¥{payingSalary.bonus.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-400">扣款</span>
                    <span className="text-red-500 font-medium">-¥{payingSalary.deductions.toLocaleString()}</span>
                  </div>
                </div>

                <div className="divider-x" />

                {/* 发放方式 */}
                <div>
                  <label className="block text-sm font-medium text-ink-500 mb-2">
                    发放方式 <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['cash', 'wechat', 'alipay', 'transfer', 'bank', 'other'] as const).filter(m => m !== 'bank').map((method) => {
                      const selected = paySalaryForm.paidMethod === method;
                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() =>
                            setPaySalaryForm((f) => ({ ...f, paidMethod: method }))
                          }
                          className={cn(
                            'p-3 rounded-xl border-2 text-center transition-all duration-200',
                            selected
                              ? 'bg-jade-50 border-jade-300 text-jade-700'
                              : 'bg-white border-cream-200 text-ink-400 hover:border-cream-300'
                          )}
                        >
                          <span className="text-sm font-medium">
                            {getPaymentMethodLabel(method)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 备注 */}
                <div>
                  <label className="block text-sm font-medium text-ink-500 mb-1.5">
                    备注
                  </label>
                  <textarea
                    rows={2}
                    value={paySalaryForm.remark}
                    onChange={(e) =>
                      setPaySalaryForm((f) => ({ ...f, remark: e.target.value }))
                    }
                    placeholder="请输入备注信息（可选）"
                    className="input-field resize-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-cream-200 bg-cream-50">
                <button
                  className="btn-ghost"
                  onClick={() => setIsPaySalaryModalOpen(false)}
                >
                  取消
                </button>
                <button className="btn-primary" onClick={handlePaySalary}>
                  确认发放
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 工资单明细 Modal */}
      {isSalaryDetailModalOpen && viewingSalary && (() => {
        const tech = technicians.find((t) => t.id === viewingSalary.technicianId);
        const techIdx = technicians.findIndex((t) => t.id === viewingSalary.technicianId);
        const sortedItems = [...viewingSalary.items].sort(
          (a, b) => b.serviceDate.localeCompare(a.serviceDate)
        );
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm animate-fade-in"
              onClick={() => setIsSalaryDetailModalOpen(false)}
            />
            <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-3xl max-h-[90vh] overflow-hidden animate-fade-up">
              <div className="flex items-center justify-between px-6 py-5 border-b border-cream-200">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md bg-gradient-to-br',
                      getAvatarGradient(techIdx >= 0 ? techIdx : 0)
                    )}
                  >
                    {tech?.name.charAt(0) ?? '?'}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-ink-500">
                      {tech?.name ?? '未知技师'}
                      <span
                        className={cn(
                          'ml-3 inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border',
                          viewingSalary.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        )}
                      >
                        {viewingSalary.status === 'paid' ? '已发放' : '待发放'}
                      </span>
                    </h2>
                    <p className="text-sm text-ink-300 mt-0.5">
                      工资周期：{viewingSalary.periodStart} ~ {viewingSalary.periodEnd}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSalaryDetailModalOpen(false)}
                  className="p-2 rounded-lg text-ink-300 hover:text-ink-500 hover:bg-cream-100 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* 工资汇总 */}
              <div className="px-6 py-4 bg-gradient-to-r from-cream-50 to-white border-b border-cream-200">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="bg-white rounded-xl p-3 border border-cream-100">
                    <p className="text-xs text-ink-400 mb-1">服务次数</p>
                    <p className="text-lg font-bold text-jade-600">
                      {viewingSalary.totalServiceCount}
                      <span className="text-xs font-normal ml-0.5">次</span>
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-cream-100">
                    <p className="text-xs text-ink-400 mb-1">服务总额</p>
                    <p className="text-lg font-bold text-sandalwood-600">
                      ¥{viewingSalary.totalAmount.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-cream-100">
                    <p className="text-xs text-ink-400 mb-1">提成工资</p>
                    <p className="text-lg font-bold text-rose-600">
                      ¥{viewingSalary.totalCommission.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-cream-100">
                    <p className="text-xs text-ink-400 mb-1">基/奖/扣</p>
                    <p className="text-sm font-medium">
                      <span className="text-jade-600">¥{viewingSalary.baseSalary}</span>
                      <span className="text-ink-300 mx-0.5">/</span>
                      <span className="text-amber-600">+{viewingSalary.bonus}</span>
                      <span className="text-ink-300 mx-0.5">/</span>
                      <span className="text-red-500">-{viewingSalary.deductions}</span>
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-gold-50 to-sandalwood-50 rounded-xl p-3 border border-gold-200">
                    <p className="text-xs text-gold-600 mb-1">实发工资</p>
                    <p className="text-xl font-bold text-gold-700">
                      ¥{viewingSalary.netSalary.toLocaleString()}
                    </p>
                  </div>
                </div>
                {viewingSalary.status === 'paid' && viewingSalary.paidAt && (
                  <div className="mt-3 flex items-center gap-4 text-xs text-ink-400">
                    <span className="flex items-center gap-1">
                      <CreditCard size={12} />
                      发放方式：{viewingSalary.paidMethod && getPaymentMethodLabel(viewingSalary.paidMethod)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      发放时间：{format(new Date(viewingSalary.paidAt), 'yyyy-MM-dd HH:mm')}
                    </span>
                    {viewingSalary.remark && (
                      <span className="flex items-center gap-1">
                        <FileText size={12} />
                        备注：{viewingSalary.remark}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 提成明细列表 */}
              <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-400px)]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-ink-500 flex items-center gap-2">
                    <ClipboardList size={16} className="text-ink-400" />
                    提成明细
                    <span className="text-sm font-normal text-ink-300">
                      ({sortedItems.length}条)
                    </span>
                  </h3>
                </div>

                {sortedItems.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-cream-100 flex items-center justify-center mb-4">
                      <ClipboardList size={28} className="text-ink-300" />
                    </div>
                    <p className="text-ink-400">该周期内暂无提成明细</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-cream-100">
                          <th className="text-left px-3 py-2.5 text-xs font-semibold text-ink-500 whitespace-nowrap">服务日期</th>
                          <th className="text-left px-3 py-2.5 text-xs font-semibold text-ink-500 whitespace-nowrap">服务项目</th>
                          <th className="text-right px-3 py-2.5 text-xs font-semibold text-ink-500 whitespace-nowrap">服务金额</th>
                          <th className="text-right px-3 py-2.5 text-xs font-semibold text-ink-500 whitespace-nowrap">提成比例</th>
                          <th className="text-right px-3 py-2.5 text-xs font-semibold text-ink-500 whitespace-nowrap">提成金额</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedItems.map((item) => (
                          <tr
                            key={item.appointmentId}
                            className="border-t border-cream-100 hover:bg-cream-50 transition-colors"
                          >
                            <td className="px-3 py-2.5 text-sm text-ink-500 whitespace-nowrap">
                              {item.serviceDate}
                            </td>
                            <td className="px-3 py-2.5 text-sm text-ink-600 font-medium">
                              {item.projectName}
                            </td>
                            <td className="px-3 py-2.5 text-sm text-right text-sandalwood-600">
                              ¥{item.servicePrice.toLocaleString()}
                            </td>
                            <td className="px-3 py-2.5 text-sm text-right">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                                {item.commissionRate}%
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-sm text-right font-semibold text-rose-600">
                              ¥{item.commissionAmount.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-cream-50 border-t-2 border-cream-200">
                          <td colSpan={2} className="px-3 py-2.5 text-sm font-semibold text-ink-500">
                            合计
                          </td>
                          <td className="px-3 py-2.5 text-sm text-right font-semibold text-sandalwood-600">
                            ¥{viewingSalary.totalAmount.toLocaleString()}
                          </td>
                          <td></td>
                          <td className="px-3 py-2.5 text-sm text-right font-bold text-rose-600">
                            ¥{viewingSalary.totalCommission.toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between px-6 py-4 border-t border-cream-200 bg-cream-50">
                <div className="text-xs text-ink-400">
                  工资单编号：{viewingSalary.id}
                  <span className="mx-2">·</span>
                  创建时间：{format(new Date(viewingSalary.createdAt), 'yyyy-MM-dd HH:mm')}
                </div>
                <button
                  className="btn-primary"
                  onClick={() => setIsSalaryDetailModalOpen(false)}
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
