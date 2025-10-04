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
  const [showAuthModal, setShowAuthModal] = useState(false);
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

  const openAuthModal = () => setShowAuthModal(true);
  const closeAuthModal = () => setShowAuthModal(false);

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
    // Auth modal
    showAuthModal,
    openAuthModal,
    closeAuthModal,

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
