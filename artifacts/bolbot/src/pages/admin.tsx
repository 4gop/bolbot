import { useState, useEffect } from 'react';
import { useGetAdminStats } from '@workspace/api-client-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, MessageSquare, Activity, Image as ImageIcon, Mic, Type, AlertCircle } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

export default function AdminStatsPage() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (t) setToken(t);
  }, []);

  const { data, isLoading, error } = useGetAdminStats(
    { token: token || '' },
    { query: { enabled: !!token, retry: false } }
  );

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-white/10 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl">
          <AlertCircle size={48} className="text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">Admin token is required to view statistics.</p>
          <div className="bg-secondary p-3 rounded-lg text-sm font-mono break-all text-left">
            /stats?token=YOUR_ADMIN_TOKEN
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-destructive font-bold text-lg bg-destructive/10 p-4 rounded-xl border border-destructive/20">
          Failed to load stats. Check your token.
        </div>
      </div>
    );
  }

  const pieData = [
    { name: 'Voice', value: data.voiceCount, color: '#FF6B35' },
    { name: 'Text', value: data.textCount, color: '#3b82f6' },
    { name: 'Image', value: data.imageCount, color: '#10b981' },
  ];

  const StatCard = ({ title, value, icon: Icon, colorClass }: any) => (
    <div className="bg-card border border-white/5 rounded-2xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-muted-foreground font-medium">{title}</h3>
        <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
          <Icon size={20} className={colorClass.replace('bg-', 'text-')} />
        </div>
      </div>
      <p className="text-3xl font-display font-bold text-white">{formatNumber(value)}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-white">Dashboard</h1>
            <p className="text-muted-foreground mt-1">BolBot System Overview</p>
          </div>
          <div className="bg-primary/10 text-primary px-4 py-2 rounded-full font-bold text-sm border border-primary/20">
            Live
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Users" value={data.totalUsers} icon={Users} colorClass="bg-blue-500" />
          <StatCard title="Active Today" value={data.activeUsersToday} icon={Activity} colorClass="bg-green-500" />
          <StatCard title="Messages Today" value={data.messagesToday} icon={MessageSquare} colorClass="bg-primary" />
          <StatCard title="Total Messages" value={data.totalMessages} icon={MessageSquare} colorClass="bg-purple-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-card border border-white/5 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold mb-6">Daily Activity (Last 14 Days)</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.dailyActivity}>
                  <XAxis dataKey="date" stroke="#666" tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} />
                  <YAxis stroke="#666" />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1f1f1f', border: '1px solid #333', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="count" fill="#FF6B35" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-white/5 rounded-2xl p-6 shadow-lg flex flex-col">
            <h3 className="text-lg font-bold mb-2">Input Types</h3>
            <div className="flex-1 flex items-center justify-center min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: '#1f1f1f', border: 'none', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              {pieData.map(item => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-card border border-white/5 rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-white/5">
            <h3 className="text-lg font-bold">Recent Interactions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/50 text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 font-medium">Time</th>
                  <th className="px-6 py-4 font-medium">Platform</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">User Message</th>
                  <th className="px-6 py-4 font-medium">Bot Response</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.recentInteractions.map((interaction) => (
                  <tr key={interaction.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                      {new Date(interaction.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 bg-white/5 rounded-md text-xs font-medium border border-white/10">
                        {interaction.platform}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-muted-foreground">
                        {interaction.inputType === 'voice' && <Mic size={16} className="text-primary mr-1" />}
                        {interaction.inputType === 'text' && <Type size={16} className="text-blue-400 mr-1" />}
                        {interaction.inputType === 'image' && <ImageIcon size={16} className="text-green-400 mr-1" />}
                        {interaction.inputType}
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-gray-300">
                      {interaction.userMessage || '—'}
                    </td>
                    <td className="px-6 py-4 max-w-sm truncate text-gray-400">
                      {interaction.botResponse}
                    </td>
                  </tr>
                ))}
                {data.recentInteractions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      No recent interactions
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
