import { Users, Package, Truck, FileText, Banknote, Percent } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
    Area, AreaChart, BarChart, Bar, PieChart, Pie, Cell,
    ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

/* ---------------- dummy data (replace with real props/API data) ---------------- */

type Stats = {
    totalParties: number;
    totalProducts: number;
    totalChallans: number;
    deliveredChallans: number;
    totalInvoices: number;
    totalRevenue: number;
    totalPaid: number;
    totalDue: number;
};

const defaultStats: Stats = {
    totalParties: 128,
    totalProducts: 46,
    totalChallans: 342,
    deliveredChallans: 298,
    totalInvoices: 289,
    totalRevenue: 1845000,
    totalPaid: 1510000,
    totalDue: 335000,
};

const monthly = [
    { month: 'জান', challans: 38, invoices: 30, revenue: 220000 },
    { month: 'ফেব্রু', challans: 45, invoices: 40, revenue: 260000 },
    { month: 'মার্চ', challans: 52, invoices: 47, revenue: 310000 },
    { month: 'এপ্রিল', challans: 61, invoices: 55, revenue: 340000 },
    { month: 'মে', challans: 58, invoices: 52, revenue: 330000 },
    { month: 'জুন', challans: 88, invoices: 65, revenue: 385000 },
];

const challanStatus = [
    { name: 'ডেলিভার্ড', value: 298, color: '#0ca30c' },
    { name: 'প্রেরিত', value: 58, color: '#fab219' },
    { name: 'পেন্ডিং', value: 34, color: '#378ADD' },
    { name: 'বাতিল', value: 12, color: '#d03b3b' },
];

const invoiceStatus = [
    { name: 'পরিশোধিত', value: 190, color: '#0ca30c' },
    { name: 'আংশিক', value: 38, color: '#fab219' },
    { name: 'অপরিশোধিত', value: 45, color: '#378ADD' },
    { name: 'মেয়াদোত্তীর্ণ', value: 16, color: '#d03b3b' },
];

type ChallanRow = {
    id: string;
    party: string;
    status: string;
    tone: 'good' | 'warn' | 'info';
};

type InvoiceRow = {
    id: string;
    amount: number;
    status: string;
    tone: 'good' | 'warn' | 'bad';
};

const recentChallans: ChallanRow[] = [
    { id: 'CH-1042', party: 'রহমান ট্রেডার্স', status: 'ডেলিভার্ড', tone: 'good' },
    { id: 'CH-1041', party: 'নবীন এন্টারপ্রাইজ', status: 'প্রেরিত', tone: 'warn' },
    { id: 'CH-1040', party: 'সোনার বাংলা স্টোর', status: 'পেন্ডিং', tone: 'info' },
    { id: 'CH-1039', party: 'মেঘনা ডিস্ট্রিবিউশন', status: 'ডেলিভার্ড', tone: 'good' },
];

const recentInvoices: InvoiceRow[] = [
    { id: 'INV-0812', amount: 42000, status: 'পরিশোধিত', tone: 'good' },
    { id: 'INV-0811', amount: 28500, status: 'আংশিক', tone: 'warn' },
    { id: 'INV-0810', amount: 61200, status: 'মেয়াদোত্তীর্ণ', tone: 'bad' },
    { id: 'INV-0809', amount: 35000, status: 'পরিশোধিত', tone: 'good' },
];

/* ---------------- helpers ---------------- */

const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');

type Tone = 'good' | 'warn' | 'info' | 'bad';

const toneClasses: Record<Tone, string> = {
    good: 'bg-[#EAF3DE] text-[#173404]',
    warn: 'bg-[#FAEEDA] text-[#412402]',
    info: 'bg-[#E6F1FB] text-[#042C53]',
    bad: 'bg-[#FCEBEB] text-[#501313]',
};

function StatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string | number }) {
    return (
        <div className="rounded-xl bg-[#F6F5F1] p-4">
            <div className="flex items-center gap-1.5 text-[13px] text-[#68675F]">
                <Icon className="size-4" />
                <span>{label}</span>
            </div>
            <p className="mt-1 text-2xl font-semibold text-[#1F1E1B]">{value}</p>
        </div>
    );
}

function Legend({ items }: { items: Array<{ name: string; value: number; color: string }> }) {
    return (
        <div className="flex flex-col gap-1.5 text-xs">
            {items.map((it) => (
                <div key={it.name} className="flex items-center gap-2">
                    <span className="size-2.5 rounded-sm" style={{ background: it.color }} />
                    <span className="text-[#4B4A44]">{it.name}</span>
                    <span className="font-semibold text-[#1F1E1B]">{it.value}</span>
                </div>
            ))}
        </div>
    );
}

/* ---------------- main component ---------------- */

