import React, { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import * as XLSX from "xlsx";
import { useStaffAuth } from "../hooks/useStaffAuth";
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Bell,
  X,
  Upload,
  Download,
  FileSpreadsheet,
  Printer,
} from "lucide-react";
import BulkBarcodePrintModal from "../components/BulkBarcodePrintModal";

const BATCH_SIZE = 25;

const NAME_HEADERS = ["name", "product name"];
const BRAND_HEADERS = ["brand"];
const COLOR_HEADERS = ["color"];
const QUANTITY_HEADERS = ["quantity", "inventory"];
const PRICE_HEADERS = ["price"];
const COST_PRICE_HEADERS = ["costprice", "cost price", "cost"];
const BARCODE_HEADERS = ["barcode", "code"];
const CATEGORY_HEADERS = ["category"];
const STAGE_HEADERS = ["stage"];
const TIER_HEADERS = ["tier"];
const DESCRIPTION_HEADERS = ["description"];
const IMAGE_HEADERS = ["image", "primary image", "image url", "picture"];

function normalizeHeader(h) {
  return String(h || "").trim().toLowerCase();
}

function findValue(rowObj, headerAliases) {
  for (const key of Object.keys(rowObj)) {
    if (headerAliases.includes(normalizeHeader(key))) {
      const v = rowObj[key];
      return typeof v === "string" ? v.trim() : v;
    }
  }
  return undefined;
}

// Parses the raw sheet rows into { name, color, quantity, price, barcode, category, stage, tier, description, image }
// plus an `errors` array populated by client-side (Pass 1) validation.
// A row with no recognized-column values at all is dropped entirely (not
// treated as an error) rather than reported as blank.
function parseRows(sheetRows) {
  const parsed = [];
  for (const rawRow of sheetRows) {
    const name = findValue(rawRow, NAME_HEADERS);
    const brandRaw = findValue(rawRow, BRAND_HEADERS);
    const color = findValue(rawRow, COLOR_HEADERS);
    const quantityRaw = findValue(rawRow, QUANTITY_HEADERS);
    const priceRaw = findValue(rawRow, PRICE_HEADERS);
    const costPriceRaw = findValue(rawRow, COST_PRICE_HEADERS);
    const barcodeRaw = findValue(rawRow, BARCODE_HEADERS);
    const categoryRaw = findValue(rawRow, CATEGORY_HEADERS);
    const stageRaw = findValue(rawRow, STAGE_HEADERS);
    const tierRaw = findValue(rawRow, TIER_HEADERS);
    const descriptionRaw = findValue(rawRow, DESCRIPTION_HEADERS);
    const imageRaw = findValue(rawRow, IMAGE_HEADERS);

    const isEntirelyEmpty =
      !name && !brandRaw && !color && quantityRaw === undefined && priceRaw === undefined &&
      costPriceRaw === undefined && !barcodeRaw && !categoryRaw && !stageRaw && !tierRaw &&
      !descriptionRaw && !imageRaw;
    if (isEntirelyEmpty) continue;

    const errors = [];

    if (!name || !String(name).trim()) {
      errors.push("Name is required");
    }

    let price;
    if (priceRaw === undefined || priceRaw === "") {
      errors.push("Price must be a positive number");
    } else {
      price = typeof priceRaw === "number" ? priceRaw : parseFloat(priceRaw);
      if (isNaN(price) || price <= 0) {
        errors.push("Price must be a positive number");
      }
    }

    let quantity;
    if (quantityRaw !== undefined && quantityRaw !== "") {
      quantity = typeof quantityRaw === "number" ? quantityRaw : parseFloat(quantityRaw);
      if (isNaN(quantity)) {
        errors.push("Quantity must be a number");
      } else if (quantity < 0) {
        errors.push("Quantity cannot be negative");
      }
    }

    let costPrice;
    if (costPriceRaw !== undefined && costPriceRaw !== "") {
      costPrice = typeof costPriceRaw === "number" ? costPriceRaw : parseFloat(costPriceRaw);
      if (isNaN(costPrice) || costPrice < 0) {
        errors.push("Cost price must be a positive number");
      } else if (price !== undefined && !isNaN(price) && costPrice >= price) {
        errors.push("Cost price must be less than price");
      }
    }

    const barcode = barcodeRaw ? String(barcodeRaw).trim() : undefined;

    parsed.push({
      name: name ? String(name).trim() : "",
      brand: brandRaw ? String(brandRaw).trim() : undefined,
      color: color ? String(color).trim() : undefined,
      quantity: quantity !== undefined && !isNaN(quantity) ? quantity : undefined,
      price,
      costPrice: costPrice !== undefined && !isNaN(costPrice) ? costPrice : undefined,
      barcode,
      category: categoryRaw ? String(categoryRaw).trim() : undefined,
      stage: stageRaw ? String(stageRaw).trim() : undefined,
      tier: tierRaw ? String(tierRaw).trim() : undefined,
      description: descriptionRaw ? String(descriptionRaw).trim() : undefined,
      image: imageRaw ? String(imageRaw).trim() : undefined,
      errors,
    });
  }

  // Flag in-file duplicate barcodes (across otherwise-valid rows).
  const barcodeToRows = new Map();
  parsed.forEach((row, idx) => {
    if (!row.barcode) return;
    if (!barcodeToRows.has(row.barcode)) barcodeToRows.set(row.barcode, []);
    barcodeToRows.get(row.barcode).push(idx);
  });
  for (const [barcode, idxs] of barcodeToRows.entries()) {
    if (idxs.length < 2) continue;
    idxs.forEach((idx) => {
      const others = idxs.filter((i) => i !== idx).map((i) => i + 1).join(", ");
      parsed[idx].errors.push(`Barcode "${barcode}" is duplicated in this file (also row ${others})`);
    });
  }

  return parsed;
}

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([["Name", "Brand", "Color", "Quantity", "Price", "CostPrice", "Barcode", "Category", "Stage", "Tier", "Description", "Image"]]);
  XLSX.utils.book_append_sheet(wb, ws, "Products");
  XLSX.writeFile(wb, "bulk-product-upload-template.xlsx");
}

