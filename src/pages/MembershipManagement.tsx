import { useState, useMemo, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  User,
  Phone,
  Calendar,
  Clock,
  Grid3X3,
  List,
  Eye,
  RefreshCw,
  Ban,
  UserPlus,
  DollarSign,
  Sparkles,
  Zap,
  Shield,
  AlertCircle,
  CheckCircle,
  Tag,
  ArrowLeft,
  ArrowRight,
  FileText,
} from 'lucide-react';
import {
  format,
  addDays,
  differenceInDays,
  differenceInCalendarDays,
  parseISO,
  isAfter,
  isBefore,
  startOfToday,
} from 'date-fns';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import type {
  CardType,
  MembershipCard,
  Customer,
  CardCategory,
  CardTypeType,
  PaymentMethod,
  Transaction,
} from '@/types';

const GRADIENT_PRESETS = [
  { name: '檀香金', from: '#6B4423', to: '#C9A961' },
  { name: '翡翠绿', from: '#3B5C3A', to: '#99BE99' },
  { name: '深海蓝', from: '#1e3a5f', to: '#4a90b8' },
  { name: '玫瑰紫', from: '#5c3d5e', to: '#b48ac4' },
  { name: '落日橙', from: '#a0461a', to: '#e89b5b' },
  { name: '典雅灰', from: '#2D2A26', to: '#8D887F' },
];

const CARD_TYPE_META: Record<
  CardCategory,
  { label: string; bg: string; text: string; border: string }
> = {
  recharge: {
    label: '储值卡',
    bg: 'bg-gold-100',
    text: 'text-gold-700',
    border: 'border-gold-200',
  },
  times: {
    label: '次卡',
    bg: 'bg-jade-100',
    text: 'text-jade-700',
    border: 'border-jade-200',
  },
  discount: {
    label: '折扣卡',
    bg: 'bg-sandalwood-100',
    text: 'text-sandalwood-700',
    border: 'border-sandalwood-200',
  },
};

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: typeof CreditCard }[] = [
  { value: 'cash', label: '现金', icon: DollarSign },
  { value: 'wechat', label: '微信', icon: Zap },
  { value: 'alipay', label: '支付宝', icon: CreditCard },
  { value: 'card', label: '刷卡', icon: CreditCard },
];

type TabKey = 'types' | 'holdings';
type ViewMode = 'card' | 'list';
type StatusFilter = 'all' | 'active' | 'used' | 'expired';
type SortKey = 'expireDate' | 'createdAt' | 'remaining';

interface CardTypeForm {
  name: string;
  category: CardCategory;
  value: string;
  price: string;
  validDays: string;
  isPermanent: boolean;
  applicableProjectIds: string[];
  allProjects: boolean;
  description: string;
  gradientFrom: string;
  gradientTo: string;
  isActive: boolean;
}

interface NewCustomerForm {
  name: string;
  phone: string;
  gender: 'male' | 'female' | 'other' | '';
  note: string;
}

interface PurchaseFlow {
  step: 1 | 2 | 3;
  selectedCustomerId: string | null;
  selectedCardTypeId: string | null;
  discountAmount: string;
  paymentMethod: PaymentMethod;
  openCardDate: string;
  remark: string;
}

const todayStr = () => format(startOfToday(), 'yyyy-MM-dd');

