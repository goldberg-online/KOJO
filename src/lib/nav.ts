import {
  LayoutDashboard,
  Users,
  GraduationCap,
  FileText,
  Wallet,
  ClipboardList,
  BookOpen,
  Bus,
  Receipt,
  Banknote,
  Megaphone,
  ListTodo,
  Shield,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export const ROLE_NAV: Record<string, NavItem[]> = {
  SUPER_ADMIN: [
    { title: "Dashboard", href: "/super-admin", icon: LayoutDashboard },
    { title: "Allocate logins", href: "/super-admin/users", icon: Users },
    { title: "Authorize access", href: "/super-admin/access", icon: Shield },
    { title: "Teachers", href: "/super-admin/teachers", icon: BookOpen },
    { title: "Classes", href: "/super-admin/classes", icon: ClipboardList },
    { title: "Students", href: "/super-admin/students", icon: GraduationCap },
    { title: "Accountant", href: "/accountant", icon: Wallet },
    { title: "School Admin", href: "/school-admin", icon: Shield },
    { title: "Teacher portal", href: "/teacher", icon: FileText },
  ],
  SCHOOL_ADMIN: [
    { title: "Dashboard", href: "/school-admin", icon: LayoutDashboard },
    { title: "Staff directory", href: "/school-admin/users", icon: Users },
    { title: "Students (view)", href: "/school-admin/students", icon: GraduationCap },
    { title: "Assign subject & class", href: "/school-admin/academic", icon: BookOpen },
    { title: "Tasks", href: "/school-admin/tasks", icon: ListTodo },
    { title: "Announcements", href: "/school-admin/announcements", icon: Megaphone },
  ],
  TEACHER: [
    { title: "Dashboard", href: "/teacher", icon: LayoutDashboard },
    { title: "My students", href: "/teacher/students", icon: GraduationCap },
    { title: "Attendance", href: "/teacher/attendance", icon: ClipboardList },
    { title: "Marks", href: "/teacher/marks", icon: FileText },
  ],
  STUDENT: [
    { title: "Dashboard", href: "/student", icon: LayoutDashboard },
    { title: "Fees", href: "/student/fees", icon: Wallet },
  ],
  ACCOUNTANT: [
    { title: "Dashboard", href: "/accountant", icon: LayoutDashboard },
    { title: "Students", href: "/accountant/students", icon: GraduationCap },
    { title: "Fee Structures", href: "/accountant/structures", icon: Wallet },
    { title: "Billing", href: "/accountant/invoices", icon: FileText },
    { title: "Payments", href: "/accountant/payments", icon: ClipboardList },
    { title: "Balance breakdown", href: "/accountant/ledger", icon: Wallet },
    { title: "Bus & Feeding", href: "/accountant/services", icon: Bus },
    { title: "Other income", href: "/accountant/other-income", icon: Banknote },
    { title: "Expenses", href: "/accountant/expenses", icon: Receipt },
    { title: "Salaries", href: "/accountant/salaries", icon: Banknote },
  ],
  PARENT: [
    { title: "Dashboard", href: "/parent", icon: LayoutDashboard },
    { title: "Children", href: "/parent/children", icon: Users },
    { title: "Fees", href: "/parent/fees", icon: Wallet },
  ],
  SERVICE_OFFICER: [
    { title: "Bus & feeding", href: "/services", icon: Bus },
    { title: "View fees", href: "/services/fees", icon: Wallet },
  ],
};
