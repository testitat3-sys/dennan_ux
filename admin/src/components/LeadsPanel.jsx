import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTrackedQuery } from "../hooks/useTrackedQuery";
import { Copy, CheckCircle, RotateCcw, ShoppingBag, Bell, Megaphone, UserPlus, Calendar, PhoneCall, AlertTriangle } from "lucide-react";
import CustomerActivityModal from "./CustomerActivityModal";
import LeadDetailModal from "./LeadDetailModal";
import { useTableSortAndFilter } from "../hooks/useTableSortAndFilter";
import { SortableHeader, TableFilterBar } from "./DataTableControls";

const STATUS_TABS = [
  { key: "unresolved", label: "Unresolved" },
  { key: "resolved", label: "Resolved" },
  { key: "all", label: "All" },
];

const CHANNEL_CONFIG = [
  { key: "tiktok", label: "TikTok", color: "#00f2fe", icon: "🎵" },
  { key: "instagram", label: "Instagram", color: "#e1306c", icon: "📸" },
  { key: "friend", label: "A Friend", color: "#3b82f6", icon: "👥" },
  { key: "google", label: "Google", color: "#10b981", icon: "🔍" },
  { key: "chatgpt", label: "ChatGPT / AI", color: "#8b5cf6", icon: "✨" },
  { key: "other", label: "Other", color: "#6b7280", icon: "💬" },
];

const LEAD_TYPE_OPTIONS = [
  { value: "all", label: "All Lead Types" },
  { value: "storeRequest", label: "Order Reminder" },
  { value: "restockNotify", label: "Restock Notify" },
  { value: "notifySignup", label: "Launch Signup" },
  { value: "preLaunchSignup", label: "Pre-Launch" },
];

const EVENT_STATUS_OPTIONS = [
  { value: "all", label: "All Events" },
  { value: "upcoming", label: "Has Upcoming Event" },
  { value: "overdue", label: "Overdue - Not Contacted" },
  { value: "contacted", label: "Contacted" },
  { value: "none", label: "No Scheduled Event" },
];

const EVENT_STATUS_CONFIG = {
  upcoming: { label: "Upcoming", badgeClass: "active-badge--off", icon: Calendar },
  overdue: { label: "Overdue - Not Contacted", badgeClass: "active-badge--red", icon: AlertTriangle },
  contacted: { label: "Contacted", badgeClass: "active-badge--on", icon: PhoneCall },
  none: { label: "—", badgeClass: "active-badge--off", icon: null },
};

// convex/leads.ts's resolveLead is a discriminated union keyed by which id
// field is set (storeRequestId | wishlistItemId | notifySignupId |
// preLaunchUserId), not by a generic `kind`/`id` pair - map lead.kind to the
// right field name here rather than at every call site.
const LEAD_KIND_TO_RESOLVE_ID_FIELD = {
  storeRequest: "storeRequestId",
  restockNotify: "wishlistItemId",
  notifySignup: "notifySignupId",
  preLaunchSignup: "preLaunchUserId",
};

