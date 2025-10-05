import { useState } from 'react';

export interface PromptModalState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: (value: string) => void;
  defaultValue?: string;
}

export interface AlertModalState {
  isOpen: boolean;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export function useModals() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [promptModal, setPromptModal] = useState<PromptModalState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    defaultValue: ''
  });
  const [alertModal, setAlertModal] = useState<AlertModalState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const openLoginModal = () => setShowLoginModal(true);
  const closeLoginModal = () => setShowLoginModal(false);
  const openSignupModal = () => setShowSignupModal(true);
  const closeSignupModal = () => setShowSignupModal(false);

  const openPromptModal = (
    title: string,
    message: string,
    onConfirm: (value: string) => void,
    defaultValue?: string
  ) => {
    setPromptModal({
      isOpen: true,
      title,
      message,
      onConfirm,
      defaultValue
    });
  };

  const closePromptModal = () => {
    setPromptModal({ ...promptModal, isOpen: false });
  };

  const openAlertModal = (
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
  ) => {
    setAlertModal({
      isOpen: true,
      title,
      message,
      type
    });
  };

  const closeAlertModal = () => {
    setAlertModal({ ...alertModal, isOpen: false });
  };

  return {
    // Login modal
    showLoginModal,
    openLoginModal,
    closeLoginModal,

    // Signup modal
    showSignupModal,
    openSignupModal,
    closeSignupModal,

    // Prompt modal
    promptModal,
    openPromptModal,
    closePromptModal,

    // Alert modal
    alertModal,
    openAlertModal,
    closeAlertModal,
  };
}
