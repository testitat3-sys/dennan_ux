import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStaffAuth } from "../hooks/useStaffAuth";
import { useProductDisplayName } from "../hooks/useProductDisplayName";
import { useTrackedQuery } from "../hooks/useTrackedQuery";
import BrandCombobox from "../components/BrandCombobox";
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Bell,
  X,
  Upload,
  Image as ImageIcon,
  Save,
  Send,
  Trash,
} from "lucide-react";

const CATEGORY_OPTIONS = [
  "Expectant and New Mom Essentials",
  "Newborn Essentials & Kids Apparel/Footwear",
  "Nursery and Furnishing",
  "Feeding/Nursing Essentials",
  "Bathing and Changing",
  "Baby Play and Safety Gear",
  "Travel Must-Haves",
];
const STAGE_OPTIONS = ["mother", "newborn", "kid"];
const TIER_OPTIONS = ["essentials", "musthaves", "luxuries"];
const GENDER_OPTIONS = ["boy", "girl", "unisex"];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

function range(start, end) {
  const out = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
}

const AGE_MONTH_GROUPS = [
  { label: "Year 1 (0-11 mo)", months: range(0, 11) },
  { label: "Year 2 (12-23 mo)", months: range(12, 23) },
  { label: "Year 3 (24-35 mo)", months: range(24, 35) },
];

