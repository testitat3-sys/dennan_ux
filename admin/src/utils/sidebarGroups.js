import {
  LayoutDashboard,
  Boxes,
  Tag,
  Users,
  UserCheck,
  BarChart3,
  Calendar as CalendarIcon,
  RotateCcw,
  History,
  ClipboardList,
  Package,
  Settings,
  Inbox,
  Database,
  ShoppingCart,
} from "lucide-react";

/**
 * Lightweight sidebar groups for standalone pages (e.g. the return
 * resolution pages) that sit outside AdminDashboard/StaffDashboard's own
 * tab state. Every item just navigates back to "/" with the matching
 * ?tab=, which both dashboards read on mount - no live badge counts here
 * since these pages don't have that data loaded.
 */
export function getReturnPageSidebarGroups(role, navigate) {
  const go = (tab) => () => navigate(`/?tab=${tab}`);

  if (role === "admin") {
    return [
      {
        id: "overview",
        label: "Overview",
        items: [{ key: "overview", label: "Dashboard", icon: LayoutDashboard, onClick: go("overview") }],
      },
      {
        id: "salesOrders",
        label: "Sales & Orders",
        items: [
          { key: "onlineOrders", label: "Online Orders", icon: Package, onClick: go("onlineOrders") },
          { key: "metrics", label: "Sales Metrics", icon: BarChart3, onClick: go("metrics") },
          { key: "history", label: "Order History", icon: History, onClick: go("history") },
          { key: "returns", label: "Returns", icon: RotateCcw, onClick: go("returns") },
        ],
      },
      {
        id: "catalogue",
        label: "Catalogue",
        items: [
          { key: "stock", label: "Stock Manager", icon: Boxes, onClick: go("stock") },
          { key: "salesReport", label: "Sales Report", icon: ClipboardList, onClick: go("salesReport") },
          { key: "discounts", label: "Discounts & Promos", icon: Tag, onClick: go("discounts") },
        ],
      },
      {
        id: "peoplePlanning",
        label: "People & Planning",
        items: [
          { key: "customers", label: "Customers", icon: Users, onClick: go("customers") },
          { key: "leads", label: "Leads", icon: Inbox, onClick: go("leads") },
          { key: "calendar", label: "Calendar", icon: CalendarIcon, onClick: go("calendar") },
          { key: "staff", label: "Staff Roster", icon: UserCheck, onClick: go("staff") },
        ],
      },
      {
        id: "system",
        label: "System",
        items: [
          { key: "settings", label: "Settings", icon: Settings, onClick: go("settings") },
          { key: "dbio", label: "DB I/O", icon: Database, onClick: go("dbio") },
        ],
      },
    ];
  }

  return [
    {
      id: "orders",
      label: "Orders",
      items: [
        { key: "orders", label: "Online Orders", icon: ClipboardList, onClick: go("orders") },
        { key: "pos", label: "Physical Orders", icon: ShoppingCart, onClick: go("pos") },
        { key: "history", label: "My Order History", icon: History, onClick: go("history") },
        { key: "returns", label: "Returns", icon: RotateCcw, onClick: go("returns") },
      ],
    },
    {
      id: "customersPlanning",
      label: "Customers & Planning",
      items: [
        { key: "customers", label: "Customers CRM", icon: Users, onClick: go("customers") },
        { key: "leads", label: "Leads", icon: Inbox, onClick: go("leads") },
        { key: "calendar", label: "Calendar", icon: CalendarIcon, onClick: go("calendar") },
      ],
    },
  ];
}
