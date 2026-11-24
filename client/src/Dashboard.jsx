import { useEffect, useRef, useState } from "react";
import axios from "axios";

import {
  Activity,
  ArrowUp,
  BarChart3,
  Check,
  ChevronDown,
  Clock3,
  Database,
  FileCode2,
  History,
  Loader2,
  Menu,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Table2,
  Trash2,
  UserCircle,
  LogOut,
  X,
  Zap,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import "./App.css";

const API_URL = "http://localhost:5000/api/query/generate";


// ---------------------------------------------
// INITIAL DATA
// ---------------------------------------------

const createNewConversation = () => ({
  localId: crypto.randomUUID(),
  conversationId: null,
  title: "New conversation",
  messages: [],
  updatedAt: Date.now(),
});


// ---------------------------------------------
// MAIN APPLICATION
// ---------------------------------------------

function Dashboard({ user, onLogout }) {

  // Keep each user's locally stored conversations separate.
  const userStorageId = user?.id ?? user?.userId ?? user?.email ?? "current-user";
  const STORAGE_KEY = `data-query-ai-conversations-${userStorageId}`;
  const ACTIVE_KEY = `data-query-ai-active-${userStorageId}`;

  const [conversations, setConversations] = useState(() => {

    try {

      return JSON.parse(
        localStorage.getItem(STORAGE_KEY)
      ) || [];

    } catch {

      return [];

    }

  });


  const [activeId, setActiveId] = useState(() => {

    try {

      return localStorage.getItem(ACTIVE_KEY);

    } catch {

      return null;

    }

  });


  const [input, setInput] = useState("");

  const [loading, setLoading] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [expandedSQL, setExpandedSQL] = useState({});

  const [activeTabs, setActiveTabs] = useState({});


  const bottomRef = useRef(null);

  const inputRef = useRef(null);


  // -------------------------------------------
  // ACTIVE CONVERSATION
  // -------------------------------------------

  const activeConversation = conversations.find(
    (conversation) => conversation.localId === activeId
  );


  // -------------------------------------------
  // PERSIST CONVERSATIONS
  // -------------------------------------------

  useEffect(() => {

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(conversations)
    );

  }, [conversations]);


  useEffect(() => {

    if (activeId) {

      localStorage.setItem(
        ACTIVE_KEY,
        activeId
      );

    }

  }, [activeId]);


  // -------------------------------------------
  // AUTO SCROLL
  // -------------------------------------------

  useEffect(() => {

    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });

  }, [activeConversation?.messages, loading]);


  // -------------------------------------------
  // NEW CONVERSATION
  // -------------------------------------------

  const createConversation = () => {

    if (loading) return;

    const conversation = createNewConversation();

    setConversations((previous) => [
      conversation,
      ...previous,
    ]);

    setActiveId(conversation.localId);

    setInput("");

    inputRef.current?.focus();

  };


  // -------------------------------------------
  // SELECT CONVERSATION
  // -------------------------------------------

  const selectConversation = (id) => {

    if (loading) return;

    setActiveId(id);

    setInput("");

  };


  // -------------------------------------------
  // DELETE CONVERSATION
  // -------------------------------------------

  const deleteConversation = (id) => {

    const updated = conversations.filter(
      (conversation) => conversation.localId !== id
    );

    setConversations(updated);

    if (activeId === id) {

      if (updated.length > 0) {

        setActiveId(updated[0].localId);

      } else {

        setActiveId(null);

      }

    }

  };


  // -------------------------------------------
  // SEND QUESTION TO BACKEND
  // -------------------------------------------

  const sendMessage = async (e) => {

    e?.preventDefault();

    const question = input.trim();

    if (!question || loading) return;


    let conversation = activeConversation;


    // Create conversation if one doesn't exist

    if (!conversation) {

      conversation = createNewConversation();

      setConversations((previous) => [
        conversation,
        ...previous,
      ]);

      setActiveId(conversation.localId);

    }


    const localId = conversation.localId;


    const userMessage = {

      id: crypto.randomUUID(),

      role: "user",

      content: question,

    };


    // Update conversation with user question

    setConversations((previous) => {

      const existing = previous.find(
        (item) => item.localId === localId
      );


      const updatedConversation = {

        ...conversation,

        ...(existing || {}),

        title:
          conversation.messages.length === 0
            ? question.slice(0, 35)
            : conversation.title,

        messages: [
          ...(existing?.messages || conversation.messages),
          userMessage,
        ],

        updatedAt: Date.now(),

      };


      return [

        updatedConversation,

        ...previous.filter(
          (item) => item.localId !== localId
        ),

      ];

    });


    setInput("");

    setLoading(true);


    try {

      const payload = {

        question,

      };


      if (conversation.conversationId) {

        payload.conversationId =
          conversation.conversationId;

      }


      const response = await axios.post(
        API_URL,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
          timeout: 120000,
        }
      );


      const data = response.data;


      if (!data.success) {

        throw new Error(
          data.message || "Something went wrong"
        );

      }


      const assistantMessage = {

        id: crypto.randomUUID(),

        role: "assistant",

        content: data.message,

        sqlQuery: data.sqlQuery,

        results: data.results || [],

        columns: data.columns || [],

        rowCount: data.rowCount || 0,

        executionTime: data.executionTime,

        wasAutoCorrected: data.wasAutoCorrected,

        correctionAttempts: data.correctionAttempts,

      };


      // Save backend conversation ID

      setConversations((previous) => {

        const updatedConversation = previous.find(
          (item) => item.localId === localId
        );


        if (!updatedConversation) return previous;


        return [

          {

            ...updatedConversation,

            conversationId: data.conversationId,

            messages: [

              ...updatedConversation.messages,

              assistantMessage,

            ],

            updatedAt: Date.now(),

          },

          ...previous.filter(
            (item) => item.localId !== localId
          ),

        ];

      });


    } catch (error) {

      console.error("API Error:", error);


      const errorMessage = {

        id: crypto.randomUUID(),

        role: "assistant",

        error: true,

        content:
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          "Unable to connect to the server.",

      };


      setConversations((previous) => {

        return previous.map((item) => {

          if (item.localId !== localId) return item;


          return {

            ...item,

            messages: [

              ...item.messages,

              errorMessage,

            ],

          };

        });

      });

    } finally {

      setLoading(false);

      inputRef.current?.focus();

    }

  };
    // -------------------------------------------
  // KEYBOARD HANDLING
  // -------------------------------------------

  const handleKeyDown = (e) => {

    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {

      e.preventDefault();

      sendMessage();

    }

  };


  // -------------------------------------------
  // GROUP CONVERSATIONS BY DATE
  // -------------------------------------------

  const today = new Date().toDateString();


  const recentConversations = conversations.filter(
    (conversation) =>
      new Date(conversation.updatedAt).toDateString() === today
  );


  const olderConversations = conversations.filter(
    (conversation) =>
      new Date(conversation.updatedAt).toDateString() !== today
  );


  return (

    <div className="app-container">


      {/* SIDEBAR */}

      <aside className={`sidebar ${sidebarOpen ? "" : "sidebar-hidden"}`}>

        <div className="sidebar-header">

          <div className="brand">

            <div className="brand-icon">
              <Database size={21} />
            </div>

            <span>DataQuery<span className="brand-ai">AI</span></span>

          </div>

          <button
            className="icon-button"
            onClick={() => setSidebarOpen(false)}
            title="Close sidebar"
          >
            <X size={18} />
          </button>

        </div>


        <button
          className="new-chat-button"
          onClick={createConversation}
        >

          <Plus size={18} />

          <span>New conversation</span>

        </button>


        <div className="sidebar-section">

          <div className="sidebar-label">
            <History size={14} />
            Recent conversations
          </div>


          {recentConversations.length > 0 && (

            <div className="conversation-list">

              {recentConversations.map((conversation) => (

                <ConversationItem
                  key={conversation.localId}
                  conversation={conversation}
                  active={activeId === conversation.localId}
                  onSelect={selectConversation}
                  onDelete={deleteConversation}
                />

              ))}

            </div>

          )}


          {olderConversations.length > 0 && (

            <>

              <div className="sidebar-label older-label">
                Previous conversations
              </div>

              <div className="conversation-list">

                {olderConversations.map((conversation) => (

                  <ConversationItem
                    key={conversation.localId}
                    conversation={conversation}
                    active={activeId === conversation.localId}
                    onSelect={selectConversation}
                    onDelete={deleteConversation}
                  />

                ))}

              </div>

            </>

          )}


          {conversations.length === 0 && (

            <p className="empty-sidebar">
              Your conversations will appear here.
            </p>

          )}

        </div>


        <div className="sidebar-footer">

          <div className="database-status">

            <span className="status-dot"></span>

            <div>
              <strong>Database connected</strong>
              <small>PostgreSQL</small>
            </div>

          </div>


          <div className="sidebar-version">
            DataQuery AI · v1.0
          </div>

        </div>

      </aside>


      {/* MAIN AREA */}

      <main className="main-area">


        {/* TOP BAR */}

        <header className="topbar">

          <div className="topbar-left">

            {!sidebarOpen && (

              <button
                className="icon-button"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size={20} />
              </button>

            )}

            <div className="breadcrumb">
              Workspace <span>/</span> AI Assistant
            </div>

          </div>


          <div className="topbar-right">

            <div className="model-indicator">

              <Sparkles size={14} />

              Gemini AI

              <span className="online-dot"></span>

            </div>

            <div className="account-actions">

              <div className="account-info">
                <UserCircle size={19} />
                <span>{user?.name || user?.email || "Account"}</span>
              </div>

              <button
                type="button"
                className="logout-button"
                onClick={onLogout}
                title="Logout"
              >
                <LogOut size={16} />
                Logout
              </button>

            </div>

          </div>

        </header>


        {/* CHAT CONTENT */}

        <section className="chat-area">


          {!activeConversation?.messages?.length ? (

            <div className="welcome-screen">

              <div className="welcome-icon">
                <Database size={30} />
                <Sparkles size={15} className="welcome-sparkle" />
              </div>


              <div className="welcome-heading">

                <span className="welcome-eyebrow">
                  YOUR AI DATABASE ASSISTANT
                </span>

                <h1>
                  Your data, <span>your questions.</span>
                </h1>

                <p>
                  Explore your PostgreSQL database using
                  natural language. No SQL expertise required.
                </p>

              </div>


              <div className="suggestion-grid">

                <SuggestionCard
                  icon={<BarChart3 size={19} />}
                  title="Analyze revenue"
                  description="Calculate total revenue generated from all orders"
                  onClick={() => setInput(
                    "Calculate the total revenue generated from all orders"
                  )}
                />

                <SuggestionCard
                  icon={<Activity size={19} />}
                  title="Customer insights"
                  description="Find the top three customers by spending"
                  onClick={() => setInput(
                    "Find the top three customers based on their total spending"
                  )}
                />

                <SuggestionCard
                  icon={<Database size={19} />}
                  title="Explore customers"
                  description="Show all customers from Noida"
                  onClick={() => setInput(
                    "Show all customers from Noida"
                  )}
                />

                <SuggestionCard
                  icon={<Table2 size={19} />}
                  title="Database overview"
                  description="Show all products and their prices"
                  onClick={() => setInput(
                    "Show all products and their prices"
                  )}
                />

              </div>

            </div>

          ) : (

            <div className="messages-container">

              {activeConversation.messages.map((message) => (

                <MessageBubble
                  key={message.id}
                  message={message}
                  expandedSQL={expandedSQL}
                  setExpandedSQL={setExpandedSQL}
                  activeTabs={activeTabs}
                  setActiveTabs={setActiveTabs}
                />

              ))}


              {loading && (

                <div className="loading-message">

                  <div className="assistant-avatar">
                    <Sparkles size={17} />
                  </div>

                  <div className="loading-content">

                    <strong>DataQuery AI</strong>

                    <div className="loading-indicator">
                      <Loader2 size={15} className="spin" />
                      Analyzing your question and querying database...
                    </div>

                  </div>

                </div>

              )}


              <div ref={bottomRef}></div>

            </div>

          )}

        </section>


        {/* INPUT AREA */}

        <footer className="input-section">

          <form
            className="chat-input-container"
            onSubmit={sendMessage}
          >

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your database..."
              rows={1}
              disabled={loading}
            />


            <div className="input-bottom">

              <div className="input-hint">

                <Zap size={13} />

                AI-powered SQL generation

              </div>


              <button
                className="send-button"
                type="submit"
                disabled={!input.trim() || loading}
                title="Send message"
              >

                {loading ? (
                  <Loader2 size={17} className="spin" />
                ) : (
                  <Send size={17} />
                )}

              </button>

            </div>

          </form>


          <p className="disclaimer">
            AI-generated SQL may occasionally contain errors.
            Queries are executed using a read-only database connection.
          </p>

        </footer>

      </main>

    </div>

  );

}
// ---------------------------------------------
// CONVERSATION SIDEBAR ITEM
// ---------------------------------------------