export default function MembershipManagement() {
  const {
    cardTypes,
    membershipCards,
    customers,
    projects,
    transactions,
    addCardType,
    addMembershipCard,
    addTransaction,
    addCustomer,
    saveToStorage,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<TabKey>('types');

  const [isCardTypeModalOpen, setIsCardTypeModalOpen] = useState(false);
  const [editingCardType, setEditingCardType] = useState<CardType | null>(null);
  const [cardTypeForm, setCardTypeForm] = useState<CardTypeForm>({
    name: '',
    category: 'recharge',
    value: '',
    price: '',
    validDays: '',
    isPermanent: false,
    applicableProjectIds: [],
    allProjects: true,
    description: '',
    gradientFrom: GRADIENT_PRESETS[0].from,
    gradientTo: GRADIENT_PRESETS[0].to,
    isActive: true,
  });
  const [cardTypeErrors, setCardTypeErrors] = useState<
    Partial<Record<keyof CardTypeForm, string>>
  >({});

  const [confirmDeleteCardType, setConfirmDeleteCardType] = useState<CardType | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [viewMode, setViewMode] = useState<ViewMode>('card');

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<MembershipCard | null>(null);

  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseFlow, setPurchaseFlow] = useState<PurchaseFlow>({
    step: 1,
    selectedCustomerId: null,
    selectedCardTypeId: null,
    discountAmount: '',
    paymentMethod: 'wechat',
    openCardDate: todayStr(),
    remark: '',
  });
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState<NewCustomerForm>({
    name: '',
    phone: '',
    gender: '',
    note: '',
  });
  const [newCustomerErrors, setNewCustomerErrors] = useState<
    Partial<Record<keyof NewCustomerForm, string>>
  >({});
  const [purchaseCustomerSearch, setPurchaseCustomerSearch] = useState('');

  const updateCardTypesDirectly = (
    updater: (prev: CardType[]) => CardType[]
  ) => {
    useAppStore.setState((s) => ({ cardTypes: updater(s.cardTypes) }));
    saveToStorage();
  };

  const updateMembershipCardsDirectly = (
    updater: (prev: MembershipCard[]) => MembershipCard[]
  ) => {
    useAppStore.setState((s) => ({ membershipCards: updater(s.membershipCards) }));
    saveToStorage();
  };

  const sortedCardTypes = useMemo(
    () => [...cardTypes].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)),
    [cardTypes]
  );

  const filteredMembershipCards = useMemo(() => {
    let result = [...membershipCards];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((mc) => {
        const customer = customers.find((c) => c.id === mc.customerId);
        return (
          customer?.name.toLowerCase().includes(q) ||
          customer?.phone.includes(q) ||
          mc.id.toLowerCase().includes(q) ||
          mc.name.toLowerCase().includes(q)
        );
      });
    }

    result = result.filter((mc) => {
      const isUsed =
        (mc.type === 'count' && (mc.remainingTimes ?? 0) <= 0) ||
        (mc.type === 'stored' && (mc.balance ?? 0) <= 0);
      const isExpired =
        mc.expireDate && isBefore(parseISO(mc.expireDate), startOfToday());

      if (statusFilter === 'active') {
        return mc.isActive && !isUsed && !isExpired;
      }
      if (statusFilter === 'used') return isUsed;
      if (statusFilter === 'expired') return !!isExpired;
      return true;
    });

    result.sort((a, b) => {
      if (sortKey === 'expireDate') {
        if (!a.expireDate && !b.expireDate) return 0;
        if (!a.expireDate) return 1;
        if (!b.expireDate) return -1;
        return differenceInCalendarDays(
          parseISO(a.expireDate),
          parseISO(b.expireDate)
        );
      }
      if (sortKey === 'remaining') {
        const ra =
          a.type === 'count'
            ? a.remainingTimes ?? 0
            : a.type === 'stored'
            ? a.balance ?? 0
            : a.discountPercent ?? 0;
        const rb =
          b.type === 'count'
            ? b.remainingTimes ?? 0
            : b.type === 'stored'
            ? b.balance ?? 0
            : b.discountPercent ?? 0;
        return ra - rb;
      }
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

    return result;
  }, [membershipCards, customers, searchQuery, statusFilter, sortKey]);

  const getCustomer = (id: string) => customers.find((c) => c.id === id);
  const getCardType = (id: string) => cardTypes.find((ct) => ct.id === id);
  const getProjectName = (id: string) =>
    projects.find((p) => p.id === id)?.name ?? '';

  const getCardStatus = (mc: MembershipCard) => {
    if (mc.expireDate && isBefore(parseISO(mc.expireDate), startOfToday())) {
      return { key: 'expired' as const, label: '已过期', cls: 'bg-ink-100 text-ink-400' };
    }
    const isUsed =
      (mc.type === 'count' && (mc.remainingTimes ?? 0) <= 0) ||
      (mc.type === 'stored' && (mc.balance ?? 0) <= 0);
    if (isUsed) {
      return { key: 'used' as const, label: '已用完', cls: 'bg-gold-100 text-gold-700' };
    }
    if (!mc.isActive) {
      return { key: 'frozen' as const, label: '已冻结', cls: 'bg-ink-100 text-ink-400' };
    }
    return { key: 'normal' as const, label: '正常', cls: 'bg-jade-100 text-jade-700' };
  };

  const isExpiringSoon = (mc: MembershipCard) => {
    if (!mc.expireDate) return false;
    const days = differenceInDays(parseISO(mc.expireDate), startOfToday());
    return days >= 0 && days <= 7;
  };

  const openAddCardTypeModal = () => {
    setEditingCardType(null);
    setCardTypeForm({
      name: '',
      category: 'recharge',
      value: '',
      price: '',
      validDays: '',
      isPermanent: false,
      applicableProjectIds: [],
      allProjects: true,
      description: '',
      gradientFrom: GRADIENT_PRESETS[0].from,
      gradientTo: GRADIENT_PRESETS[0].to,
      isActive: true,
    });
    setCardTypeErrors({});
    setIsCardTypeModalOpen(true);
  };

  const openEditCardTypeModal = (ct: CardType) => {
    setEditingCardType(ct);
    setCardTypeForm({
      name: ct.name,
      category: ct.category,
      value: String(ct.value),
      price: String(ct.price),
      validDays: ct.validDays ? String(ct.validDays) : '',
      isPermanent: ct.validDays === undefined,
      applicableProjectIds: [],
      allProjects: true,
      description: ct.description ?? '',
      gradientFrom: GRADIENT_PRESETS[cardTypes.indexOf(ct) % GRADIENT_PRESETS.length].from,
      gradientTo: GRADIENT_PRESETS[cardTypes.indexOf(ct) % GRADIENT_PRESETS.length].to,
      isActive: ct.isActive,
    });
    setCardTypeErrors({});
    setIsCardTypeModalOpen(true);
  };

  const validateCardTypeForm = () => {
    const errors: Partial<Record<keyof CardTypeForm, string>> = {};
    if (!cardTypeForm.name.trim()) errors.name = '请输入卡名';
    if (!cardTypeForm.value || Number(cardTypeForm.value) <= 0) {
      if (cardTypeForm.category === 'times') errors.value = '请输入次数';
      else if (cardTypeForm.category === 'recharge') errors.value = '请输入储值面额';
      else errors.value = '请输入折扣值（1-99）';
    }
    if (cardTypeForm.category === 'discount' && Number(cardTypeForm.value) >= 100) {
      errors.value = '折扣值必须小于100';
    }
    if (!cardTypeForm.price || Number(cardTypeForm.price) < 0) errors.price = '请输入售价';
    if (!cardTypeForm.isPermanent && (!cardTypeForm.validDays || Number(cardTypeForm.validDays) <= 0)) {
      errors.validDays = '请输入有效期天数';
    }
    setCardTypeErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveCardType = () => {
    if (!validateCardTypeForm()) return;

    const baseCardType = {
      name: cardTypeForm.name.trim(),
      category: cardTypeForm.category,
      type: (cardTypeForm.category === 'recharge'
        ? 'stored'
        : cardTypeForm.category === 'times'
        ? 'count'
        : 'percent') as CardTypeType,
      value: Number(cardTypeForm.value),
      price: Number(cardTypeForm.price),
      description: cardTypeForm.description.trim() || undefined,
      validDays: cardTypeForm.isPermanent ? undefined : Number(cardTypeForm.validDays),
      isActive: cardTypeForm.isActive,
    };

    if (editingCardType) {
      updateCardTypesDirectly((prev) =>
        prev.map((ct) => (ct.id === editingCardType.id ? { ...ct, ...baseCardType } : ct))
      );
    } else {
      addCardType(baseCardType);
    }
    setIsCardTypeModalOpen(false);
  };

  const handleDeleteCardType = (ct: CardType) => {
    const hasUsed = membershipCards.some((mc) => mc.cardTypeId === ct.id);
    if (hasUsed) {
      alert('该卡种已有客户办理，无法删除');
      return;
    }
    updateCardTypesDirectly((prev) => prev.filter((x) => x.id !== ct.id));
    setConfirmDeleteCardType(null);
  };

  const openCardDetail = (mc: MembershipCard) => {
    setSelectedCard(mc);
    setIsDetailModalOpen(true);
  };

  const toggleCardActive = (mc: MembershipCard) => {
    updateMembershipCardsDirectly((prev) =>
      prev.map((x) => (x.id === mc.id ? { ...x, isActive: !x.isActive } : x))
    );
    if (selectedCard?.id === mc.id) {
      setSelectedCard({ ...mc, isActive: !mc.isActive });
    }
  };

  const openPurchaseModal = () => {
    setPurchaseFlow({
      step: 1,
      selectedCustomerId: null,
      selectedCardTypeId: null,
      discountAmount: '',
      paymentMethod: 'wechat',
      openCardDate: todayStr(),
      remark: '',
    });
    setPurchaseCustomerSearch('');
    setIsPurchaseModalOpen(true);
  };

  const validateNewCustomerForm = () => {
    const errors: Partial<Record<keyof NewCustomerForm, string>> = {};
    if (!newCustomerForm.name.trim()) errors.name = '请输入客户姓名';
    if (!newCustomerForm.phone.trim()) errors.phone = '请输入手机号';
    else if (!/^1\d{10}$/.test(newCustomerForm.phone)) errors.phone = '手机号格式不正确';
    setNewCustomerErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddNewCustomer = () => {
    if (!validateNewCustomerForm()) return;
    addCustomer({
      name: newCustomerForm.name.trim(),
      phone: newCustomerForm.phone.trim(),
      gender: newCustomerForm.gender || undefined,
      note: newCustomerForm.note.trim() || undefined,
    });
    setIsNewCustomerModalOpen(false);
    const state = useAppStore.getState();
    const created = state.customers.find(
      (c) =>
        c.name === newCustomerForm.name.trim() &&
        c.phone === newCustomerForm.phone.trim()
    );
    if (created) {
      setPurchaseFlow((p) => ({ ...p, selectedCustomerId: created.id }));
    }
    setNewCustomerForm({ name: '', phone: '', gender: '', note: '' });
    setNewCustomerErrors({});
  };

  const filteredPurchaseCustomers = useMemo(() => {
    if (!purchaseCustomerSearch.trim()) return customers;
    const q = purchaseCustomerSearch.trim().toLowerCase();
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [customers, purchaseCustomerSearch]);

  const selectedCardTypeForPurchase = useMemo(
    () =>
      purchaseFlow.selectedCardTypeId
        ? cardTypes.find((ct) => ct.id === purchaseFlow.selectedCardTypeId)
        : null,
    [purchaseFlow.selectedCardTypeId, cardTypes]
  );

  const selectedCustomerForPurchase = useMemo(
    () =>
      purchaseFlow.selectedCustomerId
        ? customers.find((c) => c.id === purchaseFlow.selectedCustomerId)
        : null,
    [purchaseFlow.selectedCustomerId, customers]
  );

  const actualPay = useMemo(() => {
    if (!selectedCardTypeForPurchase) return 0;
    const discount = Number(purchaseFlow.discountAmount) || 0;
    return Math.max(0, selectedCardTypeForPurchase.price - discount);
  }, [selectedCardTypeForPurchase, purchaseFlow.discountAmount]);

  const handleConfirmPurchase = () => {
    if (!purchaseFlow.selectedCustomerId || !selectedCardTypeForPurchase) return;

    const expireDate = selectedCardTypeForPurchase.validDays
      ? format(
          addDays(parseISO(purchaseFlow.openCardDate), selectedCardTypeForPurchase.validDays),
          'yyyy-MM-dd'
        )
      : undefined;

    const baseMc = {
      customerId: purchaseFlow.selectedCustomerId,
      cardTypeId: selectedCardTypeForPurchase.id,
      name: selectedCardTypeForPurchase.name,
      category: selectedCardTypeForPurchase.category,
      type: selectedCardTypeForPurchase.type,
      expireDate,
      isActive: true,
    };

    if (selectedCardTypeForPurchase.type === 'stored') {
      addMembershipCard({ ...baseMc, balance: selectedCardTypeForPurchase.value });
    } else if (selectedCardTypeForPurchase.type === 'count') {
      addMembershipCard({
        ...baseMc,
        totalTimes: selectedCardTypeForPurchase.value,
        remainingTimes: selectedCardTypeForPurchase.value,
      });
    } else {
      addMembershipCard({
        ...baseMc,
        discountPercent: selectedCardTypeForPurchase.value,
      });
    }

    const state = useAppStore.getState();
    const createdCard = state.membershipCards[state.membershipCards.length - 1];

    addTransaction({
      customerId: purchaseFlow.selectedCustomerId,
      membershipCardId: createdCard?.id,
      type: 'recharge',
      paymentMethod: purchaseFlow.paymentMethod,
      amount: actualPay,
      remark: purchaseFlow.remark.trim() || undefined,
    });

    setIsPurchaseModalOpen(false);
  };

  const cardTransactions = useMemo(() => {
    if (!selectedCard) return [];
    return transactions
      .filter((t) => t.membershipCardId === selectedCard.id)
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [selectedCard, transactions]);

  useEffect(() => {
    if (
      purchaseFlow.step === 1 &&
      !purchaseFlow.selectedCustomerId &&
      filteredPurchaseCustomers.length === 1
    ) {
      // do nothing auto-select
    }
  }, [purchaseFlow.step, purchaseFlow.selectedCustomerId, filteredPurchaseCustomers]);

  const renderGradientStyle = (from: string, to: string) => ({
    background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
  });

  const CardTypeCard = ({
    ct,
    gradient,
  }: {
    ct: CardType;
    gradient: { from: string; to: string };
  }) => {
    const meta = CARD_TYPE_META[ct.category];
    return (
      <div
        className="group relative rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-modal cursor-pointer"
        style={renderGradientStyle(gradient.from, gradient.to)}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,215,100,0.3) 0%, transparent 50%)',
            }}
          />
        </div>

        <div
          className="absolute inset-[2px] rounded-[14px] pointer-events-none"
          style={{
            boxShadow:
              'inset 0 0 0 1px rgba(201,169,97,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
          }}
        />

        <div className="relative p-5 h-full flex flex-col min-h-[240px]">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0 pr-3">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-bold text-white truncate drop-shadow">
                  {ct.name}
                </h3>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-md text-xs font-medium border',
                    meta.bg,
                    meta.text,
                    meta.border
                  )}
                >
                  {meta.label}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
              <CreditCard className="text-yellow-200" size={22} strokeWidth={1.5} />
            </div>
          </div>

          <div className="flex items-end justify-between mb-4 flex-1">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-yellow-200 text-lg font-medium">¥</span>
                <span className="text-4xl font-bold text-yellow-200 drop-shadow-lg tracking-tight">
                  {ct.price}
                </span>
              </div>
              <div className="text-xs text-white/70 mt-1">售价</div>
            </div>
            <div className="text-right">
              <div className="text-white font-semibold text-lg">
                {ct.category === 'recharge'
                  ? `储值¥${ct.value}`
                  : ct.category === 'times'
                  ? `${ct.value}次套餐`
                  : `全场${ct.value / 10}折`}
              </div>
              {ct.description && (
                <div className="text-xs text-white/70 mt-1 line-clamp-2">
                  {ct.description}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/15">
            <div className="text-xs text-white/80 flex items-center gap-1">
              <Calendar size={12} />
              {ct.validDays ? `有效期${ct.validDays}天` : '永久有效'}
            </div>
            <div className="text-xs text-white/80">
              全场通用
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEditCardTypeModal(ct);
            }}
            className="w-8 h-8 rounded-lg bg-white/90 backdrop-blur flex items-center justify-center text-ink-500 hover:bg-white hover:text-sandalwood-500 transition-all shadow-md"
            title="编辑"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDeleteCardType(ct);
            }}
            className="w-8 h-8 rounded-lg bg-white/90 backdrop-blur flex items-center justify-center text-ink-500 hover:bg-red-500 hover:text-white transition-all shadow-md"
            title="删除"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    );
  };

  const MembershipCardView = ({ mc }: { mc: MembershipCard }) => {
    const customer = getCustomer(mc.customerId);
    const meta = CARD_TYPE_META[mc.category];
    const status = getCardStatus(mc);
    const idx = membershipCards.indexOf(mc);
    const gradient = GRADIENT_PRESETS[idx % GRADIENT_PRESETS.length];
    const expiringSoon = isExpiringSoon(mc);

    let remainingText = '';
    let usedPercent = 0;
    if (mc.type === 'count') {
      const total = mc.totalTimes ?? 0;
      const used = total - (mc.remainingTimes ?? 0);
      usedPercent = total > 0 ? (used / total) * 100 : 0;
      remainingText = `剩 ${mc.remainingTimes}/${total} 次`;
    } else if (mc.type === 'stored') {
      const total = mc.balance ?? 0;
      remainingText = `¥${total.toFixed(0)} 余额`;
    } else {
      remainingText = `${(mc.discountPercent ?? 0) / 10}折`;
    }

    return (
      <div
        onClick={() => openCardDetail(mc)}
        className="group relative rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-modal cursor-pointer"
        style={renderGradientStyle(gradient.from, gradient.to)}
      >
        <div
          className="absolute top-3 right-3 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <span
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-semibold shadow-md',
              status.cls
            )}
          >
            {status.label}
          </span>
        </div>

        <div
          className="absolute inset-[2px] rounded-[14px] pointer-events-none"
          style={{
            boxShadow:
              'inset 0 0 0 1px rgba(201,169,97,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
          }}
        />

        <div className="relative p-5 h-full flex flex-col min-h-[260px]">
          <div className="mb-3 pr-16">
            <div className="flex items-center gap-2 mb-1">
              <User className="text-yellow-200" size={14} />
              <span className="text-white font-semibold">{customer?.name ?? '未知客户'}</span>
            </div>
            <div className="flex items-center gap-2 text-white/80 text-xs">
              <Phone size={11} />
              {customer?.phone ?? '-'}
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <h3 className="text-base font-bold text-white drop-shadow truncate max-w-[150px]">
                  {mc.name}
                </h3>
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded text-[10px] font-medium border',
                    meta.bg,
                    meta.text,
                    meta.border
                  )}
                >
                  {meta.label}
                </span>
              </div>
              <div className="text-[11px] text-white/60 font-mono">#{mc.id.slice(-8).toUpperCase()}</div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
              <CreditCard className="text-yellow-200" size={18} strokeWidth={1.5} />
            </div>
          </div>

          <div className="flex items-end justify-between mb-4 flex-1">
            <div>
              <div className="text-2xl font-bold text-yellow-200 drop-shadow tracking-tight">
                {mc.type === 'stored' && '¥'}
                {mc.type === 'count'
                  ? mc.remainingTimes
                  : mc.type === 'stored'
                  ? (mc.balance ?? 0).toFixed(0)
                  : `${(mc.discountPercent ?? 0) / 10}折`}
              </div>
              <div className="text-xs text-white/70 mt-1">{remainingText}</div>
            </div>
          </div>

          {mc.type !== 'percent' && (
            <div className="mb-3">
              <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-yellow-100 transition-all duration-500"
                  style={{ width: `${Math.min(100, 100 - usedPercent)}%` }}
                />
              </div>
              {mc.type === 'count' && (
                <div className="flex justify-between text-[10px] text-white/60 mt-1">
                  <span>已用 {mc.totalTimes! - (mc.remainingTimes ?? 0)} 次</span>
                  <span>{usedPercent.toFixed(0)}%</span>
                </div>
              )}
            </div>
          )}

          <div
            className={cn(
              'flex items-center justify-between pt-3 border-t border-white/15 text-xs',
              expiringSoon ? 'text-red-300' : 'text-white/80'
            )}
          >
            <div className="flex items-center gap-1">
              <Calendar size={12} />
              {mc.expireDate ? (
                <>
                  {format(parseISO(mc.expireDate), 'yyyy/MM/dd')}
                  {expiringSoon && <AlertTriangle size={12} className="text-red-300" />}
                </>
              ) : (
                '永久有效'
              )}
            </div>
            <div className="flex items-center gap-1">
              <Clock size={12} />
              {format(parseISO(mc.createdAt), 'MM/dd开卡')}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-ink-500 tracking-tight">
              疗程卡管理
            </h1>
            <p className="text-ink-300 mt-1">卡种配置与客户会员卡管理</p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex bg-cream-100 rounded-xl p-1">
              {([
                { k: 'types', label: '卡种配置' },
                { k: 'holdings', label: '持有卡片' },
              ] as { k: TabKey; label: string }[]).map((t) => (
                <button
                  key={t.k}
                  onClick={() => setActiveTab(t.k)}
                  className={cn(
                    'px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    activeTab === t.k
                      ? 'bg-white text-ink-500 shadow-sm'
                      : 'text-ink-400 hover:text-ink-500'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {activeTab === 'types' ? (
              <button
                onClick={openAddCardTypeModal}
                className="btn-primary flex items-center gap-2"
              >
                <Plus size={18} />
                新增卡种
              </button>
            ) : (
              <button
                onClick={openPurchaseModal}
                className="btn-primary flex items-center gap-2"
              >
                <Sparkles size={18} />
                办理新卡
              </button>
            )}
          </div>
        </div>

        {activeTab === 'types' && (
          <div>
            {sortedCardTypes.length === 0 ? (
              <div className="card p-16 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gold-50 flex items-center justify-center">
                  <CreditCard className="text-gold-400" size={36} />
                </div>
                <h3 className="text-lg font-semibold text-ink-500 mb-2">
                  暂无卡种配置
                </h3>
                <p className="text-ink-300 mb-6">
                  点击上方按钮创建您的第一个疗程卡
                </p>
                <button
                  onClick={openAddCardTypeModal}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Plus size={16} />
                  立即创建
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {sortedCardTypes.map((ct, idx) => (
                  <CardTypeCard
                    key={ct.id}
                    ct={ct}
                    gradient={GRADIENT_PRESETS[idx % GRADIENT_PRESETS.length]}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'holdings' && (
          <div>
            <div className="card p-5 mb-5">
              <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-300"
                    size={18}
                  />
                  <input
                    type="text"
                    placeholder="搜索客户名/手机号/卡号..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field pl-11"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex bg-cream-100 rounded-lg p-0.5">
                    {(
                      [
                        { k: 'all', label: '全部' },
                        { k: 'active', label: '正常' },
                        { k: 'used', label: '已用完' },
                        { k: 'expired', label: '已过期' },
                      ] as { k: StatusFilter; label: string }[]
                    ).map((s) => (
                      <button
                        key={s.k}
                        onClick={() => setStatusFilter(s.k)}
                        className={cn(
                          'px-3.5 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
                          statusFilter === s.k
                            ? 'bg-white text-ink-500 shadow-sm'
                            : 'text-ink-400 hover:text-ink-500'
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <select
                      value={sortKey}
                      onChange={(e) => setSortKey(e.target.value as SortKey)}
                      className="input-field appearance-none pr-9 pl-3 py-2 cursor-pointer text-sm"
                    >
                      <option value="createdAt">开卡时间</option>
                      <option value="expireDate">到期时间</option>
                      <option value="remaining">剩余数量</option>
                    </select>
                    <ChevronDown
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 pointer-events-none"
                      size={16}
                    />
                  </div>
                  <div className="flex bg-cream-100 rounded-lg p-0.5">
                    {(
                      [
                        { k: 'card', icon: Grid3X3 },
                        { k: 'list', icon: List },
                      ] as { k: ViewMode; icon: typeof Grid3X3 }[]
                    ).map((v) => {
                      const Icon = v.icon;
                      return (
                        <button
                          key={v.k}
                          onClick={() => setViewMode(v.k)}
                          className={cn(
                            'w-9 h-9 rounded-md flex items-center justify-center transition-all duration-200',
                            viewMode === v.k
                              ? 'bg-white text-ink-500 shadow-sm'
                              : 'text-ink-300 hover:text-ink-500'
                          )}
                          title={v.k === 'card' ? '卡片视图' : '列表视图'}
                        >
                          <Icon size={16} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {filteredMembershipCards.length === 0 ? (
              <div className="card p-16 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-sandalwood-50 flex items-center justify-center">
                  <Shield className="text-sandalwood-300" size={36} />
                </div>
                <h3 className="text-lg font-semibold text-ink-500 mb-2">
                  暂无会员卡记录
                </h3>
                <p className="text-ink-300 mb-6">
                  {searchQuery || statusFilter !== 'all'
                    ? '未找到符合条件的会员卡'
                    : '点击上方"办理新卡"按钮为客户开卡'}
                </p>
                {!searchQuery && statusFilter === 'all' && (
                  <button
                    onClick={openPurchaseModal}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <Sparkles size={16} />
                    办理新卡
                  </button>
                )}
              </div>
            ) : viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredMembershipCards.map((mc) => (
                  <MembershipCardView key={mc.id} mc={mc} />
                ))}
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-cream-100">
                        <th className="text-left px-6 py-4 text-sm font-semibold text-ink-500 whitespace-nowrap">
                          客户信息
                        </th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-ink-500 whitespace-nowrap">
                          卡名
                        </th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-ink-500 whitespace-nowrap">
                          类型
                        </th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-ink-500 whitespace-nowrap">
                          剩余
                        </th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-ink-500 whitespace-nowrap">
                          有效期
                        </th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-ink-500 whitespace-nowrap">
                          状态
                        </th>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-ink-500 whitespace-nowrap">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembershipCards.map((mc) => {
                        const customer = getCustomer(mc.customerId);
                        const meta = CARD_TYPE_META[mc.category];
                        const status = getCardStatus(mc);
                        const expiringSoon = isExpiringSoon(mc);
                        return (
                          <tr
                            key={mc.id}
                            className="border-t border-cream-200 transition-colors duration-150 hover:bg-cream-100"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-sandalwood-100 flex items-center justify-center">
                                  <User
                                    className="text-sandalwood-500"
                                    size={18}
                                  />
                                </div>
                                <div>
                                  <div className="font-medium text-ink-500">
                                    {customer?.name ?? '-'}
                                  </div>
                                  <div className="text-sm text-ink-300">
                                    {customer?.phone ?? '-'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-medium text-ink-500">
                                {mc.name}
                              </div>
                              <div className="text-xs text-ink-300 font-mono">
                                #{mc.id.slice(-8).toUpperCase()}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={cn(
                                  'tag',
                                  meta.bg,
                                  meta.text
                                )}
                              >
                                {meta.label}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-semibold text-sandalwood-600">
                                {mc.type === 'count'
                                  ? `${mc.remainingTimes}/${mc.totalTimes} 次`
                                  : mc.type === 'stored'
                                  ? `¥${mc.balance?.toFixed(0)}`
                                  : `${(mc.discountPercent ?? 0) / 10}折`}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div
                                className={cn(
                                  'flex items-center gap-1',
                                  expiringSoon ? 'text-red-500' : 'text-ink-500'
                                )}
                              >
                                {mc.expireDate ? (
                                  <>
                                    {format(
                                      parseISO(mc.expireDate),
                                      'yyyy-MM-dd'
                                    )}
                                    {expiringSoon && (
                                      <AlertTriangle size={14} />
                                    )}
                                  </>
                                ) : (
                                  <span className="text-ink-300">永久</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={cn('tag', status.cls)}
                              >
                                {status.label}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => openCardDetail(mc)}
                                  className="p-2 rounded-lg text-ink-300 hover:text-sandalwood-500 hover:bg-sandalwood-50 transition-all duration-200"
                                  title="查看详情"
                                >
                                  <Eye size={16} />
                                </button>
                                <button
                                  onClick={() => toggleCardActive(mc)}
                                  className={cn(
                                    'p-2 rounded-lg transition-all duration-200',
                                    mc.isActive
                                      ? 'text-ink-300 hover:text-yellow-600 hover:bg-yellow-50'
                                      : 'text-jade-500 hover:bg-jade-50'
                                  )}
                                  title={mc.isActive ? '冻结' : '解冻'}
                                >
                                  {mc.isActive ? (
                                    <Ban size={16} />
                                  ) : (
                                    <Shield size={16} />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isCardTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsCardTypeModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fade-up">
            <div className="flex items-center justify-between px-6 py-5 border-b border-cream-200">
              <h2 className="text-xl font-bold text-ink-500">
                {editingCardType ? '编辑卡种' : '新增卡种'}
              </h2>
              <button
                onClick={() => setIsCardTypeModalOpen(false)}
                className="p-2 rounded-lg text-ink-300 hover:text-ink-500 hover:bg-cream-100 transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto max-h-[calc(90vh-160px)]">
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-ink-500 mb-1.5">
                      卡名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={cardTypeForm.name}
                      onChange={(e) =>
                        setCardTypeForm((f) => ({ ...f, name: e.target.value }))
                      }
                      placeholder="如：10次全身推拿卡"
                      className={cn(
                        'input-field',
                        cardTypeErrors.name &&
                          'border-red-400 focus:border-red-400 focus:ring-red-100'
                      )}
                    />
                    {cardTypeErrors.name && (
                      <p className="text-red-500 text-xs mt-1">
                        {cardTypeErrors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-500 mb-1.5">
                      卡类型 <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          {
                            k: 'recharge',
                            label: '储值卡',
                            icon: DollarSign,
                          },
                          { k: 'times', label: '次卡', icon: Zap },
                          {
                            k: 'discount',
                            label: '折扣卡',
                            icon: Tag,
                          },
                        ] as {
                          k: CardCategory;
                          label: string;
                          icon: typeof DollarSign;
                        }[]
                      ).map((opt) => {
                        const Icon = opt.icon;
                        const isSel = cardTypeForm.category === opt.k;
                        const meta = CARD_TYPE_META[opt.k];
                        return (
                          <label
                            key={opt.k}
                            className={cn(
                              'flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl cursor-pointer transition-all duration-200 border-2',
                              isSel
                                ? `${meta.border} ${meta.bg} shadow-sm`
                                : 'border-cream-200 bg-white hover:border-cream-300'
                            )}
                          >
                            <input
                              type="radio"
                              name="category"
                              checked={isSel}
                              onChange={() =>
                                setCardTypeForm((f) => ({
                                  ...f,
                                  category: opt.k,
                                }))
                              }
                              className="sr-only"
                            />
                            <Icon
                              className={cn(
                                'transition-colors',
                                isSel ? meta.text : 'text-ink-300'
                              )}
                              size={20}
                            />
                            <span
                              className={cn(
                                'text-xs font-medium',
                                isSel ? meta.text : 'text-ink-400'
                              )}
                            >
                              {opt.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-ink-500 mb-1.5">
                      {cardTypeForm.category === 'recharge'
                        ? '储值面额(¥) *'
                        : cardTypeForm.category === 'times'
                        ? '包含次数 *'
                        : '折扣值(1-99) *'}
                    </label>
                    <input
                      type="number"
                      min={cardTypeForm.category === 'discount' ? 1 : 1}
                      max={cardTypeForm.category === 'discount' ? 99 : undefined}
                      value={cardTypeForm.value}
                      onChange={(e) =>
                        setCardTypeForm((f) => ({
                          ...f,
                          value: e.target.value,
                        }))
                      }
                      placeholder={
                        cardTypeForm.category === 'recharge'
                          ? '如：5000'
                          : cardTypeForm.category === 'times'
                          ? '如：10'
                          : '如：88（表示8.8折）'
                      }
                      className={cn(
                        'input-field',
                        cardTypeErrors.value &&
                          'border-red-400 focus:border-red-400 focus:ring-red-100'
                      )}
                    />
                    {cardTypeErrors.value && (
                      <p className="text-red-500 text-xs mt-1">
                        {cardTypeErrors.value}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-500 mb-1.5">
                      售价(¥) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={cardTypeForm.price}
                      onChange={(e) =>
                        setCardTypeForm((f) => ({
                          ...f,
                          price: e.target.value,
                        }))
                      }
                      placeholder="如：2800"
                      className={cn(
                        'input-field',
                        cardTypeErrors.price &&
                          'border-red-400 focus:border-red-400 focus:ring-red-100'
                      )}
                    />
                    {cardTypeErrors.price && (
                      <p className="text-red-500 text-xs mt-1">
                        {cardTypeErrors.price}
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-cream-50 rounded-xl border border-cream-200">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-ink-500">
                      有效期设置
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-ink-300">永久有效</span>
                      <button
                        type="button"
                        onClick={() =>
                          setCardTypeForm((f) => ({
                            ...f,
                            isPermanent: !f.isPermanent,
                          }))
                        }
                        className={cn(
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200',
                          cardTypeForm.isPermanent
                            ? 'bg-jade-500'
                            : 'bg-ink-200'
                        )}
                      >
                        <span
                          className={cn(
                            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200',
                            cardTypeForm.isPermanent
                              ? 'translate-x-6'
                              : 'translate-x-1'
                          )}
                        />
                      </button>
                    </div>
                  </div>
                  {!cardTypeForm.isPermanent && (
                    <div>
                      <input
                        type="number"
                        min="1"
                        value={cardTypeForm.validDays}
                        onChange={(e) =>
                          setCardTypeForm((f) => ({
                            ...f,
                            validDays: e.target.value,
                          }))
                        }
                        placeholder="天数，如365"
                        className={cn(
                          'input-field',
                          cardTypeErrors.validDays &&
                            'border-red-400 focus:border-red-400 focus:ring-red-100'
                        )}
                      />
                      {cardTypeErrors.validDays && (
                        <p className="text-red-500 text-xs mt-1">
                          {cardTypeErrors.validDays}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-cream-50 rounded-xl border border-cream-200">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-ink-500">
                      适用项目
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-ink-300">全场通用</span>
                      <button
                        type="button"
                        onClick={() =>
                          setCardTypeForm((f) => ({
                            ...f,
                            allProjects: !f.allProjects,
                          }))
                        }
                        className={cn(
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200',
                          cardTypeForm.allProjects
                            ? 'bg-jade-500'
                            : 'bg-ink-200'
                        )}
                      >
                        <span
                          className={cn(
                            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200',
                            cardTypeForm.allProjects
                              ? 'translate-x-6'
                              : 'translate-x-1'
                          )}
                        />
                      </button>
                    </div>
                  </div>
                  {!cardTypeForm.allProjects && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                      {projects.map((p) => {
                        const checked =
                          cardTypeForm.applicableProjectIds.includes(p.id);
                        return (
                          <label
                            key={p.id}
                            className={cn(
                              'flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all duration-200 border text-sm',
                              checked
                                ? 'bg-sandalwood-50 border-sandalwood-300 text-sandalwood-700'
                                : 'bg-white border-cream-200 text-ink-500 hover:border-cream-300'
                            )}
                          >
                            <div
                              className={cn(
                                'w-3.5 h-3.5 rounded border-1.5 flex items-center justify-center transition-all',
                                checked
                                  ? 'bg-sandalwood-500 border-sandalwood-500'
                                  : 'border-ink-300'
                              )}
                            >
                              {checked && (
                                <Check size={9} className="text-white" />
                              )}
                            </div>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const ids = e.target.checked
                                  ? [
                                      ...cardTypeForm.applicableProjectIds,
                                      p.id,
                                    ]
                                  : cardTypeForm.applicableProjectIds.filter(
                                      (id) => id !== p.id
                                    );
                                setCardTypeForm((f) => ({
                                  ...f,
                                  applicableProjectIds: ids,
                                }));
                              }}
                              className="sr-only"
                            />
                            <span className="truncate">{p.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-500 mb-2">
                    卡面渐变色
                  </label>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {GRADIENT_PRESETS.map((g, idx) => {
                      const isSel =
                        cardTypeForm.gradientFrom === g.from &&
                        cardTypeForm.gradientTo === g.to;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() =>
                            setCardTypeForm((f) => ({
                              ...f,
                              gradientFrom: g.from,
                              gradientTo: g.to,
                            }))
                          }
                          className={cn(
                            'relative rounded-xl overflow-hidden h-14 transition-all duration-200 border-2',
                            isSel
                              ? 'border-sandalwood-500 ring-2 ring-sandalwood-200 scale-105'
                              : 'border-transparent hover:border-cream-300'
                          )}
                          style={renderGradientStyle(g.from, g.to)}
                        >
                          {isSel && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <Check
                                className="text-yellow-200"
                                size={18}
                                strokeWidth={3}
                              />
                            </div>
                          )}
                          <div className="absolute bottom-1 left-0 right-0 text-center text-[10px] text-white/90 drop-shadow">
                            {g.name}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs text-ink-300 mb-1">
                        左侧色值
                      </label>
                      <div className="flex gap-2">
                        <div
                          className="w-10 h-10 rounded-lg border border-cream-200 shrink-0"
                          style={{
                            backgroundColor: cardTypeForm.gradientFrom,
                          }}
                        />
                        <input
                          type="text"
                          value={cardTypeForm.gradientFrom}
                          onChange={(e) =>
                            setCardTypeForm((f) => ({
                              ...f,
                              gradientFrom: e.target.value,
                            }))
                          }
                          className="input-field py-2 text-sm font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-ink-300 mb-1">
                        右侧色值
                      </label>
                      <div className="flex gap-2">
                        <div
                          className="w-10 h-10 rounded-lg border border-cream-200 shrink-0"
                          style={{
                            backgroundColor: cardTypeForm.gradientTo,
                          }}
                        />
                        <input
                          type="text"
                          value={cardTypeForm.gradientTo}
                          onChange={(e) =>
                            setCardTypeForm((f) => ({
                              ...f,
                              gradientTo: e.target.value,
                            }))
                          }
                          className="input-field py-2 text-sm font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl overflow-hidden h-40" style={renderGradientStyle(cardTypeForm.gradientFrom, cardTypeForm.gradientTo)}>
                    <div className="relative h-full p-4 flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-white font-bold text-lg drop-shadow">
                            {cardTypeForm.name || '卡名预览'}
                          </div>
                          <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium border mt-1 inline-block', CARD_TYPE_META[cardTypeForm.category].bg, CARD_TYPE_META[cardTypeForm.category].text, CARD_TYPE_META[cardTypeForm.category].border)}>
                            {CARD_TYPE_META[cardTypeForm.category].label}
                          </span>
                        </div>
                        <CreditCard className="text-yellow-200" size={24} strokeWidth={1.5} />
                      </div>
                      <div className="flex items-end justify-between">
                        <div className="flex items-baseline gap-1">
                          <span className="text-yellow-200 text-lg">¥</span>
                          <span className="text-3xl font-bold text-yellow-200 drop-shadow">
                            {cardTypeForm.price || '0'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-500 mb-1.5">
                    描述说明
                  </label>
                  <textarea
                    rows={3}
                    value={cardTypeForm.description}
                    onChange={(e) =>
                      setCardTypeForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                    placeholder="卡种介绍、使用说明等（可选）"
                    className="input-field resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-500 mb-2">
                    是否启用
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setCardTypeForm((f) => ({
                        ...f,
                        isActive: !f.isActive,
                      }))
                    }
                    className={cn(
                      'relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200',
                      cardTypeForm.isActive ? 'bg-jade-500' : 'bg-ink-200'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200',
                        cardTypeForm.isActive ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>
                  <span className="ml-3 text-sm text-ink-400">
                    {cardTypeForm.isActive ? '已启用' : '已停用'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-cream-200 bg-cream-50">
              <button
                className="btn-ghost"
                onClick={() => setIsCardTypeModalOpen(false)}
              >
                取消
              </button>
              <button className="btn-primary" onClick={handleSaveCardType}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteCardType && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setConfirmDeleteCardType(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-sm animate-fade-up">
            <div className="p-6 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="text-red-500" size={28} />
              </div>
              <h3 className="text-lg font-bold text-ink-500 mb-2">确认删除</h3>
              <p className="text-sm text-ink-300 mb-6">
                确定要删除卡种
                <span className="font-medium text-ink-500 mx-1">
                  「{confirmDeleteCardType.name}」
                </span>
                吗？
                <br />
                删除后将无法恢复。
              </p>
              <div className="flex gap-3">
                <button
                  className="flex-1 btn-outline"
                  onClick={() => setConfirmDeleteCardType(null)}
                >
                  取消
                </button>
                <button
                  className="flex-1 bg-red-500 text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-200 hover:bg-red-600 active:bg-red-700"
                  onClick={() => handleDeleteCardType(confirmDeleteCardType)}
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isDetailModalOpen && selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm animate-fade-in"
            onClick={() => {
              setIsDetailModalOpen(false);
              setSelectedCard(null);
            }}
          />
          <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-3xl max-h-[90vh] overflow-hidden animate-fade-up">
            <div className="flex items-center justify-between px-6 py-5 border-b border-cream-200">
              <h2 className="text-xl font-bold text-ink-500">会员卡详情</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleCardActive(selectedCard)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5',
                    selectedCard.isActive
                      ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                      : 'bg-jade-50 text-jade-600 hover:bg-jade-100'
                  )}
                >
                  {selectedCard.isActive ? (
                    <>
                      <Ban size={14} />
                      冻结
                    </>
                  ) : (
                    <>
                      <Shield size={14} />
                      解冻
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setSelectedCard(null);
                  }}
                  className="p-2 rounded-lg text-ink-300 hover:text-ink-500 hover:bg-cream-100 transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="px-6 py-5 overflow-y-auto max-h-[calc(90vh-88px)]">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-2/5">
                  <div
                    className="rounded-2xl overflow-hidden mb-5"
                    style={renderGradientStyle(
                      GRADIENT_PRESETS[
                        membershipCards.indexOf(selectedCard) %
                          GRADIENT_PRESETS.length
                      ].from,
                      GRADIENT_PRESETS[
                        membershipCards.indexOf(selectedCard) %
                          GRADIENT_PRESETS.length
                      ].to
                    )}
                  >
                    <div className="relative h-full p-5 min-h-[220px] flex flex-col">
                      <div
                        className="absolute top-3 right-3"
                      >
                        <span
                          className={cn(
                            'px-2.5 py-1 rounded-full text-xs font-semibold shadow-md',
                            getCardStatus(selectedCard).cls
                          )}
                        >
                          {getCardStatus(selectedCard).label}
                        </span>
                      </div>
                      <div className="mb-4 pr-16">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="text-yellow-200" size={14} />
                          <span className="text-white font-semibold">
                            {getCustomer(selectedCard.customerId)?.name ?? '-'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-white/80 text-xs">
                          <Phone size={11} />
                          {getCustomer(selectedCard.customerId)?.phone ?? '-'}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="text-base font-bold text-white drop-shadow mb-1">
                            {selectedCard.name}
                          </div>
                          <div className="text-[11px] text-white/60 font-mono">
                            #{selectedCard.id.slice(-8).toUpperCase()}
                          </div>
                        </div>
                        <div className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
                          <CreditCard
                            className="text-yellow-200"
                            size={18}
                            strokeWidth={1.5}
                          />
                        </div>
                      </div>
                      <div className="mt-auto">
                        <div className="text-3xl font-bold text-yellow-200 drop-shadow tracking-tight">
                          {selectedCard.type === 'stored' && '¥'}
                          {selectedCard.type === 'count'
                            ? selectedCard.remainingTimes
                            : selectedCard.type === 'stored'
                            ? (selectedCard.balance ?? 0).toFixed(0)
                            : `${(selectedCard.discountPercent ?? 0) / 10}折`}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-3 border-b border-cream-200">
                      <span className="text-ink-300 text-sm">客户信息</span>
                      <span className="text-ink-500 font-medium">
                        {getCustomer(selectedCard.customerId)?.name ?? '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-cream-200">
                      <span className="text-ink-300 text-sm">卡类型</span>
                      <span
                        className={cn(
                          'tag',
                          CARD_TYPE_META[selectedCard.category].bg,
                          CARD_TYPE_META[selectedCard.category].text
                        )}
                      >
                        {CARD_TYPE_META[selectedCard.category].label}
                      </span>
                    </div>
                    {selectedCard.type === 'count' && (
                      <div className="flex items-center justify-between py-3 border-b border-cream-200">
                        <span className="text-ink-300 text-sm">使用进度</span>
                        <span className="text-ink-500 font-medium">
                          {selectedCard.totalTimes! -
                            (selectedCard.remainingTimes ?? 0)}
                          /{selectedCard.totalTimes} 次
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between py-3 border-b border-cream-200">
                      <span className="text-ink-300 text-sm">开卡时间</span>
                      <span className="text-ink-500 font-medium">
                        {format(parseISO(selectedCard.createdAt), 'yyyy-MM-dd')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <span className="text-ink-300 text-sm">有效期至</span>
                      <span
                        className={cn(
                          'font-medium',
                          isExpiringSoon(selectedCard)
                            ? 'text-red-500'
                            : 'text-ink-500'
                        )}
                      >
                        {selectedCard.expireDate
                          ? format(
                              parseISO(selectedCard.expireDate),
                              'yyyy-MM-dd'
                            )
                          : '永久有效'}
                        {isExpiringSoon(selectedCard) && (
                          <AlertTriangle size={12} className="inline ml-1" />
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="lg:w-3/5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-ink-500 flex items-center gap-2">
                      <FileText size={18} className="text-sandalwood-500" />
                      交易记录
                    </h3>
                    <span className="text-sm text-ink-300">
                      共 {cardTransactions.length} 条
                    </span>
                  </div>

                  {cardTransactions.length === 0 ? (
                    <div className="card p-10 text-center">
                      <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-cream-100 flex items-center justify-center">
                        <FileText className="text-ink-300" size={24} />
                      </div>
                      <p className="text-ink-300 text-sm">暂无交易记录</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-4 top-2 bottom-2 w-px bg-cream-300" />
                      <div className="space-y-4">
                        {cardTransactions.map((t) => {
                          const isRecharge = t.type === 'recharge';
                          const isRefund = t.type === 'refund';
                          return (
                            <div
                              key={t.id}
                              className="relative pl-10"
                            >
                              <div
                                className={cn(
                                  'absolute left-2.5 top-3 w-3 h-3 rounded-full border-2 border-white shadow',
                                  isRecharge
                                    ? 'bg-jade-500'
                                    : isRefund
                                    ? 'bg-red-500'
                                    : 'bg-sandalwood-500'
                                )}
                              />
                              <div className="card p-4">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={cn(
                                          'tag text-xs',
                                          isRecharge
                                            ? 'bg-jade-100 text-jade-700'
                                            : isRefund
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-sandalwood-100 text-sandalwood-700'
                                        )}
                                      >
                                        {isRecharge
                                          ? '充值/开卡'
                                          : isRefund
                                          ? '退款'
                                          : '消费'}
                                      </span>
                                      <span className="text-xs text-ink-300">
                                        {PAYMENT_METHODS.find(
                                          (p) => p.value === t.paymentMethod
                                        )?.label ?? t.paymentMethod}
                                      </span>
                                    </div>
                                    {t.remark && (
                                      <p className="text-sm text-ink-400 mt-1.5">
                                        {t.remark}
                                      </p>
                                    )}
                                  </div>
                                  <div
                                    className={cn(
                                      'text-lg font-bold whitespace-nowrap',
                                      isRecharge || isRefund
                                        ? 'text-jade-600'
                                        : 'text-sandalwood-600'
                                    )}
                                  >
                                    {isRecharge || isRefund ? '+' : '-'}¥
                                    {t.amount.toFixed(2)}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-ink-300">
                                  <Clock size={11} />
                                  {format(
                                    parseISO(t.createdAt),
                                    'yyyy-MM-dd HH:mm'
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsPurchaseModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-4xl max-h-[90vh] overflow-hidden animate-fade-up">
            <div className="flex items-center justify-between px-6 py-5 border-b border-cream-200">
              <div>
                <h2 className="text-xl font-bold text-ink-500">办理新卡</h2>
                <div className="flex items-center gap-2 mt-2">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex items-center">
                      <div
                        className={cn(
                          'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300',
                          purchaseFlow.step === step
                            ? 'bg-sandalwood-500 text-white shadow-md'
                            : purchaseFlow.step > step
                            ? 'bg-jade-500 text-white'
                            : 'bg-cream-200 text-ink-400'
                        )}
                      >
                        {purchaseFlow.step > step ? (
                          <Check size={14} />
                        ) : (
                          step
                        )}
                      </div>
                      <span
                        className={cn(
                          'ml-2 text-xs font-medium',
                          purchaseFlow.step === step
                            ? 'text-sandalwood-600'
                            : purchaseFlow.step > step
                            ? 'text-jade-600'
                            : 'text-ink-300'
                        )}
                      >
                        {step === 1
                          ? '选择客户'
                          : step === 2
                          ? '选择卡种'
                          : '支付办理'}
                      </span>
                      {step < 3 && (
                        <ChevronRight
                          className={cn(
                            'ml-3 mr-3',
                            purchaseFlow.step > step
                              ? 'text-jade-400'
                              : 'text-cream-300'
                          )}
                          size={14}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setIsPurchaseModalOpen(false)}
                className="p-2 rounded-lg text-ink-300 hover:text-ink-500 hover:bg-cream-100 transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto max-h-[calc(90vh-180px)]">
              {purchaseFlow.step === 1 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="relative flex-1 max-w-md">
                      <Search
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-300"
                        size={16}
                      />
                      <input
                        type="text"
                        placeholder="搜索客户姓名/手机号..."
                        value={purchaseCustomerSearch}
                        onChange={(e) =>
                          setPurchaseCustomerSearch(e.target.value)
                        }
                        className="input-field pl-10 py-2 text-sm"
                      />
                    </div>
                    <button
                      onClick={() => setIsNewCustomerModalOpen(true)}
                      className="btn-outline flex items-center gap-1.5 ml-3"
                    >
                      <UserPlus size={16} />
                      新客户登记
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto pr-2">
                    {filteredPurchaseCustomers.length === 0 ? (
                      <div className="col-span-full text-center py-12">
                        <p className="text-ink-300">
                          {purchaseCustomerSearch
                            ? '未找到客户'
                            : '暂无客户，请先登记新客户'}
                        </p>
                      </div>
                    ) : (
                      filteredPurchaseCustomers.map((c) => {
                        const isSel =
                          purchaseFlow.selectedCustomerId === c.id;
                        return (
                          <label
                            key={c.id}
                            className={cn(
                              'flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all duration-200 border-2',
                              isSel
                                ? 'bg-sandalwood-50 border-sandalwood-400 shadow-sm'
                                : 'bg-white border-cream-200 hover:border-sandalwood-200 hover:bg-cream-50'
                            )}
                          >
                            <input
                              type="radio"
                              name="customer"
                              checked={isSel}
                              onChange={() =>
                                setPurchaseFlow((p) => ({
                                  ...p,
                                  selectedCustomerId: c.id,
                                }))
                              }
                              className="sr-only"
                            />
                            <div
                              className={cn(
                                'w-11 h-11 rounded-full flex items-center justify-center shrink-0',
                                isSel
                                  ? 'bg-sandalwood-500 text-white'
                                  : 'bg-sandalwood-100 text-sandalwood-500'
                              )}
                            >
                              <User size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-ink-500">
                                {c.name}
                              </div>
                              <div className="text-sm text-ink-300 flex items-center gap-1">
                                <Phone size={11} />
                                {c.phone}
                              </div>
                            </div>
                            {isSel && (
                              <Check
                                className="text-sandalwood-500 shrink-0"
                                size={20}
                              />
                            )}
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {purchaseFlow.step === 2 && (
                <div>
                  <p className="text-sm text-ink-400 mb-4">
                    已选择客户：
                    <span className="font-semibold text-ink-500 ml-1">
                      {selectedCustomerForPurchase?.name} (
                      {selectedCustomerForPurchase?.phone})
                    </span>
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[55vh] overflow-y-auto pr-2">
                    {sortedCardTypes
                      .filter((ct) => ct.isActive)
                      .map((ct, idx) => {
                        const isSel =
                          purchaseFlow.selectedCardTypeId === ct.id;
                        const gradient =
                          GRADIENT_PRESETS[
                            idx % GRADIENT_PRESETS.length
                          ];
                        return (
                          <div
                            key={ct.id}
                            onClick={() =>
                              setPurchaseFlow((p) => ({
                                ...p,
                                selectedCardTypeId: ct.id,
                              }))
                            }
                            className={cn(
                              'relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300',
                              isSel
                                ? 'ring-4 ring-sandalwood-300 ring-offset-2 scale-[1.02]'
                                : 'hover:-translate-y-1'
                            )}
                            style={renderGradientStyle(
                              gradient.from,
                              gradient.to
                            )}
                          >
                            <div
                              className="absolute inset-[2px] rounded-[14px] pointer-events-none"
                              style={{
                                boxShadow:
                                  'inset 0 0 0 1px rgba(201,169,97,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
                              }}
                            />
                            <div className="relative p-4 min-h-[180px] flex flex-col">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h3 className="text-base font-bold text-white drop-shadow mb-1">
                                    {ct.name}
                                  </h3>
                                  <span
                                    className={cn(
                                      'px-1.5 py-0.5 rounded text-[10px] font-medium border',
                                      CARD_TYPE_META[ct.category].bg,
                                      CARD_TYPE_META[ct.category].text,
                                      CARD_TYPE_META[ct.category].border
                                    )}
                                  >
                                    {CARD_TYPE_META[ct.category].label}
                                  </span>
                                </div>
                                <div
                                  className={cn(
                                    'w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all',
                                    isSel
                                      ? 'bg-white border-white'
                                      : 'bg-white/10 border-white/30'
                                  )}
                                >
                                  {isSel ? (
                                    <Check
                                      className="text-sandalwood-500"
                                      size={16}
                                      strokeWidth={3}
                                    />
                                  ) : (
                                    <CreditCard
                                      className="text-yellow-200"
                                      size={14}
                                      strokeWidth={1.5}
                                    />
                                  )}
                                </div>
                              </div>
                              <div className="mt-auto">
                                <div className="flex items-baseline gap-1">
                                  <span className="text-yellow-200 text-sm">
                                    ¥
                                  </span>
                                  <span className="text-3xl font-bold text-yellow-200 drop-shadow">
                                    {ct.price}
                                  </span>
                                </div>
                                <div className="text-xs text-white/70 mt-1">
                                  {ct.category === 'recharge'
                                    ? `储值¥${ct.value}`
                                    : ct.category === 'times'
                                    ? `${ct.value}次`
                                    : `${ct.value / 10}折`}
                                  {ct.validDays
                                    ? ` · ${ct.validDays}天有效`
                                    : ' · 永久有效'}
                                </div>
                                {ct.description && (
                                  <div className="text-[10px] text-white/60 mt-1 line-clamp-1">
                                    {ct.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {purchaseFlow.step === 3 && selectedCardTypeForPurchase && selectedCustomerForPurchase && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-base font-bold text-ink-500 mb-4 flex items-center gap-2">
                      <CreditCard
                        className="text-sandalwood-500"
                        size={18}
                      />
                      订单信息
                    </h3>
                    <div
                      className="rounded-2xl overflow-hidden mb-5"
                      style={renderGradientStyle(
                        GRADIENT_PRESETS[0].from,
                        GRADIENT_PRESETS[0].to
                      )}
                    >
                      <div className="relative p-5">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="text-yellow-200" size={14} />
                          <span className="text-white font-semibold">
                            {selectedCustomerForPurchase.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-white/80 text-xs mb-4">
                          <Phone size={11} />
                          {selectedCustomerForPurchase.phone}
                        </div>
                        <div className="text-base font-bold text-white drop-shadow mb-1">
                          {selectedCardTypeForPurchase.name}
                        </div>
                        <span
                          className={cn(
                            'px-1.5 py-0.5 rounded text-[10px] font-medium border',
                            CARD_TYPE_META[selectedCardTypeForPurchase.category]
                              .bg,
                            CARD_TYPE_META[selectedCardTypeForPurchase.category]
                              .text,
                            CARD_TYPE_META[selectedCardTypeForPurchase.category]
                              .border
                          )}
                        >
                          {
                            CARD_TYPE_META[selectedCardTypeForPurchase.category]
                              .label
                          }
                        </span>
                        <div className="mt-4 pt-4 border-t border-white/15 flex items-end justify-between">
                          <div>
                            <div className="text-xs text-white/60 mb-1">
                              包含权益
                            </div>
                            <div className="text-white font-semibold">
                              {selectedCardTypeForPurchase.category ===
                              'recharge'
                                ? `¥${selectedCardTypeForPurchase.value} 余额`
                                : selectedCardTypeForPurchase.category ===
                                  'times'
                                ? `${selectedCardTypeForPurchase.value} 次服务`
                                : `全场 ${selectedCardTypeForPurchase.value / 10} 折`}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-white/60 mb-1">
                              有效期
                            </div>
                            <div className="text-white font-semibold">
                              {selectedCardTypeForPurchase.validDays
                                ? `${selectedCardTypeForPurchase.validDays} 天`
                                : '永久有效'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-ink-500 mb-4 flex items-center gap-2">
                      <DollarSign className="text-sandalwood-500" size={18} />
                      支付详情
                    </h3>
                    <div className="card p-5 space-y-5">
                      <div className="flex items-center justify-between py-2 border-b border-cream-200">
                        <span className="text-ink-400">卡售价</span>
                        <span className="text-lg font-semibold text-ink-500">
                          ¥{selectedCardTypeForPurchase.price.toFixed(2)}
                        </span>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-ink-500 mb-1.5">
                          优惠金额
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={purchaseFlow.discountAmount}
                          onChange={(e) =>
                            setPurchaseFlow((p) => ({
                              ...p,
                              discountAmount: e.target.value,
                            }))
                          }
                          placeholder="可选，如：100"
                          className="input-field py-2"
                        />
                      </div>

                      <div className="flex items-center justify-between py-3 border-y border-cream-200 bg-cream-50 -mx-5 px-5">
                        <span className="text-ink-500 font-medium">实付金额</span>
                        <span className="text-2xl font-bold text-sandalwood-600">
                          ¥{actualPay.toFixed(2)}
                        </span>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-ink-500 mb-2">
                          支付方式
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {PAYMENT_METHODS.map((pm) => {
                            const Icon = pm.icon;
                            const isSel =
                              purchaseFlow.paymentMethod === pm.value;
                            return (
                              <label
                                key={pm.value}
                                className={cn(
                                  'flex flex-col items-center justify-center gap-1 p-3 rounded-xl cursor-pointer transition-all duration-200 border-2',
                                  isSel
                                    ? 'border-sandalwood-400 bg-sandalwood-50'
                                    : 'border-cream-200 bg-white hover:border-cream-300'
                                )}
                              >
                                <input
                                  type="radio"
                                  name="payment"
                                  checked={isSel}
                                  onChange={() =>
                                    setPurchaseFlow((p) => ({
                                      ...p,
                                      paymentMethod: pm.value,
                                    }))
                                  }
                                  className="sr-only"
                                />
                                <Icon
                                  className={cn(
                                    'transition-colors',
                                    isSel
                                      ? 'text-sandalwood-500'
                                      : 'text-ink-300'
                                  )}
                                  size={20}
                                />
                                <span
                                  className={cn(
                                    'text-xs font-medium',
                                    isSel
                                      ? 'text-sandalwood-600'
                                      : 'text-ink-400'
                                  )}
                                >
                                  {pm.label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-ink-500 mb-1.5">
                            开卡日期
                          </label>
                          <input
                            type="date"
                            value={purchaseFlow.openCardDate}
                            onChange={(e) =>
                              setPurchaseFlow((p) => ({
                                ...p,
                                openCardDate: e.target.value,
                              }))
                            }
                            className="input-field py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-ink-500 mb-1.5">
                            到期日期
                          </label>
                          <div className="input-field py-2 text-sm bg-cream-50 text-ink-400">
                            {selectedCardTypeForPurchase.validDays
                              ? format(
                                  addDays(
                                    parseISO(purchaseFlow.openCardDate),
                                    selectedCardTypeForPurchase.validDays
                                  ),
                                  'yyyy-MM-dd'
                                )
                              : '永久有效'}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-ink-500 mb-1.5">
                          备注
                        </label>
                        <textarea
                          rows={2}
                          value={purchaseFlow.remark}
                          onChange={(e) =>
                            setPurchaseFlow((p) => ({
                              ...p,
                              remark: e.target.value,
                            }))
                          }
                          placeholder="可选，如：VIP客户特殊办理..."
                          className="input-field resize-none text-sm py-2"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t border-cream-200 bg-cream-50">
              <button
                className={cn(
                  'btn-ghost flex items-center gap-1.5',
                  purchaseFlow.step === 1 && 'opacity-50 cursor-not-allowed'
                )}
                onClick={() =>
                  purchaseFlow.step > 1 &&
                  setPurchaseFlow((p) => ({
                    ...p,
                    step: (p.step - 1) as 1 | 2 | 3,
                  }))
                }
                disabled={purchaseFlow.step === 1}
              >
                <ArrowLeft size={16} />
                上一步
              </button>
              {purchaseFlow.step < 3 ? (
                <button
                  className={cn(
                    'btn-primary flex items-center gap-1.5',
                    ((purchaseFlow.step === 1 &&
                      !purchaseFlow.selectedCustomerId) ||
                      (purchaseFlow.step === 2 &&
                        !purchaseFlow.selectedCardTypeId)) &&
                      'opacity-50 cursor-not-allowed'
                  )}
                  onClick={() => {
                    if (purchaseFlow.step === 1 && !purchaseFlow.selectedCustomerId)
                      return;
                    if (purchaseFlow.step === 2 && !purchaseFlow.selectedCardTypeId)
                      return;
                    setPurchaseFlow((p) => ({
                      ...p,
                      step: (p.step + 1) as 1 | 2 | 3,
                    }));
                  }}
                  disabled={
                    (purchaseFlow.step === 1 &&
                      !purchaseFlow.selectedCustomerId) ||
                    (purchaseFlow.step === 2 &&
                      !purchaseFlow.selectedCardTypeId)
                  }
                >
                  下一步
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  className="btn-primary flex items-center gap-1.5"
                  onClick={handleConfirmPurchase}
                >
                  <Check size={16} />
                  确认办理
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isNewCustomerModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm animate-fade-in"
            onClick={() => {
              setIsNewCustomerModalOpen(false);
              setNewCustomerForm({
                name: '',
                phone: '',
                gender: '',
                note: '',
              });
              setNewCustomerErrors({});
            }}
          />
          <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-md animate-fade-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-cream-200">
              <h3 className="text-lg font-bold text-ink-500">快速登记新客户</h3>
              <button
                onClick={() => {
                  setIsNewCustomerModalOpen(false);
                  setNewCustomerForm({
                    name: '',
                    phone: '',
                    gender: '',
                    note: '',
                  });
                  setNewCustomerErrors({});
                }}
                className="p-1.5 rounded-lg text-ink-300 hover:text-ink-500 hover:bg-cream-100 transition-all"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-500 mb-1.5">
                  客户姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCustomerForm.name}
                  onChange={(e) =>
                    setNewCustomerForm((f) => ({
                      ...f,
                      name: e.target.value,
                    }))
                  }
                  placeholder="请输入客户姓名"
                  className={cn(
                    'input-field',
                    newCustomerErrors.name &&
                      'border-red-400 focus:border-red-400 focus:ring-red-100'
                  )}
                />
                {newCustomerErrors.name && (
                  <p className="text-red-500 text-xs mt-1">
                    {newCustomerErrors.name}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-500 mb-1.5">
                  手机号 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={newCustomerForm.phone}
                  onChange={(e) =>
                    setNewCustomerForm((f) => ({
                      ...f,
                      phone: e.target.value,
                    }))
                  }
                  placeholder="请输入手机号"
                  className={cn(
                    'input-field',
                    newCustomerErrors.phone &&
                      'border-red-400 focus:border-red-400 focus:ring-red-100'
                  )}
                />
                {newCustomerErrors.phone && (
                  <p className="text-red-500 text-xs mt-1">
                    {newCustomerErrors.phone}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-500 mb-1.5">
                  性别
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { k: 'male', label: '男' },
                    { k: 'female', label: '女' },
                    { k: 'other', label: '其他' },
                  ].map((g) => (
                    <label
                      key={g.k}
                      className={cn(
                        'py-2 rounded-lg text-center cursor-pointer transition-all duration-200 border text-sm font-medium',
                        newCustomerForm.gender === g.k
                          ? 'bg-sandalwood-50 border-sandalwood-400 text-sandalwood-600'
                          : 'bg-white border-cream-200 text-ink-400 hover:border-cream-300'
                      )}
                    >
                      <input
                        type="radio"
                        name="gender"
                        checked={newCustomerForm.gender === g.k}
                        onChange={() =>
                          setNewCustomerForm((f) => ({
                            ...f,
                            gender: g.k as 'male' | 'female' | 'other',
                          }))
                        }
                        className="sr-only"
                      />
                      {g.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-500 mb-1.5">
                  备注
                </label>
                <textarea
                  rows={2}
                  value={newCustomerForm.note}
                  onChange={(e) =>
                    setNewCustomerForm((f) => ({
                      ...f,
                      note: e.target.value,
                    }))
                  }
                  placeholder="过敏史、偏好等（可选）"
                  className="input-field resize-none text-sm"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-cream-200 bg-cream-50">
              <button
                className="btn-ghost"
                onClick={() => {
                  setIsNewCustomerModalOpen(false);
                  setNewCustomerForm({
                    name: '',
                    phone: '',
                    gender: '',
                    note: '',
                  });
                  setNewCustomerErrors({});
                }}
              >
                取消
              </button>
              <button className="btn-primary" onClick={handleAddNewCustomer}>
                确认登记
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}