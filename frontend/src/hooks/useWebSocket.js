import { useEffect, useRef, useState, useCallback } from 'react';

const RECONNECT_INTERVAL = 3000;

export const useWebSocket = (url, onMessage) => {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connect = useCallback(() => {
    if (!url) {
      return;
    }
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}${url}`;

    console.log('🔌 Connecting to WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ WebSocket Connected');
      setIsConnected(true);
    };

    ws.onclose = () => {
      console.log('❌ WebSocket Disconnected');
      setIsConnected(false);
      wsRef.current = null;
      
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('🔄 Attempting reconnect...');
        connect();
      }, RECONNECT_INTERVAL);
    };

    ws.onerror = (error) => {
      console.error('⚠️ WebSocket Error:', error);
      ws.close();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessage) {
          onMessage(data);
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    };

    wsRef.current = ws;
  }, [url, onMessage]);

  useEffect(() => {
    if (!url) { 
      return;
    }

    connect();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [url, connect]);

  const sendMessage = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn('Cannot send message: WebSocket is not open');
    }
  }, []);

  return { isConnected, sendMessage };
};