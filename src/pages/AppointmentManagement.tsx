import { useState, useMemo, useEffect } from 'react';
import {
  format,
  addDays,
  subDays,
  parse,
  isSameDay,
  isToday,
  isBefore,
  startOfDay,
  getHours,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  X,
  Check,
  Clock,
  User,
  Phone,
  Calendar,
  Scissors,
  CreditCard,
  Banknote,
  Smartphone,
  CreditCard as CardIcon,
  ArrowLeft,
  ArrowRight,
  Edit2,
  Trash2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import type {
  Appointment,
  AppointmentStatus,
  Customer,
  Project,
  Technician,
  MembershipCard,
  PaymentMethod,
} from '@/types';

type StatusFilter = 'all' | AppointmentStatus;

const STATUS_TABS: { value: StatusFilter; label: string; color: string }[] = [
  { value: 'all', label: '全部', color: 'bg-ink-100 text-ink-600' },
  { value: 'pending', label: '待确认', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'confirmed', label: '已确认', color: 'bg-jade-100 text-jade-700 border-jade-300' },
  { value: 'in_progress', label: '进行中', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'completed', label: '已完成', color: 'bg-ink-200 text-ink-600 border-ink-300' },
  { value: 'cancelled', label: '已取消', color: 'bg-red-100 text-red-700 border-red-300' },
];

const STATUS_CONFIG: Record<AppointmentStatus, { bg: string; border: string; text: string; label: string; blockStyle: string }> = {
  pending: {
    bg: 'bg-amber-50',
    border: 'border-2 border-amber-400',
    text: 'text-amber-800',
    label: '待确认',
    blockStyle: 'bg-amber-50 border-2 border-amber-400 text-amber-800',
  },
  confirmed: {
    bg: 'bg-jade-500',
    border: 'border-jade-500',
    text: 'text-white',
    label: '已确认',
    blockStyle: 'bg-jade-500 text-white',
  },
  in_progress: {
    bg: 'bg-blue-500',
    border: 'border-blue-500',
    text: 'text-white',
    label: '进行中',
    blockStyle: 'bg-blue-500 text-white',
  },
  completed: {
    bg: 'bg-ink-300',
    border: 'border-ink-300',
    text: 'text-ink-600',
    label: '已完成',
    blockStyle: 'bg-ink-300 text-ink-600',
  },
  cancelled: {
    bg: 'bg-red-50',
    border: 'border-red-400',
    text: 'text-red-700',
    label: '已取消',
    blockStyle: 'bg-red-50 border-2 border-red-400 text-red-700 [background-image:repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(248,113,113,0.15)_6px,rgba(248,113,113,0.15)_12px)]',
  },
  no_show: {
    bg: 'bg-orange-100',
    border: 'border-orange-400',
    text: 'text-orange-800',
    label: '未到店',
    blockStyle: 'bg-orange-100 border-2 border-orange-400 text-orange-800',
  },
};

const TIME_SLOTS = Array.from({ length: 13 }, (_, i) => `${String(i + 9).padStart(2, '0')}:00`);
const HOUR_WIDTH = 100;
const ROW_HEIGHT = 72;

type ModalMode = 'create' | 'edit';
type ModalStep = 1 | 2 | 3 | 4;

interface NewCustomerForm {
  name: string;
  phone: string;
  gender?: 'male' | 'female' | 'other';
  note?: string;
}

interface AppointmentFormState {
  customerId: string | null;
  newCustomer: NewCustomerForm | null;
  showNewCustomerForm: boolean;
  selectedProjectIds: string[];
  technicianId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  paymentMethod: PaymentMethod;
  useCardId: string | null;
  useCardAmount: number;
  discount: number;
  note: string;
}

const emptyForm = (dateStr: string): AppointmentFormState => ({
  customerId: null,
  newCustomer: null,
  showNewCustomerForm: false,
  selectedProjectIds: [],
  technicianId: null,
  date: dateStr,
  startTime: '',
  endTime: '',
  paymentMethod: 'cash',
  useCardId: null,
  useCardAmount: 0,
  discount: 100,
  note: '',
});

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export default function AppointmentManagement() {
  const {
    appointments,
    customers,
    projects,
    technicians,
    membershipCards,
    addAppointment,
    updateAppointment,
    updateAppointmentStatus,
    addCustomer,
    addTransaction,
    useMembershipCard,
    initStore,
  } = useAppStore();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [customerSearch, setCustomerSearch] = useState('');
  const [detailAppointment, setDetailAppointment] = useState<Appointment | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [modalStep, setModalStep] = useState<ModalStep>(1);
  const [formState, setFormState] = useState<AppointmentFormState>(emptyForm(format(new Date(), 'yyyy-MM-dd')));
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);

  useEffect(() => {
    initStore();
  }, [initStore]);

  const selectedDateStr = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);

  const dayAppointments = useMemo(() => {
    return appointments.filter((a) => a.date === selectedDateStr);
  }, [appointments, selectedDateStr]);

  const filteredAppointments = useMemo(() => {
    let list = dayAppointments;
    if (statusFilter !== 'all') {
      list = list.filter((a) => a.status === statusFilter);
    }
    return list.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }, [dayAppointments, statusFilter]);

  const getCustomer = (id: string) => customers.find((c) => c.id === id);
  const getProject = (id: string) => projects.find((p) => p.id === id);
  const getTechnician = (id: string) => technicians.find((t) => t.id === id);
  const getCustomerCards = (customerId: string) =>
    membershipCards.filter((mc) => mc.customerId === customerId && mc.isActive);

  const groupedByPeriod = useMemo(() => {
    const morning: Appointment[] = [];
    const afternoon: Appointment[] = [];
    const evening: Appointment[] = [];
    filteredAppointments.forEach((a) => {
      const h = getHours(parse(a.startTime, 'HH:mm', new Date()));
      if (h < 12) morning.push(a);
      else if (h < 18) afternoon.push(a);
      else evening.push(a);
    });
    return { morning, afternoon, evening };
  }, [filteredAppointments]);

  const totalDuration = useMemo(() => {
    return formState.selectedProjectIds.reduce((sum, pid) => {
      const p = getProject(pid);
      return sum + (p?.duration || 0);
    }, 0);
  }, [formState.selectedProjectIds, projects]);

  const totalPrice = useMemo(() => {
    const base = formState.selectedProjectIds.reduce((sum, pid) => {
      const p = getProject(pid);
      return sum + (p?.price || 0);
    }, 0);
    const discount = (base * formState.discount) / 100;
    return Math.round(discount);
  }, [formState.selectedProjectIds, formState.discount, projects]);

  const openCreateModal = (preset?: Partial<AppointmentFormState>) => {
    setModalMode('create');
    setEditingAppointmentId(null);
    setModalStep(1);
    setFormState({ ...emptyForm(selectedDateStr), ...preset });
    setShowModal(true);
  };

  const openEditModal = (appointment: Appointment) => {
    setModalMode('edit');
    setEditingAppointmentId(appointment.id);
    setModalStep(1);
    const proj = getProject(appointment.projectId);
    setFormState({
      customerId: appointment.customerId,
      newCustomer: null,
      showNewCustomerForm: false,
      selectedProjectIds: appointment.projectId ? [appointment.projectId] : [],
      technicianId: appointment.technicianId,
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      paymentMethod: 'cash',
      useCardId: appointment.useCardId || null,
      useCardAmount: appointment.useCardAmount || 0,
      discount: 100,
      note: appointment.note || '',
    });
    void proj;
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setDetailAppointment(null);
  };

  const handleCreateSubmit = () => {
    if (!formState.customerId && !formState.showNewCustomerForm) return;
    if (formState.selectedProjectIds.length === 0) return;
    if (!formState.technicianId || !formState.startTime || !formState.endTime) return;

    let finalCustomerId = formState.customerId;

    if (formState.showNewCustomerForm && formState.newCustomer && formState.newCustomer.name && formState.newCustomer.phone) {
      const newId = `nc-${Date.now()}`;
      addCustomer({
        name: formState.newCustomer.name,
        phone: formState.newCustomer.phone,
        gender: formState.newCustomer.gender,
        note: formState.newCustomer.note,
      });
      finalCustomerId = newId;
    }

    if (!finalCustomerId) return;

    const totalDur = formState.selectedProjectIds.reduce((sum, pid) => sum + (getProject(pid)?.duration || 0), 0);
    const startMin = timeToMinutes(formState.startTime);
    const endTime = minutesToTime(startMin + totalDur);

    const firstProj = formState.selectedProjectIds[0] || '';
    const apptData = {
      customerId: finalCustomerId,
      projectId: firstProj,
      technicianId: formState.technicianId,
      date: formState.date,
      startTime: formState.startTime,
      endTime: formState.endTime || endTime,
      status: 'pending' as AppointmentStatus,
      price: totalPrice,
      useCardId: formState.useCardId || undefined,
      useCardAmount: formState.useCardAmount || undefined,
      paidAmount: 0,
      note: formState.note || undefined,
    };

    if (modalMode === 'edit' && editingAppointmentId) {
      updateAppointment(editingAppointmentId, apptData);
    } else {
      addAppointment(apptData);
    }

    if (formState.paymentMethod && totalPrice > 0 && modalMode === 'create') {
      addTransaction({
        customerId: finalCustomerId,
        appointmentId: undefined,
        membershipCardId: formState.useCardId || undefined,
        type: 'consume',
        paymentMethod: formState.paymentMethod,
        amount: totalPrice,
        cardDeduction: formState.useCardAmount || undefined,
        remark: formState.note || undefined,
      });
    }

    if (formState.useCardId && formState.useCardAmount > 0) {
      const card = membershipCards.find((c) => c.id === formState.useCardId);
      if (card?.type === 'stored') {
        useMembershipCard(formState.useCardId, { balance: formState.useCardAmount });
      } else if (card?.type === 'count') {
        useMembershipCard(formState.useCardId, { times: 1 });
      }
    }

    closeModal();
  };

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const s = customerSearch.toLowerCase();
    return customers.filter(
      (c) => c.name.toLowerCase().includes(s) || c.phone.includes(s)
    );
  }, [customers, customerSearch]);

  const sortedTechnicians = useMemo(() => {
    if (formState.selectedProjectIds.length === 0) return technicians;
    return [...technicians].sort((a, b) => {
      const aHas = formState.selectedProjectIds.some((pid) => a.projectIds.includes(pid)) ? 0 : 1;
      const bHas = formState.selectedProjectIds.some((pid) => b.projectIds.includes(pid)) ? 0 : 1;
      return aHas - bHas;
    });
  }, [technicians, formState.selectedProjectIds]);

  const isSlotBooked = (techId: string, time: string): boolean => {
    return dayAppointments.some((a) => {
      if (a.technicianId !== techId) return false;
      if (a.status === 'cancelled') return false;
      const sMin = timeToMinutes(time);
      const aStart = timeToMinutes(a.startTime);
      const aEnd = timeToMinutes(a.endTime);
      return sMin >= aStart && sMin < aEnd;
    });
  };

  return (
    <div className="space-y-6 animate-fade-up h-full flex flex-col">
      {/* 页面标题区 */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-shrink-0">
          <h2 className="text-2xl font-serif font-bold text-ink-700">顾客预约</h2>
          <p className="text-ink-500 mt-1 text-sm">管理顾客预约排钟与服务状态</p>
        </div>

        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-card">
          <button
            onClick={() => setSelectedDate((d) => subDays(d, 1))}
            className="p-1.5 rounded-lg hover:bg-cream-200 transition-colors text-ink-500"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="px-3 py-1 min-w-[140px] text-center">
            <div className="text-sm font-medium text-ink-600">
              {isToday(selectedDate) ? '今天 ' : ''}
              {format(selectedDate, 'M月d日', { locale: zhCN })}
            </div>
            <div className="text-xs text-ink-400">
              {format(selectedDate, 'EEEE', { locale: zhCN })}
            </div>
          </div>
          <button
            onClick={() => setSelectedDate((d) => addDays(d, 1))}
            className="p-1.5 rounded-lg hover:bg-cream-200 transition-colors text-ink-500"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white rounded-xl p-1.5 shadow-card">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                  statusFilter === tab.value
                    ? `${tab.color} shadow-sm`
                    : 'text-ink-500 hover:bg-cream-100'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button onClick={() => openCreateModal()} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            新增预约
          </button>
        </div>
      </div>

      {/* 主体内容区 */}
      <div className="flex-1 grid grid-cols-5 gap-6 min-h-0">
        {/* 时间轴排钟视图 3/5 */}
        <div className="col-span-3 card p-5 flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-serif font-semibold text-ink-700 flex items-center gap-2">
              <Clock size={18} className="text-sandalwood-500" />
              排钟视图
            </h3>
            <span className="text-xs text-ink-400">1小时 = {HOUR_WIDTH}px</span>
          </div>

          <div className="flex-1 overflow-auto">
            <div style={{ minWidth: TIME_SLOTS.length * HOUR_WIDTH + 140 }}>
              <div className="flex sticky top-0 bg-cream-50 z-10 border-b border-cream-300">
                <div
                  className="flex-shrink-0 flex items-center justify-center text-xs font-medium text-ink-500 border-r border-cream-300 bg-white"
                  style={{ width: 140, height: 44 }}
                >
                  技师 / 时间
                </div>
                {TIME_SLOTS.map((t) => (
                  <div
                    key={t}
                    className="flex-shrink-0 flex items-center justify-center text-xs font-medium text-ink-500 border-r border-cream-200"
                    style={{ width: HOUR_WIDTH, height: 44 }}
                  >
                    {t}
                  </div>
                ))}
              </div>

              {sortedTechnicians.map((tech) => (
                <div key={tech.id} className="flex border-b border-cream-200">
                  <div
                    className="flex-shrink-0 flex items-center gap-2 px-3 border-r border-cream-300 bg-white sticky left-0 z-[1]"
                    style={{ width: 140, height: ROW_HEIGHT }}
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sandalwood-200 to-sandalwood-400 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                      {tech.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-ink-700 truncate">{tech.name}</div>
                      <div className="text-[11px] text-ink-400 truncate">{tech.position || '技师'}</div>
                    </div>
                  </div>
                  {TIME_SLOTS.map((t, slotIdx) => {
                    const booked = isSlotBooked(tech.id, t);
                    const appt = dayAppointments.find((a) => {
                      if (a.technicianId !== tech.id) return false;
                      if (a.status === 'cancelled') return false;
                      const aStart = timeToMinutes(a.startTime);
                      return timeToMinutes(t) === aStart;
                    });

                    if (appt) {
                      const startMin = timeToMinutes(appt.startTime);
                      const endMin = timeToMinutes(appt.endTime);
                      const width = ((endMin - startMin) / 60) * HOUR_WIDTH;
                      const leftOffset = slotIdx * HOUR_WIDTH;
                      const customer = getCustomer(appt.customerId);
                      const project = getProject(appt.projectId);
                      const cfg = STATUS_CONFIG[appt.status];

                      return (
                        <div
                          key={`${tech.id}-${t}`}
                          className="relative"
                          style={{ width: HOUR_WIDTH, height: ROW_HEIGHT }}
                        >
                          <div
                            onClick={() => setDetailAppointment(appt)}
                            className={cn(
                              'absolute top-1.5 bottom-1.5 rounded-lg px-2 py-1.5 cursor-pointer overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg z-[2]',
                              cfg.blockStyle,
                              appt.status === 'cancelled' && 'cursor-default'
                            )}
                            style={{
                              left: 2,
                              width: width - 4,
                            }}
                          >
                            <div className="text-xs font-semibold truncate">{customer?.name || '未知客户'}</div>
                            <div className="text-[10px] opacity-90 truncate mt-0.5">{project?.name || '项目'}</div>
                            <div className="text-[10px] opacity-75 mt-0.5">
                              {appt.startTime}-{appt.endTime}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={`${tech.id}-${t}`}
                        onClick={() => !booked && openCreateModal({ technicianId: tech.id, startTime: t })}
                        className={cn(
                          'flex-shrink-0 border-r border-cream-200 transition-colors',
                          booked ? 'bg-cream-100 opacity-60' : 'hover:bg-sandalwood-50 cursor-pointer'
                        )}
                        style={{ width: HOUR_WIDTH, height: ROW_HEIGHT }}
                      >
                        <div className="h-full border-l border-dashed border-cream-200" />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 预约列表卡片 2/5 */}
        <div className="col-span-2 card p-5 flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-serif font-semibold text-ink-700 flex items-center gap-2">
              <Calendar size={18} className="text-sandalwood-500" />
              预约列表
            </h3>
            <span className="text-xs text-ink-400">
              共 {filteredAppointments.length} 条
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-5 pr-1">
            {(['morning', 'afternoon', 'evening'] as const).map((period) => {
              const list = groupedByPeriod[period];
              const label = period === 'morning' ? '上午' : period === 'afternoon' ? '下午' : '晚上';
              if (list.length === 0) return null;
              return (
                <div key={period}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-4 bg-sandalwood-400 rounded-full" />
                    <span className="text-sm font-semibold text-ink-600">{label}</span>
                    <div className="flex-1 h-px bg-cream-200" />
                    <span className="text-xs text-ink-400">{list.length}条</span>
                  </div>
                  <div className="space-y-3">
                    {list.map((appt) => {
                      const customer = getCustomer(appt.customerId);
                      const project = getProject(appt.projectId);
                      const tech = getTechnician(appt.technicianId);
                      const cfg = STATUS_CONFIG[appt.status];
                      return (
                        <div
                          key={appt.id}
                          onClick={() => setDetailAppointment(appt)}
                          className="rounded-xl border border-cream-200 bg-cream-50 p-4 cursor-pointer transition-all hover:shadow-md hover:border-sandalwood-200"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="text-xl font-serif font-bold text-ink-700">
                              {appt.startTime}
                              <span className="text-ink-300 mx-1">-</span>
                              <span className="text-ink-500">{appt.endTime}</span>
                            </div>
                            <span
                              className={cn(
                                'px-2.5 py-0.5 rounded-full text-xs font-medium border',
                                cfg.bg,
                                cfg.text,
                                'border-current'
                              )}
                            >
                              {cfg.label}
                            </span>
                          </div>
                          <div className="space-y-2 mb-3">
                            <div className="flex items-center gap-2 text-sm text-ink-600">
                              <User size={14} className="text-ink-400 flex-shrink-0" />
                              <span className="font-medium">{customer?.name || '未知客户'}</span>
                              <a
                                href={`tel:${customer?.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-sandalwood-600 hover:underline ml-auto text-xs"
                              >
                                <Phone size={12} className="inline mr-1" />
                                {customer?.phone || '--'}
                              </a>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {project && (
                                <span className="tag-sandalwood text-xs">
                                  <Scissors size={12} className="mr-1" />
                                  {project.name}
                                </span>
                              )}
                              <div className="flex items-center gap-1.5 ml-auto">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sandalwood-300 to-sandalwood-500 flex items-center justify-center text-white text-[10px] font-medium">
                                  {tech?.name.charAt(0) || '?'}
                                </div>
                                <span className="text-xs text-ink-500">{tech?.name || '--'}</span>
                              </div>
                            </div>
                          </div>
                          <div
                            className="flex items-center gap-2 pt-3 border-t border-cream-200"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {appt.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => updateAppointmentStatus(appt.id, 'confirmed')}
                                  className="flex-1 btn-secondary text-xs py-2 px-3"
                                >
                                  <Check size={14} className="inline mr-1" />确认
                                </button>
                                <button
                                  onClick={() => updateAppointmentStatus(appt.id, 'cancelled')}
                                  className="flex-1 text-xs py-2 px-3 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <X size={14} className="inline mr-1" />取消
                                </button>
                              </>
                            )}
                            {appt.status === 'confirmed' && (
                              <button
                                onClick={() => updateAppointmentStatus(appt.id, 'in_progress')}
                                className="flex-1 btn-primary text-xs py-2 px-3"
                              >
                                <Sparkles size={14} className="inline mr-1" />开始服务
                              </button>
                            )}
                            {appt.status === 'in_progress' && (
                              <button
                                onClick={() => updateAppointmentStatus(appt.id, 'completed')}
                                className="flex-1 btn-secondary text-xs py-2 px-3"
                              >
                                <Check size={14} className="inline mr-1" />完成服务
                              </button>
                            )}
                            {appt.status === 'completed' && (
                              <button
                                onClick={() => openEditModal(appt)}
                                className="flex-1 btn-outline text-xs py-2 px-3"
                              >
                                <Edit2 size={14} className="inline mr-1" />编辑
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {filteredAppointments.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-ink-400">
                <Calendar size={48} className="mb-3 opacity-30" />
                <p className="text-sm">暂无符合条件的预约</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 新增/编辑 Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-cream-200">
              <div>
                <h3 className="text-xl font-serif font-bold text-ink-700">
                  {modalMode === 'edit' ? '编辑预约' : '新增预约'}
                </h3>
                <p className="text-xs text-ink-400 mt-0.5">请按步骤完成预约信息填写</p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg hover:bg-cream-100 text-ink-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-4 border-b border-cream-100 bg-cream-50">
              <div className="flex items-center justify-between max-w-xl mx-auto">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-center flex-1">
                    <div
                      className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                        modalStep === step
                          ? 'bg-sandalwood-500 text-white shadow-md'
                          : modalStep > step
                          ? 'bg-jade-500 text-white'
                          : 'bg-cream-200 text-ink-400'
                      )}
                    >
                      {modalStep > step ? <Check size={16} /> : step}
                    </div>
                    <span
                      className={cn(
                        'ml-2 text-xs font-medium whitespace-nowrap',
                        modalStep >= step ? 'text-ink-600' : 'text-ink-400'
                      )}
                    >
                      {step === 1 ? '选择客户' : step === 2 ? '选择项目' : step === 3 ? '技师&时间' : '确认支付'}
                    </span>
                    {step < 4 && (
                      <div
                        className={cn(
                          'flex-1 h-0.5 mx-3',
                          modalStep > step ? 'bg-jade-400' : 'bg-cream-300'
                        )}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {modalStep === 1 && (
                <Step1SelectCustomer
                  customerSearch={customerSearch}
                  setCustomerSearch={setCustomerSearch}
                  filteredCustomers={filteredCustomers}
                  formState={formState}
                  setFormState={setFormState}
                />
              )}
              {modalStep === 2 && (
                <Step2SelectProjects
                  formState={formState}
                  setFormState={setFormState}
                  projects={projects}
                  totalDuration={totalDuration}
                  totalPrice={totalPrice}
                  getProject={getProject}
                />
              )}
              {modalStep === 3 && (
                <Step3SelectTechTime
                  formState={formState}
                  setFormState={setFormState}
                  sortedTechnicians={sortedTechnicians}
                  selectedDateStr={selectedDateStr}
                  dayAppointments={dayAppointments}
                  totalDuration={totalDuration}
                  getProject={getProject}
                />
              )}
              {modalStep === 4 && (
                <Step4ConfirmPay
                  formState={formState}
                  setFormState={setFormState}
                  customers={customers}
                  projects={projects}
                  technicians={technicians}
                  membershipCards={membershipCards}
                  totalPrice={totalPrice}
                  totalDuration={totalDuration}
                  getCustomer={getCustomer}
                  getProject={getProject}
                  getTechnician={getTechnician}
                  getCustomerCards={getCustomerCards}
                />
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-cream-200 bg-cream-50">
              <div>
                {modalStep > 1 && (
                  <button
                    onClick={() => setModalStep((s) => (s - 1) as ModalStep)}
                    className="btn-ghost flex items-center gap-1.5"
                  >
                    <ArrowLeft size={16} /> 上一步
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={closeModal} className="btn-ghost">
                  取消
                </button>
                {modalStep < 4 ? (
                  <button
                    onClick={() => setModalStep((s) => (s + 1) as ModalStep)}
                    disabled={
                      (modalStep === 1 && !formState.customerId && !formState.showNewCustomerForm) ||
                      (modalStep === 2 && formState.selectedProjectIds.length === 0) ||
                      (modalStep === 3 && (!formState.technicianId || !formState.startTime))
                    }
                    className="btn-primary flex items-center gap-1.5"
                  >
                    下一步 <ArrowRight size={16} />
                  </button>
                ) : (
                  <button onClick={handleCreateSubmit} className="btn-primary flex items-center gap-1.5">
                    <Check size={16} />
                    {modalMode === 'edit' ? '保存修改' : '确认创建'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 预约详情 Modal */}
      {detailAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-cream-200">
              <h3 className="text-xl font-serif font-bold text-ink-700">预约详情</h3>
              <button
                onClick={() => setDetailAppointment(null)}
                className="p-2 rounded-lg hover:bg-cream-100 text-ink-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <AppointmentDetailContent
              appointment={detailAppointment}
              customer={getCustomer(detailAppointment.customerId)}
              project={getProject(detailAppointment.projectId)}
              technician={getTechnician(detailAppointment.technicianId)}
              cards={getCustomerCards(detailAppointment.customerId)}
              onStatusChange={(s) => {
                updateAppointmentStatus(detailAppointment.id, s);
                setDetailAppointment({ ...detailAppointment, status: s });
              }}
              onEdit={() => {
                openEditModal(detailAppointment);
                setDetailAppointment(null);
              }}
              onDelete={() => {
                updateAppointmentStatus(detailAppointment.id, 'cancelled');
                setDetailAppointment(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Step 1: 选择客户
function Step1SelectCustomer({
  customerSearch,
  setCustomerSearch,
  filteredCustomers,
  formState,
  setFormState,
}: {
  customerSearch: string;
  setCustomerSearch: (s: string) => void;
  filteredCustomers: Customer[];
  formState: AppointmentFormState;
  setFormState: React.Dispatch<React.SetStateAction<AppointmentFormState>>;
}) {
  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          type="text"
          placeholder="搜索客户姓名或手机号..."
          value={customerSearch}
          onChange={(e) => setCustomerSearch(e.target.value)}
          className="input-field pl-11"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto pr-1">
        {filteredCustomers.map((c) => {
          const selected = formState.customerId === c.id;
          return (
            <label
              key={c.id}
              className={cn(
                'relative flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all',
                selected
                  ? 'border-sandalwood-400 bg-sandalwood-50 shadow-md'
                  : 'border-cream-200 bg-white hover:border-cream-300 hover:bg-cream-50'
              )}
            >
              <input
                type="radio"
                name="customer"
                checked={selected}
                onChange={() =>
                  setFormState((s) => ({
                    ...s,
                    customerId: c.id,
                    showNewCustomerForm: false,
                    newCustomer: null,
                  }))
                }
                className="sr-only"
              />
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-jade-200 to-jade-400 flex items-center justify-center text-white font-medium flex-shrink-0">
                {c.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink-700">{c.name}</span>
                  {c.gender && (
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded',
                        c.gender === 'male'
                          ? 'bg-blue-100 text-blue-600'
                          : c.gender === 'female'
                          ? 'bg-pink-100 text-pink-600'
                          : 'bg-ink-100 text-ink-600'
                      )}
                    >
                      {c.gender === 'male' ? '男' : c.gender === 'female' ? '女' : '其他'}
                    </span>
                  )}
                </div>
                <div className="text-sm text-ink-500 mt-0.5 flex items-center gap-1">
                  <Phone size={12} /> {c.phone}
                </div>
                {c.note && (
                  <div className="text-xs text-ink-400 mt-1 line-clamp-1">{c.note}</div>
                )}
              </div>
              {selected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-sandalwood-500 flex items-center justify-center">
                  <Check size={12} className="text-white" />
                </div>
              )}
            </label>
          );
        })}
      </div>

      <div className="pt-2 border-t border-cream-200">
        {!formState.showNewCustomerForm ? (
          <button
            onClick={() =>
              setFormState((s) => ({
                ...s,
                showNewCustomerForm: true,
                customerId: null,
                newCustomer: { name: '', phone: '' },
              }))
            }
            className="text-sandalwood-600 hover:text-sandalwood-700 text-sm font-medium flex items-center gap-1.5"
          >
            <Plus size={16} /> 新客户快速登记
          </button>
        ) : (
          <div className="bg-sandalwood-50 rounded-xl p-5 border border-sandalwood-200 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-serif font-semibold text-ink-700 flex items-center gap-2">
                <Sparkles size={16} className="text-sandalwood-500" /> 新客户信息
              </h4>
              <button
                onClick={() =>
                  setFormState((s) => ({
                    ...s,
                    showNewCustomerForm: false,
                    newCustomer: null,
                  }))
                }
                className="text-ink-400 hover:text-ink-600"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-ink-500 mb-1.5 block">
                  姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formState.newCustomer?.name || ''}
                  onChange={(e) =>
                    setFormState((s) => ({
                      ...s,
                      newCustomer: { ...s.newCustomer!, name: e.target.value },
                    }))
                  }
                  placeholder="请输入客户姓名"
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-xs text-ink-500 mb-1.5 block">
                  手机号 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formState.newCustomer?.phone || ''}
                  onChange={(e) =>
                    setFormState((s) => ({
                      ...s,
                      newCustomer: { ...s.newCustomer!, phone: e.target.value },
                    }))
                  }
                  placeholder="请输入手机号"
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-xs text-ink-500 mb-1.5 block">性别</label>
                <select
                  value={formState.newCustomer?.gender || ''}
                  onChange={(e) =>
                    setFormState((s) => ({
                      ...s,
                      newCustomer: {
                        ...s.newCustomer!,
                        gender: (e.target.value as 'male' | 'female' | 'other') || undefined,
                      },
                    }))
                  }
                  className="input-field"
                >
                  <option value="">请选择</option>
                  <option value="male">男</option>
                  <option value="female">女</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-ink-500 mb-1.5 block">备注</label>
                <input
                  type="text"
                  value={formState.newCustomer?.note || ''}
                  onChange={(e) =>
                    setFormState((s) => ({
                      ...s,
                      newCustomer: { ...s.newCustomer!, note: e.target.value },
                    }))
                  }
                  placeholder="选填"
                  className="input-field"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Step 2: 选择项目
function Step2SelectProjects({
  formState,
  setFormState,
  projects,
  totalDuration,
  totalPrice,
  getProject,
}: {
  formState: AppointmentFormState;
  setFormState: React.Dispatch<React.SetStateAction<AppointmentFormState>>;
  projects: Project[];
  totalDuration: number;
  totalPrice: number;
  getProject: (id: string) => Project | undefined;
}) {
  const toggleProject = (pid: string) => {
    setFormState((s) => {
      const has = s.selectedProjectIds.includes(pid);
      return {
        ...s,
        selectedProjectIds: has
          ? s.selectedProjectIds.filter((id) => id !== pid)
          : [...s.selectedProjectIds, pid],
      };
    });
  };

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-4 max-h-[50vh] overflow-y-auto pr-2">
        <h4 className="font-serif font-semibold text-ink-700 text-sm">请选择服务项目（可多选）</h4>
        <div className="grid grid-cols-3 gap-3">
          {projects
            .filter((p) => p.isActive)
            .map((p) => {
              const selected = formState.selectedProjectIds.includes(p.id);
              return (
                <label
                  key={p.id}
                  className={cn(
                    'relative p-4 rounded-xl border-2 cursor-pointer transition-all block',
                    selected
                      ? 'border-sandalwood-400 bg-sandalwood-50 shadow-md'
                      : 'border-cream-200 bg-white hover:border-cream-300 hover:bg-cream-50'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleProject(p.id)}
                    className="sr-only"
                  />
                  {selected && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-sandalwood-500 flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                  <div className="text-sm font-semibold text-ink-700">{p.name}</div>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-ink-500 flex items-center gap-1">
                        <Clock size={12} /> {p.duration}分钟
                      </span>
                      <span className="text-sandalwood-600 font-semibold text-base">¥{p.price}</span>
                    </div>
                    {p.description && (
                      <div className="text-[11px] text-ink-400 line-clamp-2 mt-1">{p.description}</div>
                    )}
                  </div>
                </label>
              );
            })}
        </div>
      </div>

      <div className="col-span-1">
        <div className="sticky top-0 bg-cream-50 rounded-xl p-5 border border-cream-200">
          <h4 className="font-serif font-semibold text-ink-700 mb-4 flex items-center gap-2">
            <Scissors size={16} className="text-sandalwood-500" />
            已选项目
          </h4>
          {formState.selectedProjectIds.length === 0 ? (
            <div className="text-center py-10 text-ink-400 text-sm">
              <AlertCircle size={32} className="mx-auto mb-2 opacity-40" />
              暂未选择项目
            </div>
          ) : (
            <div className="space-y-3">
              {formState.selectedProjectIds.map((pid) => {
                const p = getProject(pid);
                return (
                  <div key={pid} className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                    <div>
                      <div className="text-sm font-medium text-ink-600">{p?.name}</div>
                      <div className="text-[11px] text-ink-400">{p?.duration}分钟</div>
                    </div>
                    <div className="text-sm font-semibold text-sandalwood-600">¥{p?.price}</div>
                  </div>
                );
              })}
              <div className="border-t border-cream-300 pt-3 mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-500">累计时长</span>
                  <span className="font-medium text-ink-700">{totalDuration}分钟</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-500 text-sm">合计金额</span>
                  <span className="text-xl font-bold text-sandalwood-600">¥{totalPrice}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Step 3: 选择技师与时间
function Step3SelectTechTime({
  formState,
  setFormState,
  sortedTechnicians,
  selectedDateStr,
  dayAppointments,
  totalDuration,
  getProject,
}: {
  formState: AppointmentFormState;
  setFormState: React.Dispatch<React.SetStateAction<AppointmentFormState>>;
  sortedTechnicians: Technician[];
  selectedDateStr: string;
  dayAppointments: Appointment[];
  totalDuration: number;
  getProject: (id: string) => Project | undefined;
}) {
  const dateObj = parse(selectedDateStr, 'yyyy-MM-dd', new Date());
  const today = startOfDay(new Date());

  const canSelectDate = (d: Date) => !isBefore(startOfDay(d), today);

  const selectTimeSlot = (techId: string, time: string) => {
    const startMin = timeToMinutes(time);
    const endMin = startMin + Math.max(totalDuration, 30);
    setFormState((s) => ({
      ...s,
      technicianId: techId,
      startTime: time,
      endTime: minutesToTime(endMin),
    }));
  };

  const isSlotAvailable = (techId: string, time: string, duration: number): boolean => {
    const tech = sortedTechnicians.find((t) => t.id === techId);
    if (!tech) return false;
    const sMin = timeToMinutes(time);
    const techStart = timeToMinutes(tech.startTime);
    const techEnd = timeToMinutes(tech.endTime);
    if (sMin < techStart || sMin + duration > techEnd) return false;
    for (const a of dayAppointments) {
      if (a.technicianId !== techId) continue;
      if (a.status === 'cancelled') continue;
      const aS = timeToMinutes(a.startTime);
      const aE = timeToMinutes(a.endTime);
      if (sMin < aE && sMin + duration > aS) return false;
    }
    return true;
  };

  const duration = Math.max(totalDuration, 30);
  void getProject;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h4 className="font-serif font-semibold text-ink-700 text-sm mb-3">选择日期</h4>
        <div className="flex items-center gap-2 flex-wrap">
          {Array.from({ length: 14 }, (_, idx) => {
            const d = addDays(today, idx);
            const dStr = format(d, 'yyyy-MM-dd');
            const selected = formState.date === dStr;
            const enabled = canSelectDate(d);
            return (
              <button
                key={dStr}
                disabled={!enabled}
                onClick={() => setFormState((s) => ({ ...s, date: dStr }))}
                className={cn(
                  'flex flex-col items-center px-3 py-2 rounded-xl min-w-[64px] transition-all border-2',
                  !enabled && 'opacity-40 cursor-not-allowed',
                  selected
                    ? 'bg-sandalwood-500 text-white border-sandalwood-500 shadow-md'
                    : enabled
                    ? 'bg-white border-cream-200 hover:border-sandalwood-300 hover:bg-cream-50 text-ink-600'
                    : 'bg-cream-100 border-cream-200 text-ink-400'
                )}
              >
                <span className="text-[10px] opacity-80">
                  {format(d, 'EEE', { locale: zhCN })}
                </span>
                <span className="text-lg font-semibold">{format(d, 'd')}</span>
                <span className="text-[10px] opacity-80">{isSameDay(d, today) ? '今天' : format(d, 'M月')}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="font-serif font-semibold text-ink-700 text-sm mb-3">选择技师与时段</h4>
        <div className="bg-cream-50 rounded-xl overflow-hidden border border-cream-200">
          <div className="flex bg-white border-b border-cream-200 sticky top-0 z-10">
            <div className="w-36 flex-shrink-0 px-4 py-3 text-xs font-medium text-ink-500 border-r border-cream-200">
              技师
            </div>
            <div className="flex flex-1 overflow-x-auto">
              {TIME_SLOTS.map((t) => (
                <div
                  key={t}
                  className="w-20 flex-shrink-0 px-2 py-3 text-center text-xs font-medium text-ink-500 border-r border-cream-100"
                >
                  {t}
                </div>
              ))}
            </div>
          </div>

          <div className="max-h-[35vh] overflow-y-auto">
            {sortedTechnicians.map((tech) => {
              const isSkilled = formState.selectedProjectIds.some((pid) => tech.projectIds.includes(pid));
              return (
                <div key={tech.id} className="flex border-b border-cream-100 last:border-b-0">
                  <div
                    className={cn(
                      'w-36 flex-shrink-0 px-3 py-3 border-r border-cream-200 flex items-center gap-2 bg-white sticky left-0 z-[1]',
                      formState.technicianId === tech.id && 'bg-sandalwood-50'
                    )}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0',
                        isSkilled
                          ? 'bg-gradient-to-br from-jade-400 to-jade-600'
                          : 'bg-gradient-to-br from-sandalwood-300 to-sandalwood-500'
                      )}
                    >
                      {tech.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-ink-700 truncate">{tech.name}</div>
                      <div className="text-[10px] text-ink-400 truncate">
                        {isSkilled ? '✓ 擅长' : tech.position || '技师'}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-1 overflow-x-auto">
                    {TIME_SLOTS.map((t) => {
                      const available = isSlotAvailable(tech.id, t, duration);
                      const selected =
                        formState.technicianId === tech.id && formState.startTime === t;
                      return (
                        <button
                          key={t}
                          disabled={!available}
                          onClick={() => selectTimeSlot(tech.id, t)}
                          className={cn(
                            'w-20 flex-shrink-0 h-14 border-r border-b border-cream-100 transition-all text-xs',
                            !available && 'bg-cream-100 opacity-40 cursor-not-allowed',
                            selected
                              ? 'bg-sandalwood-500 text-white shadow-inner'
                              : available
                              ? 'hover:bg-sandalwood-100 text-ink-500 hover:text-sandalwood-700'
                              : 'text-ink-300'
                          )}
                        >
                          {available ? (selected ? '✓' : '可选') : '—'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {formState.technicianId && formState.startTime && (
        <div className="bg-jade-50 border border-jade-200 rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-jade-500 flex items-center justify-center flex-shrink-0">
            <Check size={24} className="text-white" />
          </div>
          <div>
            <div className="font-semibold text-ink-700">
              {sortedTechnicians.find((t) => t.id === formState.technicianId)?.name}
              <span className="text-ink-400 font-normal text-sm mx-2">·</span>
              {format(parse(formState.date, 'yyyy-MM-dd', new Date()), 'M月d日 EEEE', { locale: zhCN })}
              <span className="text-ink-400 font-normal text-sm mx-2">·</span>
              <span className="text-jade-700">
                {formState.startTime} - {formState.endTime}
              </span>
            </div>
            <div className="text-xs text-ink-500 mt-1">服务时长 {duration} 分钟</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Step 4: 确认支付
function Step4ConfirmPay({
  formState,
  setFormState,
  customers,
  projects,
  technicians,
  membershipCards,
  totalPrice,
  totalDuration,
  getCustomer,
  getProject,
  getTechnician,
  getCustomerCards,
}: {
  formState: AppointmentFormState;
  setFormState: React.Dispatch<React.SetStateAction<AppointmentFormState>>;
  customers: Customer[];
  projects: Project[];
  technicians: Technician[];
  membershipCards: MembershipCard[];
  totalPrice: number;
  totalDuration: number;
  getCustomer: (id: string) => Customer | undefined;
  getProject: (id: string) => Project | undefined;
  getTechnician: (id: string) => Technician | undefined;
  getCustomerCards: (id: string) => MembershipCard[];
}) {
  const customer =
    formState.customerId
      ? getCustomer(formState.customerId)
      : formState.newCustomer
      ? { name: formState.newCustomer.name, phone: formState.newCustomer.phone }
      : null;

  const custId = formState.customerId;
  const cards = custId ? getCustomerCards(custId) : [];
  const selectedCard = cards.find((c) => c.id === formState.useCardId);

  const paymentMethods: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { value: 'cash', label: '现金', icon: <Banknote size={18} /> },
    { value: 'wechat', label: '微信', icon: <Smartphone size={18} /> },
    { value: 'alipay', label: '支付宝', icon: <Smartphone size={18} /> },
    { value: 'card', label: '刷卡', icon: <CardIcon size={18} /> },
    { value: 'transfer', label: '疗程卡', icon: <CreditCard size={18} /> },
  ];

  const actualPay = Math.max(0, totalPrice - (formState.useCardAmount || 0));

  void customers;
  void projects;
  void technicians;
  void membershipCards;

  return (
    <div className="grid grid-cols-5 gap-6 max-w-4xl mx-auto">
      <div className="col-span-3 space-y-5">
        <div className="bg-cream-50 rounded-xl p-5 space-y-4 border border-cream-200">
          <h4 className="font-serif font-semibold text-ink-700 text-sm border-b border-cream-200 pb-2">
            预约信息汇总
          </h4>
          <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
            <div className="text-ink-500">客户</div>
            <div className="font-medium text-ink-700">
              {customer?.name || '--'}
              <span className="text-ink-400 ml-2 text-xs">{customer?.phone || ''}</span>
            </div>
            <div className="text-ink-500">服务项目</div>
            <div className="font-medium text-ink-700 space-y-0.5">
              {formState.selectedProjectIds.map((pid) => (
                <div key={pid} className="flex items-center justify-between">
                  <span>{getProject(pid)?.name}</span>
                  <span className="text-sandalwood-600 text-xs">¥{getProject(pid)?.price}</span>
                </div>
              ))}
            </div>
            <div className="text-ink-500">服务技师</div>
            <div className="font-medium text-ink-700">
              {getTechnician(formState.technicianId || '')?.name || '--'}
            </div>
            <div className="text-ink-500">日期时间</div>
            <div className="font-medium text-ink-700">
              {format(parse(formState.date, 'yyyy-MM-dd', new Date()), 'yyyy年M月d日 EEEE', { locale: zhCN })}
              <span className="text-sandalwood-600 ml-2">
                {formState.startTime} - {formState.endTime}
              </span>
            </div>
            <div className="text-ink-500">累计时长</div>
            <div className="font-medium text-ink-700">{totalDuration} 分钟</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 space-y-4 border border-cream-200">
          <h4 className="font-serif font-semibold text-ink-700 text-sm">支付方式</h4>
          <div className="grid grid-cols-5 gap-2">
            {paymentMethods.map((m) => (
              <button
                key={m.value}
                onClick={() =>
                  setFormState((s) => ({
                    ...s,
                    paymentMethod: m.value,
                    useCardId: m.value !== 'transfer' ? null : s.useCardId,
                    useCardAmount: m.value !== 'transfer' ? 0 : s.useCardAmount,
                  }))
                }
                className={cn(
                  'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all',
                  formState.paymentMethod === m.value
                    ? 'border-sandalwood-400 bg-sandalwood-50 text-sandalwood-700'
                    : 'border-cream-200 hover:border-cream-300 text-ink-500'
                )}
              >
                {m.icon}
                <span className="text-xs font-medium">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {cards.length > 0 && (
          <div className="bg-white rounded-xl p-5 space-y-4 border border-cream-200">
            <h4 className="font-serif font-semibold text-ink-700 text-sm flex items-center gap-2">
              <CreditCard size={16} className="text-sandalwood-500" />
              使用疗程卡
            </h4>
            <div className="space-y-2">
              {cards.map((card) => {
                const selected = formState.useCardId === card.id;
                return (
                  <label
                    key={card.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                      selected
                        ? 'border-sandalwood-400 bg-sandalwood-50'
                        : 'border-cream-200 hover:border-cream-300'
                    )}
                  >
                    <input
                      type="radio"
                      name="card"
                      checked={selected}
                      onChange={() =>
                        setFormState((s) => ({
                          ...s,
                          useCardId: card.id,
                          useCardAmount:
                            card.type === 'stored'
                              ? Math.min(card.balance || 0, totalPrice)
                              : card.type === 'count'
                              ? totalPrice
                              : 0,
                        }))
                      }
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0',
                        card.category === 'recharge'
                          ? 'bg-gradient-to-br from-jade-400 to-jade-600'
                          : card.category === 'times'
                          ? 'bg-gradient-to-br from-gold-400 to-gold-600'
                          : 'bg-gradient-to-br from-sandalwood-400 to-sandalwood-600'
                      )}
                    >
                      <CreditCard size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-ink-700 text-sm">{card.name}</div>
                      <div className="text-xs text-ink-500 mt-0.5">
                        {card.type === 'stored' && `余额：¥${card.balance?.toFixed(0)}`}
                        {card.type === 'count' && `剩余：${card.remainingTimes}次`}
                        {card.type === 'percent' && `折扣：${card.discountPercent}折`}
                        {card.expireDate && ` · 有效期至 ${card.expireDate}`}
                      </div>
                    </div>
                    {selected && (
                      <div className="w-5 h-5 rounded-full bg-sandalwood-500 flex items-center justify-center">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                  </label>
                );
              })}
            </div>
            {selectedCard?.type === 'stored' && formState.useCardAmount > 0 && (
              <div>
                <label className="text-xs text-ink-500 mb-1.5 block">使用金额</label>
                <input
                  type="number"
                  min={0}
                  max={selectedCard.balance || 0}
                  value={formState.useCardAmount}
                  onChange={(e) =>
                    setFormState((s) => ({
                      ...s,
                      useCardAmount: Math.min(
                        Number(e.target.value) || 0,
                        selectedCard.balance || 0,
                        totalPrice
                      ),
                    }))
                  }
                  className="input-field max-w-xs"
                />
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl p-5 space-y-4 border border-cream-200">
          <div>
            <label className="text-xs text-ink-500 mb-1.5 block flex items-center justify-between">
              <span>优惠折扣</span>
              <span className="text-sandalwood-600 font-medium">{formState.discount}%</span>
            </label>
            <input
              type="range"
              min={50}
              max={100}
              step={5}
              value={formState.discount}
              onChange={(e) => setFormState((s) => ({ ...s, discount: Number(e.target.value) }))}
              className="w-full accent-sandalwood-500"
            />
            <div className="flex justify-between text-[10px] text-ink-400 mt-1">
              <span>5折</span>
              <span>7.5折</span>
              <span>原价</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-ink-500 mb-1.5 block">备注</label>
            <textarea
              rows={3}
              value={formState.note}
              onChange={(e) => setFormState((s) => ({ ...s, note: e.target.value }))}
              placeholder="选填，备注特殊需求..."
              className="input-field resize-none"
            />
          </div>
        </div>
      </div>

      <div className="col-span-2">
        <div className="sticky top-0 bg-gradient-to-br from-sandalwood-500 to-sandalwood-700 rounded-2xl p-6 text-white shadow-lg">
          <h4 className="font-serif font-semibold text-lg mb-4">费用明细</h4>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between opacity-90">
              <span>项目原价</span>
              <span>¥{formState.selectedProjectIds.reduce((sum, pid) => sum + (getProject(pid)?.price || 0), 0)}</span>
            </div>
            {formState.discount < 100 && (
              <div className="flex items-center justify-between opacity-90">
                <span>优惠折扣 ({formState.discount}%)</span>
                <span>
                  -¥
                  {formState.selectedProjectIds.reduce((sum, pid) => sum + (getProject(pid)?.price || 0), 0) -
                    Math.round(
                      (formState.selectedProjectIds.reduce((sum, pid) => sum + (getProject(pid)?.price || 0), 0) *
                        formState.discount) /
                        100
                    )}
                </span>
              </div>
            )}
            {formState.useCardAmount > 0 && (
              <div className="flex items-center justify-between opacity-90">
                <span>疗程卡扣减</span>
                <span>-¥{formState.useCardAmount}</span>
              </div>
            )}
            <div className="h-px bg-white/20 my-2" />
            <div className="flex items-center justify-between">
              <span className="opacity-90">应付金额</span>
              <span className="text-3xl font-bold">¥{actualPay}</span>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-white/20 text-xs opacity-80">
            <div className="flex items-center gap-1.5">
              <AlertCircle size={14} />
              点击"确认创建"后将记录本次交易
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 预约详情内容
function AppointmentDetailContent({
  appointment,
  customer,
  project,
  technician,
  cards,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  appointment: Appointment;
  customer?: Customer;
  project?: Project;
  technician?: Technician;
  cards: MembershipCard[];
  onStatusChange: (s: AppointmentStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cfg = STATUS_CONFIG[appointment.status];
  void cards;

  return (
    <>
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className={cn('rounded-xl p-5', cfg.bg, cfg.border, cfg.text, 'border-2')}>
          <div className="flex items-center justify-between">
            <div className="text-xs opacity-80">当前状态</div>
            <span className="px-3 py-1 rounded-full bg-white/20 text-sm font-semibold">{cfg.label}</span>
          </div>
          <div className="mt-3 text-3xl font-serif font-bold">
            {appointment.startTime}
            <span className="opacity-60 mx-2 text-xl">-</span>
            {appointment.endTime}
          </div>
          <div className="text-sm opacity-80 mt-1">
            {format(parse(appointment.date, 'yyyy-MM-dd', new Date()), 'yyyy年M月d日 EEEE', { locale: zhCN })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-cream-50 rounded-xl">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-jade-200 to-jade-400 flex items-center justify-center text-white font-medium flex-shrink-0">
              {customer?.name.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-ink-700">{customer?.name || '未知客户'}</div>
              <a
                href={`tel:${customer?.phone}`}
                className="text-sm text-sandalwood-600 hover:underline flex items-center gap-1 mt-0.5"
              >
                <Phone size={12} /> {customer?.phone || '--'}
              </a>
              {customer?.note && (
                <div className="text-xs text-ink-400 mt-2 p-2 bg-white rounded-lg border border-cream-200">
                  <AlertCircle size={12} className="inline mr-1 text-amber-500" />
                  {customer.note}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-cream-50 rounded-xl">
              <div className="text-xs text-ink-400 mb-1">服务项目</div>
              <div className="font-semibold text-ink-700">{project?.name || '--'}</div>
              <div className="text-xs text-ink-400 mt-1">
                {project?.duration}分钟 · ¥{appointment.price}
              </div>
            </div>
            <div className="p-4 bg-cream-50 rounded-xl">
              <div className="text-xs text-ink-400 mb-1">服务技师</div>
              <div className="font-semibold text-ink-700 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sandalwood-300 to-sandalwood-500 flex items-center justify-center text-white text-[10px]">
                  {technician?.name.charAt(0) || '?'}
                </div>
                {technician?.name || '--'}
              </div>
              <div className="text-xs text-ink-400 mt-1">{technician?.position || '技师'}</div>
            </div>
          </div>

          <div className="p-4 bg-cream-50 rounded-xl">
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <div className="text-ink-400">实收金额</div>
              <div className="font-semibold text-ink-700 text-right">¥{appointment.paidAmount}</div>
              {appointment.useCardId && (
                <>
                  <div className="text-ink-400">疗程卡扣减</div>
                  <div className="font-semibold text-sandalwood-600 text-right">
                    ¥{appointment.useCardAmount || 0}
                  </div>
                </>
              )}
              <div className="text-ink-400">创建时间</div>
              <div className="text-ink-600 text-right text-xs">
                {format(new Date(appointment.createdAt), 'yyyy-MM-dd HH:mm')}
              </div>
            </div>
          </div>

          {appointment.note && (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="text-xs text-amber-700 font-semibold mb-1 flex items-center gap-1">
                <AlertCircle size={12} /> 备注
              </div>
              <div className="text-sm text-amber-900">{appointment.note}</div>
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-4 border-t border-cream-200 bg-cream-50 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {appointment.status === 'pending' && (
            <>
              <button
                onClick={() => onStatusChange('confirmed')}
                className="flex-1 btn-secondary text-sm"
              >
                <Check size={16} className="inline mr-1" /> 确认预约
              </button>
              <button
                onClick={() => onStatusChange('cancelled')}
                className="flex-1 text-sm py-2.5 px-4 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
              >
                <X size={16} className="inline mr-1" /> 取消预约
              </button>
            </>
          )}
          {appointment.status === 'confirmed' && (
            <button
              onClick={() => onStatusChange('in_progress')}
              className="flex-1 btn-primary text-sm"
            >
              <Sparkles size={16} className="inline mr-1" /> 开始服务
            </button>
          )}
          {appointment.status === 'in_progress' && (
            <button
              onClick={() => onStatusChange('completed')}
              className="flex-1 btn-secondary text-sm"
            >
              <Check size={16} className="inline mr-1" /> 完成服务
            </button>
          )}
          {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
            <button onClick={onEdit} className="btn-outline text-sm px-4">
              <Edit2 size={14} className="inline mr-1" /> 编辑
            </button>
          )}
          {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
            <button
              onClick={onDelete}
              className="text-sm px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-200"
            >
              <Trash2 size={14} className="inline mr-1" /> 删除
            </button>
          )}
        </div>
      </div>
    </>
  );
}
