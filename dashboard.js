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
  let userPhone = '';
  let userAddress = '';

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
        userPhone = user.phone || '';
        userAddress = user.address || '';
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

      // Populate Settings if on settings page
      const pNameInput = document.getElementById('pName');
      if (pNameInput) {
        pNameInput.value = displayName;
        const pEmailInput = document.getElementById('pEmail');
        if (pEmailInput) pEmailInput.value = emailParam;
        const pPhoneInput = document.getElementById('pPhone');
        if (pPhoneInput) pPhoneInput.value = userPhone || "+91 98401 23456";
        const pRoleInput = document.getElementById('pRole');
        if (pRoleInput) {
          pRoleInput.value = userRole;
          pRoleInput.removeAttribute('readonly');
        }
        const pIdInput = document.getElementById('pId');
        if (pIdInput) pIdInput.value = userId;
        const pAddrInput = document.getElementById('pAddr');
        if (pAddrInput) pAddrInput.value = userAddress || "C-4, Emerald Apartments, Adyar, Chennai - 600020";

        // Setup settings form handler
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
          // Replace visual placeholder click listener
          const newForm = profileForm.cloneNode(true);
          profileForm.parentNode.replaceChild(newForm, profileForm);
          newForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const phone = document.getElementById('pPhone').value.trim();
            const address = document.getElementById('pAddr').value.trim();
            const role = document.getElementById('pRole').value.trim();
            const apiBase = window.location.origin.startsWith('file://') || window.location.origin === 'null' ? 'http://localhost:8000' : window.location.origin;
            try {
              const res = await fetch(`${apiBase}/api/profile/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailParam, phone, address, role })
              });
              if (res.ok) {
                alert("Profile details saved successfully!");
                location.reload();
              } else {
                const err = await res.json();
                alert(err.error || "Failed to update profile");
              }
            } catch (err) {
              console.error(err);
              alert("Network error while updating profile.");
            }
          });
        }
      }

      // Fetch academics if role is student
      if (roleParam === 'student') {
        const acadResponse = await fetch(`${apiBase}/api/student/academics?email=${encodeURIComponent(emailParam)}`);
        const acad = await acadResponse.json();
        if (acad && !acad.error) {
          window.studentAcademics = acad;
          updateStudentPageData(acad);
        }
      }
    } catch (error) {
      console.error('Failed to load user profile from backend', error);
    }
  }

  function updateStudentPageData(acad) {
    const cgpa = acad.cgpa || '';
    const fees_due = acad.fees_due !== undefined ? acad.fees_due : 0;
    const fees_status = acad.fees_status || 'Pending Update';
    const attendance = acad.attendance || {};
    
    // Calculate overall attendance
    let totalHeld = 0;
    let totalAttended = 0;
    Object.keys(attendance).forEach(sub => {
      totalHeld += attendance[sub].held || 0;
      totalAttended += attendance[sub].attended || 0;
    });
    const attPercent = totalHeld > 0 ? Math.round((totalAttended / totalHeld) * 100) : 0;

    const path = window.location.pathname.toLowerCase();

    // 1. student-dashboard.html
    if (path.includes('student-dashboard.html') || path.endsWith('student-dashboard') || path.endsWith('dashboard.html') || path.includes('/dashboard')) {
      const cards = document.querySelectorAll('.stats-grid .stat-card');
      if (cards.length >= 3) {
        // CGPA card
        const cgpaVal = cards[0].querySelector('.stat-value');
        if (cgpaVal) cgpaVal.textContent = cgpa || 'Not Updated';
        
        // Attendance card
        const attVal = cards[1].querySelector('.stat-value');
        if (attVal) attVal.textContent = `${attPercent}%`;
        const attTrend = cards[1].querySelector('.stat-trend');
        if (attTrend) {
          attTrend.textContent = attPercent >= 75 ? 'Above 75% requirement' : 'Below 75% requirement';
          attTrend.className = `stat-trend ${attPercent >= 75 ? 'ok' : 'warn'}`;
        }
        
        // Fees Card
        const feesVal = cards[2].querySelector('.stat-value');
        if (feesVal) feesVal.textContent = `₹${fees_due.toLocaleString('en-IN')}`;
        const feesTrend = cards[2].querySelector('.stat-trend');
        if (feesTrend) {
          feesTrend.textContent = fees_status;
          feesTrend.className = `stat-trend ${fees_status === 'Paid' ? 'ok' : 'warn'}`;
        }
      }
    }

    // 2. attendance.html
    if (path.includes('attendance.html') || path.endsWith('attendance')) {
      const FACULTY_MAP = {
        "Cloud Computing": "Dr. R. Menon",
        "Machine Learning": "Prof. S. Iyer",
        "Prompt Engineering": "Dr. K. Bala",
        "Software Architecture": "Prof. A. Nair",
        "Computer Networks": "Dr. P. Suresh",
        "Professional Ethics": "Dr. M. Devi"
      };
      
      const tbody = document.querySelector('table.data-table tbody');
      if (tbody) {
        tbody.innerHTML = '';
        Object.keys(FACULTY_MAP).forEach(sub => {
          const subAtt = attendance[sub] || { attended: 0, held: 0 };
          const pct = subAtt.held > 0 ? Math.round((subAtt.attended / subAtt.held) * 100) : 0;
          
          let pillClass = 'pill-good';
          let statusLabel = 'Good';
          let fillBg = 'var(--teal)';
          
          if (pct < 75) {
            pillClass = 'pill-bad';
            statusLabel = 'Below 75%';
            fillBg = '#DC2626';
          } else if (pct < 85) {
            pillClass = 'pill-warn';
            statusLabel = 'Watch';
            fillBg = '#D97706';
          }

          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${sub}</td>
            <td>${FACULTY_MAP[sub]}</td>
            <td>${subAtt.held}</td>
            <td>${subAtt.attended}</td>
            <td>
              <div class="mini-bar-track"><div class="mini-bar-fill" style="width:${pct}%; background:${fillBg};"></div></div>
              ${pct}%
            </td>
            <td><span class="pill ${pillClass}">${statusLabel}</span></td>
          `;
          tbody.appendChild(tr);
        });
      }
    }

    // 3. grades.html
    if (path.includes('grades.html') || path.endsWith('grades')) {
      const cgpaEl = document.querySelector('.stats-grid .stat-card:nth-child(1) .stat-value');
      if (cgpaEl) cgpaEl.textContent = cgpa || 'Not Updated';
      
      const semHistoryRows = document.querySelectorAll('table.data-table tbody tr');
      semHistoryRows.forEach(row => {
        if (row.cells[0] && row.cells[0].textContent.includes('Semester 5')) {
          row.cells[3].textContent = cgpa ? `${cgpa}*` : 'Not Updated';
        }
      });
    }

    // 4. fees.html
    if (path.includes('fees.html') || path.endsWith('fees')) {
      const balanceEl = document.querySelector('.stats-grid .stat-card:nth-child(1) .stat-value');
      if (balanceEl) balanceEl.textContent = `₹${fees_due.toLocaleString('en-IN')}`;
      const balanceTrend = document.querySelector('.stats-grid .stat-card:nth-child(1) .stat-trend');
      if (balanceTrend) {
        balanceTrend.textContent = fees_status;
        balanceTrend.className = `stat-trend ${fees_status === 'Paid' ? 'ok' : 'warn'}`;
      }
      
      const lastRow = document.querySelector('table.data-table tbody tr:last-child');
      if (lastRow) {
        lastRow.cells[2].textContent = `₹${fees_due.toLocaleString('en-IN')}`;
        const badge = lastRow.cells[3].querySelector('.pill');
        if (badge) {
          badge.textContent = fees_status;
          badge.className = `pill ${fees_status === 'Paid' ? 'pill-good' : 'pill-warn'}`;
        }
      }
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
    // Dynamic Sidebar Nav Generation based on role
    const sidebarNav = document.querySelector('.sidebar-nav');
    if (sidebarNav) {
      const currentPath = window.location.pathname.split('/').pop().toLowerCase() || 'student-dashboard.html';
      let navHTML = '';
      if (roleParam === 'admin') {
        const adminItems = [
          { href: 'admin-dashboard.html', icon: 'fa-grid-2', text: 'Overview' },
          { href: 'admin-users.html', icon: 'fa-users', text: 'User Management' },
          { href: 'admin-courses.html', icon: 'fa-graduation-cap', text: 'Courses & Academics' },
          { href: 'admin-finance.html', icon: 'fa-file-invoice-dollar', text: 'Finance & Fees' },
          { href: 'admin-leaves.html', icon: 'fa-envelope-open-text', text: 'Leave Requests' },
          { href: 'admin-library.html', icon: 'fa-book', text: 'Library Catalog' },
          { href: 'admin-notices.html', icon: 'fa-bullhorn', text: 'Notice Board' },
          { href: 'admin-health.html', icon: 'fa-server', text: 'System Health' },
          { href: 'admin-tickets.html', icon: 'fa-ticket', text: 'Support Tickets' }
        ];
        adminItems.forEach(item => {
          const isActive = currentPath === item.href.toLowerCase() ? 'active' : '';
          navHTML += `<a href="${item.href}" class="nav-item ${isActive}"><i class="fa-solid ${item.icon}"></i><span>${item.text}</span></a>`;
        });
      } else if (roleParam === 'faculty') {
        const facultyItems = [
          { href: 'faculty-dashboard.html', icon: 'fa-grid-2', text: 'Overview' },
          { href: 'faculty-classes.html', icon: 'fa-chalkboard-user', text: 'My Classes' },
          { href: 'faculty-attendance.html', icon: 'fa-clipboard-check', text: 'Attendance' },
          { href: 'faculty-grades.html', icon: 'fa-pen-to-square', text: 'Grade Entry' },
          { href: 'faculty-timetable.html', icon: 'fa-calendar-days', text: 'Timetable' },
          { href: 'faculty-students.html', icon: 'fa-users', text: 'Students' },
          { href: 'faculty-leaves.html', icon: 'fa-envelope-open-text', text: 'Leave Requests' }
        ];
        facultyItems.forEach(item => {
          const isActive = currentPath === item.href.toLowerCase() ? 'active' : '';
          navHTML += `<a href="${item.href}" class="nav-item ${isActive}"><i class="fa-solid ${item.icon}"></i><span>${item.text}</span></a>`;
        });
      } else {
        const studentItems = [
          { href: 'student-dashboard.html', icon: 'fa-grid-2', text: 'Overview' },
          { href: 'my-courses.html', icon: 'fa-book-open', text: 'My Courses' },
          { href: 'attendance.html', icon: 'fa-clipboard-check', text: 'Attendance' },
          { href: 'grades.html', icon: 'fa-chart-line', text: 'Grades' },
          { href: 'timetable.html', icon: 'fa-calendar-days', text: 'Timetable' },
          { href: 'fees.html', icon: 'fa-file-invoice-dollar', text: 'Fees' },
          { href: 'library.html', icon: 'fa-book', text: 'Library' },
          { href: 'student-leaves.html', icon: 'fa-envelope-open-text', text: 'Leave Requests' }
        ];
        studentItems.forEach(item => {
          const isActive = currentPath === item.href.toLowerCase() ? 'active' : '';
          navHTML += `<a href="${item.href}" class="nav-item ${isActive}"><i class="fa-solid ${item.icon}"></i><span>${item.text}</span></a>`;
        });
      }
      sidebarNav.innerHTML = navHTML;
    }

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
