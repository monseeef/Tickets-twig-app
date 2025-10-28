// main.js - client-side logic for auth + tickets + UI helpers
(() => {
  // Utility / Toasts
  function toast(msg, type = "info") {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    t.style =
      "position:fixed;bottom:20px;right:20px;padding:10px 14px;border-radius:8px;background:#111;color:#fff;opacity:0.95;z-index:9999";
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  // Cookie set helper (used so server route guard can also detect session)
  function setSessionCookie(token) {
    const days = 1;
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `ticketapp_session=${encodeURIComponent(token)};path=/;expires=${d.toUTCString()}`;
  }
  function clearSessionCookie() {
    document.cookie = "ticketapp_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }

  // Auth helpers
  const SESSION_KEY = "ticketapp_session";
  const TICKETS_KEY = "ticketapp_tickets";

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY));
    } catch (e) {
      return null;
    }
  }
  function setSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setSessionCookie(session && session.token ? session.token : "");
  }
  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    clearSessionCookie();
  }

  // sample hardcoded test user (same as React README)
  const TEST_USER = { email: "test@user.com", password: "password123", name: "Test User" };

  function isLoggedIn() {
    return !!getSession();
  }

  // show logout button if logged in
  const logoutBtn = document.getElementById("logout-btn");
  function refreshAuthUI() {
    const authLink = document.getElementById("auth-link");
    if (isLoggedIn()) {
      logoutBtn.hidden = false;
      if (authLink) authLink.hidden = true;
    } else {
      logoutBtn.hidden = true;
      if (authLink) authLink.hidden = false;
    }
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearSession();
      toast("Logged out.");
      refreshAuthUI();
      window.location.href = "/";
    });
  }

  // Protect client-side navigation for .protected links
  document.querySelectorAll(".protected").forEach((a) => {
    a.addEventListener("click", (e) => {
      if (!isLoggedIn()) {
        e.preventDefault();
        toast("Please log in to access that page.");
        window.location.href = "/auth/login";
      }
    });
  });

  // AUTH PAGE
  if (window.location.pathname.startsWith("/auth")) {
    const mode = window.location.pathname.endsWith("/signup") ? "signup" : "login";
    const title = document.getElementById("auth-title");
    const form = document.getElementById("auth-form");
    const switchEl = document.getElementById("auth-switch");

    function showMode(m) {
      if (m === "signup") {
        title.textContent = "Sign Up";
        document.getElementById("auth-submit").textContent = "Sign Up";
        switchEl.innerHTML = 'Have an account? <a href="/auth/login">Login</a>';
      } else {
        title.textContent = "Login";
        document.getElementById("auth-submit").textContent = "Login";
        switchEl.innerHTML = 'No account? <a href="/auth/signup">Sign up</a>';
      }
    }
    showMode(mode);

    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const email = form.email.value.trim();
      const password = form.password.value.trim();
      // simple validation
      let err = false;
      if (!email) {
        document.getElementById("email-error").textContent = "Email required";
        err = true;
      } else {
        document.getElementById("email-error").textContent = "";
      }
      if (!password || password.length < 6) {
        document.getElementById("password-error").textContent = "Password must be 6+ chars";
        err = true;
      } else {
        document.getElementById("password-error").textContent = "";
      }
      if (err) return;

      if (mode === "signup") {
        // create "account" — in this demo we accept any credentials but if email === test user we'll warn
        if (email === TEST_USER.email) {
          toast("Test user already exists — you can login with test@user.com / password123");
        }
        // Immediately log in the user
        const token = "token-" + Math.random().toString(36).slice(2);
        setSession({ email, token, name: email.split("@")[0] });
        toast("Signed up and logged in!");
        refreshAuthUI();
        window.location.href = "/dashboard";
      } else {
        // login mode: accept test user OR any user created previously (we don't persist users separately)
        if (email === TEST_USER.email && password === TEST_USER.password) {
          const token = "token-" + Math.random().toString(36).slice(2);
          setSession({ email, token, name: TEST_USER.name });
          toast("Login successful!");
          refreshAuthUI();
          window.location.href = "/dashboard";
          return;
        }
        // fallback: accept any email with any password (simulate signup-less login)
        // but show an error for invalid test credentials
        const token = "token-" + Math.random().toString(36).slice(2);
        setSession({ email, token, name: email.split("@")[0] });
        toast("Login successful!");
        refreshAuthUI();
        window.location.href = "/dashboard";
      }
    });
    refreshAuthUI();
  }

  // DASHBOARD PAGE
  if (window.location.pathname === "/dashboard") {
    // client side guard
    if (!isLoggedIn()) {
      toast("Your session has expired — please log in again.");
      window.location.href = "/auth/login";
    } else {
      const tickets = JSON.parse(localStorage.getItem(TICKETS_KEY) || "[]");
      const total = tickets.length;
      const open = tickets.filter((t) => t.status === "open").length;
      const resolved = tickets.filter((t) => t.status === "closed").length;
      document.getElementById("stat-total").textContent = total;
      document.getElementById("stat-open").textContent = open;
      document.getElementById("stat-resolved").textContent = resolved;
    }
    refreshAuthUI();
  }

  // TICKETS PAGE (CRUD)
  if (window.location.pathname === "/tickets") {
    if (!isLoggedIn()) {
      toast("Unauthorized — please log in.");
      window.location.href = "/auth/login";
      return;
    }
    refreshAuthUI();

    // Helpers for tickets storage
    function loadTickets() {
      try {
        return JSON.parse(localStorage.getItem(TICKETS_KEY) || "[]");
      } catch (e) {
        return [];
      }
    }
    function saveTickets(arr) {
      localStorage.setItem(TICKETS_KEY, JSON.stringify(arr));
    }

    // UI Elements
    const grid = document.getElementById("tickets-grid");
    const createBtn = document.getElementById("create-ticket-btn");
    const modal = document.getElementById("ticket-modal");
    const form = document.getElementById("ticket-form");
    const modalTitle = document.getElementById("modal-title");

    let editId = null;

    function render() {
      const tickets = loadTickets();
      grid.innerHTML = "";
      if (!tickets.length) {
        grid.innerHTML = '<div class="card">No tickets yet. Create one.</div>';
        return;
      }
      tickets.forEach((t) => {
        const card = document.createElement("article");
        card.className = "ticket-card card";
        card.innerHTML = `
          <h4 class="ticket-title">${escapeHtml(t.title)}</h4>
          <div class="ticket-meta">
            <span class="status-tag status-${t.status}">${t.status}</span>
          </div>
          <p>${escapeHtml(t.description || "")}</p>
          <div style="margin-top:10px; display:flex; gap:8px;">
            <button data-id="${t.id}" class="btn edit">Edit</button>
            <button data-id="${t.id}" class="btn outline delete">Delete</button>
          </div>
        `;
        grid.appendChild(card);
      });

      // wire actions
      grid.querySelectorAll(".edit").forEach((b) => {
        b.addEventListener("click", (ev) => {
          const id = ev.currentTarget.getAttribute("data-id");
          openEdit(id);
        });
      });
      grid.querySelectorAll(".delete").forEach((b) => {
        b.addEventListener("click", (ev) => {
          const id = ev.currentTarget.getAttribute("data-id");
          if (!confirm("Delete this ticket?")) return;
          const arr = loadTickets().filter((x) => x.id !== id);
          saveTickets(arr);
          toast("Ticket deleted.");
          render();
        });
      });
    }

    function escapeHtml(s) {
      if (!s) return "";
      return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    }

    function openCreate() {
      editId = null;
      modalTitle.textContent = "Create Ticket";
      form["title"].value = "";
      form["status"].value = "";
      form["description"].value = "";
      document.getElementById("t-title-error").textContent = "";
      document.getElementById("t-status-error").textContent = "";
      if (typeof modal.showModal === "function") modal.showModal();
      else modal.style.display = "block";
    }

    function openEdit(id) {
      const arr = loadTickets();
      const t = arr.find((x) => x.id === id);
      if (!t) {
        toast("Failed to load ticket. Please retry.");
        return;
      }
      editId = id;
      modalTitle.textContent = "Edit Ticket";
      form["title"].value = t.title;
      form["status"].value = t.status;
      form["description"].value = t.description || "";
      document.getElementById("t-title-error").textContent = "";
      document.getElementById("t-status-error").textContent = "";
      if (typeof modal.showModal === "function") modal.showModal();
      else modal.style.display = "block";
    }

    // create sample tickets if none
    if (!localStorage.getItem(TICKETS_KEY)) {
      const sample = [
        { id: "t1", title: "Sample open ticket", status: "open", description: "A sample open ticket" },
        { id: "t2", title: "Sample in progress", status: "in_progress", description: "Work in progress" },
        { id: "t3", title: "Sample closed", status: "closed", description: "Resolved ticket" },
      ];
      saveTickets(sample);
    }

    createBtn.addEventListener("click", openCreate);

    document.getElementById("cancel-ticket").addEventListener("click", () => {
      if (typeof modal.close === "function") modal.close();
      else modal.style.display = "none";
    });

    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const title = form["title"].value.trim();
      const status = form["status"].value;
      const desc = form["description"].value.trim();

      let ok = true;
      if (!title) {
        document.getElementById("t-title-error").textContent = "Title is required";
        ok = false;
      } else if (title.length < 3) {
        document.getElementById("t-title-error").textContent = "Title must be 3+ characters";
        ok = false;
      } else {
        document.getElementById("t-title-error").textContent = "";
      }
      const allowed = ["open", "in_progress", "closed"];
      if (!status || !allowed.includes(status)) {
        document.getElementById("t-status-error").textContent = "Select a valid status";
        ok = false;
      } else {
        document.getElementById("t-status-error").textContent = "";
      }
      if (desc && desc.length > 1000) {
        document.getElementById("t-desc-error").textContent = "Description too long";
        ok = false;
      } else {
        document.getElementById("t-desc-error").textContent = "";
      }

      if (!ok) return;

      const arr = loadTickets();
      if (editId) {
        const idx = arr.findIndex((x) => x.id === editId);
        if (idx !== -1) {
          arr[idx].title = title;
          arr[idx].status = status;
          arr[idx].description = desc;
          saveTickets(arr);
          toast("Ticket updated.");
        } else {
          toast("Failed to update ticket.");
        }
      } else {
        const newTicket = {
          id: "t-" + Math.random().toString(36).slice(2),
          title,
          status,
          description: desc,
        };
        arr.unshift(newTicket);
        saveTickets(arr);
        toast("Ticket created.");
      }
      if (typeof modal.close === "function") modal.close();
      render();
    });

    render();
  }

  // simple enhancement: update header UI based on session on every load
  refreshAuthUI();
})();
