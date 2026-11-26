document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const signupContainer = document.getElementById("signup-container");
  const loginDialog = document.getElementById("login-dialog");
  const loginForm = document.getElementById("login-form");
  const authMessage = document.getElementById("auth-message");
  const loginButton = document.getElementById("login-open");
  const logoutButton = document.getElementById("logout-button");
  const authStatus = document.getElementById("auth-status");
  let isTeacher = false;

  function setTeacherAuthenticated(authenticated) {
    isTeacher = authenticated;
    signupContainer.hidden = !authenticated;
    loginButton.hidden = authenticated;
    logoutButton.hidden = !authenticated;
    authStatus.textContent = authenticated ? "Teacher signed in" : "Public view";
  }

  function showMessage(element, text, isSuccess) {
    element.textContent = text;
    element.className = isSuccess ? "success" : "error";
    element.classList.remove("hidden");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.replaceChildren(activitySelect.options[0]);

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) => `
                      <li>
                        <span class="participant-email">${email}</span>
                        ${
                          isTeacher
                            ? `<button class="delete-btn" data-activity="${name}" data-email="${email}" aria-label="Unregister ${email}">❌</button>`
                            : ""
                        }
                      </li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        activityCard.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", handleUnregister);
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");
    if (!email) {
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(messageDiv, result.message, true);

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        if (response.status === 401) {
          setTeacherAuthenticated(false);
          fetchActivities();
        }
        showMessage(messageDiv, result.detail || "An error occurred", false);
      }

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      showMessage(messageDiv, "Failed to unregister. Please try again.", false);
      console.error("Error unregistering:", error);
    }
  }

  loginButton.addEventListener("click", () => {
    document.querySelector(".user-menu").open = false;
    authMessage.className = "hidden";
    loginDialog.showModal();
  });

  document.getElementById("login-cancel").addEventListener("click", () => {
    loginDialog.close();
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();

      if (!response.ok) {
        showMessage(authMessage, result.detail || "Sign in failed", false);
        return;
      }

      loginForm.reset();
      loginDialog.close();
      setTeacherAuthenticated(true);
      fetchActivities();
    } catch (error) {
      showMessage(authMessage, "Unable to sign in. Please try again.", false);
      console.error("Error signing in:", error);
    }
  });

  logoutButton.addEventListener("click", async () => {
    try {
      const response = await fetch("/auth/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error(`Sign out failed with status ${response.status}`);
      }

      setTeacherAuthenticated(false);
      fetchActivities();
    } catch (error) {
      showMessage(messageDiv, "Could not sign out. Please try again.", false);
      console.error("Error signing out:", error);
    }
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(messageDiv, result.message, true);
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        if (response.status === 401) {
          setTeacherAuthenticated(false);
          fetchActivities();
        }
        showMessage(messageDiv, result.detail || "An error occurred", false);
      }

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      showMessage(messageDiv, "Failed to sign up. Please try again.", false);
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetch("/auth/session")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Session check failed with status ${response.status}`);
      }
      return response.json();
    })
    .then((session) => {
      setTeacherAuthenticated(session.authenticated);
      fetchActivities();
    })
    .catch((error) => {
      setTeacherAuthenticated(false);
      console.error("Error checking teacher session:", error);
      fetchActivities();
    });
});