export default function LeadsPanel({ token }) {
  const leads = useTrackedQuery(api.leads.getLeads, { token });
  const referralStats = useTrackedQuery(api.referralSources.getReferralSourceStats, { token });
  const resolveLeadMutation = useMutation(api.leads.resolveLead);
  const ensureLeadUserMutation = useMutation(api.leads.ensureLeadUser);

  const [statusTab, setStatusTab] = useState("unresolved");
  const [activityCustomer, setActivityCustomer] = useState(null);
  const [viewingLead, setViewingLead] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [loadingLeadId, setLoadingLeadId] = useState(null);

  const rawLeadsForTab = (leads || []).filter((l) => {
    if (statusTab === "resolved") return l.status === "resolved";
    if (statusTab === "unresolved") return l.status !== "resolved";
    return true;
  });

  const {
    processedData: filteredLeads,
    sortConfig,
    requestSort,
    searchQuery,
    setSearchQuery,
    filterValues,
    setFilterValue,
    resetFilters,
    isFiltered,
    totalCount: totalTabLeads,
    filteredCount,
  } = useTableSortAndFilter(rawLeadsForTab, {
    searchFields: ["name", "email", "phone", "detail", "kind", "stageLabel", "itemDescription"],
    initialSort: { key: "createdAt", direction: "desc" },
    customSorts: {
      eventStatus: (a, b) => {
        const rank = { overdue: 0, upcoming: 1, contacted: 2, none: 3 };
        return (rank[a.eventStatus ?? "none"] ?? 3) - (rank[b.eventStatus ?? "none"] ?? 3);
      },
    },
  });

  const handleCopyPhone = (lead) => {
    if (!lead.phone) return;
    navigator.clipboard.writeText(lead.phone);
    setCopiedId(lead.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleOpenNotes = async (lead) => {
    setLoadingLeadId(lead.id);
    try {
      let userId = lead.userId;
      if (!userId) {
        const res = await ensureLeadUserMutation({
          token,
          leadKind: lead.kind,
          leadId: lead.id,
        });
        userId = res.userId;
      }
      setActivityCustomer({
        _id: userId,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
      });
    } catch (err) {
      console.error("Failed to ensure lead user:", err);
    } finally {
      setLoadingLeadId(null);
    }
  };

  const totalCount = leads?.length ?? 0;
  const resolvedCount = leads?.filter((l) => l.status === "resolved").length ?? 0;
  const unresolvedCount = totalCount - resolvedCount;

  const showReferralGraphic = referralStats && referralStats.total >= 10;

  return (
    <div className="admin-tab-panel is-active">
      <div className="page-header">
        <h1 className="admin-page-title">Leads</h1>
      </div>

      {leads === undefined ? (
        <div className="empty-state">
          <div className="empty-title">Loading leads...</div>
        </div>
      ) : (
        <>
          {showReferralGraphic && (
            <div className="referral-breakdown-card">
              <div className="referral-breakdown-header">
                <div>
                  <h3 className="referral-breakdown-title">How Customers Hear About Us</h3>
                  <span className="referral-breakdown-sub">
                    Based on {referralStats.total} store signups
                  </span>
                </div>
              </div>
              <div className="referral-channel-grid">
                {CHANNEL_CONFIG.map((ch) => {
                  const count = referralStats.counts?.[ch.key] || 0;
                  const pct = referralStats.proportions?.[ch.key] || 0;
                  return (
                    <div key={ch.key} className="referral-channel-item">
                      <div className="referral-channel-top">
                        <div className="referral-channel-label">
                          <span className="referral-channel-icon">{ch.icon}</span>
                          <span>{ch.label}</span>
                        </div>
                        <div className="referral-channel-stats">
                          <span className="referral-channel-pct" style={{ color: ch.color }}>{pct}%</span>
                          <span className="referral-channel-count">({count})</span>
                        </div>
                      </div>
                      <div className="referral-channel-track">
                        <div
                          className="referral-channel-fill"
                          style={{ width: `${pct}%`, backgroundColor: ch.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
            <div className="tab-strip" style={{ margin: 0 }}>
              {STATUS_TABS.map((t) => (
                <button
                  key={t.key}
                  className={`tab-btn ${statusTab === t.key ? "is-active" : ""}`}
                  onClick={() => setStatusTab(t.key)}
                >
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <TableFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search leads by name, phone, email..."
            filterValues={filterValues}
            onFilterChange={(key, val) => setFilterValue(key, val === "all" ? "" : val)}
            filters={[
              { key: "kind", width: "160px", options: LEAD_TYPE_OPTIONS },
              { key: "eventStatus", width: "190px", options: EVENT_STATUS_OPTIONS },
            ]}
            isFiltered={isFiltered}
            onResetFilters={resetFilters}
            totalCount={totalTabLeads}
            filteredCount={filteredCount}
          />

          {filteredLeads.length === 0 ? (
            <div className="empty-state">
              <div className="empty-title">No leads match filter criteria.</div>
              <div className="empty-sub">Store requests and back-in-stock signups will show up here.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <SortableHeader sortKey="name" sortConfig={sortConfig} onRequestSort={requestSort}>
                      Name
                    </SortableHeader>
                    <SortableHeader sortKey="phone" sortConfig={sortConfig} onRequestSort={requestSort}>
                      Contact
                    </SortableHeader>
                    <SortableHeader sortKey="kind" sortConfig={sortConfig} onRequestSort={requestSort}>
                      Type
                    </SortableHeader>
                    <SortableHeader sortKey="createdAt" sortConfig={sortConfig} onRequestSort={requestSort}>
                      Date
                    </SortableHeader>
                    <SortableHeader sortKey="eventStatus" sortConfig={sortConfig} onRequestSort={requestSort}>
                      Scheduled Event
                    </SortableHeader>
                    <SortableHeader sortKey="status" sortConfig={sortConfig} onRequestSort={requestSort}>
                      Status
                    </SortableHeader>
                    <th style={{ width: "220px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => (
                    <tr
                      key={`${lead.kind}-${lead.id}`}
                      onClick={() => setViewingLead(lead)}
                      style={{ cursor: "pointer" }}
                    >
                      <td className="td-customer">{lead.name}</td>
                      <td className="td-phone">
                        {lead.phone ? (
                          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {lead.phone}
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              title="Copy phone number"
                              onClick={(e) => { e.stopPropagation(); handleCopyPhone(lead); }}
                              style={{ padding: "2px 6px", height: "auto" }}
                            >
                              <Copy size={12} />
                            </button>
                            {copiedId === lead.id && <span style={{ fontSize: "11px", color: "#16a34a" }}>Copied!</span>}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <span className={`active-badge ${lead.kind === "storeRequest" ? "active-badge--on" : lead.kind === "preLaunchSignup" ? "active-badge--purple" : "active-badge--off"}`}>
                          {lead.kind === "storeRequest" && <ShoppingBag size={12} />}
                          {lead.kind === "restockNotify" && <Bell size={12} />}
                          {lead.kind === "notifySignup" && <Megaphone size={12} />}
                          {lead.kind === "preLaunchSignup" && <UserPlus size={12} />}
                          {lead.kind === "storeRequest" && "Order Reminder"}
                          {lead.kind === "restockNotify" && "Restock Notify"}
                          {lead.kind === "notifySignup" && "Launch Signup"}
                          {lead.kind === "preLaunchSignup" && "Pre-Launch"}
                        </span>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {(() => {
                          const cfg = EVENT_STATUS_CONFIG[lead.eventStatus] || EVENT_STATUS_CONFIG.none;
                          const EventIcon = cfg.icon;
                          if (lead.eventStatus === "none" || !lead.eventDate) {
                            return <span style={{ color: "var(--text-tertiary)" }}>—</span>;
                          }
                          return (
                            <span
                              className={`active-badge ${cfg.badgeClass}`}
                              title={lead.eventNote || undefined}
                            >
                              {EventIcon && <EventIcon size={12} />}
                              {cfg.label} · {new Date(lead.eventDate).toLocaleDateString()}
                            </span>
                          );
                        })()}
                      </td>
                      <td>
                        <span className={`active-badge ${lead.status === "resolved" ? "active-badge--on" : "active-badge--yellow"}`}>
                          {lead.status === "resolved" ? "Resolved" : "Open"}
                        </span>
                      </td>
                      <td className="td-action" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            className="btn btn--secondary btn--sm"
                            onClick={() => handleOpenNotes(lead)}
                            disabled={loadingLeadId === lead.id}
                          >
                            {loadingLeadId === lead.id ? "Loading..." : "Activity & Notes"}
                          </button>
                          <button
                            type="button"
                            className={`btn btn--sm ${lead.status === "resolved" ? "btn--ghost" : "btn--primary"}`}
                            onClick={async () => {
                              await resolveLeadMutation({
                                token,
                                [LEAD_KIND_TO_RESOLVE_ID_FIELD[lead.kind]]: lead.id,
                                resolved: lead.status !== "resolved",
                              });
                            }}
                            title={lead.status === "resolved" ? "Re-open" : "Mark resolved"}
                          >
                            {lead.status === "resolved" ? <RotateCcw size={13} /> : <CheckCircle size={13} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activityCustomer && (
        <CustomerActivityModal
          token={token}
          customer={activityCustomer}
          onClose={() => setActivityCustomer(null)}
        />
      )}

      {viewingLead && (
        <LeadDetailModal
          lead={viewingLead}
          onClose={() => setViewingLead(null)}
          onResolve={async (leadToResolve) => {
            await resolveLeadMutation({
              token,
              [LEAD_KIND_TO_RESOLVE_ID_FIELD[leadToResolve.kind]]: leadToResolve.id,
              resolved: leadToResolve.status !== "resolved",
            });
            setViewingLead(null);
          }}
          onOpenNotes={(leadForNotes) => {
            setViewingLead(null);
            handleOpenNotes(leadForNotes);
          }}
        />
      )}
    </div>
  );
}
