export default function Dashboard() {
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-ink-700">欢迎回来</h2>
          <p className="text-ink-500 mt-1">这是今日的运营概览</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: '今日预约', value: '12', color: 'from-sandalwood-500 to-sandalwood-700' },
          { label: '在店顾客', value: '5', color: 'from-jade-500 to-jade-700' },
          { label: '今日营业额', value: '¥3,680', color: 'from-gold-500 to-gold-700' },
          { label: '活跃技师', value: '8', color: 'from-ink-500 to-ink-700' },
        ].map((item, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-shadow"
          >
            <p className="text-sm text-ink-500">{item.label}</p>
            <p className={`text-3xl font-bold mt-2 bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-card">
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto rounded-full bg-cream-100 flex items-center justify-center mb-4">
            <span className="text-4xl">📊</span>
          </div>
          <h3 className="text-xl font-serif font-semibold text-ink-700">数据面板开发中</h3>
          <p className="text-ink-500 mt-2">图表和统计数据将在此处展示</p>
        </div>
      </div>
    </div>
  );
}
