import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase/config";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import api from "../services/api.js";
import "./ChatRoom.css";

const ChatRoom = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notes, setNotes] = useState([]);
  const [showNotes, setShowNotes] = useState(false);
  const [notesError, setNotesError] = useState(null);
  const [isSending, setIsSending] = useState(false); // FIX #2: Prevent multiple sends
  const messagesEndRef = useRef(null); // FIX #3: Better scroll reference
  const pollingIntervalRef = useRef(null);

  // FIX #3: Auto-scroll function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch session data
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await api.get(`/sessions/${sessionId}/`);
        setSession(response.data);
      } catch (err) {
        console.error("Error fetching session:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [sessionId]);

  // Listen to live messages from Firebase
  useEffect(() => {
    if (!session?.firestore_chat_id) return;

    const messagesRef = collection(
      db,
      "studySessions",
      session.firestore_chat_id,
      "messages",
    );
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(docs);
      // FIX #3: Scroll to bottom whenever messages update
      setTimeout(scrollToBottom, 100);
    });

    return () => unsubscribe();
  }, [session?.firestore_chat_id]);

  // FIX #3: Scroll on initial mount and when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch existing notes on load
  useEffect(() => {
    if (!sessionId) return;
    fetchNotes();
  }, [sessionId]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const fetchNotes = async () => {
    try {
      const response = await api.get(`/sessions/${sessionId}/notes/`);
      const notesData = Array.isArray(response.data)
        ? response.data
        : response.data.results || [];
      setNotes(notesData);
      setNotesError(null);
      return notesData;
    } catch (err) {
      console.error("Error fetching notes:", err);
      setNotesError("Failed to load notes");
      return [];
    }
  };

  const startPollingNotes = () => {
    let pollCount = 0;
    const maxPolls = 30;

    pollingIntervalRef.current = setInterval(async () => {
      pollCount++;
      const fetchedNotes = await fetchNotes();

      if (fetchedNotes.length > notes.length) {
        clearInterval(pollingIntervalRef.current);
        setIsGenerating(false);
        setShowNotes(true);
        alert("AI notes generated successfully!");
      }

      if (pollCount >= maxPolls) {
        clearInterval(pollingIntervalRef.current);
        setIsGenerating(false);
        alert(
          "Note generation is taking longer than expected. Please refresh.",
        );
      }
    }, 2000); // Changed to 2 seconds for better UX
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    // FIX #2: Prevent multiple sends and validate message
    if (isSending || !newMessage.trim() || !session?.firestore_chat_id) {
      return;
    }

    const userJson = localStorage.getItem("user");
    const storedUser = userJson ? JSON.parse(userJson) : null;
    const senderId = storedUser?.id || "guest-id";
    const senderName = storedUser?.username || "Anonymous";

    // FIX #2: Set sending state immediately
    setIsSending(true);
    const messageToSend = newMessage.trim();

    // FIX #2: Clear input IMMEDIATELY before sending
    setNewMessage("");

    try {
      const messagesRef = collection(
        db,
        "studySessions",
        session.firestore_chat_id,
        "messages",
      );

      await addDoc(messagesRef, {
        text: messageToSend,
        senderId: senderId,
        senderName: senderName,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error sending message:", err);
      // FIX #2: Restore message if send fails
      setNewMessage(messageToSend);
      alert("Failed to send message. Please try again.");
    } finally {
      // FIX #2: Re-enable sending
      setIsSending(false);
    }
  };

  const handleGenerateNotes = async () => {
    if (messages.length === 0) {
      alert("No messages to analyze yet! Start chatting first.");
      return;
    }

    setIsGenerating(true);
    setNotesError(null);

    try {
      const messagesData = messages.map((msg) => ({
        text: msg.text,
        senderName: msg.senderName,
        senderId: msg.senderId,
        timestamp: msg.timestamp?.toDate?.() || new Date(),
      }));

      const response = await api.post(
        `/sessions/${sessionId}/generate_notes/`,
        { messages: messagesData },
      );

      if (response.status === 202) {
        alert("AI is processing your conversation. Notes will appear shortly!");
        startPollingNotes();
      } else if (response.status === 200 || response.status === 201) {
        await fetchNotes();
        setIsGenerating(false);
        setShowNotes(true);
        alert("AI notes generated successfully!");
      }
    } catch (err) {
      console.error("Error generating notes:", err);

      let errorMessage = "Failed to generate notes. ";
      if (err.response?.status === 404) {
        errorMessage += "Endpoint not found.";
      } else if (err.response?.status === 500) {
        errorMessage += "Server error.";
      } else if (err.response?.data?.detail) {
        errorMessage += err.response.data.detail;
      } else if (err.response?.data?.error) {
        errorMessage += err.response.data.error;
      }

      setNotesError(errorMessage);
      alert(errorMessage);
      setIsGenerating(false);

      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    }
  };

  const handleEndSession = async () => {
    if (!window.confirm("End session and return to dashboard?")) return;

    try {
      await api.post(`/sessions/${sessionId}/end_session/`);
      navigate("/dashboard");
    } catch (err) {
      console.error("Error ending session:", err);
      alert("Failed to end session.");
    }
  };

  // FIX #1: Toggle notes panel
  const toggleNotesPanel = () => {
    setShowNotes(!showNotes);
  };

  if (loading) return <div className="loading">Loading session...</div>;
  if (!session) return <div className="error">Session not found</div>;

  return (
    <div className={`chat-container ${showNotes ? "notes-open" : ""}`}>
      {/* Header */}
      <header className="chat-header">
        <div className="session-info">
          <h2>{session.post?.title || session.topic || "Study Session"}</h2>
          <span className="status-badge">● Live</span>
        </div>
        <div className="header-actions">
          <button
            onClick={toggleNotesPanel}
            className={`notes-btn ${showNotes ? "active" : ""}`}
          >
            📝 {showNotes ? "Hide Notes" : `Notes (${notes.length})`}
          </button>
          <button
            onClick={handleGenerateNotes}
            disabled={isGenerating || messages.length === 0}
            className="notes-btn"
          >
            {isGenerating ? "⏳ Processing..." : "🤖 Generate Notes"}
          </button>
          <button onClick={handleEndSession} className="end-btn">
            End Session
          </button>
        </div>
      </header>

      {/* Error Alert */}
      {notesError && (
        <div className="error-alert">
          {notesError}
          <button onClick={() => setNotesError(null)} className="error-close">
            ×
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="chat-main-content">
        {/* Messages Area */}
        <main className="messages-log">
          {messages.length === 0 ? (
            <div className="messages-empty">
              <div className="messages-empty-icon">💬</div>
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="message-item">
                <div className="message-bubble">
                  <span className="sender-name">{msg.senderName}</span>
                  <p className="message-text">{msg.text}</p>
                  <span className="message-time">
                    {msg.timestamp?.toDate?.().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))
          )}
          {/* FIX #3: Scroll anchor at the end of messages */}
          <div ref={messagesEndRef} />
        </main>

        {/* Message Input */}
        <form className="message-form" onSubmit={handleSendMessage}>
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={isSending}
            autoFocus
          />
          <button type="submit" disabled={!newMessage.trim() || isSending}>
            {isSending ? "Sending..." : "Send"}
          </button>
        </form>
      </div>

      {/* FIX #1: Notes Side Panel with proper open/close functionality */}
      <aside className={`notes-panel ${showNotes ? "active" : ""}`}>
        <div className="notes-panel-header">
          <h3>📚 Study Notes</h3>
          <div className="notes-panel-actions">
            <button
              onClick={fetchNotes}
              className="notes-refresh-btn"
              title="Refresh notes"
              disabled={isGenerating}
            >
              🔄
            </button>
            <button
              onClick={toggleNotesPanel}
              className="notes-close-btn"
              title="Close panel"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="notes-panel-content">
          {notes.length === 0 ? (
            <div className="notes-empty">
              <div className="notes-empty-icon">📝</div>
              <p>
                No notes yet. Click "Generate Notes" to create study notes from
                your conversation.
              </p>
            </div>
          ) : (
            notes.map((note, index) => (
              <article key={note.id || index} className="note-card">
                <div className="note-timestamp">
                  {new Date(note.created_at).toLocaleString()}
                </div>

                {note.content && (
                  <section className="note-section">
                    <h4 className="note-section-title">📄 Summary</h4>
                    <div className="note-section-content">
                      <p>{note.content}</p>
                    </div>
                  </section>
                )}

                {note.key_concepts && note.key_concepts.length > 0 && (
                  <section className="note-section">
                    <h4 className="note-section-title">💡 Key Concepts</h4>
                    <div className="note-section-content">
                      <ul>
                        {note.key_concepts.map((concept, idx) => (
                          <li key={idx}>{concept}</li>
                        ))}
                      </ul>
                    </div>
                  </section>
                )}

                {note.definitions && note.definitions.length > 0 && (
                  <section className="note-section">
                    <h4 className="note-section-title">📖 Definitions</h4>
                    <div className="note-section-content">
                      <ul>
                        {note.definitions.map((def, idx) => (
                          <li key={idx}>
                            <strong className="note-definition-term">
                              {def.term || def}:
                            </strong>{" "}
                            {def.definition || def}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                )}

                {note.study_tips && note.study_tips.length > 0 && (
                  <section className="note-section">
                    <h4 className="note-section-title">✨ Study Tips</h4>
                    <div className="note-section-content">
                      <ul>
                        {note.study_tips.map((tip, idx) => (
                          <li key={idx}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  </section>
                )}

                {note.resources_mentioned &&
                  note.resources_mentioned.length > 0 && (
                    <section className="note-section">
                      <h4 className="note-section-title">🔗 Resources</h4>
                      <div className="note-section-content">
                        <ul>
                          {note.resources_mentioned.map((resource, idx) => (
                            <li key={idx}>{resource}</li>
                          ))}
                        </ul>
                      </div>
                    </section>
                  )}
              </article>
            ))
          )}
        </div>
      </aside>
    </div>
  );
};

export default ChatRoom;