export default function DashboardDemo({ stats = defaultStats }: { stats?: Stats }) {
    const collectionRate = Math.round((stats.totalPaid / stats.totalRevenue) * 100);

    return (
        <div className="w-full space-y-6 bg-white p-5 md:p-7">
            {/* KPI row */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
                <StatCard icon={Users} label="পার্টি" value={stats.totalParties} />
                <StatCard icon={Package} label="পণ্য" value={stats.totalProducts} />
                <StatCard icon={Truck} label="চালান" value={stats.totalChallans} />
                <StatCard icon={FileText} label="ইনভয়েস" value={stats.totalInvoices} />
                <StatCard icon={Banknote} label="মোট আয়" value={'৳' + fmt(stats.totalRevenue)} />
                <StatCard icon={Banknote} label="পরিশোধিত" value={'৳' + fmt(stats.totalPaid)} />
                <StatCard icon={Banknote} label="বাকি" value={'৳' + fmt(stats.totalDue)} />
            </div>

            {/* revenue + collection */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-xl bg-[#F6F5F1] p-4">
                    <div className="mb-1 flex items-center gap-1.5 text-[13px] text-[#68675F]">
                        <Banknote className="size-4" />
                        <span>মোট আয়</span>
                    </div>
                    <p className="text-[26px] font-semibold text-[#1F1E1B]">৳{fmt(stats.totalRevenue)}</p>
                    <div className="mt-1.5 flex gap-4 text-xs">
                        <span className="text-[#3B6D11]">পরিশোধিত ৳{fmt(stats.totalPaid)}</span>
                        <span className="text-[#993C1D]">বাকি ৳{fmt(stats.totalDue)}</span>
                    </div>
                </div>
                <div className="rounded-xl bg-[#F6F5F1] p-4">
                    <div className="mb-2 flex items-center gap-1.5 text-[13px] text-[#68675F]">
                        <Percent className="size-4" />
                        <span>কালেকশন রেট</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <p className="text-[26px] font-semibold text-[#1F1E1B]">{collectionRate}%</p>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#EAF3DE]">
                            <div className="h-full rounded-full bg-[#0ca30c]" style={{ width: `${collectionRate}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* revenue trend */}
            <div>
                <p className="mb-2 text-sm font-medium text-[#1F1E1B]">মাসিক আয়ের ধারা</p>
                <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthly} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                            <CartesianGrid vertical={false} stroke="#e1e0d9" />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#68675F' }} axisLine={false} tickLine={false} />
                            <YAxis
                                tick={{ fontSize: 11, fill: '#68675F' }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(v) => `${(v / 100000).toFixed(1)}L`}
                            />
                            <Tooltip formatter={(v) => [`৳${fmt(Number(v))}`, 'আয়']} />
                            <defs>
                                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#2a78d6" stopOpacity={0.18} />
                                    <stop offset="100%" stopColor="#2a78d6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="revenue" stroke="#2a78d6" strokeWidth={2} fill="url(#revFill)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* challans vs invoices */}
            <div>
                <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-[#1F1E1B]">চালান বনাম ইনভয়েস (মাসিক)</p>
                    <div className="flex gap-4 text-xs text-[#68675F]">
                        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[#2a78d6]" />চালান</span>
                        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[#eb6834]" />ইনভয়েস</span>
                    </div>
                </div>
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthly} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barGap={4}>
                            <CartesianGrid vertical={false} stroke="#e1e0d9" />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#68675F' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#68675F' }} axisLine={false} tickLine={false} />
                            <Tooltip />
                            <Bar dataKey="challans" fill="#2a78d6" radius={[4, 4, 0, 0]} maxBarSize={16} />
                            <Bar dataKey="invoices" fill="#eb6834" radius={[4, 4, 0, 0]} maxBarSize={16} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* status donuts */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                    <p className="mb-2 text-sm font-medium text-[#1F1E1B]">চালানের অবস্থা</p>
                    <div className="flex items-center gap-4">
                        <div className="h-[120px] w-[120px] shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={challanStatus} dataKey="value" innerRadius={38} outerRadius={58} paddingAngle={2}>
                                        {challanStatus.map((s) => (
                                            <Cell key={s.name} fill={s.color} stroke="#fff" strokeWidth={2} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <Legend items={challanStatus} />
                    </div>
                </div>
                <div>
                    <p className="mb-2 text-sm font-medium text-[#1F1E1B]">ইনভয়েসের অবস্থা</p>
                    <div className="flex items-center gap-4">
                        <div className="h-[120px] w-[120px] shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={invoiceStatus} dataKey="value" innerRadius={38} outerRadius={58} paddingAngle={2}>
                                        {invoiceStatus.map((s) => (
                                            <Cell key={s.name} fill={s.color} stroke="#fff" strokeWidth={2} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <Legend items={invoiceStatus} />
                    </div>
                </div>
            </div>

            {/* recent activity */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-[#F6F5F1] p-4">
                    <p className="mb-3 text-sm font-medium text-[#1F1E1B]">সাম্প্রতিক চালান</p>
                    <div className="space-y-2.5">
                        {recentChallans.map((c) => (
                            <div key={c.id} className="flex items-center justify-between text-xs">
                                <span className="font-mono">{c.id}</span>
                                <span className="text-[#68675F]">{c.party}</span>
                                <span className={`rounded px-2 py-0.5 font-medium ${toneClasses[c.tone]}`}>{c.status}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="rounded-xl bg-[#F6F5F1] p-4">
                    <p className="mb-3 text-sm font-medium text-[#1F1E1B]">সাম্প্রতিক ইনভয়েস</p>
                    <div className="space-y-2.5">
                        {recentInvoices.map((inv) => (
                            <div key={inv.id} className="flex items-center justify-between text-xs">
                                <span className="font-mono">{inv.id}</span>
                                <span>৳{fmt(inv.amount)}</span>
                                <span className={`rounded px-2 py-0.5 font-medium ${toneClasses[inv.tone]}`}>{inv.status}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}