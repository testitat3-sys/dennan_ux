import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStaffAuth } from "../hooks/useStaffAuth";
import OrderDetailModal from "../components/OrderDetailModal";
import HandoverModal from "../components/HandoverModal";
import ReturnsPanel from "../components/ReturnsPanel";
import DeliveryFailureModal from "../components/DeliveryFailureModal";
import CustomerActivityModal from "../components/CustomerActivityModal";
import RemindersWidget from "../components/RemindersWidget";
import CalendarPanel from "../components/CalendarPanel";
import ReceiptModal from "../components/ReceiptModal";
import Toast from "../components/Toast";
import LiveTimer from "../components/LiveTimer";
import { useToast } from "../hooks/useToast";
import { useNewOrderNotifications } from "../hooks/useNewOrderNotifications";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { useOfflineProducts } from "../hooks/useOfflineProducts";
import { useOfflineOrderSync } from "../hooks/useOfflineOrderSync";
import { addPendingOrder, listPendingOrders } from "../lib/offlineDb";
import OfflineBanner from "../components/OfflineBanner";
import CatalogDownloadBanner from "../components/CatalogDownloadBanner";
import LeadsPanel from "../components/LeadsPanel";
import { getTodayStr } from "../utils/reminderHelpers";
import sosLogo from "../assets/SOS.png";
import profileImg from "../assets/about-dennan.png";
import {
  ClipboardList,
  ShoppingCart,
  Users,
  Search,
  CheckCircle,
  XCircle,
  Truck,
  Minus,
  Plus,
  X,
  Eye,
  Sparkles,
  LogOut,
  ChevronRight,
  Banknote,
  Smartphone,
  CreditCard,
  Calendar as CalendarIcon,
  History,
  Printer,
  Copy,
  RotateCcw,
  Package,
  Inbox
} from "lucide-react";

const LAST_TAB_KEY = "dennan_staff_last_tab";

