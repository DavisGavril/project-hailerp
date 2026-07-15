// ===== EduPulse ERP - Unified Dashboard Shared Script =====

(function() {
  // 1. Session & Parameters Management
  const urlParams = new URLSearchParams(window.location.search);
  let emailParam = urlParams.get('email');
  let roleParam = urlParams.get('role');

  if (emailParam) sessionStorage.setItem('edupulse_email', emailParam);
  if (roleParam) sessionStorage.setItem('edupulse_role', roleParam);

  if (!emailParam) emailParam = sessionStorage.getItem('edupulse_email');
  if (!roleParam) roleParam = sessionStorage.getItem('edupulse_role');

  // Fallbacks if accessed completely directly
  if (!roleParam) {
    const pathName = window.location.pathname.toLowerCase();
    if (pathName.includes('admin-')) {
      roleParam = 'admin';
    } else if (pathName.includes('faculty-')) {
      roleParam = 'faculty';
    } else {
      roleParam = 'student';
    }
  }
  if (!emailParam) {
    if (roleParam === 'admin') {
      emailParam = 'admin@institution.edu';
    } else if (roleParam === 'faculty') {
      emailParam = 'prof.iyer@institution.edu';
    } else {
      emailParam = 'davis.gavril@institution.edu';
    }
  }

  // Update session storage with fallbacks
  sessionStorage.setItem('edupulse_email', emailParam);
  sessionStorage.setItem('edupulse_role', roleParam);

  // Expose session variables globally for page-specific scripts
  window.emailParam = emailParam;
  window.roleParam = roleParam;

  // 2. Profile Sync & Database Lookup
  let displayName = '';
  let userDept = '';
  let userId = '';
  let userRole = roleParam.charAt(0).toUpperCase() + roleParam.slice(1);

  async function loadUserProfile() {
    try {
      const apiBase = window.location.origin.startsWith('file://') || window.location.origin === 'null' ? 'http://localhost:8000' : window.location.origin;
      const params = new URLSearchParams({ email: emailParam, role: roleParam });
      const response = await fetch(`${apiBase}/api/profile?${params.toString()}`);
      const user = await response.json();

      if (user && !user.error) {
        displayName = user.name;
        userId = user.reg_id;
        userDept = user.dept || '';
        userRole = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : userRole;
      } else {
        const namePart = decodeURIComponent(emailParam).split('@')[0];
        displayName = namePart
          .replace(/[._]/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase());

        let hash = 0;
        for (let i = 0; i < emailParam.length; i++) {
          hash = emailParam.charCodeAt(i) + ((hash << 5) - hash);
        }
        const numericPart = Math.abs(hash % 900) + 100;
        if (roleParam === 'faculty') {
          userId = `EMP-2024-${numericPart}`;
          userDept = 'IT';
        } else if (roleParam === 'admin') {
          userId = `EMP-2022-${numericPart}`;
          userDept = 'Admin Office';
        } else {
          userId = `731122205${numericPart}`;
          userDept = 'IT';
        }
      }

      const initials = displayName
        .split(' ')
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.profile-name, #profileName, #dropdownProfileName').forEach(el => {
          el.textContent = displayName;
        });

        document.querySelectorAll('.avatar, #avatarInitials, #dropdownAvatarInitials').forEach(el => {
          el.textContent = initials || 'ST';
        });

        const dropEmailEl = document.getElementById('dropdownProfileEmail');
        if (dropEmailEl) dropEmailEl.textContent = emailParam;

        const dropIdEl = document.getElementById('dropdownProfileId');
        if (dropIdEl) {
          const prefix = roleParam === 'student' ? 'Reg No: ' : 'Emp ID: ';
          dropIdEl.textContent = prefix + userId;
        }

        const roleEl = document.querySelector('.profile-role');
        if (roleEl) {
          if (roleParam === 'faculty') {
            roleEl.textContent = `Associate Professor · Dept of ${userDept}`;
          } else if (roleParam === 'admin') {
            roleEl.textContent = `System Administrator · ${userDept}`;
          } else {
            roleEl.textContent = `B.Tech ${userDept} · III Year`;
          }
        }

        const welcomeHeading = document.getElementById('welcomeHeading') || document.querySelector('.welcome-banner h2');
        if (welcomeHeading) {
          welcomeHeading.textContent = `Welcome back, ${displayName.split(' ')[0]} 👋`;
        }
      });
    } catch (error) {
      console.error('Failed to load user profile from backend', error);
    }
  }

  loadUserProfile();

  const initials = displayName
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // 3. UI Element Personalization
  document.addEventListener('DOMContentLoaded', () => {
    // 4. Parameter Forwarding (makes all links robust across files)
    function withParams(href) {
      if (!href || href === '#' || href.startsWith('http') || href.startsWith('javascript:')) return href;
      if (href === 'login.html') href = 'index.html';
      
      const parts = href.split('?');
      const path = parts[0];
      const params = new URLSearchParams(parts[1] || '');
      if (emailParam) params.set('email', emailParam);
      if (roleParam) params.set('role', roleParam);
      return path + '?' + params.toString();
    }

    document.querySelectorAll('a.nav-item, a.panel-link, a.btn-outline-light-custom, a.dropdown-item-custom, a.view-all-link').forEach(a => {
      const href = a.getAttribute('href');
      if (href && href !== '#' && !href.startsWith('http') && !href.startsWith('javascript:')) {
        a.setAttribute('href', withParams(href));
      }
    });

    // 5. Component Controls (Dropdowns, mobile sidebar)
    const bellToggle = document.getElementById('bellToggle');
    const notificationDropdown = document.getElementById('notificationDropdown');
    const profileToggle = document.getElementById('profileToggle');
    const profileDropdown = document.getElementById('profileDropdown');
    const bellBadge = document.getElementById('bellBadge');
    const clearNotifications = document.getElementById('clearNotifications');

    if (bellToggle && notificationDropdown) {
      bellToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        notificationDropdown.classList.toggle('show');
        if (profileDropdown) profileDropdown.classList.remove('show');
      });
    }

    if (profileToggle && profileDropdown) {
      profileToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        profileDropdown.classList.toggle('show');
        if (notificationDropdown) notificationDropdown.classList.remove('show');
      });
    }

    document.addEventListener('click', () => {
      if (notificationDropdown) notificationDropdown.classList.remove('show');
      if (profileDropdown) profileDropdown.classList.remove('show');
    });

    if (clearNotifications) {
      clearNotifications.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.notification-item-custom').forEach(item => item.remove());
        if (bellBadge) bellBadge.style.display = 'none';
        const list = document.getElementById('notificationList');
        if (list) {
          list.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--muted2); font-size: 13px;">No new notifications</div>';
        }
      });
    }

    // Sidebar nav active state highlighting and mobile controls
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');

    if (menuToggle && sidebar) {
      menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('open');
      });

      document.addEventListener('click', (e) => {
        if (window.innerWidth <= 900 &&
            sidebar.classList.contains('open') &&
            !sidebar.contains(e.target) &&
            !menuToggle.contains(e.target)) {
          sidebar.classList.remove('open');
        }
      });
    }

    // 6. Unified Logout Driver
    document.querySelectorAll('.logout, .nav-item.logout').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        sessionStorage.removeItem('edupulse_email');
        sessionStorage.removeItem('edupulse_role');
        window.location.href = 'index.html';
      });
    });

    // 7. Dynamic Simulator Click Interceptor (payments, downloads, etc)
    document.addEventListener('click', (e) => {
      const target = e.target.closest('a, button');
      if (!target) return;
      
      const href = target.getAttribute('href');
      const isMockBtn = target.classList.contains('btn-pay') || 
                        target.classList.contains('btn-outline-light-custom') || 
                        target.closest('.btn-pay') || 
                        target.closest('.btn-outline-light-custom') ||
                        target.textContent.includes('Download') || 
                        target.textContent.includes('Export') || 
                        target.textContent.includes('Print');

      if (href === '#' || isMockBtn) {
        e.preventDefault();
        e.stopPropagation();
        const label = target.textContent.trim() || "Action";
        
        if (label.includes('Pay')) {
          alert("Payment Gateway Redirect:\n\nProcessing ₹12,500. UPI/Card authentication approved! Fee status updated to Paid.");
          const outstandingStat = document.querySelector('.stat-card .stat-label');
          if (outstandingStat && outstandingStat.textContent.includes('Outstanding')) {
            const valEl = outstandingStat.nextElementSibling;
            if (valEl) valEl.textContent = "₹0";
            const trendEl = valEl.nextElementSibling;
            if (trendEl) {
              trendEl.textContent = "All dues paid!";
              trendEl.className = "stat-trend ok";
            }
          }
        } else if (label.includes('Diagnostic')) {
          // Skip general alert if the page has a console log diagnostic box (admin-health page)
          if (document.getElementById('consoleLogs')) return;
          alert("System diagnostics initiated... checking nodes... CPU temps nominal. Web sockets connected. Test passed!");
        } else if (label.includes('Download') || label.includes('Export') || label.includes('Print')) {
          alert(`${label} Compiled!\n\nCompiling report data... PDF generated and downloaded to local system.`);
        } else {
          alert(`${label} Triggered!\n\nSimulated action completed successfully in this ERP portal demo.`);
        }
      }
    });
  });
})();
