import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  CalendarClock,
  CalendarDays,
  CreditCard,
  ReceiptText,
  Leaf,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const menuItems = [
  { icon: LayoutDashboard, label: '首页仪表盘', path: '/' },
  { icon: ClipboardList, label: '项目管理', path: '/projects' },
  { icon: CalendarClock, label: '技师排班', path: '/schedule' },
  { icon: CalendarDays, label: '顾客预约', path: '/appointments' },
  { icon: CreditCard, label: '疗程卡管理', path: '/memberships' },
  { icon: ReceiptText, label: '消费记录', path: '/transactions' },
];

export default function Sidebar() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <aside className="w-[240px] h-screen bg-sandalwood-700 text-cream-100 flex flex-col fixed left-0 top-0 z-40">
      <div className="h-20 flex items-center gap-3 px-6 border-b border-sandalwood-600">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-lg">
          <Leaf className="w-6 h-6 text-sandalwood-700" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col">
          <h1 className="text-lg font-serif font-bold text-gold-300 leading-tight">悦心堂</h1>
          <p className="text-xs text-sandalwood-300">理疗管理系统</p>
        </div>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-3">
          {menuItems.map(({ icon: Icon, label, path }) => (
            <li key={path}>
              <NavLink
                to={path}
                end={path === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200 relative',
                    'hover:bg-sandalwood-600 hover:text-gold-300',
                    isActive
                      ? 'text-gold-500 bg-sandalwood-600/50 font-medium'
                      : 'text-cream-100/85'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gold-500 transition-opacity duration-200',
                        isActive ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <Icon className="w-5 h-5 shrink-0" strokeWidth={2} />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="px-6 py-4 border-t border-sandalwood-600 bg-sandalwood-800/30">
        <div className="text-center">
          <p className="text-gold-400 font-serif font-medium text-lg">
            {format(now, 'yyyy年MM月dd日')}
          </p>
          <p className="text-sandalwood-300 text-sm mt-1 font-mono">
            {format(now, 'EEEE HH:mm:ss')}
          </p>
        </div>
      </div>
    </aside>
  );
}