export default function StaffDashboard() {
  const navigate = useNavigate();
  const { user, token, logout } = useStaffAuth();
  const [activeTab, setActiveTabState] = useState(
    () => localStorage.getItem(LAST_TAB_KEY) || "orders"
  );
  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    localStorage.setItem(LAST_TAB_KEY, tab);
  };
  const isOnline = useOnlineStatus();
  const [ordersTab, setOrdersTab] = useState("pending");

  // Modals state
  const [viewingOrder, setViewingOrder] = useState(null);
  const [handoverOrderId, setHandoverOrderId] = useState(null);
  const [failureOrder, setFailureOrder] = useState(null);
  const [crmCustomer, setCrmCustomer] = useState(null);

  const { toasts, showToast, dismissToast } = useToast();

  // --- TAB 1: ORDERS QUEUE ---
  const { results: ordersList, status: ordersStatus, loadMore: loadMoreOrders } = usePaginatedQuery(
    api.orders.getOrdersForStaff,
    { token },
    { initialNumItems: 50 }
  );

  // --- TAB: ORDER HISTORY (all orders) ---
  // Only subscribe when the history tab is open — avoids an unnecessary live
  // subscription while staff are on the queue, POS, or other tabs.
  const { results: allOrderHistory, status: allOrderHistoryStatus, loadMore: loadMoreAllOrderHistory } = usePaginatedQuery(
    api.orders.adminGetOrdersByDateRange,
    activeTab === "history" ? { token } : "skip",
    { initialNumItems: 30 }
  );

  const claimOrderMutation = useMutation(api.orders.claimOrder);
  const handoverMutation = useMutation(api.orders.handoverToDelivery);
  const completeOrderMutation = useMutation(api.orders.completeOrder);
  const reportDeliveryFailureMutation = useMutation(api.orders.reportDeliveryFailure);

  const handleClaimOrder = async (orderId) => {
    try {
      await claimOrderMutation({ token, orderId });
    } catch (err) {
      alert("Failed to claim order: " + err.message);
    }
  };

  const handleHandoverSubmit = async (data) => {
    try {
      await handoverMutation({
        token,
        orderId: data.orderId,
        deliveryPersonName: data.deliveryPersonName,
        riderPhone: data.riderPhone,
        expectedDeliveryTime: data.expectedDeliveryTime
      });
      setHandoverOrderId(null);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleCompleteOrder = async (orderId) => {
    try {
      await completeOrderMutation({ token, orderId });
    } catch (err) {
      alert("Error completing order: " + err.message);
    }
  };

  const handleReportDeliveryFailure = async (data) => {
    try {
      await reportDeliveryFailureMutation({
        token,
        orderId: data.orderId,
        failedItems: data.failedItems,
        note: data.note
      });
      setFailureOrder(null);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // --- TAB 2: WALK-IN POS ---
  // Product catalog is downloaded once per device and cached in IndexedDB,
  // then kept fresh via delta syncs on reconnect - see useOfflineProducts.
  // This also means the POS grid still renders (from cache) with no
  // connection at all.
  const {
    products: posProducts,
    isSyncing: isPosCatalogSyncing,
    needsBootstrap: catalogNeedsBootstrap,
    requestBootstrap: requestCatalogBootstrap,
    refreshBootstrapStatus: refreshCatalogBootstrapStatus,
  } = useOfflineProducts(token);
  const createPhysicalOrderMutation = useMutation(api.orders.createPhysicalOrder);
  // Reserves stock against not-yet-synced offline sales so a second offline
  // sale of the same product can't oversell the cached inventory figure.
  // Rebuilt from IndexedDB on mount (see effect below) so a page reload while
  // orders are still pending doesn't silently forget the reservation, and
  // trimmed per-order as each queued sale actually syncs (onOrderSynced
  // below) so it doesn't keep double-subtracting once real inventory catches up.
  const [offlineStockReservations, setOfflineStockReservations] = useState({});
  const handleOfflineOrderSynced = React.useCallback((order) => {
    const items = order?.payload?.items;
    if (!items || items.length === 0) return;
    setOfflineStockReservations(prev => {
      const next = { ...prev };
      for (const item of items) {
        const remaining = (next[item.productId] || 0) - item.quantity;
        if (remaining > 0) {
          next[item.productId] = remaining;
        } else {
          delete next[item.productId];
        }
      }
      return next;
    });
  }, []);
  const { pendingCount, failedOrders: failedOfflineOrders } = useOfflineOrderSync(
    token,
    createPhysicalOrderMutation,
    isOnline,
    handleOfflineOrderSynced
  );
  // Rebuild reservations from the IndexedDB queue truth on mount, rather than
  // starting from {} - otherwise a reload while offline sales are still
  // pending/failed silently reopens the oversell window they were guarding.
  React.useEffect(() => {
    (async () => {
      const all = await listPendingOrders();
      const reservations = {};
      for (const order of all) {
        if (order.status !== "pending" && order.status !== "failed") continue;
        for (const item of order.payload?.items || []) {
          reservations[item.productId] = (reservations[item.productId] || 0) + item.quantity;
        }
      }
      setOfflineStockReservations(reservations);
    })();
  }, []);
  // Re-checks (fresh from IndexedDB, not stale React state) whether the
  // catalog is missing every time staff open the POS tab - covers both a
  // brand-new device and a mid-session IndexedDB eviction.
  const [catalogPromptDismissed, setCatalogPromptDismissed] = useState(false);
  React.useEffect(() => {
    if (activeTab === "pos") {
      setCatalogPromptDismissed(false);
      refreshCatalogBootstrapStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleDownloadCatalog = async () => {
    setCatalogPromptDismissed(true);
    showToast("Downloading product catalog…", "info");
    const result = await requestCatalogBootstrap();
    if (result.success) {
      showToast("Product catalog ready for offline use.", "success");
    } else {
      showToast("Couldn't download the catalog — try again.", "error");
      setCatalogPromptDismissed(false);
    }
  };

  const staffRoster = useQuery(api.staffAuth.getStaffRoster, { token });

  const [posSearch, setPosSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [voucherCartItems, setVoucherCartItems] = useState([]);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [posCustomer, setPosCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    note: ""
  });
  const [workedByStaffId, setWorkedByStaffId] = useState("");
  const [saleChannel, setSaleChannel] = useState("walk_in");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [deliveryFeeInput, setDeliveryFeeInput] = useState(0);
  const [tenders, setTenders] = useState([
    { tempId: "default", method: "physical", amount: 0, momoPhone: "", cardOrderId: "", voucherCode: "" }
  ]);
  const [voucherValidation, setVoucherValidation] = useState({});
  const [issuedVouchers, setIssuedVouchers] = useState([]);
  const [scheduleReminder, setScheduleReminder] = useState(false);
  const [reminderType, setReminderType] = useState("call");
  const [reminderDate, setReminderDate] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [reminderNote, setReminderNote] = useState("");
  const [reminderPriority, setReminderPriority] = useState("normal");
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [isCheckoutSubmitting, setIsCheckoutSubmitting] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const todayStr = getTodayStr();

  // --- Linked-order lookup, used when a Calendar reminder references an order ---
  const [pendingOrderId, setPendingOrderId] = useState(null);
  const pendingOrderDetail = useQuery(
    api.orders.getOrderDetailById,
    pendingOrderId ? { token, orderId: pendingOrderId } : "skip"
  );
  React.useEffect(() => {
    if (pendingOrderDetail) {
      setViewingOrder(pendingOrderDetail);
      setPendingOrderId(null);
    }
  }, [pendingOrderDetail]);

  const getOriginalPrice = (product) => {
    if (!product) return 0;
    const prices = [product.price, product.wasPrice, product.originalPrice, product.discountPrice].filter(
      v => typeof v === "number" && v > 0
    );
    return prices.length > 0 ? Math.max(...prices) : (product.price || 0);
  };

  // Subtracts stock already reserved by not-yet-synced offline sales, so a
  // second offline sale of the same product can't oversell the cached
  // inventory figure. A no-op once everything's synced (reservations clear).
  const getEffectiveInventory = (product) => {
    if (!product || product.inventory === undefined) return undefined;
    const reserved = offlineStockReservations[product._id] || 0;
    return Math.max(0, product.inventory - reserved);
  };

  const addToCart = (product) => {
    const availableInventory = getEffectiveInventory(product);
    setCart(prev => {
      const existing = prev.find(item => item.id === product._id);
      if (existing) {
        if (availableInventory !== undefined && existing.quantity >= availableInventory) {
          alert(`Cannot add more. Only ${availableInventory} available in stock.`);
          return prev;
        }
        return prev.map(item => item.id === product._id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { id: product._id, name: product.name, price: getOriginalPrice(product), quantity: 1, inventory: availableInventory }];
    });
  };

  const updateCartQty = (productId, delta, max) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        if (max !== undefined && newQty > max) {
          alert(`Stock limit reached. Only ${max} items available.`);
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const removeVoucherCartItem = (tempId) => {
    setVoucherCartItems(prev => prev.filter(item => item.tempId !== tempId));
  };

  const resetPosForm = () => {
    setCart([]);
    setVoucherCartItems([]);
    setTenders([{ tempId: "default", method: "physical", amount: 0, momoPhone: "", cardOrderId: "", voucherCode: "" }]);
    setVoucherValidation({});
    setPosCustomer({ name: "", phone: "", email: "", note: "" });
    setWorkedByStaffId("");
    setSaleChannel("walk_in");
    setDeliveryLocation("");
    setDeliveryFeeInput(0);
    setScheduleReminder(false);
    setReminderType("call");
    setReminderDate("");
    setReminderTime("");
    setReminderNote("");
    setReminderPriority("normal");
  };

  const handleAddTender = () => {
    setTenders(prev => [
      ...prev,
      {
        tempId: Math.random().toString(36).substr(2, 9),
        method: "physical",
        amount: 0,
        momoPhone: "",
        cardOrderId: "",
        voucherCode: ""
      }
    ]);
  };

  const handleRemoveTender = (tempId) => {
    setTenders(prev => prev.filter(t => t.tempId !== tempId));
  };

  const handleUpdateTender = (tempId, field, value) => {
    setTenders(prev => prev.map(t => {
      if (t.tempId === tempId) {
        return { ...t, [field]: value };
      }
      return t;
    }));
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0 && voucherCartItems.length === 0) {
      setCheckoutError("Cart is empty.");
      return;
    }
    if (!posCustomer.name.trim()) {
      setCheckoutError("Customer name is required.");
      return;
    }
    if (scheduleReminder && !reminderDate) {
      setCheckoutError("Please choose a reminder date.");
      return;
    }
    if (scheduleReminder && !reminderNote.trim()) {
      setCheckoutError("Please describe the reminder.");
      return;
    }

    // Vouchers require live balance/expiry validation on the server, which
    // can't be safely replicated offline - block them rather than risk
    // issuing/redeeming a voucher the server later can't honor.
    if (!isOnline && voucherCartItems.length > 0) {
      setCheckoutError("Gift vouchers require a connection. Remove them to complete this sale offline.");
      return;
    }
    if (!isOnline && tenders.some(t => t.method === "voucher")) {
      setCheckoutError("Voucher tenders require a connection. Choose cash, MoMo, or card to complete this sale offline.");
      return;
    }

    // Validate voucher items
    const now = Date.now();
    for (const vItem of voucherCartItems) {
      if (vItem.amount <= 0) {
        setCheckoutError("Gift voucher amount must be positive.");
        return;
      }
      if (vItem.expiresAt <= now) {
        setCheckoutError("Gift voucher expiry date must be in the future.");
        return;
      }
    }

    if (saleChannel === "whatsapp" && posDeliveryFee < 0) {
      setCheckoutError("Delivery fee cannot be negative.");
      return;
    }

    // Validate tenders total (includes delivery fee for WhatsApp orders)
    const totalTendersAmount = tenders.reduce((sum, t) => sum + t.amount, 0);
    if (totalTendersAmount !== posPayableTotal) {
      setCheckoutError(`Tender total (UGX ${totalTendersAmount.toLocaleString()}) must match order total (UGX ${posPayableTotal.toLocaleString()}).`);
      return;
    }

    // Validate voucher tenders
    for (const tender of tenders) {
      if (tender.method === "voucher") {
        if (!tender.voucherCode) {
          setCheckoutError("Please specify the voucher code.");
          return;
        }
        const validation = voucherValidation[tender.voucherCode];
        if (!validation) {
          setCheckoutError("Voucher validation in progress...");
          return;
        }
        if (!validation.found) {
          setCheckoutError(`Voucher ${tender.voucherCode} not found.`);
          return;
        }
        if (!validation.redeemable) {
          setCheckoutError(`Voucher ${tender.voucherCode} is not redeemable.`);
          return;
        }
        if (validation.remainingBalance < tender.amount) {
          setCheckoutError(`Voucher ${tender.voucherCode} has insufficient balance (Remaining: UGX ${validation.remainingBalance.toLocaleString()}).`);
          return;
        }
      } else if (tender.method === "momo") {
        if (!tender.momoPhone?.trim()) {
          setCheckoutError("Mobile money phone number is required for all MoMo tenders.");
          return;
        }
        if (!tender.cardOrderId?.trim()) {
          setCheckoutError("Transaction ID is required for all MoMo tenders.");
          return;
        }
      } else if (tender.method === "card" && !tender.cardOrderId?.trim()) {
        setCheckoutError("Transaction ID is required for all card tenders.");
        return;
      }
    }

    setCheckoutError("");
    setIsCheckoutSubmitting(true);

    try {
      const itemsPayload = cart.map(item => ({
        productId: item.id,
        quantity: item.quantity
      }));

      const paymentsPayload = tenders.map(t => ({
        method: t.method,
        amount: t.amount,
        momoPhone: t.method === "momo" ? t.momoPhone.trim() : undefined,
        cardOrderId: (t.method === "card" || t.method === "momo") ? t.cardOrderId.trim() : undefined,
        voucherCode: t.method === "voucher" ? t.voucherCode.trim().toUpperCase() : undefined
      }));

      const voucherItemsPayload = voucherCartItems.map(item => ({
        amount: item.amount,
        expiresAt: item.expiresAt,
        recipientName: item.recipientName || undefined,
        recipientEmail: item.recipientEmail || undefined
      }));

      // Generated up front (not just for the offline path) so the same id is both
      // the IndexedDB queue key and the server-side idempotency key - see
      // createPhysicalOrder's offlineOrderId handling in convex/orders.ts.
      const offlineOrderId = crypto.randomUUID();

      const orderPayload = {
        customerName: posCustomer.name.trim(),
        phone: posCustomer.phone.trim() || undefined,
        email: posCustomer.email.trim() || undefined,
        items: itemsPayload,
        payments: paymentsPayload,
        voucherItems: voucherItemsPayload.length > 0 ? voucherItemsPayload : undefined,
        note: posCustomer.note.trim() || undefined,
        reminder: scheduleReminder
          ? {
            type: reminderType,
            note: reminderNote.trim(),
            scheduledDate: reminderDate,
            scheduledTime: reminderTime || undefined,
            priority: reminderPriority
          }
          : undefined,
        workedByStaffId: workedByStaffId || undefined,
        channel: saleChannel,
        deliveryFee: saleChannel === "whatsapp" ? posDeliveryFee : undefined,
        deliveryLocation: saleChannel === "whatsapp" ? (deliveryLocation.trim() || undefined) : undefined,
        offlineOrderId,
      };

      let orderId, receiptNumber, issuedVouchersResult;

      if (isOnline) {
        const result = await createPhysicalOrderMutation({ token, ...orderPayload });
        orderId = result.orderId;
        receiptNumber = result.receiptNumber;
        issuedVouchersResult = result.issuedVouchers || [];
      } else {
        // No connection: queue the sale locally (drained automatically once
        // back online, see useOfflineOrderSync) instead of blocking checkout.
        const pending = await addPendingOrder(orderPayload, offlineOrderId);
        setOfflineStockReservations(prev => {
          const next = { ...prev };
          for (const item of cart) {
            next[item.id] = (next[item.id] || 0) + item.quantity;
          }
          return next;
        });
        orderId = `pending-${pending.localId}`;
        receiptNumber = `OFFLINE-${pending.localId.slice(0, 8).toUpperCase()}`;
        issuedVouchersResult = [];
      }

      setIssuedVouchers(issuedVouchersResult);
      setCheckoutSuccess(true);
      setLastReceipt({
        orderId,
        receiptNumber,
        date: new Date(),
        cashier: user?.name,
        customerName: posCustomer.name.trim(),
        customerPhone: posCustomer.phone.trim(),
        pendingSync: !isOnline,
        items: [
          ...cart.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
          ...voucherCartItems.map(item => ({ name: "Gift Voucher", quantity: 1, price: item.amount }))
        ],
        payments: tenders.map(t => ({ method: t.method, amount: t.amount })),
        subtotal: cartSubtotal,
        discountAmount: 0,
        deliveryFee: posDeliveryFee,
        total: posPayableTotal
      });

      resetPosForm();
      setTimeout(() => {
        setCheckoutSuccess(false);
        setIssuedVouchers([]);
      }, 10000);
    } catch (err) {
      setCheckoutError("Checkout failed: " + err.message);
    } finally {
      setIsCheckoutSubmitting(false);
    }
  };

  // --- TAB 3: CUSTOMERS CRM ---
  const customerList = useQuery(api.customerActivities.getCustomerList, { token });
  const [customerSearch, setCustomerSearch] = useState("");

  // --- LEADS (store requests + back-in-stock signups) ---
  const leadsList = useQuery(api.leads.getLeads, { token });
  const unresolvedLeadsCount = leadsList?.filter((l) => l.status !== "resolved").length || 0;

  // --- TAB 4: CALENDAR / REMINDERS ---
  const dueActivities = useQuery(api.customerActivities.getDueActivities, { token, currentDate: todayStr });

  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0) +
    voucherCartItems.reduce((sum, item) => sum + item.amount, 0);

  const posDeliveryFee = saleChannel === "whatsapp" ? (parseInt(deliveryFeeInput) || 0) : 0;
  const posPayableTotal = cartSubtotal + posDeliveryFee;

  const tendersRemainingToPay = posPayableTotal - tenders.reduce((sum, t) => sum + t.amount, 0);

  React.useEffect(() => {
    if (tenders.length === 1) {
      setTenders(prev => [
        { ...prev[0], amount: posPayableTotal }
      ]);
    }
  }, [posPayableTotal, tenders.length]);

  const initials = (name) => (name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  // Helper: map an order from history list to ReceiptModal shape
  const buildReceiptFromOrder = (order) => ({
    orderId: order._id,
    receiptNumber: order.receiptNumber,
    date: new Date(order.createdAt),
    cashier: order.claimantName || user?.name,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    items: order.items?.map(i => ({
      name: i.productName,
      quantity: i.quantity,
      price: i.unitPrice,
    })) || [],
    payments: order.payments || [],
    subtotal: order.subtotal,
    discountAmount: order.discountAmount || 0,
    deliveryFee: order.deliveryFee || 0,
    couponApplied: order.couponApplied,
    total: order.grandTotal,
  });

  // Helper: status -> CSS modifier
  const getStatusModifier = (status) => {
    switch (status) {
      case "preparing": return "new";
      case "packing": return "packing";
      case "dispatched": return "dispatched";
      case "delivered": return "done";
      case "failed": return "failed";
      case "returned": return "returned";
      case "partially_returned": return "partially-returned";
      default: return "new";
    }
  };

  const pendingOrders = ordersList?.filter(o => o.status === "preparing") || [];
  const packingOrders = ordersList?.filter(o => o.status === "packing") || [];
  const dispatchedOrders = ordersList?.filter(o => o.status === "dispatched") || [];
  const deliveredOrders = ordersList?.filter(o => o.status === "delivered") || [];
  const failedOrders = ordersList?.filter(o => o.status === "failed") || [];

  const ORDERS_TABS = [
    { key: "pending", label: "Pending", icon: Sparkles, orders: pendingOrders },
    { key: "packing", label: "Packing", icon: Package, orders: packingOrders },
    { key: "dispatched", label: "Dispatched", icon: Truck, orders: dispatchedOrders },
    { key: "delivered", label: "Delivered", icon: CheckCircle, orders: deliveredOrders },
    { key: "failed", label: "Failed", icon: XCircle, orders: failedOrders },
  ];
  const activeOrdersList = ORDERS_TABS.find(t => t.key === ordersTab).orders;

  useNewOrderNotifications(ordersList === undefined ? undefined : pendingOrders, {
    onNewOrder: (order) => showToast(`New order received from ${order.customerName}`, "info"),
  });

  const filteredPosProducts = posProducts?.filter(p =>
    p.name.toLowerCase().includes(posSearch.toLowerCase()) ||
    p.barcode?.includes(posSearch) ||
    p.sku?.toLowerCase().includes(posSearch.toLowerCase())
  ) || [];

  const filteredCustomers = customerList?.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.includes(customerSearch)
  ) || [];

  return (
    <div className="staff-portal-body">
      <OfflineBanner isOnline={isOnline} pendingCount={pendingCount} failedCount={failedOfflineOrders.length} />
      <CatalogDownloadBanner
        show={catalogNeedsBootstrap && !catalogPromptDismissed}
        isOnline={isOnline}
        onDownload={handleDownloadCatalog}
        onDismiss={() => setCatalogPromptDismissed(true)}
      />
      <div className="admin-layout">
        {/* Sidebar Navigation */}
        <aside className="sidebar">
          <div className="sidebar-brand">
            <img src={sosLogo} alt="Dennan" className="sidebar-logo" />
            <span className="sidebar-brand-sub">Growth Team</span>
          </div>

          <nav className="sidebar-nav">
            <div className="sidebar-nav-group">
              <span className="sidebar-nav-group-label">Orders</span>
              <button
                className={`sidebar-nav-item ${activeTab === "orders" ? "is-active" : ""}`}
                onClick={() => setActiveTab("orders")}
              >
                <ClipboardList size={18} />
                <span>Online Orders</span>
                {pendingOrders.length > 0 && (
                  <span className="sidebar-nav-badge">{pendingOrders.length}</span>
                )}
              </button>
              <button
                className={`sidebar-nav-item ${activeTab === "pos" ? "is-active" : ""}`}
                onClick={() => setActiveTab("pos")}
              >
                <ShoppingCart size={18} />
                <span>Physical Orders</span>
                {(pendingCount > 0 || failedOfflineOrders.length > 0) && (
                  <span className="sidebar-nav-badge">{pendingCount + failedOfflineOrders.length}</span>
                )}
              </button>
              <button
                className={`sidebar-nav-item ${activeTab === "history" ? "is-active" : ""}`}
                onClick={() => setActiveTab("history")}
              >
                <History size={18} />
                <span>My Order History</span>
              </button>
              <button
                className={`sidebar-nav-item ${activeTab === "returns" ? "is-active" : ""}`}
                onClick={() => setActiveTab("returns")}
              >
                <RotateCcw size={18} />
                <span>Returns</span>
              </button>
            </div>

            <div className="sidebar-nav-group">
              <span className="sidebar-nav-group-label">Customers & Planning</span>
              <button
                className={`sidebar-nav-item ${activeTab === "customers" ? "is-active" : ""}`}
                onClick={() => setActiveTab("customers")}
              >
                <Users size={18} />
                <span>Customers CRM</span>
              </button>
              <button
                className={`sidebar-nav-item ${activeTab === "leads" ? "is-active" : ""}`}
                onClick={() => setActiveTab("leads")}
              >
                <Inbox size={18} />
                <span>Leads</span>
                {unresolvedLeadsCount > 0 && (
                  <span className="sidebar-nav-badge">{unresolvedLeadsCount}</span>
                )}
              </button>
              <button
                className={`sidebar-nav-item ${activeTab === "calendar" ? "is-active" : ""}`}
                onClick={() => setActiveTab("calendar")}
              >
                <CalendarIcon size={18} />
                <span>Calendar</span>
                {dueActivities && dueActivities.length > 0 && (
                  <span className="sidebar-nav-badge">{dueActivities.length}</span>
                )}
              </button>
            </div>
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="avatar">
                <img src={profileImg} alt={user?.name || "Profile"} className="avatar-img" />
              </div>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{user?.name}</span>
                <span className="sidebar-user-role">{user?.accountRole?.toUpperCase()}</span>
              </div>
            </div>
            <button className="logout-btn" onClick={logout} type="button">
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="admin-main">
          {/* TAB 1: ORDERS QUEUE */}
          {activeTab === "orders" && (
            <div className="admin-tab-panel is-active">
              <div className="page-header">
                <h1 className="admin-page-title">Orders Queue</h1>
              </div>

              <RemindersWidget token={token} onViewCalendar={() => setActiveTab("calendar")} />

              <div className="tab-strip">
                {ORDERS_TABS.map(({ key, label, icon: Icon, orders }) => (
                  <button
                    key={key}
                    className={`tab-btn ${ordersTab === key ? "is-active" : ""}`}
                    onClick={() => setOrdersTab(key)}
                  >
                    <Icon size={15} />
                    <span>{label}</span>
                    {orders.length > 0 && (
                      <span className={`tab-count-badge ${key === "pending" ? "tab-count-badge--alert" : ""}`}>
                        {orders.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="order-feed">
                {ordersList === undefined ? (
                  <div className="empty-state">
                    <div className="empty-title">Syncing queue...</div>
                  </div>
                ) : activeOrdersList.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-title">No orders in {ORDERS_TABS.find(t => t.key === ordersTab).label.toLowerCase()}.</div>
                  </div>
                ) : (
                  activeOrdersList.map(order => (
                    <article
                      key={order._id}
                      className={`order-row order-row--${getStatusModifier(order.status)}`}
                      onClick={() => setViewingOrder(order)}
                    >
                      <div className="order-row-main">
                        <h2 className="order-row-name" title={order.customerName}>{order.customerName}</h2>
                        <div className="order-meta-line">
                          <span>UGX {order.grandTotal.toLocaleString()}</span>
                          <span className="meta-separator">·</span>
                          <span>Zone: {order.deliveryAddress?.zone}</span>
                        </div>
                      </div>

                      {order.claimantName && (
                        <span className="claimed-chip" title={order.claimantName}>
                          <span className="mini-avatar">{order.claimantName[0]}</span>
                          <span className="claimed-chip-name">{order.claimantName}</span>
                        </span>
                      )}

                      <div className="order-row-timer">
                        {order.status === "preparing" && (
                          <LiveTimer sinceTimestamp={order.createdAt} label="Waiting" warningThresholdSeconds={300} />
                        )}
                        {order.status === "packing" && (
                          <LiveTimer sinceTimestamp={order.claimedAt} label="Packing" warningThresholdSeconds={900} />
                        )}
                      </div>

                      <span className={`status-badge status-badge--${getStatusModifier(order.status)}`}>
                        <span className="status-dot" />
                        {order.status.toUpperCase()}
                      </span>

                      <ChevronRight size={16} className="order-row-chevron" />
                    </article>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: WALK-IN POS */}
          {activeTab === "pos" && (
            <div className="admin-tab-panel is-active">
              <div className="page-header">
                <h1 className="admin-page-title">Walk-in Order</h1>
              </div>

              <div className="pos-layout">
                <div className="pos-products-container">
                  <div className="stock-search-wrap">
                    <Search className="stock-search-icon" size={15} />
                    <input
                      className="stock-search-input"
                      type="text"
                      placeholder="Search barcode, description..."
                      value={posSearch}
                      onChange={(e) => setPosSearch(e.target.value)}
                    />
                    {posSearch && (
                      <button className="stock-search-clear" onClick={() => setPosSearch("")}>
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {posProducts.length === 0 && isPosCatalogSyncing ? (
                    <div className="empty-state">
                      <div className="empty-title">Loading POS database...</div>
                    </div>
                  ) : (
                    <div className="pos-products-grid">
                      {/* Permanent Sell Gift Voucher tile */}
                      <button
                        key="gift-voucher-tile"
                        onClick={() => setShowVoucherModal(true)}
                        disabled={isCheckoutSubmitting}
                        type="button"
                        style={{
                          background: "linear-gradient(135deg, var(--surface-container-low), var(--surface-container))",
                          border: "1px dashed var(--color-brand-primary)",
                          borderRadius: "var(--radius-lg)",
                          padding: "var(--space-3)",
                          cursor: "pointer",
                          textAlign: "left",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          height: "172px"
                        }}
                      >
                        <div style={{ width: "100%", height: "90px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-md)", background: "rgba(99, 102, 241, 0.1)", color: "var(--color-brand-primary)" }}>
                          <Sparkles size={36} />
                        </div>
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>Sell Gift Voucher</div>
                          <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>Free-form amount</div>
                        </div>
                      </button>

                      {filteredPosProducts.map(p => {
                        const availableInventory = getEffectiveInventory(p);
                        const inStock = availableInventory === undefined || availableInventory > 0;
                        const cartItem = cart.find(item => item.id === p._id);
                        const atMax = cartItem && availableInventory !== undefined && cartItem.quantity >= availableInventory;
                        return (
                          <button
                            key={p._id}
                            onClick={() => addToCart(p)}
                            disabled={!inStock || atMax}
                            style={{
                              background: "var(--surface-container-low)",
                              border: cartItem ? "2px solid var(--color-brand-primary)" : "1px solid var(--surface-container-highest)",
                              borderRadius: "var(--radius-lg)",
                              padding: "var(--space-3)",
                              cursor: inStock ? "pointer" : "not-allowed",
                              opacity: inStock ? 1 : 0.5,
                              textAlign: "left",
                              position: "relative",
                            }}
                          >
                            {p.image ? (
                              <img
                                src={p.image}
                                alt={p.name}
                                style={{ width: "100%", height: "90px", objectFit: "cover", borderRadius: "var(--radius-md)", marginBottom: "var(--space-2)", display: "block" }}
                              />
                            ) : (
                              <div style={{
                                width: "100%",
                                height: "90px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: "var(--radius-md)",
                                marginBottom: "var(--space-2)",
                                background: "linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(236, 72, 153, 0.08))",
                                border: "1px solid rgba(99, 102, 241, 0.15)",
                                position: "relative",
                                overflow: "hidden"
                              }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8, marginBottom: "4px" }}>
                                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                                  <line x1="3" y1="6" x2="21" y2="6" />
                                  <path d="M16 10a4 4 0 0 1-8 0" />
                                </svg>
                                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-tertiary)", letterSpacing: "0.5px" }}>
                                  {p.brand || "Dennan"}
                                </span>
                              </div>
                            )}

                            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3, marginBottom: "3px" }}>{p.name}</div>
                            <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginBottom: "var(--space-2)" }}>Barcode: {p.barcode}</div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                               <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-brand-primary)" }}>UGX {getOriginalPrice(p).toLocaleString()}</span>
                              <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "20px", background: !inStock ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", color: !inStock ? "#ef4444" : "#16a34a" }}>
                                {availableInventory !== undefined ? (!inStock ? "Out" : `${availableInventory} left`) : "In Stock"}
                              </span>
                            </div>
                            {cartItem && (
                              <div style={{ position: "absolute", top: 8, right: 8, background: "var(--color-brand-primary)", color: "#fff", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700 }}>
                                {cartItem.quantity}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Cart Drawer and Checkout Info */}
                <div style={{ position: "sticky", top: "20px" }}>
                  {checkoutSuccess && (
                    <div className="form-error is-visible" style={{ background: "rgba(34,197,94,0.08)", color: "#16a34a", marginBottom: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-2)", alignItems: "flex-start" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Sparkles size={16} />
                        <span>Physical order processed successfully!</span>
                      </div>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => setShowReceipt(true)}
                        style={{ marginTop: "var(--space-1)" }}
                      >
                        Print Receipt
                      </button>
                      {issuedVouchers.length > 0 && (
                        <div style={{ width: "100%", marginTop: "var(--space-2)", paddingTop: "var(--space-2)", borderTop: "1px solid rgba(34,197,94,0.2)" }}>
                          <div style={{ fontSize: "11px", fontWeight: 700, marginBottom: "var(--space-1)" }}>Issued Gift Vouchers:</div>
                          {issuedVouchers.map((v, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(34,197,94,0.1)", padding: "var(--space-2)", borderRadius: "var(--radius-sm)", marginBottom: "var(--space-1)", width: "100%" }}>
                              <span style={{ fontSize: "12px", fontFamily: "monospace", fontWeight: 700 }}>{v.code} (UGX {v.amount.toLocaleString()})</span>
                              <button
                                type="button"
                                className="btn btn--ghost btn--sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(v.code);
                                  alert("Copied code to clipboard!");
                                }}
                                style={{ padding: "2px 6px", fontSize: "10px", height: "auto" }}
                              >
                                Copy
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {checkoutError && <div className="form-error is-visible">{checkoutError}</div>}

                  {cart.length === 0 && voucherCartItems.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-title">Cart is empty.</div>
                      <div className="empty-sub">Tap products or Sell Gift Voucher to add them.</div>
                    </div>
                  ) : (
                    <form onSubmit={handleCheckout} className="pos-checkout-form">
                      <div className="pos-cart-items-wrapper">
                        {cart.map(item => (
                          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-2) 0", borderBottom: "1px solid var(--surface-container-highest)" }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "13px", fontWeight: 600 }}>{item.name}</div>
                              <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>UGX {item.price.toLocaleString()} each</div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <button type="button" className="btn btn--stepper" onClick={() => updateCartQty(item.id, -1)}>
                                <Minus size={12} />
                              </button>
                              <span style={{ fontSize: "13px", fontWeight: 700, minWidth: "18px", textAlign: "center" }}>{item.quantity}</span>
                              <button type="button" className="btn btn--stepper" onClick={() => updateCartQty(item.id, 1, item.inventory)}>
                                <Plus size={12} />
                              </button>
                            </div>
                            <div style={{ fontSize: "13px", fontWeight: 700, minWidth: "90px", textAlign: "right" }}>
                              UGX {(item.price * item.quantity).toLocaleString()}
                            </div>
                          </div>
                        ))}

                        {/* Gift Voucher Cart Items */}
                        {voucherCartItems.map(item => (
                          <div key={item.tempId} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-2) 0", borderBottom: "1px solid var(--surface-container-highest)" }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                                <Sparkles size={14} style={{ color: "var(--color-brand-primary)" }} /> Gift Voucher
                              </div>
                              <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                                Expiry: {new Date(item.expiresAt).toLocaleDateString()}
                                {item.recipientEmail && ` · To: ${item.recipientName || item.recipientEmail}`}
                              </div>
                            </div>
                            <div>
                              <button type="button" className="btn btn--stepper" onClick={() => removeVoucherCartItem(item.tempId)}>
                                <X size={12} />
                              </button>
                            </div>
                            <div style={{ fontSize: "13px", fontWeight: 700, minWidth: "90px", textAlign: "right" }}>
                              UGX {item.amount.toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>

                      {posDeliveryFee > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "var(--space-3)" }}>
                          <span style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>Delivery Fee</span>
                          <span style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>UGX {posDeliveryFee.toLocaleString()}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "var(--space-3)", paddingTop: "var(--space-3)", borderTop: "2px solid var(--surface-container-high)" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600 }}>Total Payable</span>
                        <strong style={{ fontSize: "16px" }}>UGX {posPayableTotal.toLocaleString()}</strong>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Sale Type</label>
                        <div className="tab-strip" style={{ marginBottom: 0 }}>
                          <button
                            type="button"
                            className={`tab-btn${saleChannel === "walk_in" ? " is-active" : ""}`}
                            onClick={() => setSaleChannel("walk_in")}
                            disabled={isCheckoutSubmitting}
                          >
                            Walk-in
                          </button>
                          <button
                            type="button"
                            className={`tab-btn${saleChannel === "whatsapp" ? " is-active" : ""}`}
                            onClick={() => setSaleChannel("whatsapp")}
                            disabled={isCheckoutSubmitting}
                          >
                            WhatsApp Order
                          </button>
                        </div>
                      </div>

                      {saleChannel === "whatsapp" && (
                        <>
                          <div className="form-group">
                            <label className="form-label">Delivery Location</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="e.g. Bukoto, near Kabira Country Club"
                              value={deliveryLocation}
                              onChange={(e) => setDeliveryLocation(e.target.value)}
                              disabled={isCheckoutSubmitting}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Delivery Fee (UGX)</label>
                            <input
                              type="number"
                              min="0"
                              className="form-input"
                              placeholder="e.g. 5000"
                              value={deliveryFeeInput}
                              onChange={(e) => setDeliveryFeeInput(e.target.value)}
                              disabled={isCheckoutSubmitting}
                            />
                            <p className="momo-hint">
                              This order enters the delivery pipeline (packing → dispatch) instead of being marked delivered immediately.
                            </p>
                          </div>
                        </>
                      )}

                      <div className="form-group">
                        <label className="form-label">Staff Who Worked On This</label>
                        <select
                          className="form-input"
                          value={workedByStaffId || user?.id || ""}
                          onChange={(e) => setWorkedByStaffId(e.target.value)}
                          disabled={isCheckoutSubmitting}
                        >
                          {!staffRoster && user && (
                            <option value={user.id}>{user.name}</option>
                          )}
                          {staffRoster?.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Customer Name</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Walk-in Customer"
                          value={posCustomer.name}
                          onChange={(e) => setPosCustomer(prev => ({ ...prev, name: e.target.value }))}
                          required
                          disabled={isCheckoutSubmitting}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Customer Phone (Optional)</label>
                        <input
                          type="tel"
                          className="form-input"
                          placeholder="e.g. +256701..."
                          value={posCustomer.phone}
                          onChange={(e) => setPosCustomer(prev => ({ ...prev, phone: e.target.value }))}
                          disabled={isCheckoutSubmitting}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Customer Email (Optional)</label>
                        <input
                          type="email"
                          className="form-input"
                          placeholder="e.g. customer@domain.com"
                          value={posCustomer.email}
                          onChange={(e) => setPosCustomer(prev => ({ ...prev, email: e.target.value }))}
                          disabled={isCheckoutSubmitting}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Checkout Note</label>
                        <textarea
                          rows={2}
                          className="form-input"
                          placeholder="Special instructions or receipt references..."
                          value={posCustomer.note}
                          onChange={(e) => setPosCustomer(prev => ({ ...prev, note: e.target.value }))}
                          disabled={isCheckoutSubmitting}
                        />
                      </div>

                      {/* Split payment control */}
                      <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <label className="form-label" style={{ margin: 0 }}>Payments / Tenders</label>
                          <button
                            type="button"
                            className="btn btn--secondary btn--sm"
                            onClick={handleAddTender}
                            disabled={isCheckoutSubmitting}
                            style={{ height: "28px", padding: "0 8px", fontSize: "11px" }}
                          >
                            + Add Tender
                          </button>
                        </div>

                        {tenders.map((tender, index) => (
                          <div key={tender.tempId} style={{ background: "var(--surface-container)", padding: "var(--space-3)", borderRadius: "var(--radius-md)", border: "1px solid var(--surface-container-highest)", position: "relative" }}>
                            {tenders.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveTender(tender.tempId)}
                                style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer" }}
                              >
                                <X size={14} />
                              </button>
                            )}

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)", marginBottom: "var(--space-2)", marginTop: tenders.length > 1 ? "12px" : "0" }}>
                              {/* Method Select */}
                              <div>
                                <label className="form-label" style={{ fontSize: "11px" }}>Method</label>
                                <select
                                  className="form-input"
                                  value={tender.method}
                                  onChange={(e) => handleUpdateTender(tender.tempId, "method", e.target.value)}
                                  disabled={isCheckoutSubmitting}
                                  style={{ padding: "0 8px", height: "36px", fontSize: "12px" }}
                                >
                                  <option value="physical">Cash</option>
                                  <option value="momo">Mobile Money (MoMo)</option>
                                  <option value="card">Card</option>
                                  <option value="voucher">Gift Voucher</option>
                                </select>
                              </div>

                              {/* Amount input */}
                              <div>
                                <label className="form-label" style={{ fontSize: "11px" }}>Amount (UGX)</label>
                                <input
                                  type="number"
                                  className="form-input"
                                  value={tender.amount || ""}
                                  onChange={(e) => handleUpdateTender(tender.tempId, "amount", parseFloat(e.target.value) || 0)}
                                  disabled={isCheckoutSubmitting}
                                  style={{ height: "36px", fontSize: "12px" }}
                                  required
                                />
                              </div>
                            </div>

                            {/* Conditional inputs */}
                            {tender.method === "momo" && (
                              <>
                                <div className="form-group" style={{ margin: 0, marginTop: "var(--space-2)" }}>
                                  <label className="form-label" style={{ fontSize: "11px" }}>MoMo Phone</label>
                                  <input
                                    type="tel"
                                    className="form-input"
                                    placeholder="e.g. +256701..."
                                    value={tender.momoPhone || ""}
                                    onChange={(e) => handleUpdateTender(tender.tempId, "momoPhone", e.target.value)}
                                    disabled={isCheckoutSubmitting}
                                    required
                                    style={{ height: "36px", fontSize: "12px" }}
                                  />
                                </div>
                                <div className="form-group" style={{ margin: 0, marginTop: "var(--space-2)" }}>
                                  <label className="form-label" style={{ fontSize: "11px" }}>Transaction ID</label>
                                  <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. MoMo reference"
                                    value={tender.cardOrderId || ""}
                                    onChange={(e) => handleUpdateTender(tender.tempId, "cardOrderId", e.target.value)}
                                    disabled={isCheckoutSubmitting}
                                    required
                                    style={{ height: "36px", fontSize: "12px" }}
                                  />
                                </div>
                              </>
                            )}

                            {tender.method === "card" && (
                              <div className="form-group" style={{ margin: 0, marginTop: "var(--space-2)" }}>
                                <label className="form-label" style={{ fontSize: "11px" }}>Transaction ID</label>
                                <input
                                  type="text"
                                  className="form-input"
                                  placeholder="e.g. terminal reference"
                                  value={tender.cardOrderId || ""}
                                  onChange={(e) => handleUpdateTender(tender.tempId, "cardOrderId", e.target.value)}
                                  disabled={isCheckoutSubmitting}
                                  required
                                  style={{ height: "36px", fontSize: "12px" }}
                                />
                              </div>
                            )}

                            {tender.method === "voucher" && (
                              <VoucherTenderInput
                                token={token}
                                tender={tender}
                                isCheckoutSubmitting={isCheckoutSubmitting}
                                onUpdate={(field, val) => handleUpdateTender(tender.tempId, field, val)}
                                onValidationUpdate={(code, res) => setVoucherValidation(prev => ({ ...prev, [code]: res }))}
                              />
                            )}
                          </div>
                        ))}

                        {/* Remaining to pay readout */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: "var(--radius-md)", background: tendersRemainingToPay === 0 ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", color: tendersRemainingToPay === 0 ? "#16a34a" : "#ef4444", fontSize: "12px", fontWeight: 700 }}>
                          <span>{tendersRemainingToPay >= 0 ? "Remaining to pay" : "Overpaid"}</span>
                          <span>UGX {Math.abs(tendersRemainingToPay).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="toggle-container" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={scheduleReminder}
                            onChange={(e) => {
                              setScheduleReminder(e.target.checked);
                              if (e.target.checked && !reminderDate) setReminderDate(todayStr);
                            }}
                            disabled={isCheckoutSubmitting}
                          />
                          <span className="toggle-slider"></span>
                          <span className="toggle-label" style={{ fontSize: "12px", fontWeight: 700 }}>Schedule a follow-up call / reminder?</span>
                        </label>
                      </div>

                      {scheduleReminder && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", background: "var(--surface-container)", padding: "var(--space-3)", borderRadius: "var(--radius-md)", border: "1px solid var(--surface-container-highest)" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: "11px" }}>Date</label>
                              <input type="date" className="form-input" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} disabled={isCheckoutSubmitting} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: "11px" }}>Time (optional)</label>
                              <input type="time" className="form-input" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} disabled={isCheckoutSubmitting} />
                            </div>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: "11px" }}>Type</label>
                              <select className="form-input" value={reminderType} onChange={(e) => setReminderType(e.target.value)} disabled={isCheckoutSubmitting} style={{ padding: "0 8px", height: "36px", fontSize: "12px" }}>
                                <option value="call">Call</option>
                                <option value="meeting">Meeting</option>
                                <option value="email">Email</option>
                                <option value="other">Other</option>
                              </select>
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: "11px" }}>Priority</label>
                              <select className="form-input" value={reminderPriority} onChange={(e) => setReminderPriority(e.target.value)} disabled={isCheckoutSubmitting} style={{ padding: "0 8px", height: "36px", fontSize: "12px" }}>
                                <option value="low">Low</option>
                                <option value="normal">Normal</option>
                                <option value="high">High</option>
                              </select>
                            </div>
                          </div>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontSize: "11px" }}>Reminder Notes</label>
                            <textarea
                              className="form-input"
                              rows={2}
                              placeholder="e.g. Call to confirm delivery satisfaction..."
                              value={reminderNote}
                              onChange={(e) => setReminderNote(e.target.value)}
                              disabled={isCheckoutSubmitting}
                              style={{ fontSize: "12px" }}
                            />
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        className={`btn btn--primary btn--md btn--full-width${isCheckoutSubmitting ? " is-loading" : ""}`}
                        disabled={
                          isCheckoutSubmitting ||
                          (cart.length === 0 && voucherCartItems.length === 0) ||
                          !posCustomer.name.trim() ||
                          tendersRemainingToPay !== 0 ||
                          tenders.some(t =>
                            (t.method === "momo" && (!t.momoPhone?.trim() || !t.cardOrderId?.trim())) ||
                            (t.method === "card" && !t.cardOrderId?.trim()) ||
                            (t.method === "voucher" && !t.voucherCode?.trim())
                          )
                        }
                      >
                        {isCheckoutSubmitting && <span className="btn-spinner" />}
                        Complete Store Purchase
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: ORDER HISTORY (all orders) */}
          {activeTab === "history" && (
            <div className="admin-tab-panel is-active">
              <div className="page-header">
                <h1 className="admin-page-title">Order History</h1>
                <span style={{ fontSize: "12px", color: "var(--text-tertiary)", alignSelf: "center" }}>
                  Today &middot; Sorted: Newest First
                </span>
              </div>

              {allOrderHistory === undefined ? (
                <div className="empty-state">
                  <div className="empty-title">Loading history...</div>
                </div>
              ) : allOrderHistory.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-title">No orders yet.</div>
                  <div className="empty-sub">All store orders will appear here.</div>
                </div>
              ) : (
                <>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date &amp; Time</th>
                          <th>Customer</th>
                          <th>Type</th>
                          <th>Items</th>
                          <th>Total</th>
                          <th>Status</th>
                          <th style={{ width: "150px" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allOrderHistory.map((order) => (
                          <tr
                            key={order._id}
                            style={{ cursor: "pointer" }}
                            onClick={() => setViewingOrder(order)}
                          >
                            <td style={{ fontSize: "12px", whiteSpace: "nowrap" }}>
                              {new Date(order.createdAt).toLocaleString("en-GB", {
                                day: "2-digit", month: "short", year: "numeric",
                                hour: "2-digit", minute: "2-digit"
                              })}
                            </td>
                            <td className="td-customer">{order.customerName}</td>
                            <td>
                              <span
                                className={`status-badge ${order.isWalkIn ? "status-badge--done" : "status-badge--packing"}`}
                                style={{ fontSize: "10px" }}
                              >
                                {order.isWalkIn ? "Walk-in" : "Online"}
                              </span>
                            </td>
                            <td style={{ textAlign: "center" }}>{order.items?.length || 0}</td>
                            <td style={{ whiteSpace: "nowrap" }}>UGX {order.grandTotal.toLocaleString()}</td>
                            <td>
                              <span className={`status-badge status-badge--${getStatusModifier(order.status)}`}>
                                <span className="status-dot" />
                                {order.status.toUpperCase()}
                              </span>
                            </td>
                            <td
                              className="td-action"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div style={{ display: "flex", gap: "5px" }}>
                                <button
                                  className="btn btn--secondary btn--sm"
                                  onClick={() => setViewingOrder(order)}
                                  title="View full details"
                                >
                                  <Eye size={13} />
                                </button>
                                <button
                                  className="btn btn--outline btn--sm"
                                  onClick={() => {
                                    setLastReceipt(buildReceiptFromOrder(order));
                                    setShowReceipt(true);
                                  }}
                                  title="Print receipt"
                                >
                                  <Printer size={13} />
                                </button>
                                <button
                                  className="btn btn--outline btn--sm"
                                  onClick={() => {
                                    setLastReceipt(buildReceiptFromOrder(order));
                                    setShowReceipt(true);
                                  }}
                                  title="Copy receipt as image"
                                >
                                  <Copy size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {allOrderHistoryStatus === "CanLoadMore" && (
                    <div style={{ textAlign: "center", marginTop: "var(--space-4)" }}>
                      <button
                        className="btn btn--secondary"
                        onClick={() => loadMoreAllOrderHistory(20)}
                      >
                        Load More Orders
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 3: CUSTOMERS CRM */}
          {activeTab === "customers" && (
            <div className="admin-tab-panel is-active">
              <div className="page-header">
                <h1 className="admin-page-title">Customer Directory & Interactions</h1>
                <div className="stock-search-wrap">
                  <Search className="stock-search-icon" size={16} />
                  <input
                    className="stock-search-input"
                    type="text"
                    placeholder="Search by name, phone, email..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                  />
                </div>
              </div>

              {customerList === undefined ? (
                <div className="empty-state">
                  <div className="empty-title">Loading customer roster...</div>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Customer Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Orders Completed</th>
                        <th>Notes Summary</th>
                        <th style={{ width: "120px" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((c) => (
                        <tr key={c.id}>
                          <td className="td-customer">{c.name}</td>
                          <td className="td-email">{c.email || "—"}</td>
                          <td className="td-phone">{c.phone || "—"}</td>
                          <td>{c.ordersCount}</td>
                          <td>{c.customerNotes ? (c.customerNotes.length > 50 ? c.customerNotes.substring(0, 50) + "..." : c.customerNotes) : "No notes logged."}</td>
                          <td className="td-action">
                            <button className="btn btn--secondary btn--sm" onClick={() => setCrmCustomer(c)}>
                              View CRM <ChevronRight size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: LEADS (store requests + back-in-stock signups) */}
          {activeTab === "leads" && (
            <LeadsPanel token={token} />
          )}

          {/* TAB 4: CALENDAR / REMINDERS */}
          {activeTab === "calendar" && (
            <CalendarPanel token={token} onOpenOrder={setPendingOrderId} />
          )}

          {/* TAB 5: RETURNS / EXCHANGES */}
          {activeTab === "returns" && (
            <ReturnsPanel token={token} />
          )}
        </main>
      </div>

      {/* Detail Modal */}
      {viewingOrder && (
        <OrderDetailModal
          order={viewingOrder}
          onClose={() => setViewingOrder(null)}
          onOpenReturn={(order) => navigate(`/admin/orders/${order._id}/exchange`)}
          onClaim={(id) => { handleClaimOrder(id); setViewingOrder(null); }}
          onPrintReceipt={(order) => { setLastReceipt(buildReceiptFromOrder(order)); setShowReceipt(true); }}
          onDispatch={(id) => { setViewingOrder(null); setHandoverOrderId(id); }}
          onComplete={(id) => { handleCompleteOrder(id); setViewingOrder(null); }}
          onMarkFailed={(order) => { setViewingOrder(null); setFailureOrder(order); }}
          token={token}
        />
      )}

      {/* Rider Handover Modal */}
      {handoverOrderId && (() => {
        const handoverOrder = ordersList?.find(o => o._id === handoverOrderId);
        return (
          <HandoverModal
            orderId={handoverOrderId}
            customerName={handoverOrder?.customerName}
            customerPhone={handoverOrder?.customerPhone}
            deliveryAddress={handoverOrder?.deliveryAddress}
            onClose={() => setHandoverOrderId(null)}
            onSubmit={handleHandoverSubmit}
          />
        );
      })()}

      {/* Delivery failure / returns-to-approval modal */}
      {failureOrder && (
        <DeliveryFailureModal
          order={failureOrder}
          onClose={() => setFailureOrder(null)}
          onSubmit={handleReportDeliveryFailure}
        />
      )}

      {/* Customer CRM modal */}
      {crmCustomer && (
        <CustomerActivityModal
          customer={crmCustomer}
          token={token}
          onClose={() => {
            setCrmCustomer(null);
            // Convex automatically updates queries when state changes!
          }}
        />
      )}

      {/* Receipt Modal */}
      {showReceipt && lastReceipt && (
        <ReceiptModal
          receipt={lastReceipt}
          onClose={() => setShowReceipt(false)}
        />
      )}

      {/* Sell Gift Voucher Modal */}
      {showVoucherModal && (
        <div className="modal-overlay is-open">
          <div className="modal" style={{ maxWidth: "450px" }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Sell Gift Voucher</h2>
                <span className="modal-subtitle">Add a custom value voucher to cart</span>
              </div>
              <button className="modal-close" onClick={() => setShowVoucherModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: "var(--space-4)" }}>
              <div className="form-group">
                <label className="form-label">Voucher Value (UGX)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 50000"
                  id="voucher-amount-input"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Expiry Date</label>
                <input
                  type="date"
                  className="form-input"
                  id="voucher-expiry-input"
                  defaultValue={(() => {
                    const d = new Date();
                    d.setFullYear(d.getFullYear() + 1); // 1 year default
                    return d.toISOString().split("T")[0];
                  })()}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Recipient Name (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Jane Doe"
                  id="voucher-recipient-name-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Recipient Email (Optional)</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="e.g. jane@domain.com"
                  id="voucher-recipient-email-input"
                />
              </div>
              <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-4)" }}>
                <button
                  type="button"
                  className="btn btn--secondary btn--full-width"
                  onClick={() => setShowVoucherModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn--primary btn--full-width"
                  onClick={() => {
                    const amountVal = parseFloat(document.getElementById("voucher-amount-input").value);
                    const expiryVal = document.getElementById("voucher-expiry-input").value;
                    const recipientNameVal = document.getElementById("voucher-recipient-name-input").value.trim();
                    const recipientEmailVal = document.getElementById("voucher-recipient-email-input").value.trim();

                    if (!amountVal || amountVal <= 0) {
                      alert("Please enter a valid amount");
                      return;
                    }
                    if (!expiryVal) {
                      alert("Please select an expiry date");
                      return;
                    }

                    const expiresAtMs = new Date(expiryVal).getTime();
                    if (expiresAtMs <= Date.now()) {
                      alert("Expiry date must be in the future");
                      return;
                    }

                    setVoucherCartItems(prev => [
                      ...prev,
                      {
                        tempId: Math.random().toString(36).substr(2, 9),
                        amount: amountVal,
                        expiresAt: expiresAtMs,
                        recipientName: recipientNameVal || undefined,
                        recipientEmail: recipientEmailVal || undefined
                      }
                    ]);
                    setShowVoucherModal(false);
                  }}
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

function VoucherTenderInput({ token, tender, isCheckoutSubmitting, onUpdate, onValidationUpdate }) {
  const [codeInputValue, setCodeInputValue] = React.useState(tender.voucherCode || "");

  // Debounce/sync the input value to the tender state
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onUpdate("voucherCode", codeInputValue.trim().toUpperCase());
    }, 400);
    return () => clearTimeout(timer);
  }, [codeInputValue]);

  const lookupResult = useQuery(
    api.giftVouchers.lookupVoucher,
    tender.voucherCode ? { token, code: tender.voucherCode } : "skip"
  );

  React.useEffect(() => {
    if (lookupResult) {
      onValidationUpdate(tender.voucherCode, lookupResult);
      if (lookupResult.found && lookupResult.redeemable) {
        if (tender.amount > lookupResult.remainingBalance) {
          onUpdate("amount", lookupResult.remainingBalance);
        }
      }
    }
  }, [lookupResult, tender.voucherCode, tender.amount]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
      <div>
        <label className="form-label" style={{ fontSize: "11px" }}>Voucher Code</label>
        <input
          type="text"
          className="form-input"
          placeholder="GV-XXXX-XXXX"
          value={codeInputValue}
          onChange={(e) => setCodeInputValue(e.target.value)}
          disabled={isCheckoutSubmitting}
          required
          style={{ height: "36px", fontSize: "12px", textTransform: "uppercase" }}
        />
      </div>

      {tender.voucherCode && (
        <div style={{ fontSize: "11px", fontWeight: 600 }}>
          {lookupResult === undefined ? (
            <span style={{ color: "var(--text-tertiary)" }}>Verifying voucher code...</span>
          ) : !lookupResult.found ? (
            <span style={{ color: "#ef4444" }}>Voucher not found</span>
          ) : !lookupResult.redeemable ? (
            <span style={{ color: "#ef4444" }}>
              Voucher is not redeemable (Status: {lookupResult.status.toUpperCase()}, Balance: UGX {lookupResult.remainingBalance.toLocaleString()})
            </span>
          ) : (
            <span style={{ color: "#16a34a" }}>
              Redeemable Balance: <strong>UGX {lookupResult.remainingBalance.toLocaleString()}</strong>
              {lookupResult.remainingBalance < tender.amount && (
                <span style={{ display: "block", color: "#eab308" }}>Amount clamped to available balance!</span>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
