"use client";

import { useState, useEffect } from "react";
import { toggleSubscription, getSubscriptionStatus } from "@/app/actions/subscriptions";
import styles from "./SubscribeBtn.module.css";

interface SubscribeBtnProps {
  authorId: string;
  authorName: string;
}

export default function SubscribeBtn({ authorId, authorName }: SubscribeBtnProps) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSubscriptionStatus(authorId).then(status => {
      setIsSubscribed(status);
      setLoading(false);
    });
  }, [authorId]);

  const handleToggle = async () => {
    setLoading(true);
    const result = await toggleSubscription(authorId);
    if (result.success) {
      setIsSubscribed(!!result.isSubscribed);
    } else if (result.error) {
      alert(result.error);
    }
    setLoading(false);
  };

  return (
    <button 
      className={`${styles.subscribeBtn} ${isSubscribed ? styles.subscribed : ''}`}
      onClick={handleToggle}
      disabled={loading}
    >
      {loading ? '...' : isSubscribed ? '구독 중' : '구독하기'}
    </button>
  );
}
