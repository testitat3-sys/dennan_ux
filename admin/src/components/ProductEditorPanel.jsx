import React, { useState } from "react";
import { useQuery, usePaginatedQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useProductDisplayName } from "../hooks/useProductDisplayName";
import { Search, Pencil, Plus, Upload } from "lucide-react";

export default function ProductEditorPanel({ token, navigate, user }) {
  const { getDisplayName } = useProductDisplayName(token);
  const [searchTerm, setSearchTerm] = useState("");

  const {
    results: browseResults,
    status: browseStatus,
    loadMore,
  } = usePaginatedQuery(api.products.getStockList, { token }, { initialNumItems: 25 });

  const searchResults = useQuery(
    api.products.searchStockList,
    searchTerm.trim() ? { token, searchTerm: searchTerm.trim() } : "skip"
  );

  const isSearching = searchTerm.trim().length > 0;
  const productList = isSearching ? searchResults : browseResults;
  const filteredProducts = productList || [];

  return (
    <div className="admin-tab-panel is-active">
      <div className="page-header">
        <h1 className="admin-page-title">Product Catalog Manager</h1>
        <div className="stock-search-wrap">
          <Search className="stock-search-icon" size={16} />
          <input
            className="stock-search-input"
            type="text"
            placeholder="Search products by SKU, barcode, name, brand..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="stock-search-clear" onClick={() => setSearchTerm("")}>×</button>
          )}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className="btn btn--primary btn--sm"
            onClick={() => navigate("/admin/products/new")}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Plus size={14} /> New Product
          </button>
          <button
            className="btn btn--secondary btn--sm"
            onClick={() => navigate("/admin/products/bulk-upload")}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Upload size={14} /> Bulk Upload (.xlsx)
          </button>
        </div>
      </div>

      {productList === undefined ? (
        <div className="empty-state">
          <div className="empty-title">Loading catalog...</div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-title">No products found.</div>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product Details</th>
                  <th>Barcode</th>
                  <th>Category / Brand</th>
                  <th>Retail Price</th>
                  <th>Cost Price</th>
                  <th>Status</th>
                  <th style={{ width: "100px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <strong>{getDisplayName(product)}</strong>
                      {product.sku && (
                        <div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                          SKU: {product.sku}
                        </div>
                      )}
                    </td>
                    <td>{product.barcode || "—"}</td>
                    <td>
                      <div>{product.category || "—"}</div>
                      {product.brand && (
                        <div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                          Brand: {product.brand}
                        </div>
                      )}
                    </td>
                    <td>UGX {(product.price ?? 0).toLocaleString()}</td>
                    <td>UGX {(product.costPrice ?? 0).toLocaleString()}</td>
                    <td>
                      <span className={`status-badge ${product.isActive !== false ? "status-badge--done" : "status-badge--failed"}`}>
                        <span className="status-dot" />
                        {product.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn--secondary btn--sm"
                        onClick={() => navigate(`/admin/products/${product.id}`)}
                        title="Edit product attributes"
                        style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                      >
                        <Pencil size={12} /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!isSearching && browseStatus === "CanLoadMore" && (
            <div style={{ textAlign: "center", marginTop: "var(--space-4)" }}>
              <button className="btn btn--secondary btn--sm" onClick={() => loadMore(25)}>
                Load More
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
