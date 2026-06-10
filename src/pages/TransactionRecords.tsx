import { useState, useMemo } from 'react';
import { useAppStore } from '@/store';
import type { Transaction, Customer, Technician, Project, Appointment, MembershipCard, TransactionType, PaymentMethod } from '@/types';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend, Cell,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
  Receipt, BarChart3, Calendar, Download, Search,
  ChevronLeft, ChevronRight, Eye, Printer, Copy, Check,
  Wallet, Users, Clock, TrendingUp, Award, Crown,
  Trophy, X, FileText, CreditCard, User, MapPin
} from 'lucide-react';
import {
  format, parseISO, startOfDay, endOfDay, subDays,
  isWithinInterval, eachDayOfInterval
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type TabKey = 'records' | 'stats';
type DatePreset = '7d' | '30d' | 'custom';

const PAYMENT_META: Record<PaymentMethod, { label: string; color: string; bg: string; icon: string }> = {
  wechat: { label: '微信支付', color: 'text-green-600', bg: 'bg-green-50', icon: '💬' },
  alipay: { label: '支付宝', color: 'text-blue-600', bg: 'bg-blue-50', icon: '📱' },
  cash: { label: '现金', color: 'text-ink-700', bg: 'bg-ink-50', icon: '💵' },
  card: { label: '疗程卡', color: 'text-gold-700', bg: 'bg-gold-50', icon: '💳' },
  transfer: { label: '银行转账', color: 'text-jade-700', bg: 'bg-jade-50', icon: '🏦' },
  other: { label: '其他', color: 'text-ink-500', bg: 'bg-cream-100', icon: '📝' },
};

const TYPE_META: Record<TransactionType, { label: string; cls: string }> = {
  consume: { label: '消费', cls: 'tag-jade' },
  recharge: { label: '充值', cls: 'tag-sandalwood' },
  refund: { label: '退款', cls: 'tag bg-red-100 text-red-700' },
};

const PIE_COLORS = ['#5B8C5A', '#6B4423', '#2D2A26', '#BA8551', '#C9A961', '#8D887F'];

export default function TransactionRecords() {
  useAppStore.getState().initStore;
  const {
    transactions, customers, projects, technicians,
    appointments, membershipCards
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<TabKey>('records');
  const [datePreset, setDatePreset] = useState<DatePreset>('7d');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 6), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [filterPayment, setFilterPayment] = useState<'all' | PaymentMethod>('all');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [detailModal, setDetailModal] = useState<Transaction | null>(null);
  const [trendGranularity, setTrendGranularity] = useState<'day' | 'week' | 'month'>('day');
  const pageSize = 20;

  const dateRange = useMemo(() => {
    if (datePreset === '7d') {
      return { start: startOfDay(subDays(new Date(), 6)), end: endOfDay(new Date()) };
    }
    if (datePreset === '30d') {
      return { start: startOfDay(subDays(new Date(), 29)), end: endOfDay(new Date()) };
    }
    return {
      start: startOfDay(parseISO(startDate)),
      end: endOfDay(parseISO(endDate)),
    };
  }, [datePreset, startDate, endDate]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const txDate = parseISO(tx.createdAt);
      if (!isWithinInterval(txDate, dateRange)) return false;
      if (filterType !== 'all' && tx.type !== filterType) return false;
      if (filterPayment !== 'all' && tx.paymentMethod !== filterPayment) return false;
      if (searchText.trim()) {
        const q = searchText.trim().toLowerCase();
        const cust = customers.find(c => c.id === tx.customerId);
        const matchName = cust?.name.toLowerCase().includes(q);
        const matchPhone = cust?.phone.includes(q);
        const matchId = tx.id.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchId) return false;
      }
      return true;
    }).sort((a, b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime());
  }, [transactions, dateRange, filterType, filterPayment, searchText, customers]);

  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, page]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));

  const overviewStats = useMemo(() => {
    const totalCount = filteredTransactions.length;
    let totalRevenue = 0;
    let totalDiscount = 0;
    const paymentCounts: Record<string, number> = {};
    filteredTransactions.forEach(tx => {
      if (tx.type === 'consume' || tx.type === 'recharge') {
        totalRevenue += tx.amount;
      } else if (tx.type === 'refund') {
        totalRevenue -= tx.amount;
      }
      if (tx.cardDeduction) {
        totalDiscount += tx.cardDeduction;
      }
      paymentCounts[tx.paymentMethod] = (paymentCounts[tx.paymentMethod] || 0) + 1;
    });
    return { totalCount, totalRevenue, totalDiscount, paymentCounts };
  }, [filteredTransactions]);

  const trendData = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    const filtered = transactions.filter(tx => {
      const d = parseISO(tx.createdAt);
      return isWithinInterval(d, dateRange);
    });
    const byDay: Record<string, typeof filtered> = {};
    filtered.forEach(tx => {
      const k = format(parseISO(tx.createdAt), 'yyyy-MM-dd');
      if (!byDay[k]) byDay[k] = [];
      byDay[k].push(tx);
    });

    return days.map(day => {
      const key = format(day, 'yyyy-MM-dd');
      const dayTxs = byDay[key] || [];
      let revenue = 0;
      dayTxs.forEach(tx => {
        if (tx.type === 'consume' || tx.type === 'recharge') revenue += tx.amount;
        else if (tx.type === 'refund') revenue -= tx.amount;
      });
      return {
        date: format(day, 'MM/dd'),
        revenue,
        orders: dayTxs.length,
      };
    });
  }, [transactions, dateRange]);

  const projectSales = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    filteredTransactions.forEach(tx => {
      if (tx.type === 'consume' && tx.appointmentId) {
        const apt = appointments.find(a => a.id === tx.appointmentId);
        if (apt) {
          const proj = projects.find(p => p.id === apt.projectId);
          if (proj) {
            const cur = map.get(proj.id) || { name: proj.name, count: 0 };
            cur.count += 1;
            map.set(proj.id, cur);
          }
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [filteredTransactions, appointments, projects]);

  const paymentPieData = useMemo(() => {
    const map = new Map<PaymentMethod, number>();
    filteredTransactions.forEach(tx => {
      map.set(tx.paymentMethod, (map.get(tx.paymentMethod) || 0) + (tx.type === 'refund' ? -tx.amount : tx.amount));
    });
    return Array.from(map.entries())
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: PAYMENT_META[k].label, value: v, key: k }));
  }, [filteredTransactions]);

  const technicianRanking = useMemo(() => {
    const map = new Map<string, { name: string; count: number; amount: number }>();
    filteredTransactions.forEach(tx => {
      if (tx.type === 'consume' && tx.appointmentId) {
        const apt = appointments.find(a => a.id === tx.appointmentId);
        if (apt) {
          const tech = technicians.find(t => t.id === apt.technicianId);
          if (tech) {
            const cur = map.get(tech.id) || { name: tech.name, count: 0, amount: 0 };
            cur.count += 1;
            cur.amount += tx.amount;
            map.set(tech.id, cur);
          }
        }
      }
    });
    return Array.from(map.values())
      .map(r => ({ ...r, avgPrice: r.count > 0 ? r.amount / r.count : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, appointments, technicians]);

  const customerRanking = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; count: number; amount: number; lastTx: Date | null }>();
    filteredTransactions.forEach(tx => {
      if (tx.type === 'consume' || tx.type === 'recharge' || tx.type === 'refund') {
        const cust = customers.find(c => c.id === tx.customerId);
        if (cust) {
          const cur = map.get(cust.id) || { name: cust.name, phone: cust.phone, count: 0, amount: 0, lastTx: null };
          cur.count += 1;
          cur.amount += tx.type === 'refund' ? -tx.amount : tx.amount;
          const txDate = parseISO(tx.createdAt);
          if (!cur.lastTx || txDate > cur.lastTx) cur.lastTx = txDate;
          map.set(cust.id, cur);
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, customers]);

  const coreMetrics = useMemo(() => {
    const totalRevenue = overviewStats.totalRevenue;
    const totalCount = overviewStats.totalCount;
    const consumeCount = filteredTransactions.filter(t => t.type === 'consume').length;
    const uniqueCustomers = new Set(filteredTransactions.map(t => t.customerId)).size;
    const avgPrice = consumeCount > 0 ? totalRevenue / consumeCount : 0;
    let totalDuration = 0;
    let durationCount = 0;
    filteredTransactions.forEach(tx => {
      if (tx.appointmentId) {
        const apt = appointments.find(a => a.id === tx.appointmentId);
        if (apt) {
          const proj = projects.find(p => p.id === apt.projectId);
          if (proj) {
            totalDuration += proj.duration;
            durationCount += 1;
          }
        }
      }
    });
    const avgDuration = durationCount > 0 ? totalDuration / durationCount : 0;
    return { totalRevenue, totalCount, avgPrice, consumeCount, uniqueCustomers, avgDuration };
  }, [overviewStats, filteredTransactions, appointments, projects]);

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset === '7d') {
      setStartDate(format(subDays(new Date(), 6), 'yyyy-MM-dd'));
      setEndDate(format(new Date(), 'yyyy-MM-dd'));
    } else if (preset === '30d') {
      setStartDate(format(subDays(new Date(), 29), 'yyyy-MM-dd'));
      setEndDate(format(new Date(), 'yyyy-MM-dd'));
    }
    setPage(1);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const getCustomer = (id: string): Customer | undefined => customers.find(c => c.id === id);
  const getTechnician = (id: string): Technician | undefined => technicians.find(t => t.id === id);
  const getProject = (id: string): Project | undefined => projects.find(p => p.id === id);
  const getAppointment = (id: string): Appointment | undefined => appointments.find(a => a.id === id);
  const getMembershipCard = (id: string): MembershipCard | undefined => membershipCards.find(m => m.id === id);

  const getProjectContent = (tx: Transaction): string => {
    if (tx.type === 'recharge' && tx.membershipCardId) {
      const mc = getMembershipCard(tx.membershipCardId);
      return mc ? `疗程卡充值-${mc.name}` : '疗程卡充值';
    }
    if (tx.appointmentId) {
      const apt = getAppointment(tx.appointmentId);
      if (apt) {
        const proj = getProject(apt.projectId);
        return proj ? `${proj.name} x1` : '项目消费';
      }
    }
    if (tx.remark) return tx.remark;
    return tx.type === 'refund' ? '订单退款' : '消费';
  };

  const getOriginalPrice = (tx: Transaction): number | null => {
    if (tx.cardDeduction) return tx.amount + tx.cardDeduction;
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* 页面标题 + Tab导航 */}
      <div className="bg-white rounded-2xl p-6 shadow-card">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-sandalwood-100 flex items-center justify-center shrink-0">
              <Receipt className="w-6 h-6 text-sandalwood-600" />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-ink-700">消费记录</h2>
              <p className="text-ink-500 mt-1">查看消费流水与经营数据统计</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePresetChange('7d')}
                className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  datePreset === '7d' ? 'bg-sandalwood-500 text-white' : 'bg-cream-100 text-ink-600 hover:bg-cream-200')}
              >
                近7天
              </button>
              <button
                onClick={() => handlePresetChange('30d')}
                className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  datePreset === '30d' ? 'bg-sandalwood-500 text-white' : 'bg-cream-100 text-ink-600 hover:bg-cream-200')}
              >
                近30天
              </button>
              <button
                onClick={() => handlePresetChange('custom')}
                className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  datePreset === 'custom' ? 'bg-sandalwood-500 text-white' : 'bg-cream-100 text-ink-600 hover:bg-cream-200')}
              >
                自定义
              </button>
            </div>
            {datePreset === 'custom' && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-ink-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={e => { setStartDate(e.target.value); setDatePreset('custom'); setPage(1); }}
                  className="input-field text-sm py-2"
                />
                <span className="text-ink-400">至</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => { setEndDate(e.target.value); setDatePreset('custom'); setPage(1); }}
                  className="input-field text-sm py-2"
                />
              </div>
            )}
            <button className="btn-outline flex items-center gap-2 whitespace-nowrap" onClick={() => alert('导出功能演示')}>
              <Download className="w-4 h-4" />
              <span>导出Excel</span>
            </button>
          </div>
        </div>

        <div className="mt-6 border-t border-cream-200 pt-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('records')}
              className={cn('flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all',
                activeTab === 'records'
                  ? 'bg-sandalwood-500 text-white shadow-md'
                  : 'text-ink-500 hover:bg-cream-100')}
            >
              <Receipt className="w-4 h-4" />
              <span>流水记录</span>
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={cn('flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all',
                activeTab === 'stats'
                  ? 'bg-sandalwood-500 text-white shadow-md'
                  : 'text-ink-500 hover:bg-cream-100')}
            >
              <BarChart3 className="w-4 h-4" />
              <span>数据统计</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1 - 流水记录 */}
      {activeTab === 'records' && (
        <>
          {/* 数据概览条 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-jade-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-jade-600" />
                </div>
                <div>
                  <p className="text-xs text-ink-400">总笔数</p>
                  <p className="text-2xl font-bold text-ink-700 mt-0.5">{overviewStats.totalCount}笔</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-sandalwood-100 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-sandalwood-600" />
                </div>
                <div>
                  <p className="text-xs text-ink-400">总营收</p>
                  <p className="text-2xl font-bold text-sandalwood-500 mt-0.5">¥{overviewStats.totalRevenue.toLocaleString()}</p>
                </div>
              </div>
              {Object.keys(overviewStats.paymentCounts).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {Object.entries(overviewStats.paymentCounts).map(([k, v]) => (
                    <span key={k} className={cn('text-xs px-2 py-0.5 rounded-full', PAYMENT_META[k as PaymentMethod].bg, PAYMENT_META[k as PaymentMethod].color)}>
                      {PAYMENT_META[k as PaymentMethod].label} {v}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-card col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-ink-400">优惠总额</p>
                  <p className="text-xl font-bold text-red-500 mt-0.5">-¥{overviewStats.totalDiscount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gold-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-gold-600" />
                </div>
                <div>
                  <p className="text-xs text-ink-400">客单价</p>
                  <p className="text-2xl font-bold text-gold-600 mt-0.5">
                    ¥{overviewStats.totalCount > 0 ? Math.round(overviewStats.totalRevenue / overviewStats.totalCount).toLocaleString() : 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 筛选工具栏 */}
          <div className="bg-white rounded-2xl p-5 shadow-card">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                <input
                  type="text"
                  value={searchText}
                  onChange={e => { setSearchText(e.target.value); setPage(1); }}
                  placeholder="搜索客户名 / 手机号 / 订单号..."
                  className="input-field pl-11"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-ink-500 whitespace-nowrap">交易类型：</span>
                  <select
                    value={filterType}
                    onChange={e => { setFilterType(e.target.value as any); setPage(1); }}
                    className="input-field py-2 text-sm"
                  >
                    <option value="all">全部</option>
                    <option value="consume">消费</option>
                    <option value="recharge">充值</option>
                    <option value="refund">退款</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-ink-500 whitespace-nowrap">支付方式：</span>
                  <select
                    value={filterPayment}
                    onChange={e => { setFilterPayment(e.target.value as any); setPage(1); }}
                    className="input-field py-2 text-sm"
                  >
                    <option value="all">全部</option>
                    <option value="cash">现金</option>
                    <option value="wechat">微信</option>
                    <option value="alipay">支付宝</option>
                    <option value="card">疗程卡</option>
                    <option value="transfer">转账</option>
                    <option value="other">其他</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* 交易流水表格 */}
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <div className="max-h-[560px] overflow-y-auto">
                <table className="w-full min-w-[1400px]">
                  <thead className="sticky top-0 bg-cream-50 z-10 border-b border-cream-200">
                    <tr>
                      {['交易时间', '订单号', '客户', '类型', '项目内容', '技师', '原价', '优惠', '实付金额', '支付方式', '操作'].map((h, i) => (
                        <th key={h} className={cn(
                          'px-4 py-3.5 text-xs font-semibold text-ink-500 whitespace-nowrap',
                          i === 0 ? 'text-left' : 'text-center'
                        )}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-4 py-16 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-16 h-16 rounded-full bg-cream-100 flex items-center justify-center">
                              <FileText className="w-8 h-8 text-ink-300" />
                            </div>
                            <p className="text-ink-400">暂无交易记录</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedTransactions.map((tx, idx) => {
                        const cust = getCustomer(tx.customerId);
                        const origPrice = getOriginalPrice(tx);
                        const isRefund = tx.type === 'refund';
                        const apt = tx.appointmentId ? getAppointment(tx.appointmentId) : null;
                        const tech = apt ? getTechnician(apt.technicianId) : null;
                        const isExpanded = expandedId === tx.id;
                        return (
                          <>
                            <tr
                              key={tx.id}
                              onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                              className={cn(
                                'border-b border-cream-100 cursor-pointer transition-colors',
                                idx % 2 === 1 ? 'bg-cream-50/50' : 'bg-white',
                                'hover:bg-cream-100/60'
                              )}
                            >
                              <td className="px-4 py-3.5">
                                <div className="text-sm text-ink-700 font-medium">{format(parseISO(tx.createdAt), 'yyyy-MM-dd')}</div>
                                <div className="text-xs text-ink-400 mt-0.5">{format(parseISO(tx.createdAt), 'HH:mm:ss')}</div>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <button
                                  onClick={e => { e.stopPropagation(); handleCopy(tx.id, tx.id); }}
                                  className="inline-flex items-center gap-1 font-mono text-xs text-ink-600 hover:text-sandalwood-600 bg-cream-100 px-2 py-1 rounded"
                                >
                                  <span className="max-w-[100px] truncate">{tx.id}</span>
                                  {copiedId === tx.id ? <Check className="w-3 h-3 text-jade-600" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sandalwood-200 to-sandalwood-400 flex items-center justify-center shrink-0">
                                    <span className="text-sm font-semibold text-white">
                                      {cust?.name?.[0] || '?'}
                                    </span>
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-sm font-medium text-ink-700 truncate">{cust?.name || '未知客户'}</div>
                                    <div className="text-xs text-ink-400">{cust?.phone || '-'}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <span className={TYPE_META[tx.type].cls}>{TYPE_META[tx.type].label}</span>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="text-sm text-ink-700 max-w-[180px] truncate">{getProjectContent(tx)}</div>
                              </td>
                              <td className="px-4 py-3.5 text-center text-sm text-ink-600">
                                {tech?.name || '-'}
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                {origPrice ? (
                                  <span className="text-sm text-ink-400 line-through">¥{origPrice.toLocaleString()}</span>
                                ) : (
                                  <span className="text-ink-300">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                {tx.cardDeduction ? (
                                  <span className="text-sm text-red-500 font-medium">-¥{tx.cardDeduction.toLocaleString()}</span>
                                ) : (
                                  <span className="text-ink-300">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <span className={cn(
                                  'text-base font-bold',
                                  isRefund ? 'text-red-500' : 'text-sandalwood-500'
                                )}>
                                  {isRefund ? '-' : ''}¥{tx.amount.toLocaleString()}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <span className={cn('inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full',
                                  PAYMENT_META[tx.paymentMethod].bg, PAYMENT_META[tx.paymentMethod].color)}>
                                  <span>{PAYMENT_META[tx.paymentMethod].icon}</span>
                                  {PAYMENT_META[tx.paymentMethod].label}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                                  <button
                                    onClick={() => setDetailModal(tx)}
                                    className="p-2 rounded-lg hover:bg-sandalwood-50 text-sandalwood-600 transition-colors"
                                    title="详情"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    className="p-2 rounded-lg hover:bg-jade-50 text-jade-600 transition-colors"
                                    title="打印"
                                    onClick={() => alert('打印功能演示')}
                                  >
                                    <Printer className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-cream-50/80 border-b border-cream-200">
                                <td colSpan={11} className="px-6 py-5">
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <span className="text-ink-400">关联预约：</span>
                                      <span className="text-ink-700 ml-1">{apt ? `${format(parseISO(apt.date), 'MM-dd')} ${apt.startTime}-${apt.endTime}` : '无'}</span>
                                    </div>
                                    <div>
                                      <span className="text-ink-400">关联会员卡：</span>
                                      <span className="text-ink-700 ml-1">
                                        {tx.membershipCardId ? getMembershipCard(tx.membershipCardId)?.name || '已删除' : '无'}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-ink-400">卡内抵扣：</span>
                                      <span className="text-red-500 ml-1">{tx.cardDeduction ? `¥${tx.cardDeduction}` : '无'}</span>
                                    </div>
                                    <div className="lg:col-span-1 md:col-span-2 col-span-1">
                                      <span className="text-ink-400">备注：</span>
                                      <span className="text-ink-700 ml-1">{tx.remark || '-'}</span>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 分页 */}
            <div className="border-t border-cream-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-sm text-ink-500">
                共 <span className="font-semibold text-ink-700">{filteredTransactions.length}</span> 条 / 每页 {pageSize} 条
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg hover:bg-cream-100 text-ink-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 7) pageNum = i + 1;
                  else if (page <= 4) pageNum = i + 1;
                  else if (page >= totalPages - 3) pageNum = totalPages - 6 + i;
                  else pageNum = page - 3 + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={cn(
                        'min-w-[36px] h-9 px-2 rounded-lg text-sm font-medium transition-all',
                        page === pageNum
                          ? 'bg-sandalwood-500 text-white shadow-md'
                          : 'text-ink-600 hover:bg-cream-100'
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg hover:bg-cream-100 text-ink-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Tab 2 - 数据统计 */}
      {activeTab === 'stats' && (
        <>
          {/* 核心指标卡片 */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: '总营收', value: `¥${coreMetrics.totalRevenue.toLocaleString()}`, diff: '+12.5%', icon: Wallet, color: 'from-sandalwood-500 to-sandalwood-700', bg: 'bg-sandalwood-50', iconColor: 'text-sandalwood-600' },
              { label: '总笔数', value: `${coreMetrics.totalCount}笔`, diff: '+8.2%', icon: FileText, color: 'from-jade-500 to-jade-700', bg: 'bg-jade-50', iconColor: 'text-jade-600' },
              { label: '客单价', value: `¥${Math.round(coreMetrics.avgPrice).toLocaleString()}`, diff: '+3.1%', icon: TrendingUp, color: 'from-gold-500 to-gold-700', bg: 'bg-gold-50', iconColor: 'text-gold-600' },
              { label: '项目数量', value: `${coreMetrics.consumeCount}次`, diff: '+6.8%', icon: MapPin, color: 'from-jade-500 to-jade-700', bg: 'bg-jade-50', iconColor: 'text-jade-600' },
              { label: '客户总数', value: `${coreMetrics.uniqueCustomers}人`, diff: '+15.3%', icon: Users, color: 'from-sandalwood-500 to-sandalwood-700', bg: 'bg-sandalwood-50', iconColor: 'text-sandalwood-600' },
              { label: '平均服务时长', value: `${Math.round(coreMetrics.avgDuration)}分钟`, diff: '-2.1%', icon: Clock, color: 'from-gold-500 to-gold-700', bg: 'bg-gold-50', iconColor: 'text-gold-600' },
            ].map((m, i) => {
              const Icon = m.icon;
              const isUp = m.diff.startsWith('+');
              return (
                <div key={i} className="bg-white rounded-2xl p-5 shadow-card">
                  <div className="flex items-start justify-between">
                    <div className={cn('w-10 h-10 rounded-xl', m.bg, 'flex items-center justify-center')}>
                      <Icon className={cn('w-5 h-5', m.iconColor)} />
                    </div>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                      isUp ? 'bg-jade-100 text-jade-700' : 'bg-red-100 text-red-700')}>
                      {isUp ? '↑' : '↓'} {m.diff.slice(1)}
                    </span>
                  </div>
                  <p className="mt-4 text-xs text-ink-400">{m.label}</p>
                  <p className={cn('text-2xl font-bold mt-1 bg-gradient-to-r bg-clip-text text-transparent', m.color)}>
                    {m.value}
                  </p>
                  <p className="text-xs text-ink-400 mt-1">环比上期</p>
                </div>
              );
            })}
          </div>

          {/* 营收趋势图 */}
          <div className="bg-white rounded-2xl p-6 shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <h3 className="text-lg font-serif font-semibold text-ink-700">营收趋势</h3>
              <div className="flex bg-cream-100 rounded-lg p-1">
                {(['day', 'week', 'month'] as const).map(g => (
                  <button
                    key={g}
                    onClick={() => setTrendGranularity(g)}
                    className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                      trendGranularity === g
                        ? 'bg-white text-sandalwood-700 shadow-sm'
                        : 'text-ink-500 hover:text-ink-700')}
                  >
                    {g === 'day' ? '日' : g === 'week' ? '周' : '月'}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFE4D7" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#8D887F' }} axisLine={{ stroke: '#EFE4D7' }} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#8D887F' }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `¥${v >= 1000 ? `${v / 1000}k` : v}`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#8D887F' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #EFE4D7',
                      borderRadius: '12px',
                      boxShadow: '0 4px 16px rgba(107, 68, 35, 0.1)',
                      fontSize: 13,
                    }}
                    formatter={(value: any, name: string) => [
                      name === 'revenue' ? `¥${Number(value).toLocaleString()}` : `${value}笔`,
                      name === 'revenue' ? '营收额' : '订单数'
                    ]}
                  />
                  <Legend formatter={(v) => v === 'revenue' ? '营收额' : '订单数'} />
                  <ReferenceLine yAxisId="left" y={trendData.reduce((s, d) => s + d.revenue, 0) / Math.max(trendData.length, 1)} stroke="#BA8551" strokeDasharray="5 5" label={{ value: '平均', fill: '#BA8551', fontSize: 11 }} />
                  <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#6B4423" strokeWidth={2.5}
                    dot={{ fill: '#6B4423', r: 3, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, fill: '#6B4423', stroke: '#fff', strokeWidth: 2 }} />
                  <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#5B8C5A" strokeWidth={2.5}
                    dot={{ fill: '#5B8C5A', r: 3, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, fill: '#5B8C5A', stroke: '#fff', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 项目销量 + 支付方式 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-6 shadow-card">
              <h3 className="text-lg font-serif font-semibold text-ink-700 mb-4">项目销量 TOP 10</h3>
              <div className="h-80">
                {projectSales.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2 text-ink-400">
                    <BarChart3 className="w-10 h-10 text-ink-200" />
                    <p className="text-sm">暂无项目销售数据</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectSales} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EFE4D7" horizontal={true} vertical={false} />
                      <XAxis type="number" tick={{ fontSize: 12, fill: '#8D887F' }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: '#676258' }} axisLine={false} tickLine={false} width={80} />
                      <Tooltip
                        cursor={{ fill: '#FAF7F2' }}
                        contentStyle={{ backgroundColor: 'white', border: '1px solid #EFE4D7', borderRadius: '12px', fontSize: 13 }}
                        formatter={(v: any) => [`${v}次`, '销量']}
                      />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                        {projectSales.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={index === 0 ? '#BA8551' : index === 1 ? '#C9A961' : index === 2 ? '#99BE99' : '#DDEADD'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-card">
              <h3 className="text-lg font-serif font-semibold text-ink-700 mb-4">支付方式分布</h3>
              <div className="h-80">
                {paymentPieData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2 text-ink-400">
                    <CreditCard className="w-10 h-10 text-ink-200" />
                    <p className="text-sm">暂无支付数据</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentPieData}
                        cx="40%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={{ stroke: '#DEC5AC', strokeWidth: 1 }}
                      >
                        {paymentPieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: 'white', border: '1px solid #EFE4D7', borderRadius: '12px', fontSize: 13 }}
                        formatter={(v: any) => [`¥${Number(v).toLocaleString()}`, '金额']}
                      />
                      <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle"
                        formatter={(v) => <span className="text-sm text-ink-600">{v}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* 技师业绩 + 客户消费榜 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-6 shadow-card">
              <div className="flex items-center gap-2 mb-5">
                <Trophy className="w-5 h-5 text-gold-600" />
                <h3 className="text-lg font-serif font-semibold text-ink-700">技师业绩排行</h3>
              </div>
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full min-w-[420px]">
                  <thead className="bg-cream-50 sticky top-0">
                    <tr>
                      {['排名', '技师', '服务次数', '服务金额', '客单价'].map(h => (
                        <th key={h} className="px-4 py-3 text-xs font-semibold text-ink-500 text-left whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {technicianRanking.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-ink-400 text-sm">暂无业绩数据</td>
                      </tr>
                    ) : (
                      technicianRanking.map((t, i) => (
                        <tr key={t.name} className="border-b border-cream-100 last:border-0 hover:bg-cream-50/50 transition-colors">
                          <td className="px-4 py-3.5">
                            {i < 3 ? (
                              <div className={cn(
                                'w-7 h-7 rounded-full flex items-center justify-center',
                                i === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-500' :
                                  i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                                    'bg-gradient-to-br from-amber-600 to-amber-800'
                              )}>
                                <Award className="w-4 h-4 text-white" />
                              </div>
                            ) : (
                              <span className="w-7 h-7 inline-flex items-center justify-center rounded-full bg-cream-100 text-sm font-medium text-ink-500">{i + 1}</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sandalwood-200 to-sandalwood-400 flex items-center justify-center">
                                <span className="text-xs font-semibold text-white">{t.name[0]}</span>
                              </div>
                              <span className="text-sm font-medium text-ink-700">{t.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-ink-600">{t.count}次</td>
                          <td className="px-4 py-3.5 text-sm font-semibold text-sandalwood-600">¥{t.amount.toLocaleString()}</td>
                          <td className="px-4 py-3.5 text-sm text-ink-600">¥{Math.round(t.avgPrice).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-card">
              <div className="flex items-center gap-2 mb-5">
                <Crown className="w-5 h-5 text-gold-600" />
                <h3 className="text-lg font-serif font-semibold text-ink-700">客户消费榜</h3>
              </div>
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full min-w-[460px]">
                  <thead className="bg-cream-50 sticky top-0">
                    <tr>
                      {['排名', '客户', '消费次数', '消费金额', '最近消费'].map(h => (
                        <th key={h} className="px-4 py-3 text-xs font-semibold text-ink-500 text-left whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {customerRanking.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-ink-400 text-sm">暂无消费数据</td>
                      </tr>
                    ) : (
                      customerRanking.slice(0, 10).map((c, i) => (
                        <tr key={c.name + c.phone} className="border-b border-cream-100 last:border-0 hover:bg-cream-50/50 transition-colors">
                          <td className="px-4 py-3.5">
                            {i < 3 ? (
                              <div className={cn(
                                'w-7 h-7 rounded-full flex items-center justify-center',
                                i === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-500' :
                                  i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                                    'bg-gradient-to-br from-amber-600 to-amber-800'
                              )}>
                                <Crown className="w-3.5 h-3.5 text-white" />
                              </div>
                            ) : (
                              <span className="w-7 h-7 inline-flex items-center justify-center rounded-full bg-cream-100 text-sm font-medium text-ink-500">{i + 1}</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-jade-200 to-jade-400 flex items-center justify-center">
                                <User className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-ink-700">{c.name}</div>
                                <div className="text-xs text-ink-400">{c.phone}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-ink-600">{c.count}次</td>
                          <td className="px-4 py-3.5 text-sm font-semibold text-sandalwood-600">¥{c.amount.toLocaleString()}</td>
                          <td className="px-4 py-3.5 text-sm text-ink-500">
                            {c.lastTx ? format(c.lastTx, 'MM-dd HH:mm') : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 交易详情 Modal */}
      {detailModal && (() => {
        const tx = detailModal;
        const cust = getCustomer(tx.customerId);
        const apt = tx.appointmentId ? getAppointment(tx.appointmentId) : null;
        const tech = apt ? getTechnician(apt.technicianId) : null;
        const proj = apt ? getProject(apt.projectId) : null;
        const mc = tx.membershipCardId ? getMembershipCard(tx.membershipCardId) : null;
        const origPrice = getOriginalPrice(tx);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-700/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-modal w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-7 py-5 border-b border-cream-200 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-xl font-serif font-bold text-ink-700">交易详情</h3>
                    <span className={cn(
                      'tag',
                      tx.type === 'refund' ? 'bg-red-100 text-red-700' : 'bg-jade-100 text-jade-700'
                    )}>
                      {tx.type === 'refund' ? '已退款' : '已完成'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="font-mono text-sm text-ink-500">{tx.id}</span>
                    <button onClick={() => handleCopy('modal-' + tx.id, tx.id)} className="text-ink-400 hover:text-sandalwood-500">
                      {copiedId === 'modal-' + tx.id ? <Check className="w-4 h-4 text-jade-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button onClick={() => setDetailModal(null)} className="p-2 rounded-lg hover:bg-cream-100 text-ink-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto px-7 py-6 space-y-6">
                <div className="bg-gradient-to-r from-sandalwood-50 to-cream-100 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-4 h-4 text-sandalwood-600" />
                    <span className="text-sm font-semibold text-sandalwood-700">客户信息</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sandalwood-300 to-sandalwood-500 flex items-center justify-center shrink-0">
                      <span className="text-lg font-bold text-white">{cust?.name?.[0] || '?'}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-ink-700">{cust?.name || '未知客户'}</p>
                      <p className="text-sm text-ink-500 mt-0.5">📞 {cust?.phone || '-'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-sandalwood-600" />
                    <span className="text-sm font-semibold text-sandalwood-700">项目明细</span>
                  </div>
                  <div className="border border-cream-200 rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-cream-50">
                        <tr>
                          {['项目名称', '单价', '数量', '小计'].map(h => (
                            <th key={h} className="px-4 py-3 text-xs font-semibold text-ink-500 text-left">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {proj ? (
                          <tr className="border-t border-cream-100">
                            <td className="px-4 py-3.5 text-sm text-ink-700">{proj.name}</td>
                            <td className="px-4 py-3.5 text-sm text-ink-600">¥{proj.price.toLocaleString()}</td>
                            <td className="px-4 py-3.5 text-sm text-ink-600">x1</td>
                            <td className="px-4 py-3.5 text-sm font-medium text-ink-700">¥{proj.price.toLocaleString()}</td>
                          </tr>
                        ) : mc ? (
                          <tr className="border-t border-cream-100">
                            <td className="px-4 py-3.5 text-sm text-ink-700">
                              <span className="inline-flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-gold-600" />
                                {tx.type === 'recharge' ? '充值-' : '消费-'} {mc.name}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-sm text-ink-600">¥{tx.amount.toLocaleString()}</td>
                            <td className="px-4 py-3.5 text-sm text-ink-600">x1</td>
                            <td className="px-4 py-3.5 text-sm font-medium text-ink-700">¥{tx.amount.toLocaleString()}</td>
                          </tr>
                        ) : (
                          <tr className="border-t border-cream-100">
                            <td className="px-4 py-3.5 text-sm text-ink-700">{tx.remark || TYPE_META[tx.type].label}</td>
                            <td className="px-4 py-3.5 text-sm text-ink-600">¥{tx.amount.toLocaleString()}</td>
                            <td className="px-4 py-3.5 text-sm text-ink-600">x1</td>
                            <td className="px-4 py-3.5 text-sm font-medium text-ink-700">¥{tx.amount.toLocaleString()}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-cream-50 rounded-2xl p-5 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-ink-500">原价合计</span>
                    <span className={cn(origPrice ? 'text-ink-400 line-through' : 'text-ink-700')}>
                      ¥{(origPrice || tx.amount).toLocaleString()}
                    </span>
                  </div>
                  {tx.cardDeduction && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-ink-500">优惠合计</span>
                      <span className="text-red-500 font-medium">-¥{tx.cardDeduction.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="h-px bg-cream-200 my-2"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-ink-700">实付金额</span>
                    <span className={cn('text-2xl font-bold', tx.type === 'refund' ? 'text-red-500' : 'text-sandalwood-500')}>
                      {tx.type === 'refund' ? '-' : ''}¥{tx.amount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-cream-50 rounded-xl p-4">
                    <p className="text-xs text-ink-400 mb-2">支付方式</p>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{PAYMENT_META[tx.paymentMethod].icon}</span>
                      <span className="text-sm font-medium text-ink-700">{PAYMENT_META[tx.paymentMethod].label}</span>
                    </div>
                  </div>
                  <div className="bg-cream-50 rounded-xl p-4">
                    <p className="text-xs text-ink-400 mb-2">支付时间</p>
                    <p className="text-sm font-medium text-ink-700">{format(parseISO(tx.createdAt), 'yyyy-MM-dd HH:mm:ss')}</p>
                  </div>
                  <div className="bg-cream-50 rounded-xl p-4">
                    <p className="text-xs text-ink-400 mb-2">服务技师</p>
                    <p className="text-sm font-medium text-ink-700">
                      {tech ? `${tech.name}${tech.position ? `（${tech.position}）` : ''}` : '-'}
                    </p>
                  </div>
                  <div className="bg-cream-50 rounded-xl p-4">
                    <p className="text-xs text-ink-400 mb-2">关联会员卡</p>
                    <p className="text-sm font-medium text-gold-700">
                      {mc ? mc.name : '无'}
                    </p>
                  </div>
                </div>

                {tx.remark && (
                  <div className="bg-cream-50 rounded-xl p-4">
                    <p className="text-xs text-ink-400 mb-2">备注信息</p>
                    <p className="text-sm text-ink-700">{tx.remark}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-cream-200 px-7 py-5 flex flex-col sm:flex-row sm:justify-end gap-3 bg-cream-50/50">
                {tx.type !== 'refund' && (
                  <button
                    className="btn-outline flex items-center justify-center gap-2"
                    onClick={() => alert('退款功能演示')}
                  >
                    <X className="w-4 h-4" />
                    <span>退款操作</span>
                  </button>
                )}
                <button
                  className="btn-primary flex items-center justify-center gap-2"
                  onClick={() => alert('打印小票功能演示')}
                >
                  <Printer className="w-4 h-4" />
                  <span>打印小票</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}