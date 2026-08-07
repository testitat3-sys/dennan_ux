import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Search, X, Plus, Trash2, Upload, AlertCircle, PackagePlus, Check, Image as ImageIcon } from "lucide-react";

// Maximum image size limit (2 MB) to prevent heavy image uploads
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export default function CreatePackageModal({ isOpen, onClose, token, showToast, onPackageCreated }) {
  const [packageName, setPackageName] = useState("");
  const [packageImage, setPackageImage] = useState("");
  const [packageImageError, setPackageImageError] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState("");
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState([]); // array of { product, quantity }
  
  const [packagePrice, setPackagePrice] = useState("");
  const [wasPrice, setWasPrice] = useState("");
  const [category, setCategory] = useState("Expectant and New Mom Essentials");
  const [stage, setStage] = useState("newborn");
  const [tier, setTier] = useState("essentials");
  const [description, setDescription] = useState("");
  const [inventory, setInventory] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const generateCloudinarySignature = useMutation(api.products.generateCloudinarySignature);
  const createPackageProduct = useMutation(api.products.createPackageProduct);

  // Search through storefront products ONLY (actual_data === true enforced by backend query)
  const storefrontProducts = useQuery(
    api.products.searchStorefrontProductsForPackage,
    isOpen ? { token, searchTerm } : "skip"
  );

  // Calculate sum of selected storefront product items
  const calculatedTotalValue = selectedItems.reduce((acc, item) => {
    return acc + (item.product.price || 0) * item.quantity;
  }, 0);

  // Auto-update price field when selected items change if price is empty or equal to previous calculated value
  useEffect(() => {
    if (calculatedTotalValue > 0 && (!packagePrice || packagePrice === 0)) {
      setPackagePrice(calculatedTotalValue.toString());
    }
  }, [calculatedTotalValue]);

  if (!isOpen) return null;

  const handleResetForm = () => {
    setPackageName("");
    setPackageImage("");
    setPackageImageError("");
    setSearchTerm("");
    setSelectedItems([]);
    setPackagePrice("");
    setWasPrice("");
    setCategory("Expectant and New Mom Essentials");
    setStage("newborn");
    setTier("essentials");
    setDescription("");
    setInventory(10);
    setFormError("");
  };

  const handleClose = () => {
    handleResetForm();
    onClose();
  };

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPackageImageError("");

    // Validate image file size: "Don't allow heavy images"
    if (file.size > MAX_IMAGE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setPackageImageError(`Image is too heavy (${sizeMB} MB). Maximum allowed size is 2.0 MB.`);
      return;
    }

    setIsUploadingImage(true);
    try {
      const { signature, timestamp, apiKey, cloudName } = await generateCloudinarySignature({ token });
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("timestamp", String(timestamp));
      formData.append("signature", signature);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Image upload failed.");
      }

      const data = await res.json();
      if (data.secure_url) {
        setPackageImage(data.secure_url);
        setPackageImageError("");
      } else {
        throw new Error("Failed to receive image URL.");
      }
    } catch (err) {
      setPackageImageError(err.message || "Failed to upload image. You can also paste an image URL directly.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleAddProduct = (product) => {
    setSelectedItems((prev) => {
      const existing = prev.find((item) => item.product._id === product._id);
      if (existing) {
        return prev.map((item) =>
          item.product._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (productId, newQty) => {
    const qty = parseInt(newQty, 10);
    if (isNaN(qty) || qty <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setSelectedItems((prev) =>
      prev.map((item) => (item.product._id === productId ? { ...item, quantity: qty } : item))
    );
  };

  const handleRemoveItem = (productId) => {
    setSelectedItems((prev) => prev.filter((item) => item.product._id !== productId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!packageName.trim()) {
      setFormError("Package Name is mandatory.");
      return;
    }

    if (!packageImage.trim()) {
      setFormError("Package Image is mandatory. Please upload an image or provide an image URL.");
      return;
    }

    if (selectedItems.length === 0) {
      setFormError("Please select at least one storefront product to create the package.");
      return;
    }

    const priceNum = parseFloat(packagePrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setFormError("Please provide a valid package selling price greater than 0.");
      return;
    }

    setIsSubmitting(true);
    try {
      const itemsPayload = selectedItems.map((item) => ({
        productId: item.product._id,
        quantity: item.quantity,
      }));

      await createPackageProduct({
        token,
        name: packageName.trim(),
        image: packageImage.trim(),
        items: itemsPayload,
        price: priceNum,
        wasPrice: wasPrice ? parseFloat(wasPrice) : undefined,
        category,
        stage,
        tier,
        description: description.trim(),
        inventory: parseInt(inventory, 10) || 10,
      });

      if (showToast) {
        showToast(`Package '${packageName.trim()}' created successfully!`, "success");
      }
      if (onPackageCreated) {
        onPackageCreated();
      }
      handleClose();
    } catch (err) {
      setFormError(err.message || "Failed to create product package.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay is-open" onClick={handleClose}>
      <div
        className="modal package-create-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "850px", width: "95%" }}
      >
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <PackagePlus size={22} className="accent-icon" />
            <div>
              <h2 className="modal-title">Create Product Package</h2>
              <span className="modal-subtitle">Bundle existing storefront products into a package</span>
            </div>
          </div>
          <button className="modal-close" onClick={handleClose} type="button">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form package-modal-form">
          {formError && (
            <div className="alert-box alert-box--error" style={{ marginBottom: "16px" }}>
              <AlertCircle size={18} />
              <span>{formError}</span>
            </div>
          )}

          {/* Top mandatory fields: Package Name & Image */}
          <div className="package-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            {/* Package Name Entry */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>
                Package Name <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Newborn Starter Bundle"
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                required
              />
              <span className="form-help-text">Give a clear descriptive title for this bundle</span>
            </div>

            {/* Package Image Entry (Mandatory, Max 2MB check) */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>
                Package Image (Mandatory) <span style={{ color: "#ef4444" }}>*</span>
              </label>
              
              {packageImage ? (
                <div className="package-image-preview-card" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px", background: "var(--surface-container-high, #1a202c)", borderRadius: "8px", border: "1px solid var(--outline-variant, #2d3748)" }}>
                  <img
                    src={packageImage}
                    alt="Package preview"
                    style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "6px" }}
                  />
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <span style={{ fontSize: "0.85rem", wordBreak: "break-all", display: "block" }}>{packageImage.slice(0, 45)}...</span>
                    <span style={{ fontSize: "0.75rem", color: "#10b981", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Check size={14} /> Image set
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-icon btn-ghost"
                    onClick={() => setPackageImage("")}
                    title="Remove image"
                    style={{ color: "#ef4444" }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <div>
                  <div className="image-upload-zone" style={{ border: packageImageError ? "2px dashed #ef4444" : "2px dashed var(--outline-variant, #4a5568)", padding: "16px", borderRadius: "8px", textAlign: "center", background: "rgba(0,0,0,0.02)" }}>
                    <input
                      type="file"
                      id="package-image-file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      style={{ display: "none" }}
                    />
                    <label htmlFor="package-image-file" style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                      <Upload size={24} style={{ color: "var(--primary, #3b82f6)" }} />
                      <span style={{ fontWeight: 500, fontSize: "0.9rem" }}>
                        {isUploadingImage ? "Uploading image..." : "Click to upload package image"}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                        Maximum file size: 2.0 MB (Heavy images disallowed)
                      </span>
                    </label>
                  </div>
                  
                  {/* Fallback direct URL input */}
                  <div style={{ marginTop: "8px" }}>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="Or paste image URL (https://...)"
                      value={packageImage}
                      onChange={(e) => {
                        setPackageImage(e.target.value);
                        setPackageImageError("");
                      }}
                      style={{ fontSize: "0.85rem", padding: "6px 10px" }}
                    />
                  </div>
                </div>
              )}

              {packageImageError && (
                <div style={{ marginTop: "6px", color: "#ef4444", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "4px" }}>
                  <AlertCircle size={14} />
                  <span>{packageImageError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section: Search and Select Storefront Products */}
          <div className="package-products-section" style={{ background: "var(--surface-container, #131722)", padding: "16px", borderRadius: "10px", marginBottom: "20px", border: "1px solid var(--outline-variant, #2a2f3d)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                <Search size={18} /> Search Storefront Products
              </h3>
              <span className="badge badge-info" style={{ fontSize: "0.75rem" }}>
                Storefront Products Only
              </span>
            </div>

            <div className="search-box" style={{ position: "relative", marginBottom: "12px" }}>
              <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search storefront products by name, barcode, or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: "36px" }}
              />
            </div>

            {/* Storefront Products Search Results Dropdown/List */}
            <div className="search-results-container" style={{ maxHeight: "180px", overflowY: "auto", borderRadius: "8px", border: "1px solid var(--outline-variant, #2a2f3d)", background: "var(--surface-container-low, #0d1117)" }}>
              {!storefrontProducts ? (
                <div style={{ padding: "12px", textAlign: "center", color: "#9ca3af", fontSize: "0.85rem" }}>Loading storefront products...</div>
              ) : storefrontProducts.length === 0 ? (
                <div style={{ padding: "12px", textAlign: "center", color: "#9ca3af", fontSize: "0.85rem" }}>
                  No storefront products found matching "{searchTerm}"
                </div>
              ) : (
                storefrontProducts.map((prod) => {
                  const isAdded = selectedItems.some((item) => item.product._id === prod._id);
                  return (
                    <div
                      key={prod._id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderBottom: "1px solid var(--outline-variant, #1e2430)",
                        fontSize: "0.85rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {prod.image ? (
                          <img src={prod.image} alt={prod.name} style={{ width: "32px", height: "32px", objectFit: "cover", borderRadius: "4px" }} />
                        ) : (
                          <div style={{ width: "32px", height: "32px", background: "#374151", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <ImageIcon size={16} color="#9ca3af" />
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 500 }}>{prod.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                            UGX {prod.price.toLocaleString()} | Stock: {prod.inventory ?? 0}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`btn btn-xs ${isAdded ? "btn-secondary" : "btn-primary"}`}
                        onClick={() => handleAddProduct(prod)}
                        style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 8px", fontSize: "0.75rem" }}
                      >
                        <Plus size={14} />
                        {isAdded ? "Add More" : "Add to Package"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Section: Selected Package Products List */}
          <div className="selected-items-section" style={{ marginBottom: "20px" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "10px" }}>
              Package Products Included ({selectedItems.length})
            </h3>

            {selectedItems.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", background: "var(--surface-container-low, #0d1117)", borderRadius: "8px", border: "1px dashed var(--outline-variant, #2a2f3d)", color: "#9ca3af", fontSize: "0.9rem" }}>
                No storefront products selected. Use the search bar above to search and add storefront products to this package.
              </div>
            ) : (
              <div style={{ border: "1px solid var(--outline-variant, #2a2f3d)", borderRadius: "8px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ background: "var(--surface-container-high, #1e2430)", textAlign: "left" }}>
                      <th style={{ padding: "8px 12px" }}>Product</th>
                      <th style={{ padding: "8px 12px" }}>Unit Price</th>
                      <th style={{ padding: "8px 12px", width: "110px" }}>Quantity</th>
                      <th style={{ padding: "8px 12px" }}>Subtotal</th>
                      <th style={{ padding: "8px 12px", width: "50px" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItems.map(({ product, quantity }) => {
                      const subtotal = (product.price || 0) * quantity;
                      return (
                        <tr key={product._id} style={{ borderBottom: "1px solid var(--outline-variant, #1e2430)" }}>
                          <td style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
                            {product.image && (
                              <img src={product.image} alt={product.name} style={{ width: "28px", height: "28px", objectFit: "cover", borderRadius: "4px" }} />
                            )}
                            <div>
                              <span style={{ fontWeight: 500 }}>{product.name}</span>
                              <span style={{ display: "block", fontSize: "0.75rem", color: "#9ca3af" }}>{product.brand}</span>
                            </div>
                          </td>
                          <td style={{ padding: "8px 12px" }}>UGX {(product.price || 0).toLocaleString()}</td>
                          <td style={{ padding: "8px 12px" }}>
                            <input
                              type="number"
                              min="1"
                              value={quantity}
                              onChange={(e) => handleUpdateQuantity(product._id, e.target.value)}
                              style={{ width: "65px", padding: "4px 6px", borderRadius: "4px", border: "1px solid var(--outline-variant, #4a5568)", background: "var(--surface, #111)" }}
                            />
                          </td>
                          <td style={{ padding: "8px 12px", fontWeight: 600 }}>UGX {subtotal.toLocaleString()}</td>
                          <td style={{ padding: "8px 12px" }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(product._id)}
                              style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px" }}
                              title="Remove item"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "var(--surface-container-high, #1e2430)", fontWeight: 600 }}>
                      <td colSpan={3} style={{ padding: "10px 12px", textAlign: "right" }}>Total Calculated Value of Items:</td>
                      <td colSpan={2} style={{ padding: "10px 12px", color: "var(--primary, #3b82f6)" }}>
                        UGX {calculatedTotalValue.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Section: Package Pricing & Categories */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "20px" }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Package Selling Price (UGX) <span style={{ color: "#ef4444" }}>*</span></label>
              <input
                type="number"
                min="1"
                className="form-input"
                placeholder="e.g. 120000"
                value={packagePrice}
                onChange={(e) => setPackagePrice(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Was Price (Original Value)</label>
              <input
                type="number"
                className="form-input"
                placeholder={`Default: ${calculatedTotalValue}`}
                value={wasPrice}
                onChange={(e) => setWasPrice(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Initial Package Stock Quantity</label>
              <input
                type="number"
                min="0"
                className="form-input"
                value={inventory}
                onChange={(e) => setInventory(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "20px" }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="Expectant and New Mom Essentials">Expectant and New Mom Essentials</option>
                <option value="Newborn Essentials & Kids Apparel/Footwear">Newborn Essentials & Kids Apparel/Footwear</option>
                <option value="Nursery and Furnishing">Nursery and Furnishing</option>
                <option value="Feeding/Nursing Essentials">Feeding/Nursing Essentials</option>
                <option value="Bathing and Changing">Bathing and Changing</option>
                <option value="Baby Play and Safety Gear">Baby Play and Safety Gear</option>
                <option value="Travel Must-Haves">Travel Must-Haves</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Stage</label>
              <select className="form-select" value={stage} onChange={(e) => setStage(e.target.value)}>
                <option value="mother">Mother</option>
                <option value="newborn">Newborn</option>
                <option value="kid">Kid</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Tier</label>
              <select className="form-select" value={tier} onChange={(e) => setTier(e.target.value)}>
                <option value="essentials">Essentials</option>
                <option value="musthaves">Must-haves</option>
                <option value="luxuries">Luxuries</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: "20px" }}>
            <label className="form-label">Package Description</label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="Describe what makes this package special..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid var(--outline-variant, #2a2f3d)", paddingTop: "16px" }}>
            <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Creating Package..." : "Create Product Package"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
