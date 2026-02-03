
import React, { useState, useEffect } from 'react';
import {
    Users,
    ClipboardCheck,
    CheckCircle2,
    Wallet,
    TrendingUp,
    Loader2,
    Filter
} from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { api } from '../services/api';

interface AnalyticsData {
    summary: {
        registrations: number;
        tasksClaimed: number;
        tasksCompleted: number;
        withdrawAmount: number;
    };
    chartData: Array<{
        date: string;
        registrations: number;
        tasksClaimed: number;
        tasksCompleted: number;
        withdrawAmount: number;
    }>;
}

const DashboardAnalytics: React.FC = () => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeMetrics, setActiveMetrics] = useState<string[]>(['registrations', 'tasksCompleted']);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // Assuming api.getAnalytics is implemented in api.ts
                const res = await api.getAnalytics();
                setData(res);
            } catch (err) {
                console.error('Failed to fetch analytics', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="h-96 flex flex-col items-center justify-center text-slate-400 gap-4">
                <Loader2 className="animate-spin" size={40} />
                <p className="font-medium animate-pulse">Loading Analytics Data...</p>
            </div>
        );
    }

    if (!data) return null;

    const cards = [
        {
            label: 'Registrations',
            value: data.summary.registrations,
            icon: Users,
            color: 'blue',
            key: 'registrations'
        },
        {
            label: 'Tasks Claimed',
            value: data.summary.tasksClaimed,
            icon: ClipboardCheck,
            color: 'indigo',
            key: 'tasksClaimed'
        },
        {
            label: 'Tasks Completed',
            value: data.summary.tasksCompleted,
            icon: CheckCircle2,
            color: 'green',
            key: 'tasksCompleted'
        },
        {
            label: 'Withdraw Amount',
            value: `Rp ${data.summary.withdrawAmount.toLocaleString()}`,
            icon: Wallet,
            color: 'orange',
            key: 'withdrawAmount'
        },
    ];

    const getColorClass = (color: string) => {
        switch (color) {
            case 'blue': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'indigo': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
            case 'green': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'orange': return 'bg-orange-50 text-orange-600 border-orange-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    const toggleMetric = (key: string) => {
        if (activeMetrics.includes(key)) {
            if (activeMetrics.length > 1) {
                setActiveMetrics(activeMetrics.filter(m => m !== key));
            }
        } else {
            setActiveMetrics([...activeMetrics, key]);
        }
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card) => (
                    <div
                        key={card.label}
                        className={`p-6 rounded-2xl bg-white border border-slate-200 shadow-sm transition-all hover:shadow-md group`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl border ${getColorClass(card.color)} transition-transform group-hover:scale-110`}>
                                <card.icon size={24} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-1 rounded">Today</span>
                        </div>
                        <h3 className="text-slate-500 text-sm font-medium mb-1">{card.label}</h3>
                        <p className="text-2xl font-bold text-slate-800">{card.value}</p>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <TrendingUp className="text-indigo-600" size={20} />
                            Growth Trends
                        </h3>
                        <p className="text-sm text-slate-500">History of the last 30 days metrics</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {[
                            { key: 'registrations', label: 'Users', color: '#3b82f6' },
                            { key: 'tasksClaimed', label: 'Claimed', color: '#6366f1' },
                            { key: 'tasksCompleted', label: 'Done', color: '#10b981' },
                            { key: 'withdrawAmount', label: 'Withdrawal', color: '#f59e0b' }
                        ].map(m => (
                            <button
                                key={m.key}
                                onClick={() => toggleMetric(m.key)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-2 ${activeMetrics.includes(m.key)
                                        ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-200'
                                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                    }`}
                            >
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <filter id="shadow" height="200%">
                                    <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                                    <feOffset dx="2" dy="2" result="offsetblur" />
                                    <feComponentTransfer>
                                        <feFuncA type="linear" slope="0.5" />
                                    </feComponentTransfer>
                                    <feMerge>
                                        <feMergeNode />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 10 }}
                                dy={10}
                                tickFormatter={(val) => {
                                    const d = new Date(val);
                                    return `${d.getMonth() + 1}/${d.getDate()}`;
                                }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 10 }}
                                dx={-10}
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: '16px',
                                    border: 'none',
                                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                    padding: '12px'
                                }}
                                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                labelStyle={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}
                            />
                            {activeMetrics.includes('registrations') && (
                                <Line
                                    type="monotone"
                                    dataKey="registrations"
                                    stroke="#3b82f6"
                                    strokeWidth={4}
                                    dot={false}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                    name="Users"
                                />
                            )}
                            {activeMetrics.includes('tasksClaimed') && (
                                <Line
                                    type="monotone"
                                    dataKey="tasksClaimed"
                                    stroke="#6366f1"
                                    strokeWidth={4}
                                    dot={false}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                    name="Tasks Claimed"
                                />
                            )}
                            {activeMetrics.includes('tasksCompleted') && (
                                <Line
                                    type="monotone"
                                    dataKey="tasksCompleted"
                                    stroke="#10b981"
                                    strokeWidth={4}
                                    dot={false}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                    name="Tasks Completed"
                                />
                            )}
                            {activeMetrics.includes('withdrawAmount') && (
                                <Line
                                    type="monotone"
                                    dataKey="withdrawAmount"
                                    stroke="#f59e0b"
                                    strokeWidth={4}
                                    dot={false}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                    name="Withdraw Amount"
                                />
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default DashboardAnalytics;