function ConversationItem({
  conversation,
  active,
  onSelect,
  onDelete,
}) {

  return (

    <div className={`conversation-item ${active ? "active" : ""}`}>

      <button
        className="conversation-select"
        onClick={() => onSelect(conversation.localId)}
      >

        <MessageSquare size={15} />

        <span>{conversation.title}</span>

      </button>


      <button
        className="delete-conversation"
        onClick={() => onDelete(conversation.localId)}
        title="Delete conversation"
      >

        <Trash2 size={14} />

      </button>

    </div>

  );

}


// ---------------------------------------------
// SUGGESTION CARD
// ---------------------------------------------

function SuggestionCard({
  icon,
  title,
  description,
  onClick,
}) {

  return (

    <button
      className="suggestion-card"
      onClick={onClick}
    >

      <div className="suggestion-icon">
        {icon}
      </div>

      <div className="suggestion-content">

        <strong>{title}</strong>

        <span>{description}</span>

      </div>

      <ArrowUp size={15} className="suggestion-arrow" />

    </button>

  );

}


// ---------------------------------------------
// CHAT MESSAGE
// ---------------------------------------------

function MessageBubble({
  message,
  expandedSQL,
  setExpandedSQL,
  activeTabs,
  setActiveTabs,
}) {

  if (message.role === "user") {

    return (

      <div className="user-message">

        <div className="user-message-content">
          {message.content}
        </div>

      </div>

    );

  }


  const currentTab = activeTabs[message.id] || "table";

  const isExpanded = expandedSQL[message.id] !== false;


  if (message.error) {

    return (

      <div className="assistant-message">

        <div className="assistant-avatar">
          <Sparkles size={17} />
        </div>

        <div className="assistant-body">

          <strong>DataQuery AI</strong>

          <div className="error-card">
            <X size={16} />
            {message.content}
          </div>

        </div>

      </div>

    );

  }


  return (

    <div className="assistant-message">

      <div className="assistant-avatar">
        <Sparkles size={17} />
      </div>


      <div className="assistant-body">

        <div className="assistant-name">
          DataQuery AI
          <span className="success-label">
            <Check size={12} />
            Completed
          </span>
        </div>


        <p className="assistant-description">
          Your query has been generated and executed successfully.
        </p>


        {/* QUERY METADATA */}

        <div className="query-stats">

          <div>
            <Table2 size={14} />
            {message.rowCount} rows
          </div>

          <div>
            <Clock3 size={14} />
            {message.executionTime} ms
          </div>

          {message.wasAutoCorrected && (

            <div>
              <Check size={14} />
              Auto-corrected
            </div>

          )}

        </div>


        {/* SQL PANEL */}

        <div className="result-panel">

          <div
            className="panel-header sql-header"
            onClick={() => setExpandedSQL((previous) => ({
              ...previous,
              [message.id]: !isExpanded,
            }))}
          >

            <div>
              <FileCode2 size={16} />
              Generated SQL
            </div>

            <ChevronDown
              size={17}
              className={isExpanded ? "rotate-icon" : ""}
            />

          </div>


          {isExpanded && (

            <div className="sql-content">

              <pre>
                <code>{message.sqlQuery}</code>
              </pre>

            </div>

          )}

        </div>


        {/* RESULTS PANEL */}

        <div className="result-panel">

          <div className="panel-header results-header">

            <div>
              <Database size={16} />
              Query Results
            </div>

            <span className="result-count">
              {message.rowCount} records
            </span>

          </div>


          <div className="results-tabs">

            <button
              className={currentTab === "table" ? "selected" : ""}
              onClick={() => setActiveTabs((previous) => ({
                ...previous,
                [message.id]: "table",
              }))}
            >
              <Table2 size={14} />
              Table
            </button>


            <button
              className={currentTab === "chart" ? "selected" : ""}
              onClick={() => setActiveTabs((previous) => ({
                ...previous,
                [message.id]: "chart",
              }))}
            >
              <BarChart3 size={14} />
              Chart
            </button>

          </div>


          {currentTab === "table" ? (

            <ResultsTable
              columns={message.columns}
              results={message.results}
            />

          ) : (

            <ResultsChart
              columns={message.columns}
              results={message.results}
            />

          )}

        </div>


        <div className="message-footer">
          <Check size={13} />
          Executed successfully on PostgreSQL
        </div>

      </div>

    </div>

  );

}
// ---------------------------------------------
// RESULTS TABLE
// ---------------------------------------------

