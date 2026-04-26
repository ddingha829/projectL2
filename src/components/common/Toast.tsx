"use client";

import { motion, AnimatePresence } from "framer-motion";
import styles from "./Toast.module.css";
import { useEffect } from "react";

interface ToastProps {
  id: string;
  message: string;
  senderName?: string;
  senderAvatar?: string;
  type: 'like' | 'comment' | 'system';
  onClose: (id: string) => void;
}

export default function Toast({ id, message, senderName, senderAvatar, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'like': return '❤️';
      case 'comment': return '💬';
      default: return '🔔';
    }
  };

  return (
    <motion.div 
      className={styles.toast}
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      whileHover={{ scale: 1.02 }}
      layout
    >
      <div className={styles.toastContent}>
        {senderAvatar ? (
          <img src={senderAvatar} alt="" className={styles.avatar} />
        ) : (
          <div className={styles.iconPlaceholder}>{getIcon()}</div>
        )}
        <div className={styles.textWrap}>
          <div className={styles.senderName}>{senderName || '티끌러'}</div>
          <div className={styles.message}>{message}</div>
        </div>
      </div>
      <button className={styles.closeBtn} onClick={() => onClose(id)}>×</button>
    </motion.div>
  );
}
