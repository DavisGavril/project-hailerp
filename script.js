document.querySelectorAll('.role-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.role-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
  });
});

const toggleBtn = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');
if (toggleBtn && passwordInput) {
  toggleBtn.addEventListener('click', () => {
    const isHidden = passwordInput.type === 'password';
    passwordInput.type = isHidden ? 'text' : 'password';
    toggleBtn.innerHTML = isHidden
      ? '<i class="fa-solid fa-eye-slash"></i>'
      : '<i class="fa-solid fa-eye"></i>';
  });
}

function resetButtonState() {
  const btn = document.getElementById('signInBtn');
  const btnLabel = document.getElementById('btnLabel');
  const spinner = document.getElementById('btnIcon');
  if (btn) btn.disabled = false;
  if (btnLabel) btnLabel.textContent = 'Sign In to Dashboard';
  if (spinner) {
    spinner.outerHTML = '<i class="fa-solid fa-arrow-right" id="btnIcon"></i>';
  }
}

function setLoadingState() {
  const btn = document.getElementById('signInBtn');
  const btnLabel = document.getElementById('btnLabel');
  if (btn) btn.disabled = true;
  if (btnLabel) btnLabel.textContent = 'Authenticating...';
  const icon = document.getElementById('btnIcon');
  if (icon) {
    icon.outerHTML = '<span class="spinner-border spinner-border-sm" id="btnIcon" role="status"></span>';
  }
}

function showSuccessState() {
  const btn = document.getElementById('signInBtn');
  const btnLabel = document.getElementById('btnLabel');
  if (btn) btn.classList.add('success');
  if (btnLabel) btnLabel.textContent = 'Access Granted';
  const spinner = document.getElementById('btnIcon');
  if (spinner) {
    spinner.outerHTML = '<i class="fa-solid fa-circle-check" id="btnIcon"></i>';
  }
}

async function submitToBackend(endpoint, payload) {
  const response = await fetch(`http://localhost:8000${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  return { response, data };
}

const form = document.getElementById('loginForm');
const btn = document.getElementById('signInBtn');
const btnLabel = document.getElementById('btnLabel');

if (form) {
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    setLoadingState();

    const emailValue = document.getElementById('email').value.trim();
    const passwordValue = document.getElementById('password').value;
    const activeRole = document.querySelector('.role-tab.active').dataset.role;

    try {
      const { response, data } = await submitToBackend('/api/login', {
        email: emailValue,
        password: passwordValue,
        role: activeRole
      });

      if (response.ok) {
        showSuccessState();
        const dashboardByRole = {
          student: 'student-dashboard.html',
          faculty: 'faculty-dashboard.html',
          admin: 'admin-dashboard.html'
        };
        const target = dashboardByRole[activeRole] || 'student-dashboard.html';
        setTimeout(() => {
          window.location.href = `${target}?email=${encodeURIComponent(emailValue)}&role=${activeRole}`;
        }, 700);
        return;
      }

      resetButtonState();
      if (response.status === 404) {
        document.getElementById('regEmail').value = emailValue;
        document.getElementById('regRole').value = activeRole;

        let suggestedId = '';
        const randNum = Math.floor(100 + Math.random() * 899);
        if (activeRole === 'student') {
          suggestedId = `731122205${randNum}`;
        } else if (activeRole === 'faculty') {
          suggestedId = `EMP-2026-${randNum}`;
        } else {
          suggestedId = `EMP-2022-${randNum}`;
        }
        document.getElementById('regId').value = suggestedId;

        const regModal = new bootstrap.Modal(document.getElementById('registerModal'));
        regModal.show();
        return;
      }

      alert(data.error || 'Authentication failed');
    } catch (error) {
      resetButtonState();
      alert('Unable to reach the backend server. Start it with python server.py.');
    }
  });
}

// Manual registration link click listener
const manualLink = document.getElementById('manualRegisterLink');
if (manualLink) {
  manualLink.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('registerForm').reset();
    
    const emailVal = document.getElementById('email').value.trim();
    const activeRole = document.querySelector('.role-tab.active').dataset.role;
    if (emailVal) document.getElementById('regEmail').value = emailVal;
    if (activeRole) {
      document.getElementById('regRole').value = activeRole;
      let suggestedId = "";
      const randNum = Math.floor(100 + Math.random() * 899);
      if (activeRole === 'student') {
        suggestedId = `731122205${randNum}`;
      } else if (activeRole === 'faculty') {
        suggestedId = `EMP-2026-${randNum}`;
      } else {
        suggestedId = `EMP-2022-${randNum}`;
      }
      document.getElementById('regId').value = suggestedId;
    }
    
    const regModal = new bootstrap.Modal(document.getElementById('registerModal'));
    regModal.show();
  });
}

// Update suggested ID when registration role changes
const regRoleSelect = document.getElementById('regRole');
if (regRoleSelect) {
  regRoleSelect.addEventListener('change', () => {
    const selectedRole = regRoleSelect.value;
    let suggestedId = "";
    const randNum = Math.floor(100 + Math.random() * 899);
    if (selectedRole === 'student') {
      suggestedId = `731122205${randNum}`;
    } else if (selectedRole === 'faculty') {
      suggestedId = `EMP-2026-${randNum}`;
    } else if (selectedRole === 'admin') {
      suggestedId = `EMP-2022-${randNum}`;
    }
    document.getElementById('regId').value = suggestedId;
  });
}

// Registration form submission handler
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('regEmail').value.trim();
    const role = document.getElementById('regRole').value;
    const name = document.getElementById('regName').value.trim();
    const dept = document.getElementById('regDept').value;
    const password = document.getElementById('regPassword').value;
    const regId = document.getElementById('regId').value.trim();

    try {
      const { response, data } = await submitToBackend('/api/signup', {
        email,
        password,
        role,
        name,
        dept,
        regId
      });

      if (!response.ok) {
        alert(data.error || 'Registration failed');
        return;
      }

      const regModalEl = document.getElementById('registerModal');
      const modalInstance = bootstrap.Modal.getInstance(regModalEl);
      if (modalInstance) {
        modalInstance.hide();
      }

      alert(`Account Registered Successfully!\n\nYour Unique ID: ${regId}\nPassword: ${password}\n\nRedirecting to Dashboard...`);

      const dashboardByRole = {
        student: 'student-dashboard.html',
        faculty: 'faculty-dashboard.html',
        admin: 'admin-dashboard.html'
      };
      const target = dashboardByRole[role] || 'student-dashboard.html';

      setTimeout(() => {
        window.location.href = `${target}?email=${encodeURIComponent(email)}&role=${role}`;
      }, 500);
    } catch (error) {
      alert('Unable to reach the backend server. Start it with python server.py.');
    }
  });
}