function ResultsTable({ columns, results }) {

  if (!results?.length) {

    return (

      <div className="no-results">
        No records found.
      </div>

    );

  }


  return (

    <div className="table-wrapper">

      <table className="results-table">

        <thead>

          <tr>

            {columns.map((column) => (

              <th key={column}>
                {column.replaceAll("_", " ")}
              </th>

            ))}

          </tr>

        </thead>


        <tbody>

          {results.map((row, index) => (

            <tr key={index}>

              {columns.map((column) => (

                <td key={column}>
                  {row[column] === null
                    ? <span className="null-value">NULL</span>
                    : String(row[column])}
                </td>

              ))}

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  );

}


// ---------------------------------------------
// RESULTS CHART
// ---------------------------------------------

function ResultsChart({ columns, results }) {

  const numericColumns = columns.filter((column) => {

    return results.some((row) => {

      const value = row[column];

      return (
        value !== null &&
        value !== "" &&
        Number.isFinite(Number(value))
      );

    });

  });


  const categoryColumn = columns.find(
    (column) => !numericColumns.includes(column)
  );


  if (
    !results.length ||
    !numericColumns.length ||
    !categoryColumn
  ) {

    return (

      <div className="no-results">
        These results don't contain suitable categorical
        and numeric columns for a bar chart.
      </div>

    );

  }


  const chartData = results.map((row) => ({

    name: String(row[categoryColumn]),

    value: Number(row[numericColumns[0]]),

  }));


  return (

    <div className="chart-container">

      <div className="chart-title">
        {numericColumns[0].replaceAll("_", " ")}
      </div>

      <ResponsiveContainer width="100%" height={280}>

        <BarChart data={chartData}>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e5eaf2"
          />

          <XAxis
            dataKey="name"
            stroke="#94a3b8"
            tick={{ fontSize: 12 }}
          />

          <YAxis
            stroke="#94a3b8"
            tick={{ fontSize: 12 }}
          />

          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #e5eaf2",
              borderRadius: "8px",
              color: "#344054",
            }}
          />

          <Bar
            dataKey="value"
            fill="#5865d9"
            radius={[5, 5, 0, 0]}
          />

        </BarChart>

      </ResponsiveContainer>

    </div>

  );

}


export default Dashboard;