export default function AdminProductEdit() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useStaffAuth();
  const fileInputRef = useRef(null);
  const isStockManager = user?.accountRole === "stockManager";

  const product = useQuery(
    api.products.getProductDetail,
    token && productId ? { token, productId } : "skip"
  );
  const generateCloudinarySignature = useMutation(api.products.generateCloudinarySignature);
  const updateProductMutation = useMutation(api.products.updateProduct);
  const adjustStockMutation = useMutation(api.products.adjustStock);
  const requestNameChangeMutation = useMutation(api.stockRequests.requestNameChange);
  const { getDisplayName } = useProductDisplayName(token);

  const myStockRequests = useTrackedQuery(
    api.stockRequests.getMyStockRequests,
    isStockManager ? { token } : "skip"
  );
  const pendingNameChange = (myStockRequests || [])
    .flatMap((group) => group.items)
    .find((item) => item.kind === "name_change" && item.productId === productId && item.status === "pending");

  const [isRequestingRename, setIsRequestingRename] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [isSubmittingRename, setIsSubmittingRename] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [reorderPoint, setReorderPoint] = useState("");
  const [inventory, setInventory] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [stage, setStage] = useState("");
  const [tier, setTier] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [material, setMaterial] = useState("");
  const [pattern, setPattern] = useState("");
  const [targetGender, setTargetGender] = useState("");
  const [minMonth, setMinMonth] = useState("");
  const [maxMonth, setMaxMonth] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isStoreOnly, setIsStoreOnly] = useState(true);

  // Image state
  const [image, setImage] = useState("");
  const [images, setImages] = useState([]);
  const [isUploadingPrimary, setIsUploadingPrimary] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [imageError, setImageError] = useState("");
  const galleryInputRef = useRef(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Populate form once product loads
  useEffect(() => {
    if (product) {
      setName(product.name || "");
      setBrand(product.brand || "");
      setDescription(product.description || "");
      setPrice(String(product.price ?? ""));
      setOriginalPrice(String(product.originalPrice ?? ""));
      setCostPrice(product.costPrice !== undefined ? String(product.costPrice) : "");
      setReorderPoint(product.reorderPoint !== undefined ? String(product.reorderPoint) : "");
      setInventory(String(product.inventory ?? 0));
      setCategory(product.category || "");
      setSubCategory(product.subCategory || "");
      setStage(product.stage || "");
      setTier(product.tier || "");
      setSize(product.size || "");
      setColor(product.color || "");
      setMaterial(product.material || "");
      setPattern(product.pattern || "");
      setTargetGender(product.targetGender || "");
      setMinMonth(product.minMonth !== undefined ? String(product.minMonth) : "");
      setMaxMonth(product.maxMonth !== undefined ? String(product.maxMonth) : "");
      setIsActive(product.isActive ?? true);
      const initialIsStoreOnly = product.specifications?.some(
        (spec) => spec.label === "for-store-only" && spec.value === "true"
      ) ?? false;
      setIsStoreOnly(initialIsStoreOnly);
      setImage(product.image || "");
      setImages(product.images || []);
      setImageError("");
      setIsDirty(false);
    }
  }, [product]);

  useEffect(() => {
    if (!product) return;
    const initialIsStoreOnly = product.specifications?.some(
      (spec) => spec.label === "for-store-only" && spec.value === "true"
    ) ?? false;

    const dirty =
      name !== (product.name || "") ||
      brand !== (product.brand || "") ||
      description !== (product.description || "") ||
      price !== String(product.price ?? "") ||
      originalPrice !== String(product.originalPrice ?? "") ||
      costPrice !== (product.costPrice !== undefined ? String(product.costPrice) : "") ||
      reorderPoint !== (product.reorderPoint !== undefined ? String(product.reorderPoint) : "") ||
      inventory !== String(product.inventory ?? 0) ||
      category !== (product.category || "") ||
      subCategory !== (product.subCategory || "") ||
      stage !== (product.stage || "") ||
      tier !== (product.tier || "") ||
      size !== (product.size || "") ||
      color !== (product.color || "") ||
      material !== (product.material || "") ||
      pattern !== (product.pattern || "") ||
      targetGender !== (product.targetGender || "") ||
      minMonth !== (product.minMonth !== undefined ? String(product.minMonth) : "") ||
      maxMonth !== (product.maxMonth !== undefined ? String(product.maxMonth) : "") ||
      isActive !== (product.isActive ?? true) ||
      isStoreOnly !== initialIsStoreOnly ||
      image !== (product.image || "") ||
      JSON.stringify(images) !== JSON.stringify(product.images || []);
    setIsDirty(dirty);
  }, [
    name, brand, description, price, originalPrice, costPrice, reorderPoint, inventory,
    category, subCategory, stage, tier, size, color, material, pattern,
    targetGender, minMonth, maxMonth, isActive, isStoreOnly, image, images, product,
  ]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const showToast = (message, type = "info") => {
    const id = Date.now() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const uploadToCloudinary = async (file) => {
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
      throw new Error("Image upload to Cloudinary failed.");
    }
    const data = await res.json();
    return data.secure_url;
  };

  const handlePrimaryFile = async (file) => {
    if (!file) return;
    setImageError("");
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError(`Image is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 2 MB.`);
      return;
    }
    setIsUploadingPrimary(true);
    try {
      const url = await uploadToCloudinary(file);
      setImage(url);
    } catch (err) {
      setImageError(err.message || "Failed to upload image.");
    } finally {
      setIsUploadingPrimary(false);
    }
  };

  const handleGalleryFile = async (file) => {
    if (!file) return;
    setImageError("");
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError(`Image is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 2 MB.`);
      return;
    }
    setIsUploadingGallery(true);
    try {
      const url = await uploadToCloudinary(file);
      setImages((prev) => [...prev, url]);
    } catch (err) {
      setImageError(err.message || "Failed to upload image.");
    } finally {
      setIsUploadingGallery(false);
    }
  };

  const handleBackNavigation = (e, path) => {
    if (isDirty) {
      const confirmed = window.confirm("You have unsaved changes. Are you sure you want to leave?");
      if (!confirmed) {
        e.preventDefault();
        return;
      }
    }
    navigate(path);
  };

  const handleRequestRename = async () => {
    const requestedName = renameDraft.trim();
    if (!requestedName || requestedName === product.name) return;
    setIsSubmittingRename(true);
    try {
      await requestNameChangeMutation({ token, productId, requestedName });
      showToast("Name change submitted for admin approval.", "success");
      setIsRequestingRename(false);
      setRenameDraft("");
    } catch (err) {
      showToast(err.message || "Failed to submit name change request.", "error");
    } finally {
      setIsSubmittingRename(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!product || isSaving) return;

    if (!name.trim()) {
      showToast("Product name is required.", "error");
      return;
    }
    const originalPriceNum = parseFloat(originalPrice);
    if (!originalPriceNum || originalPriceNum <= 0) {
      showToast("Please enter a valid original price.", "error");
      return;
    }
    if (minMonth !== "" && maxMonth !== "" && Number(minMonth) > Number(maxMonth)) {
      showToast("Min age cannot be greater than max age.", "error");
      return;
    }
    const inventoryNum = inventory === "" ? 0 : Number(inventory);
    if (inventoryNum < 0) {
      showToast("Inventory cannot be negative.", "error");
      return;
    }

    if (!isStoreOnly && !image) {
      showToast("Customer-facing products require a primary image before they can be made customer facing.", "error");
      return;
    }
    if (isActive && !isStoreOnly && !description.trim()) {
      showToast("Customer-facing products require a description before they can be made active.", "error");
      return;
    }

    setIsSaving(true);
    try {
      const inventoryDelta = inventoryNum - (product.inventory ?? 0);
      if (inventoryDelta !== 0) {
        await adjustStockMutation({ token, productId, delta: inventoryDelta });
      }
      await updateProductMutation({
        token,
        productId,
        name: name.trim(),
        brand: brand.trim() || undefined,
        description: description.trim() || undefined,
        price: price ? parseFloat(price) : originalPriceNum,
        originalPrice: originalPriceNum,
        costPrice: costPrice ? parseFloat(costPrice) : undefined,
        reorderPoint: reorderPoint ? parseInt(reorderPoint) : undefined,
        category: category || undefined,
        subCategory: subCategory.trim() || undefined,
        stage: stage || undefined,
        tier: tier || undefined,
        size: size.trim() || undefined,
        color: color.trim() || undefined,
        material: material.trim() || undefined,
        pattern: pattern.trim() || undefined,
        targetGender: targetGender || undefined,
        minMonth: minMonth === "" ? undefined : Number(minMonth),
        maxMonth: maxMonth === "" ? undefined : Number(maxMonth),
        isActive,
        isStoreOnly,
        image: image || undefined,
        images,
      });
      showToast("Product details saved successfully!", "success");
      setIsDirty(false);
    } catch (err) {
      showToast(err.message || "Failed to save product details.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!product) {
    return (
      <div className="staff-portal-body" style={{ display: "grid", placeItems: "center", height: "100vh" }}>
        <div style={{ textAlign: "center", color: "var(--text-tertiary)" }}>
          <p>Loading product details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="staff-portal-body">
      <div className="product-edit-page-container">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link to="/" className="breadcrumb-link" onClick={(e) => handleBackNavigation(e, "/")}>
            Admin
          </Link>
          <span className="breadcrumb-separator">›</span>
          <Link to="/?tab=stock" className="breadcrumb-link" onClick={(e) => handleBackNavigation(e, "/?tab=stock")}>
            Stock Manager
          </Link>
          <span className="breadcrumb-separator">›</span>
          <span className="breadcrumb-current">{getDisplayName(product)}</span>
        </nav>

        <header className="product-edit-header">
          <div className="product-edit-title-group">
            <button
              className="product-edit-back-btn"
              onClick={(e) => handleBackNavigation(e, "/?tab=stock")}
              title="Back to Stock Manager"
              type="button"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="product-edit-title">Edit Product</h1>
            {isDirty && <span className="product-edit-unsaved-badge">Unsaved changes</span>}
          </div>

          <div className="product-edit-actions">
            <button
              type="button"
              className="btn-sec"
              onClick={(e) => handleBackNavigation(e, "/?tab=stock")}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary-filled"
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
            >
              <Save size={16} />
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </header>

        <form onSubmit={handleSave} className="product-edit-form">
          <div className="product-edit-grid">
            {/* Left Column: Images & Merchandising */}
            <div>
              <div className="product-edit-card">
                <h2 className="product-edit-card-title">Product Visibility</h2>
                <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: image ? "pointer" : "not-allowed", opacity: image ? 1 : 0.7 }}>
                    <input
                      type="radio"
                      name="visibility"
                      checked={!isStoreOnly}
                      onChange={() => {
                        if (!image) {
                          showToast("Customer-facing products require a primary image before they can be made customer facing.", "error");
                          setIsStoreOnly(true);
                        } else {
                          setIsStoreOnly(false);
                        }
                      }}
                    />
                    <span>Customer-Facing (visible in storefront, requires an image)</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="visibility"
                      checked={isStoreOnly}
                      onChange={() => setIsStoreOnly(true)}
                    />
                    <span>Store-Only (staff/POS use only)</span>
                  </label>
                </div>
              </div>

              <div className="product-edit-card">
                <h2 className="product-edit-card-title">
                  Primary Image {isActive && !isStoreOnly && <span style={{ color: "var(--color-danger, #ef4444)" }}>*</span>}
                </h2>
                <div
                  className={`product-edit-image-zone ${imageError ? "has-error" : ""}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handlePrimaryFile(file);
                  }}
                >
                  {image ? (
                    <div className="product-edit-image-preview-wrapper">
                      <img src={image} alt={name || "Product preview"} className="product-edit-image-preview" />
                      <div className="product-edit-image-overlay">
                        <Upload size={24} />
                        <span>{isUploadingPrimary ? "Uploading..." : "Replace Image"}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="product-edit-image-placeholder">
                      <ImageIcon size={48} className="placeholder-icon" />
                      <p className="placeholder-text">{isUploadingPrimary ? "Uploading..." : "Click or drag image here to upload"}</p>
                      <span className="placeholder-sub">PNG, JPG, WEBP</span>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => handlePrimaryFile(e.target.files?.[0])}
                    accept="image/*"
                    style={{ display: "none" }}
                  />
                </div>
                {imageError && (
                  <div className="product-edit-image-error">
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>{imageError}</span>
                  </div>
                )}
              </div>

              <div className="product-edit-card">
                <h2 className="product-edit-card-title">Gallery Images</h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
                  {images.map((url, idx) => (
                    <div key={idx} style={{ position: "relative", width: "72px", height: "72px" }}>
                      <img
                        src={url}
                        alt={`Gallery ${idx + 1}`}
                        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "var(--radius-md)" }}
                      />
                      <button
                        type="button"
                        onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                        style={{
                          position: "absolute", top: "-6px", right: "-6px",
                          background: "var(--surface)", border: "1px solid var(--surface-container-high)",
                          borderRadius: "50%", width: "22px", height: "22px",
                          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                        }}
                        title="Remove image"
                      >
                        <Trash size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={isUploadingGallery}
                >
                  {isUploadingGallery ? "Uploading..." : "Add Gallery Image"}
                </button>
                <input
                  type="file"
                  ref={galleryInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleGalleryFile(file);
                    e.target.value = "";
                  }}
                  accept="image/*"
                  style={{ display: "none" }}
                />
              </div>

              <div className="product-edit-card">
                <h2 className="product-edit-card-title">Merchandising</h2>
                <div className="form-group" style={{ marginBottom: "16px" }}>
                  <label className="form-label">Category</label>
                  <select className="form-input-box" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="">-- None --</option>
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: "16px" }}>
                  <label className="form-label">Sub-Category</label>
                  <input
                    type="text"
                    className="form-input-box"
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                    placeholder="e.g. Bottles"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: "16px" }}>
                  <label className="form-label">Stage</label>
                  <select className="form-input-box" value={stage} onChange={(e) => setStage(e.target.value)}>
                    <option value="">-- None --</option>
                    {STAGE_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: "16px" }}>
                  <label className="form-label">Tier</label>
                  <select className="form-input-box" value={tier} onChange={(e) => setTier(e.target.value)}>
                    <option value="">-- None --</option>
                    {TIER_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: "16px" }}>
                  <label className="form-label">Target Gender</label>
                  <select className="form-input-box" value={targetGender} onChange={(e) => setTargetGender(e.target.value)}>
                    <option value="">-- None --</option>
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="product-edit-fields-row">
                  <div className="form-group flex-1">
                    <label className="form-label">Min Age</label>
                    <select className="form-input-box" value={minMonth} onChange={(e) => setMinMonth(e.target.value)}>
                      <option value="">No limit</option>
                      {AGE_MONTH_GROUPS.map((group) => (
                        <optgroup key={group.label} label={group.label}>
                          {group.months.map((m) => (
                            <option key={m} value={m}>{m} mo</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div className="form-group flex-1">
                    <label className="form-label">Max Age</label>
                    <select className="form-input-box" value={maxMonth} onChange={(e) => setMaxMonth(e.target.value)}>
                      <option value="">No limit</option>
                      {AGE_MONTH_GROUPS.map((group) => (
                        <optgroup key={group.label} label={group.label}>
                          {group.months.map((m) => (
                            <option key={m} value={m}>{m} mo</option>
                          ))}
                        </optgroup>
                      ))}
                      <option value="36">36+ / No limit</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Core details & Read-only info */}
            <div>
              <div className="product-edit-card">
                <h2 className="product-edit-card-title">Product Information</h2>
                <div className="product-edit-fields-row">
                  <div className="form-group flex-1">
                    <label className="form-label">Product Name</label>
                    <input
                      type="text"
                      className="form-input-box"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      readOnly={isStockManager}
                      disabled={isStockManager}
                      required
                    />
                    {isStockManager && (
                      <div style={{ marginTop: "8px" }}>
                        {pendingNameChange ? (
                          <div style={{ fontSize: "13px", color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: "6px" }}>
                            <AlertCircle size={14} />
                            Rename to "{pendingNameChange.requestedName}" is pending admin approval.
                          </div>
                        ) : isRequestingRename ? (
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <input
                              type="text"
                              className="form-input-box"
                              placeholder="New product name"
                              value={renameDraft}
                              onChange={(e) => setRenameDraft(e.target.value)}
                              autoFocus
                            />
                            <button
                              type="button"
                              className="btn btn--primary btn--sm"
                              onClick={handleRequestRename}
                              disabled={isSubmittingRename || !renameDraft.trim() || renameDraft.trim() === product.name}
                              style={{ display: "inline-flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}
                            >
                              <Send size={12} /> Submit
                            </button>
                            <button
                              type="button"
                              className="btn btn--secondary btn--sm"
                              onClick={() => { setIsRequestingRename(false); setRenameDraft(""); }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn btn--secondary btn--sm"
                            onClick={() => { setRenameDraft(product.name || ""); setIsRequestingRename(true); }}
                          >
                            Request Name Change
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="form-group flex-1">
                    <label className="form-label">Brand</label>
                    <BrandCombobox token={token} value={brand} onChange={setBrand} />
                  </div>
                </div>

                <div className="product-edit-fields-row">
                  <div className="form-group flex-1">
                    <label className="form-label">Size</label>
                    <input type="text" className="form-input-box" value={size} onChange={(e) => setSize(e.target.value)} />
                  </div>
                  <div className="form-group flex-1">
                    <label className="form-label">Color</label>
                    <input type="text" className="form-input-box" value={color} onChange={(e) => setColor(e.target.value)} />
                  </div>
                </div>

                <div className="product-edit-fields-row">
                  <div className="form-group flex-1">
                    <label className="form-label">Material</label>
                    <input type="text" className="form-input-box" value={material} onChange={(e) => setMaterial(e.target.value)} />
                  </div>
                  <div className="form-group flex-1">
                    <label className="form-label">Pattern</label>
                    <input type="text" className="form-input-box" value={pattern} onChange={(e) => setPattern(e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    rows={6}
                    className="form-input-box text-area-box"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter detailed product description..."
                  />
                </div>

                <div className="form-group" style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <label htmlFor="isActive" className="form-label" style={{ marginBottom: 0 }}>
                    Product is active (visible in store)
                  </label>
                </div>
              </div>

              <div className="product-edit-card">
                <h2 className="product-edit-card-title">Pricing & Inventory Metrics</h2>
                <div className="product-edit-fields-row">
                  <div className="form-group flex-1">
                    <label className="form-label">Original Price (UGX)</label>
                    <input type="number" className="form-input-box" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} required />
                  </div>
                  <div className="form-group flex-1">
                    <label className="form-label">Selling Price (UGX)</label>
                    <input type="number" className="form-input-box" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Defaults to original price" />
                  </div>
                </div>
                <div className="product-edit-fields-row">
                  <div className="form-group flex-1">
                    <label className="form-label">Cost Price (UGX)</label>
                    <input type="number" className="form-input-box" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
                  </div>
                  <div className="form-group flex-1">
                    <label className="form-label">Reorder Point</label>
                    <input type="number" className="form-input-box" value={reorderPoint} onChange={(e) => setReorderPoint(e.target.value)} />
                  </div>
                </div>
                <div className="product-edit-fields-row">
                  <div className="form-group flex-1">
                    <label className="form-label">Inventory</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input-box"
                      value={inventory}
                      onChange={(e) => setInventory(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="product-edit-card">
                <h2 className="product-edit-card-title">System References (Read-Only)</h2>
                <div className="product-edit-readonly-grid">
                  <div className="readonly-item">
                    <span className="readonly-label">Barcode</span>
                    <span className="readonly-value code-font">{product.barcode}</span>
                  </div>
                  <div className="readonly-item">
                    <span className="readonly-label">SKU</span>
                    <span className="readonly-value code-font">{product.sku || "N/A"}</span>
                  </div>
                  <div className="readonly-item">
                    <span className="readonly-label">Database ID</span>
                    <span className="readonly-value code-font">{product._id}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

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
