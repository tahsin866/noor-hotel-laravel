import { Link } from '@inertiajs/react';
import { LayoutGrid, Users, ShoppingCart, FileText, CreditCard, BarChart3, Truck, Shield, Lock, UserCog, ShieldCheck, Inbox } from 'lucide-react';
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
import { usePage } from '@inertiajs/react';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
        permission: 'view_dashboard',
    },
    {
        title: 'Party',
        href: '/party',
        icon: Users,
        permission: 'manage_parties',
    },
    {
        title: 'Purchase Order',
        href: '/po',
        icon: ShoppingCart,
        permission: 'manage_products',
    },
    {
        title: 'Chalans',
        href: '/chalans',
        icon: Truck,
        permissions: ['manage_challans', 'print_challans'],
    },
    {
        title: 'Invoices',
        href: '/invoices',
        icon: FileText,
        permission: 'manage_invoices',
    },
    {
        title: 'Payments',
        href: '/payments',
        icon: BarChart3,
        permission: 'manage_payments',
    },
    {
        title: 'Report',
        href: '/report',
        icon: BarChart3,
        children: [
            { title: 'Purchase Report', href: '/report/purchase', icon: ShoppingCart },
            { title: 'Challan Report', href: '/report/challan', icon: Truck },
            { title: 'Invoice Report', href: '/report/invoice', icon: FileText },
            { title: 'Payments Report', href: '/report/payment', icon: CreditCard },
        ],
    },
    {
        title: 'Security',
        href: editSecurity(),
        icon: ShieldCheck,
    },
    {
        title: 'Emails',
        href: '/emails',
        icon: Inbox,
    },
];

const adminNavItems: NavItem[] = [
    {
        title: 'Users',
        href: '/admin/users',
        icon: UserCog,
    },
    {
        title: 'Roles',
        href: '/admin/roles',
        icon: Shield,
    },
    {
        title: 'Permissions',
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
    const isAdmin = userPermissions.includes('manage_users') || userPermissions.includes('manage_roles');

    const visibleMainItems = mainNavItems.filter((item) => {
        if (!item.permission && !item.permissions) return true;
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
                <NavMain items={mainNavItems} />
                {isAdmin && <NavMain items={adminNavItems} />}
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
