import { Link } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import { LayoutGrid, Users, ShoppingCart, FileText, CreditCard, BarChart3, Truck, Shield, Lock, UserCog, ShieldCheck, Inbox, Bell, Trash2 } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { edit as editSecurity } from '@/routes/security';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'ড্যাশবোর্ড',
        href: dashboard(),
        icon: LayoutGrid,
        permission: 'view_dashboard',
    },
    {
        title: 'পার্টি',
        href: '/party',
        icon: Users,
        permission: 'manage_parties',
    },
    {
        title: 'ক্রয় অর্ডার',
        href: '/po',
        icon: ShoppingCart,
        permission: 'manage_products',
    },
    {
        title: 'চালান',
        href: '/chalans',
        icon: Truck,
        permissions: ['manage_challans', 'print_challans'],
    },
    {
        title: 'চালান (Invoice)',
        href: '/invoices',
        icon: FileText,
        permission: 'manage_invoices',
    },
    {
        title: 'পেমেন্ট',
        href: '/payments',
        icon: BarChart3,
        permission: 'manage_payments',
    },
    {
        title: 'রিপোর্ট',
        href: '/report',
        icon: BarChart3,
        children: [
            { title: 'ক্রয় রিপোর্ট', href: '/report/purchase', icon: ShoppingCart },
            { title: 'চালান রিপোর্ট', href: '/report/challan', icon: Truck },
            { title: 'ইনভয়েস রিপোর্ট', href: '/report/invoice', icon: FileText },
            { title: 'পেমেন্ট রিপোর্ট', href: '/report/payment', icon: CreditCard },
        ],
    },
    {
        title: 'নিরাপত্তা',
        href: editSecurity(),
        icon: ShieldCheck,
    },
    {
        title: 'ইমেইল',
        href: '/emails',
        icon: Inbox,
    },
    {
        title: 'নোটিফিকেশন',
        href: '/notifications',
        icon: Bell,
    },
    {
        title: 'ট্র্যাশ',
        href: '/trash',
        icon: Trash2,
    },
];

const adminNavItems: NavItem[] = [
    {
        title: 'ব্যবহারকারী',
        href: '/admin/users',
        icon: UserCog,
    },
    {
        title: 'ভূমিকা',
        href: '/admin/roles',
        icon: Shield,
    },
    {
        title: 'অনুমতি',
        href: '/admin/permissions',
        icon: Lock,
    },
];

const footerNavItems: NavItem[] = [
    // {
    //     title: 'Repository',
    //     href: 'https://github.com/laravel/react-starter-kit',
    //     icon: FolderGit2,
    // },
    // {
    //     title: 'Documentation',
    //     href: 'https://laravel.com/docs/starter-kits#react',
    //     icon: BookOpen,
    // },
];

export function AppSidebar() {
    const userPermissions = usePage().props.permissions ?? [];
    const unreadCount = Number(usePage().props.notification_unread_count ?? 0);
    const isAdmin = userPermissions.includes('manage_users') || userPermissions.includes('manage_roles');

    const visibleMainItems = mainNavItems.map((item) =>
        item.title === 'নোটিফিকেশন' && unreadCount > 0 ? { ...item, badge: unreadCount } : item
    ).filter((item) => {
        if (!item.permission && !item.permissions) {
return true;
}

        const required = item.permissions ?? (item.permission ? [item.permission] : []);

        return required.some((perm) => userPermissions.includes(perm));
    });

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={visibleMainItems} />
                {isAdmin && <NavMain items={adminNavItems} />}
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
