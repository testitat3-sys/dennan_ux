import { useState } from "react";
import { useStaffAuth } from "../hooks/useStaffAuth";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import sosLogo from "../assets/SOS.png";
import sosLogoDark from "../assets/SOS-dark.png";

export default function StaffLogin() {
  const { login } = useStaffAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (error) setError("");
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setError("Please enter both your email address and password.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const res = await login(trimmedEmail, password);
      if (!res.success) {
        setError(res.error || "Invalid email or password. Please check your credentials.");
      }
    } catch (err) {
      setError("An error occurred while logging in. Please check your credentials and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="staff-portal-body">
      <main className="login-page" role="main">
        <div className="login-brand">
          <img src={sosLogo} alt="Dennan" className="login-brand-logo logo-light" />
          <img src={sosLogoDark} alt="Dennan" className="login-brand-logo logo-dark" />
          <span className="login-brand-sub">Staff Portal</span>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              className="form-input"
              type="email"
              id="email"
              name="email"
              placeholder="name@dennan.ug"
              autoComplete="email"
              value={email}
              onChange={handleEmailChange}
              required
              disabled={isSubmitting}
              aria-invalid={!!error}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                className="form-input"
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={handlePasswordChange}
                required
                disabled={isSubmitting}
                aria-invalid={!!error}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={isSubmitting}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="form-error is-visible" role="alert">
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className={`btn btn--primary btn--lg btn--full-width${isSubmitting ? " is-loading" : ""}`}
            disabled={isSubmitting}
          >
            {isSubmitting && <span className="btn-spinner" />}
            Sign In
          </button>
        </form>
      </main>
    </div>
  );
}

