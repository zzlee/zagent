import React, { useState, useEffect, useRef } from 'react';

type User = { id: string; name: string; email: string; picture: string; role: string };
type Room = { id: string; name: string };
type Message = { id: string; room_id: string; user_id: string; content: string; created_at: string; name: string; role: string; is_read: number };

export default function App() {
  const [userId, setUserId] = useState<string | null>(new URLSearchParams(window.location.search).get('userId'));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<{[key: string]: string}>({});
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userId) {
      fetch(`/api/me?userId=${userId}`).then(res => res.json()).then(setCurrentUser);
      fetch(`/api/rooms?userId=${userId}`).then(res => res.json()).then(setRooms);
    }
  }, [userId]);

  const askAi = async () => {
    if (!userId) return;
    const response = await fetch('/api/rooms', {
      method: 'POST',
      body: JSON.stringify({ userId, isAiPrivate: true }),
      headers: { 'Content-Type': 'application/json' }
    });
    if (response.ok) {
      const room = await response.json();
      setRooms(prev => {
        if (prev.some(r => r.id === room.id)) return prev;
        return [room, ...prev];
      });
      setActiveRoom(room);
    }
  };

  useEffect(() => {
    if (activeRoom && userId) {
      const markAsRead = async () => {
        await fetch('/api/messages', {
          method: 'PATCH',
          body: JSON.stringify({ roomId: activeRoom.id, userId }),
          headers: { 'Content-Type': 'application/json' }
        });
      };
      
      const fetchMessages = () => {
        fetch(`/api/messages?roomId=${activeRoom.id}`)
          .then(res => res.json())
          .then(setMessages);
      };

      fetchMessages();
      markAsRead();

      // WebSocket connection
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
        ws.close();
      };
    }
  }, [activeRoom, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !activeRoom || !userId) return;
    const response = await fetch('/api/messages', {
      method: 'POST',
      body: JSON.stringify({ userId, roomId: activeRoom.id, content: input }),
      headers: { 'Content-Type': 'application/json' }
    });
    if (response.ok) {
      setInput('');
      // Optimistic update could go here
    }
  };

  if (!userId) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <h1>Welcome to AI Chat</h1>
          <p>Sign in with your Google account to start chatting.</p>
          <a href="/api/auth" className="login-btn">Login with Google</a>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="sidebar">
        {currentUser && (
          <div className="user-profile-sidebar">
            <img src={currentUser.picture} alt={currentUser.name} />
            <div className="user-info">
              <strong>{currentUser.name}</strong>
              <span>{currentUser.role}</span>
            </div>
          </div>
        )}
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
                <div key={msg.id} className={`message-bubble ${msg.user_id === userId ? 'message-user' : 'message-other'} ${msg.role === 'ai' ? 'message-ai' : ''}`}>
                  <div className="message-info">
                    {msg.name} • {new Date(msg.created_at).toLocaleTimeString()}
                    {msg.user_id === userId && (
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