export default function AdminBulkProductUpload() {
  const navigate = useNavigate();
  const { token, user } = useStaffAuth();
  const isStockManager = user?.accountRole === "stockManager";
  const fileInputRef = useRef(null);
  const bulkCreateMutation = useMutation(api.products.bulkCreateStoreOnlyProducts);
  const requestBulkUploadMutation = useMutation(api.stockRequests.requestBulkUpload);

  const [rows, setRows] = useState([]); // parsed rows with `errors`
  const [fileName, setFileName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState(null); // per-row outcome after import
  const [toasts, setToasts] = useState([]);
  const [showBulkPrint, setShowBulkPrint] = useState(false);

  const showToast = (message, type = "info") => {
    const id = Date.now() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  };

  const handleFile = async (file) => {
    if (!file) return;
    setResults(null);
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const sheetRows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
      const parsed = parseRows(sheetRows);
      setRows(parsed);
      if (parsed.length === 0) {
        showToast("No product rows found in that file.", "error");
      }
    } catch (err) {
      showToast(err.message || "Failed to read the xlsx file.", "error");
      setRows([]);
    }
  };

  const validRows = rows.filter((r) => r.errors.length === 0);
  const invalidCount = rows.length - validRows.length;
  const createdProducts = (results || []).filter((o) => o?.success && o.outcome !== "updated");

  const handleImport = async () => {
    if (isImporting || validRows.length === 0) return;
    setIsImporting(true);
    setResults(null);
    setProgress({ done: 0, total: validRows.length });

    if (isStockManager) {
      try {
        const rowsToSubmit = validRows.map((r) => ({
          name: r.name,
          brand: r.brand,
          color: r.color,
          quantity: r.quantity,
          price: r.price,
          costPrice: r.costPrice,
          barcode: r.barcode,
          category: r.category,
          stage: r.stage,
          tier: r.tier,
          description: r.description,
          image: r.image,
        }));
        await requestBulkUploadMutation({ token, rows: rowsToSubmit });
        showToast(`Bulk upload request for ${validRows.length} product(s) submitted for admin approval.`, "success");
      } catch (err) {
        showToast(err.message || "Failed to submit bulk upload request.", "error");
      } finally {
        setIsImporting(false);
      }
      return;
    }

    const outcomes = new Array(rows.length).fill(null);
    rows.forEach((row, idx) => {
      if (row.errors.length > 0) {
        outcomes[idx] = { success: false, error: row.errors.join("; ") };
      }
    });

    // Map validRows back to their original index in `rows`.
    const validIndexes = rows
      .map((row, idx) => (row.errors.length === 0 ? idx : null))
      .filter((idx) => idx !== null);

    try {
      for (let start = 0; start < validRows.length; start += BATCH_SIZE) {
        const batch = validRows.slice(start, start + BATCH_SIZE);
        const batchResult = await bulkCreateMutation({
          token,
          rows: batch.map((r) => ({
            name: r.name,
            brand: r.brand,
            color: r.color,
            quantity: r.quantity,
            price: r.price,
            costPrice: r.costPrice,
            barcode: r.barcode,
            category: r.category,
            stage: r.stage,
            tier: r.tier,
            description: r.description,
            image: r.image,
          })),
        });
        batchResult.forEach((res, i) => {
          const originalIndex = validIndexes[start + i];
          outcomes[originalIndex] = {
            success: res.success,
            outcome: res.outcome,
            error: res.error,
            barcode: res.barcode,
            name: res.name,
            price: res.price,
          };
        });
        setProgress({ done: Math.min(start + BATCH_SIZE, validRows.length), total: validRows.length });
      }

      const createdCount = outcomes.filter((o) => o?.outcome === "created").length;
      const updatedCount = outcomes.filter((o) => o?.outcome === "updated").length;
      const rejectedCount = outcomes.filter((o) => o?.outcome === "rejected_would_reduce").length;
      const errorCount = outcomes.filter((o) => o && !o.success && o.outcome !== "rejected_would_reduce").length;
      setResults(outcomes);
      showToast(
        `Import finished: ${createdCount} created, ${updatedCount} updated, ${rejectedCount} rejected (would reduce stock), ${errorCount} failed.`,
        rejectedCount > 0 || errorCount > 0 ? "error" : "success"
      );
    } catch (err) {
      showToast(err.message || "Bulk import failed.", "error");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="staff-portal-body">
      <div className="product-edit-page-container">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link to="/" className="breadcrumb-link">Admin</Link>
          <span className="breadcrumb-separator">›</span>
          <Link to="/?tab=stock" className="breadcrumb-link">Stock Manager</Link>
          <span className="breadcrumb-separator">›</span>
          <span className="breadcrumb-current">Bulk Upload</span>
        </nav>

        <header className="product-edit-header">
          <div className="product-edit-title-group">
            <button
              className="product-edit-back-btn"
              onClick={() => navigate("/?tab=stock")}
              title="Back to Stock Manager"
              type="button"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="product-edit-title">Bulk Product Upload</h1>
          </div>
        </header>

        <div className="product-edit-card">
          <h2 className="product-edit-card-title">Bulk Import via XLSX</h2>
          <p style={{ color: "var(--text-tertiary)", marginBottom: "16px" }}>
            Every row defaults to a <strong>Store-Only</strong> product (hidden from the storefront, visible in POS and Stock Manager).
            Products become <strong>Customer-Facing</strong> automatically only if <em>all</em> non-optional product creation fields (Name, Price, Category, Stage, Tier, Description, and Primary Image) are supplied in the XLSX.
          </p>

          <div className="table-wrap" style={{ marginBottom: "16px" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Required?</th>
                  <th>Type</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Name</strong> (Product Name)</td>
                  <td>Required</td>
                  <td>Text</td>
                  <td>Non-empty.</td>
                </tr>
                <tr>
                  <td><strong>Price</strong></td>
                  <td>Required</td>
                  <td>Number</td>
                  <td>Must be greater than 0.</td>
                </tr>
                <tr>
                  <td>Category</td>
                  <td>Optional</td>
                  <td>Text</td>
                  <td>Required for Customer-Facing. Must match standard category names.</td>
                </tr>
                <tr>
                  <td>Stage</td>
                  <td>Optional</td>
                  <td>Text</td>
                  <td>Required for Customer-Facing. Allowed values: mother, newborn, kid.</td>
                </tr>
                <tr>
                  <td>Tier</td>
                  <td>Optional</td>
                  <td>Text</td>
                  <td>Required for Customer-Facing. Allowed values: essentials, musthaves, luxuries.</td>
                </tr>
                <tr>
                  <td>Description</td>
                  <td>Optional</td>
                  <td>Text</td>
                  <td>Required for Customer-Facing. Product detail text.</td>
                </tr>
                <tr>
                  <td>Image (Primary Image, Picture)</td>
                  <td>Optional</td>
                  <td>URL</td>
                  <td>Required for Customer-Facing. Direct image URL.</td>
                </tr>
                <tr>
                  <td>Brand</td>
                  <td>Optional</td>
                  <td>Text</td>
                  <td>Defaults to "no-brand" if left blank.</td>
                </tr>
                <tr>
                  <td>Color</td>
                  <td>Optional</td>
                  <td>Text</td>
                  <td>Left blank if omitted.</td>
                </tr>
                <tr>
                  <td>Quantity (Inventory)</td>
                  <td>Optional</td>
                  <td>Whole number</td>
                  <td>Defaults to 0. Cannot be negative.</td>
                </tr>
                <tr>
                  <td>CostPrice (Cost Price, Cost)</td>
                  <td>Optional</td>
                  <td>Number</td>
                  <td>Must be less than the Price for that row if supplied.</td>
                </tr>
                <tr>
                  <td>Barcode (Code)</td>
                  <td>Optional</td>
                  <td>Text</td>
                  <td>Auto-assigned if blank. If matching an existing product, updates price/stock instead.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
            <button type="button" className="btn btn--secondary btn--sm" onClick={downloadTemplate}>
              <Download size={14} style={{ marginRight: "6px" }} />
              Download Template
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet size={14} style={{ marginRight: "6px" }} />
              Choose .xlsx File
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
            {fileName && <span style={{ alignSelf: "center", color: "var(--text-tertiary)" }}>{fileName}</span>}
          </div>

          {rows.length > 0 && (
            <>
              <p style={{ marginBottom: "12px" }}>
                <strong>{validRows.length}</strong> valid row{validRows.length === 1 ? "" : "s"},{" "}
                <strong>{invalidCount}</strong> row{invalidCount === 1 ? "" : "s"} with errors.
              </p>

              <div className="table-wrap" style={{ marginBottom: "16px" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Brand</th>
                      <th>Color</th>
                      <th>Quantity</th>
                      <th>Price</th>
                      <th>Cost Price</th>
                      <th>Barcode</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => {
                      const outcome = results?.[idx];
                      return (
                        <tr key={idx} className={row.errors.length > 0 ? "stock-row-oos" : ""}>
                          <td>{idx + 1}</td>
                          <td>{row.name || "—"}</td>
                          <td>{row.brand || "no-brand"}</td>
                          <td>{row.color || "—"}</td>
                          <td>{row.quantity ?? 0}</td>
                          <td>{row.price ?? "—"}</td>
                          <td>{row.costPrice ?? "—"}</td>
                          <td>{row.barcode || "auto"}</td>
                          <td>
                            {outcome ? (
                              outcome.success ? (
                                <span className="status-badge status-badge--completed">
                                  <CheckCircle size={12} /> {outcome.outcome === "updated" ? "Updated" : "Created"}
                                </span>
                              ) : outcome.outcome === "rejected_would_reduce" ? (
                                <span className="status-badge status-badge--failed" title={outcome.error}>
                                  <AlertCircle size={12} /> Rejected: would reduce stock
                                </span>
                              ) : (
                                <span className="status-badge status-badge--failed" title={outcome.error}>
                                  <AlertCircle size={12} /> {outcome.error}
                                </span>
                              )
                            ) : row.errors.length > 0 ? (
                              <span className="status-badge status-badge--failed" title={row.errors.join("; ")}>
                                <AlertCircle size={12} /> Will not be imported: {row.errors.join("; ")}
                              </span>
                            ) : (
                              <span style={{ color: "var(--text-tertiary)" }}>Ready</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn-primary-filled"
                  onClick={handleImport}
                  disabled={isImporting || validRows.length === 0}
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
                >
                  <Upload size={16} />
                  {isImporting
                    ? isStockManager
                      ? "Submitting..."
                      : `Importing… (${progress.done}/${progress.total})`
                    : isStockManager
                    ? `Submit Bulk Upload for Approval (${validRows.length})`
                    : `Import ${validRows.length} Product${validRows.length === 1 ? "" : "s"}`}
                </button>
                {createdProducts.length > 0 && (
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => setShowBulkPrint(true)}
                    style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
                  >
                    <Printer size={16} />
                    Print All Barcodes ({createdProducts.length})
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {showBulkPrint && (
        <BulkBarcodePrintModal
          products={createdProducts}
          onClose={() => setShowBulkPrint(false)}
        />
      )}

      <div id="toast-container" aria-live="assertive" aria-atomic="true">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type} is-visible`}>
            <span className="toast-icon">
              {t.type === "success" ? <CheckCircle size={18} /> : t.type === "error" ? <AlertCircle size={18} /> : <Bell size={18} />}
            </span>
            <span className="toast-msg">{t.message}</span>
            <button className="toast-close" onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
