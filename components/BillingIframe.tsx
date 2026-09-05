'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';
import { tok } from '@/services/api';

const INVOICES_URL = process.env.NEXT_PUBLIC_INVOICES_URL || 'https://main.d2n0xc418in8nz.amplifyapp.com/';

export default function BillingIframe() {
  const iframeRef    = useRef<HTMLIFrameElement>(null);
  const sentRef      = useRef(false);
  const { user }     = useAuthStore();
  const userRef      = useRef(user);

  // Mantener userRef actualizado sin causar re-renders
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const sendAuthData = useCallback((token?: string) => {
    const currentUser = userRef.current;
    if (!iframeRef.current?.contentWindow || !currentUser) return;
    const accessToken = token || localStorage.getItem('_at');
    if (!accessToken) return;
    iframeRef.current.contentWindow.postMessage(
      {
        type:  'AUTH_DATA',
        token: accessToken,
        user: {
          id:         currentUser.userId,
          email:      currentUser.email,
          name:       currentUser.name,
          tenantId:   currentUser.tenantId   || '',
          tenantName: currentUser.tenantName,
          branchId:   currentUser.branchId,
        },
      },
      '*'
    );
    sentRef.current = true;
  }, []); // ← sin dependencias — usa ref

  const handleTokenRefresh = useCallback(async () => {
    const refreshToken = tok.getR();
    if (!refreshToken) return;
    try {
      const tokens = await authService.refresh(refreshToken);
      tok.setA(tokens.accessToken);
      tok.setR(tokens.refreshToken);
      sendAuthData(tokens.accessToken);
    } catch (error) {
      console.error('Failed to refresh token:', error);
    }
  }, [sendAuthData]);

  // Solo se ejecuta UNA VEZ al montar
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'REQUEST_AUTH') {
        sendAuthData();
      } else if (event.data?.type === 'REQUEST_TOKEN_REFRESH') {
        handleTokenRefresh();
      }
    };

    window.addEventListener('message', handleMessage);

    const iframe = iframeRef.current;
    if (iframe) {
      const onLoad = () => sendAuthData();
      iframe.addEventListener('load', onLoad);
      return () => {
        window.removeEventListener('message', handleMessage);
        iframe.removeEventListener('load', onLoad);
      };
    }

    return () => window.removeEventListener('message', handleMessage);
  }, []); // ← dependencias vacías — solo monta una vez

  useEffect(() => {
    const handleLogout = () => {
      sentRef.current = false;
      iframeRef.current?.contentWindow?.postMessage({ type: 'AUTH_LOGOUT' }, '*');
    };
    window.addEventListener('auth-logout', handleLogout);
    return () => window.removeEventListener('auth-logout', handleLogout);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      src={INVOICES_URL}
      className="w-full h-full border-0 rounded-lg"
      title="Facturación"
      allow="fullscreen"
    />
  );
}
