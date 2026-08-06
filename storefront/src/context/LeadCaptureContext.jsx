import React, { createContext, useContext, useState, useCallback } from 'react';
import { useConvexAuth, useQuery } from 'convex/react';
import { api } from "@convex/_generated/api";
import NotifySignupModal from '../components/registry/NotifySignupModal';

const LeadCaptureContext = createContext();
const LEAD_CAPTURED_KEY = 'dennan_lead_captured';

export const useLeadCapture = () => {
  const context = useContext(LeadCaptureContext);
  if (!context) {
    return {
      hasLeadInfo: true,
      leadCaptured: true,
      openLeadModal: () => {},
      markLeadCaptured: () => {},
    };
  }
  return context;
};

export const LeadCaptureProvider = ({ children }) => {
  const { isAuthenticated } = useConvexAuth();
  const convexUser = useQuery(api.users.viewer, isAuthenticated ? {} : "skip");

  const [leadCaptured, setLeadCaptured] = useState(() => {
    try {
      return localStorage.getItem(LEAD_CAPTURED_KEY) === '1';
    } catch (error) {
      return false;
    }
  });

  const [modalConfig, setModalConfig] = useState(null);

  const hasLeadInfo = isAuthenticated || leadCaptured;

  const openLeadModal = useCallback(({ source, title, subtext, specifications, buttonLabel, onSuccess, showProductField, productFieldDefault } = {}) => {
    setModalConfig({ source, title, subtext, specifications, buttonLabel, onSuccess, showProductField, productFieldDefault });
  }, []);

  const closeLeadModal = useCallback(() => {
    setModalConfig(null);
  }, []);

  const handleSuccess = useCallback(() => {
    try {
      localStorage.setItem(LEAD_CAPTURED_KEY, '1');
    } catch (error) {
      // ignore storage failures (e.g. private browsing)
    }
    setLeadCaptured(true);
    modalConfig?.onSuccess && modalConfig.onSuccess();
  }, [modalConfig]);

  const value = {
    hasLeadInfo,
    leadCaptured,
    openLeadModal,
    markLeadCaptured: handleSuccess,
  };

  return (
    <LeadCaptureContext.Provider value={value}>
      {children}
      <NotifySignupModal
        isOpen={!!modalConfig}
        onClose={closeLeadModal}
        onSuccess={handleSuccess}
        convexUser={convexUser}
        source={modalConfig?.source}
        specifications={modalConfig?.specifications}
        title={modalConfig?.title}
        subtext={modalConfig?.subtext}
        buttonLabel={modalConfig?.buttonLabel}
        eyebrow={null}
        showProductField={modalConfig?.showProductField}
        productFieldDefault={modalConfig?.productFieldDefault}
      />
    </LeadCaptureContext.Provider>
  );
};
