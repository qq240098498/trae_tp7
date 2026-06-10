import { useLocation } from 'react-router-dom';
import { Search, Bell, ChevronRight, User } from 'lucide-react';

const routeTitles: Record<string, string> = {
  '/': '首页仪表盘',
  '/projects': '项目管理',
  '/schedule': '技师排班',
  '/appointments': '顾客预约',
  '/memberships': '疗程卡管理',
  '/transactions': '消费记录',
};

export default function Header() {
  const location = useLocation();
  const title = routeTitles[location.pathname] || '页面';

  return (
    <header className="h-20 bg-white border-b border-cream-200 flex items-center justify-between px-8 sticky top-0 z-30">
      <div className="flex items-center gap-2 text-ink-500">
        <span className="text-sandalwood-400 text-sm">悦心堂</span>
        <ChevronRight className="w-4 h-4 text-cream-400" />
        <h1 className="text-xl font-serif font-semibold text-ink-600">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <input
            type="text"
            placeholder="搜索..."
            className="w-64 h-10 pl-10 pr-4 rounded-lg bg-cream-50 border border-cream-200 text-sm text-ink-600 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400 transition-all"
          />
        </div>

        <button className="w-10 h-10 rounded-lg bg-cream-50 border border-cream-200 flex items-center justify-center text-ink-500 hover:bg-cream-100 hover:text-sandalwood-500 transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
            3
          </span>
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-cream-200">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sandalwood-500 to-sandalwood-700 flex items-center justify-center shadow-md">
            <User className="w-5 h-5 text-gold-200" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-ink-600">管理员</span>
            <span className="text-xs text-ink-400">超级管理员</span>
          </div>
        </div>
      </div>
    </header>
  );
}
