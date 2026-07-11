import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Copy, CheckCircle, RotateCcw, Search, Inbox, ShoppingBag, Bell, Megaphone } from "lucide-react";
import CustomerActivityModal from "./CustomerActivityModal";

const STATUS_TABS = [
  { key: "unresolved", label: "Unresolved" },
  { key: "resolved", label: "Resolved" },
  { key: "all", label: "All" },
];

export default function LeadsPanel({ token }) {
  const leads = useQuery(api.leads.getLeads, { token });
  const resolveLeadMutation = useMutation(api.leads.resolveLead);

  const [statusTab, setStatusTab] = useState("unresolved");
  const [search, setSearch] = useState("");
  const [activityCustomer, setActivityCustomer] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const handleCopyPhone = (lead) => {
    if (!lead.phone) return;
    navigator.clipboard.writeText(lead.phone);
    setCopiedId(lead.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleToggleResolved = async (lead) => {
    try {
      await resolveLeadMutation({
        token,
        storeRequestId: lead.kind === "storeRequest" ? lead.id : undefined,
        wishlistItemId: lead.kind === "restockNotify" ? lead.id : undefined,
        notifySignupId: lead.kind === "notifySignup" ? lead.id : undefined,
        resolved: lead.status !== "resolved",
      });
    } catch (err) {
      alert("Failed to update lead: " + err.message);
    }
  };

  const totalCount = leads?.length ?? 0;
  const resolvedCount = leads?.filter((l) => l.status === "resolved").length ?? 0;
  const unresolvedCount = totalCount - resolvedCount;

  const filteredLeads = (leads || [])
    .filter((l) => {
      if (statusTab === "resolved") return l.status === "resolved";
      if (statusTab === "unresolved") return l.status !== "resolved";
      return true;
    })
    .filter((l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.phone?.includes(search) ||
      l.detail?.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="admin-tab-panel is-active">
      <div className="page-header">
        <h1 className="admin-page-title">Leads</h1>
        <div className="stock-search-wrap">
          <Search className="stock-search-icon" size={16} />
          <input
            className="stock-search-input"
            type="text"
            placeholder="Search by name, phone, email, item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {leads === undefined ? (
        <div className="empty-state">
          <div className="empty-title">Loading leads...</div>
        </div>
      ) : (
        <>
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-icon stat-icon--blue">
                <Inbox size={20} />
              </div>
              <span className="stat-value">{totalCount}</span>
              <span className="stat-label">Total Leads</span>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon--saffron">
                <RotateCcw size={20} />
              </div>
              <span className="stat-value">{unresolvedCount}</span>
              <span className="stat-label">Unresolved</span>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon--green">
                <CheckCircle size={20} />
              </div>
              <span className="stat-value">{resolvedCount}</span>
              <span className="stat-label">Resolved</span>
            </div>
          </div>

          <div className="tab-strip">
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

          {filteredLeads.length === 0 ? (
            <div className="empty-state">
              <div className="empty-title">No leads here.</div>
              <div className="empty-sub">Store requests and back-in-stock signups will show up as leads.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Type</th>
                    <th>Wants</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th style={{ width: "220px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => (
                    <tr key={`${lead.kind}-${lead.id}`}>
                      <td className="td-customer">{lead.name}</td>
                      <td className="td-phone">
                        {lead.phone ? (
                          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {lead.phone}
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              title="Copy phone number"
                              onClick={() => handleCopyPhone(lead)}
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
                        <span className={`active-badge ${lead.kind === "storeRequest" ? "active-badge--on" : "active-badge--off"}`}>
                          {lead.kind === "storeRequest" && <ShoppingBag size={12} />}
                          {lead.kind === "restockNotify" && <Bell size={12} />}
                          {lead.kind === "notifySignup" && <Megaphone size={12} />}
                          {lead.kind === "storeRequest" && "Store Request"}
                          {lead.kind === "restockNotify" && "Restock Notify"}
                          {lead.kind === "notifySignup" && "Launch Signup"}
                        </span>
                      </td>
                      <td>{lead.detail}</td>
                      <td>{new Date(lead.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td>
                        <span className={`active-badge ${lead.status === "resolved" ? "active-badge--on" : "active-badge--off"}`}>
                          <span className="active-dot" />
                          {lead.status === "resolved" ? "Resolved" : "New"}
                        </span>
                      </td>
                      <td className="td-action">
                        <div style={{ display: "flex", gap: "5px" }}>
                          <button
                            className="btn btn--secondary btn--sm"
                            onClick={() =>
                              setActivityCustomer({
                                id: lead.userId,
                                name: lead.name,
                                email: lead.email,
                                phone: lead.phone,
                                ordersCount: 0,
                                createdAt: lead.createdAt,
                              })
                            }
                            disabled={!lead.userId}
                            title={lead.userId ? "Add note / schedule reminder" : "No linked customer record"}
                          >
                            Notes & Reminder
                          </button>
                          <button
                            className="btn btn--ghost btn--sm"
                            onClick={() => handleToggleResolved(lead)}
                          >
                            {lead.status === "resolved" ? "Mark Unresolved" : "Mark Resolved"}
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
          customer={activityCustomer}
          token={token}
          onClose={() => setActivityCustomer(null)}
        />
      )}
    </div>
  );
}
