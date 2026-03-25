import React, { useCallback, useEffect, useRef, useState } from 'react';

type User = { id: string; name: string; email: string; picture: string; role: string };
type Room = { id: string; name: string };
type Message = { id: string; room_id: string; user_id: string; content: string; created_at: string; name: string; role: string; is_read: number };

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<{[key: string]: string}>({});
  const [input, setInput] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleUnauthorized = useCallback(() => {
    setCurrentUser(null);
    setRooms([]);
    setActiveRoom(null);
    setMessages([]);
    setAuthChecked(true);
  }, []);

  const fetchJson = useCallback(async (url: string, options?: RequestInit) => {
    const response = await fetch(url, options);
    if (response.status === 401) {
      handleUnauthorized();
      return null;
    }
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    return response.json();
  }, [handleUnauthorized]);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        const user = await fetchJson('/api/me');
        if (!user || cancelled) return;
        setCurrentUser(user);

        const nextRooms = await fetchJson('/api/rooms');
        if (!nextRooms || cancelled) return;
        setRooms(nextRooms);
        setActiveRoom((currentActiveRoom) => currentActiveRoom ?? nextRooms[0] ?? null);
      } catch (error) {
        console.error('Failed to load session', error);
      } finally {
        if (!cancelled) {
          setAuthChecked(true);
        }
      }
    };

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [fetchJson]);

  const askAi = async () => {
    const room = await fetchJson('/api/rooms', {
      method: 'POST',
      body: JSON.stringify({ isAiPrivate: true }),
      headers: { 'Content-Type': 'application/json' }
    });

    if (room) {
      setRooms(prev => {
        if (prev.some(existingRoom => existingRoom.id === room.id)) return prev;
        return [room, ...prev];
      });
      setActiveRoom(room);
    }
  };

  useEffect(() => {
    if (activeRoom && currentUser) {
      let closed = false;

      const markAsRead = async () => {
        await fetchJson('/api/messages', {
          method: 'PATCH',
          body: JSON.stringify({ roomId: activeRoom.id }),
          headers: { 'Content-Type': 'application/json' }
        });
      };

      const fetchMessages = async () => {
        const nextMessages = await fetchJson(`/api/messages?roomId=${activeRoom.id}`);
        if (!closed && nextMessages) {
          setMessages(nextMessages);
        }
      };

      fetchMessages();
      markAsRead();

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/ws?roomId=${activeRoom.id}`);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'NEW_MESSAGE') {
          fetchMessages();
          markAsRead();
          setTypingUsers(prev => {
            const next = { ...prev };
            if (next[data.userId || 'ai-agent-001']) {
              delete next[data.userId || 'ai-agent-001'];
            }
            return next;
          });
        } else if (data.type === 'TYPING') {
          setTypingUsers(prev => ({ ...prev, [data.userId]: data.name }));
          setTimeout(() => {
            setTypingUsers(prev => {
              const next = { ...prev };
              delete next[data.userId];
              return next;
            });
          }, 3000);
        }
      };

      return () => {
        closed = true;
        ws.close();
      };
    }
  }, [activeRoom, currentUser, fetchJson]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !activeRoom || !currentUser) return;
    const response = await fetch('/api/messages', {
      method: 'POST',
      body: JSON.stringify({ roomId: activeRoom.id, content: input }),
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    if (response.ok) {
      setInput('');
    }
  };

  if (!authChecked) {
    return <div className="login-screen">Checking your session...</div>;
  }

  if (!currentUser) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <h1>Welcome to AI Chat</h1>
          <p>Sign in with your Google account to start chatting.</p>
          <a href="/api/auth" className="login-btn">Login with Google</a>
          <a href="/api/auth?mock=true" className="mock-login-link">Use mock login for local development</a>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="sidebar">
        <div className="user-profile-sidebar">
          <img src={currentUser.picture} alt={currentUser.name} />
          <div className="user-info">
            <strong>{currentUser.name}</strong>
            <span>{currentUser.role}</span>
          </div>
          <a className="logout-btn" href="/api/auth?logout=true">Logout</a>
        </div>
        <div className="sidebar-header">
          Chat Rooms
          <button className="ask-ai-btn" onClick={askAi}>Ask AI</button>
        </div>
        <div className="room-list">
          {rooms.map(room => (
            <div
              key={room.id}
              className={`room-item ${activeRoom?.id === room.id ? 'active' : ''}`}
              onClick={() => setActiveRoom(room)}
            >
              # {room.name}
            </div>
          ))}
        </div>
      </div>
      <div className="chat-container">
        {activeRoom ? (
          <>
            <div className="chat-header">
              <span># {activeRoom.name}</span>
            </div>
            <div className="messages">
              {messages.map(msg => (
                <div key={msg.id} className={`message-bubble ${msg.user_id === currentUser.id ? 'message-user' : 'message-other'} ${msg.role === 'ai' ? 'message-ai' : ''}`}>
                  <div className="message-info">
                    {msg.name} • {new Date(msg.created_at).toLocaleTimeString()}
                    {msg.user_id === currentUser.id && (
                      <span className={`read-status ${msg.is_read ? 'read' : ''}`}>
                        {msg.is_read ? ' ✓✓' : ' ✓'}
                      </span>
                    )}
                  </div>
                  <div className="message-content">{msg.content}</div>
                </div>
              ))}
              {Object.entries(typingUsers).map(([id, name]) => (
                <div key={id} className="typing-indicator">{name} is typing...</div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="input-area">
              <input
                type="text"
                placeholder="Type a message..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && sendMessage()}
              />
              <button onClick={sendMessage}>Send</button>
            </div>
          </>
        ) : (
          <div className="login-screen" style={{ background: 'white', color: '#64748b' }}>
            <h2>Select a room to start chatting</h2>
          </div>
        )}
      </div>
    </div>
  );
}
