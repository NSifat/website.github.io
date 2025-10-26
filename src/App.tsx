import React, { useEffect, useState } from "react";

/*
  BIC Admin Portal - V2 (single-file React)
  - Theme: Teal + White (modern clean)
  - Collapsible sidebar
  - Teacher payment history with edit/delete
  - Editable student payments (edit/delete) protected by admin password confirmation
  - LocalStorage persistence (demo). For production, replace with backend + secure auth.

  Usage:
  - Put this file as src/App.jsx in a React + Tailwind project (Vite or CRA).
  - Optional packages: framer-motion, jspdf (for PDF exports), lucide-react (icons)
  - Tailwind CSS is assumed in the project for styling.

  Security note: This demo stores the admin password client-side for convenience only.
  For production, move authentication server-side, use hashed passwords, sessions, and a DB.
*/

const ADMIN_USERNAME = "nsifat";
const ADMIN_PASSWORD = "SifatxBIC@admin";
const DATA_KEY = "bic_v2_data";
const LOCK_KEY = "bic_v2_lock";

function defaultData() {
  return {
    students: [], // { id, name, parent, phone, grade, className, siblings: [], payments: [] }
    teachers: [], // { id, name, phone, gender, className, salary, payments: [], attendance: {} }
    incomes: [],
    expenses: [],
  };
}

function load() {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    return raw ? JSON.parse(raw) : defaultData();
  } catch (e) {
    return defaultData();
  }
}

function save(d) {
  localStorage.setItem(DATA_KEY, JSON.stringify(d));
}

function findStudentPayment(data, studentId, paymentId) {
  const student = data.students.find(s => s.id === studentId);
  if (!student) return null;
  return (student.payments || []).find(p => p.id === paymentId);
}

function findTeacherPayment(data, teacherId, paymentId) {
  const teacher = data.teachers.find(t => t.id === teacherId);
  if (!teacher) return null;
  return (teacher.payments || []).find(p => p.id === paymentId);
}

export default function App() {
  const [data, setData] = useState(load());
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [view, setView] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [activeStudent, setActiveStudent] = useState(null);
  const [activeTeacher, setActiveTeacher] = useState(null);
  const [modal, setModal] = useState({ open: false, type: null, payload: null });

  // Persist data
  useEffect(() => {
    save(data);
  }, [data]);

  // Load lock
  useEffect(() => {
    const raw = JSON.parse(localStorage.getItem(LOCK_KEY) || "null");
    if (raw && raw.until && new Date(raw.until) > new Date()) {
      setLockedUntil(new Date(raw.until));
      setAttemptsLeft(0);
    } else {
      localStorage.removeItem(LOCK_KEY);
    }
  }, []);

  // AUTH
  function handleLogin(e) {
    e.preventDefault();
    if (lockedUntil && new Date(lockedUntil) > new Date()) return;
    if (user === ADMIN_USERNAME && pass === ADMIN_PASSWORD) {
      setLoggedIn(true);
      setAttemptsLeft(5);
      localStorage.removeItem(LOCK_KEY);
      setUser("");
      setPass("");
    } else {
      const left = attemptsLeft - 1;
      setAttemptsLeft(left);
      alert(`Login incorrect. ${left} attempts remaining.`);
      if (left <= 0) {
        const until = new Date(Date.now() + 5 * 60 * 1000); // 5 minute lock for demo
        localStorage.setItem(LOCK_KEY, JSON.stringify({ until }));
        setLockedUntil(until);
      }
    }
  }

  function logout() {
    setLoggedIn(false);
    setView("dashboard");
  }

  // UTIL
  function newId(prefix = "X") {
    return prefix + Date.now() + Math.floor(Math.random() * 900).toString();
  }

  // STUDENTS
  function addStudent(payload) {
    const student = { id: newId('S'), payments: [], siblings: payload.siblings || [], ...payload, createdAt: new Date().toISOString() };
    setData((d) => ({ ...d, students: [...d.students, student] }));
    setView('manage-students');
  }

  function updateStudent(id, patch) {
    setData((d) => ({ ...d, students: d.students.map(s => s.id === id ? { ...s, ...patch } : s) }));
  }

  function addStudentPayment(studentId, payment) {
    // payment: { id, amount, date, note }
    setData((d) => {
      const students = d.students.map(s => s.id === studentId ? { ...s, payments: [...(s.payments || []), payment] } : s);
      const incomes = [...d.incomes, { ...payment, studentId }];
      return { ...d, students, incomes };
    });
  }

  function editStudentPayment(studentId, paymentId, patch) {
    setData((d) => {
      const students = d.students.map(s => {
        if (s.id !== studentId) return s;
        const payments = (s.payments || []).map(p => p.id === paymentId ? { ...p, ...patch } : p);
        return { ...s, payments };
      });
      const incomes = d.incomes.map(i => i.id === paymentId ? { ...i, ...patch } : i);
      return { ...d, students, incomes };
    });
  }

  function deleteStudentPayment(studentId, paymentId) {
    setData((d) => {
      const students = d.students.map(s => s.id === studentId ? { ...s, payments: (s.payments || []).filter(p => p.id !== paymentId) } : s);
      const incomes = d.incomes.filter(i => i.id !== paymentId);
      return { ...d, students, incomes };
    });
  }

  // TEACHERS
  function addTeacher(payload) {
    const teacher = { id: newId('T'), payments: [], attendance: {}, ...payload, createdAt: new Date().toISOString() };
    setData((d) => ({ ...d, teachers: [...d.teachers, teacher] }));
  }

  function addTeacherPayment(teacherId, payment) {
    // payment: { id, amount, date, note }
    setData((d) => {
      const teachers = d.teachers.map(t => t.id === teacherId ? { ...t, payments: [...(t.payments || []), payment] } : t);
      const expenses = [...d.expenses, { ...payment, teacherId, title: `Teacher pay - ${teacherId}` }];
      return { ...d, teachers, expenses };
    });
  }

  function editTeacherPayment(teacherId, paymentId, patch) {
    setData((d) => {
      const teachers = d.teachers.map(t => {
        if (t.id !== teacherId) return t;
        const payments = (t.payments || []).map(p => p.id === paymentId ? { ...p, ...patch } : p);
        return { ...t, payments };
      });
      const expenses = d.expenses.map(e => e.id === paymentId ? { ...e, ...patch } : e);
      return { ...d, teachers, expenses };
    });
  }

  function deleteTeacherPayment(teacherId, paymentId) {
    setData((d) => {
      const teachers = d.teachers.map(t => t.id === teacherId ? { ...t, payments: (t.payments || []).filter(p => p.id !== paymentId) } : t);
      const expenses = d.expenses.filter(e => e.id !== paymentId);
      return { ...d, teachers, expenses };
    });
  }

  // EXPENSES
  function addExpense(payload) {
    const exp = { id: newId('E'), ...payload };
    setData((d) => ({ ...d, expenses: [...d.expenses, exp] }));
  }

  // ATTENDANCE
  function markTeacherAttendance(teacherId, dateISO, present) {
    setData((d) => ({
      ...d,
      teachers: d.teachers.map(t => t.id === teacherId ? { ...t, attendance: { ...t.attendance, [dateISO]: present } } : t)
    }));
  }

  // REPORTS
  function monthlyReport(monthISO) {
    // monthISO format: YYYY-MM
    const [y, m] = monthISO.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);

    const incomes = data.incomes.filter(i => new Date(i.date) >= start && new Date(i.date) < end);
    const expenses = data.expenses.filter(e => new Date(e.date) >= start && new Date(e.date) < end);

    const totalIncome = incomes.reduce((s, it) => s + Number(it.amount || 0), 0);
    const totalExpense = expenses.reduce((s, it) => s + Number(it.amount || 0), 0);

    return {
      totalStudents: data.students.length,
      totalTeachers: data.teachers.length,
      totalIncome,
      totalExpense,
      incomes,
      expenses,
    };
  }

  // UI Helpers
  function openModal(type, payload = null) {
    setModal({ open: true, type, payload });
  }
  function closeModal() {
    setModal({ open: false, type: null, payload: null });
  }

  // Quick derived values
  const totalIncome = data.incomes.reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalExpense = data.expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  // ---------- RENDER ----------
  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-teal-50 p-6">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-2xl font-semibold text-teal-700">BIC Admin Portal</h2>
            <p className="text-sm text-gray-500 mt-1">Brooklyn Islamic Center - Staff Login</p>

            {lockedUntil && new Date(lockedUntil) > new Date() ? (
              <div className="mt-4 bg-red-50 border border-red-200 p-3 rounded">
                <strong>Locked out:</strong> Too many failed attempts. Try again at {new Date(lockedUntil).toLocaleTimeString()}.
              </div>
            ) : (
              <form onSubmit={handleLogin} className="mt-4 space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">Username</label>
                  <input value={user} onChange={(e) => setUser(e.target.value)} className="mt-1 w-full border rounded p-2" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Password</label>
                  <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} className="mt-1 w-full border rounded p-2" />
                </div>
                <div className="flex items-center justify-between">
                  <button className="px-4 py-2 bg-teal-600 text-white rounded">Sign in</button>
                  <div className="text-sm text-gray-500">Attempts left: {attemptsLeft}</div>
                </div>
              </form>
            )}

            <div className="mt-4 text-xs text-gray-400">Username: <span className="font-mono">{ADMIN_USERNAME}</span></div>
          </div>
        </div>
      </div>
    );
  }

  // Main app UI
  return (
    <div className="min-h-screen bg-teal-50 flex">
      {/* Sidebar */}
      <aside className={`bg-white border-r transition-all duration-200 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-teal-600 text-white font-bold rounded-full h-10 w-10 flex items-center justify-center">🕌</div>
            {!sidebarCollapsed && <div>
              <div className="text-lg font-semibold text-teal-700">BIC Admin</div>
              <div className="text-xs text-gray-500">Brooklyn Islamic Center</div>
            </div>}
          </div>
          <button onClick={() => setSidebarCollapsed(s => !s)} className="text-gray-500">{sidebarCollapsed ? '>' : '<'}</button>
        </div>

        <nav className="mt-4">
          <NavItem icon="🏠" label="Dashboard" collapsed={sidebarCollapsed} active={view === 'dashboard'} onClick={() => setView('dashboard')} />
          <NavItem icon="➕" label="Add Student" collapsed={sidebarCollapsed} active={view === 'add-student'} onClick={() => setView('add-student')} />
          <NavItem icon="👥" label="Manage Students" collapsed={sidebarCollapsed} active={view === 'manage-students'} onClick={() => setView('manage-students')} />
          <NavItem icon="🧑‍🏫" label="Teachers" collapsed={sidebarCollapsed} active={view === 'teachers'} onClick={() => setView('teachers')} />
          <NavItem icon="💰" label="Expenses" collapsed={sidebarCollapsed} active={view === 'expenses'} onClick={() => setView('expenses')} />
          <NavItem icon="📄" label="Reports" collapsed={sidebarCollapsed} active={view === 'reports'} onClick={() => setView('reports')} />
        </nav>

        <div className="mt-auto p-4 text-xs text-gray-500">
          <div>Signed in as <strong>nsifat</strong></div>
          <button onClick={logout} className="mt-2 px-3 py-1 border rounded text-sm">Sign out</button>
        </div>
      </aside>

      {/* Content area */}
      <div className="flex-1 p-6">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-teal-800">{viewTitle(view)}</h1>
            <div className="text-sm text-gray-500">BIC Admin Portal — {new Date().toLocaleString()}</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">Total Students: <strong>{data.students.length}</strong></div>
            <div className="text-sm text-gray-600">Total Teachers: <strong>{data.teachers.length}</strong></div>
            <div className="text-sm text-gray-600">Balance: <strong>${(totalIncome - totalExpense).toFixed(2)}</strong></div>
          </div>
        </header>

        <main>
          {view === 'dashboard' && (
            <DashboardView data={data} totalIncome={totalIncome} totalExpense={totalExpense} onQuickOpen={s => { setActiveStudent(s); setView('student-profile'); }} />
          )}

          {view === 'add-student' && (
            <AddStudentForm onSave={addStudent} onCancel={() => setView('dashboard')} />
          )}

          {view === 'manage-students' && (
            <ManageStudentsView
              students={data.students}
              search={search}
              setSearch={setSearch}
              onView={(s) => { setActiveStudent(s); setView('student-profile'); }}
              onAddPayment={(studentId, payment) => addStudentPayment(studentId, payment)}
              onEditPayment={(studentId, paymentId) => openModal('edit-student-payment', { studentId, paymentId })}
              onDeletePayment={(studentId, paymentId) => openModal('confirm-delete-student-payment', { studentId, paymentId })}
            />
          )}

          {view === 'student-profile' && activeStudent && (
            <StudentProfile
              student={data.students.find(s => s.id === activeStudent.id)}
              onBack={() => { setActiveStudent(null); setView('manage-students'); }}
              onSave={(patch) => updateStudent(activeStudent.id, patch)}
              onAddPayment={(payment) => addStudentPayment(activeStudent.id, payment)}
              onEditPayment={(paymentId) => openModal('edit-student-payment', { studentId: activeStudent.id, paymentId })}
              onDeletePayment={(paymentId) => openModal('confirm-delete-student-payment', { studentId: activeStudent.id, paymentId })}
            />
          )}

          {view === 'teachers' && (
            <TeachersView
              teachers={data.teachers}
              onAdd={(t) => addTeacher(t)}
              onOpenPayments={(t) => { setActiveTeacher(t); openModal('teacher-payments', { teacherId: t.id }); }}
              onMarkAttendance={(teacherId, dateISO, present) => markTeacherAttendance(teacherId, dateISO, present)}
            />
          )}

          {view === 'expenses' && (
            <ExpensesView expenses={data.expenses} onAdd={addExpense} />
          )}

          {view === 'reports' && (
            <ReportsView data={data} monthlyReport={monthlyReport} />
          )}
        </main>
      </div>

      {/* Modals */}
      {modal.open && modal.type === 'confirm-delete-student-payment' && (
        <ConfirmModal title="Delete payment" onClose={closeModal} onConfirm={() => { deleteStudentPayment(modal.payload.studentId, modal.payload.paymentId); closeModal(); }}>
          Are you sure you want to delete this student payment? This action cannot be undone.
        </ConfirmModal>
      )}

      {modal.open && modal.type === 'confirm-delete-teacher-payment' && (
        <ConfirmModal title="Delete teacher payment" onClose={closeModal} onConfirm={() => { deleteTeacherPayment(modal.payload.teacherId, modal.payload.paymentId); closeModal(); }}>
          Are you sure you want to delete this teacher payment? This action cannot be undone.
        </ConfirmModal>
      )}

      {modal.open && modal.type === 'edit-student-payment' && (
        <EditPaymentModal
          title="Edit Student Payment"
          onClose={closeModal}
          onSave={(paymentPatch) => {
            // require admin password first
            const pw = prompt('Enter admin password to confirm changes:');
            if (pw !== ADMIN_PASSWORD) { alert('Wrong password'); return; }
            editStudentPayment(modal.payload.studentId, modal.payload.paymentId, paymentPatch);
            closeModal();
          }}
          initial={findStudentPayment(data, modal.payload.studentId, modal.payload.paymentId)}
        />
      )}

      {modal.open && modal.type === 'edit-teacher-payment' && (
        <EditPaymentModal
          title="Edit Teacher Payment"
          onClose={closeModal}
          onSave={(patch) => {
            const pw = prompt('Enter admin password to confirm changes:');
            if (pw !== ADMIN_PASSWORD) { alert('Wrong password'); return; }
            editTeacherPayment(modal.payload.teacherId, modal.payload.paymentId, patch);
            closeModal();
          }}
          initial={findTeacherPayment(data, modal.payload.teacherId, modal.payload.paymentId)}
        />
      )}

      {modal.open && modal.type === 'teacher-payments' && (
        <TeacherPaymentsModal
          teacher={data.teachers.find(t => t.id === modal.payload.teacherId)}
          onClose={closeModal}
          onAdd={(payment) => { addTeacherPayment(modal.payload.teacherId, payment); }}
          onEdit={(paymentId) => openModal('edit-teacher-payment', { teacherId: modal.payload.teacherId, paymentId })}
          onDelete={(paymentId) => openModal('confirm-delete-teacher-payment', { teacherId: modal.payload.teacherId, paymentId })}
        />
      )}

    </div>
  );
}

// ---------- UI Subcomponents ----------
function NavItem({ icon, label, collapsed, active, onClick }) {
  return (
    <div onClick={onClick} className={`cursor-pointer p-3 flex items-center gap-3 ${active ? 'bg-teal-50' : 'hover:bg-gray-50'}`}>
      <div className="w-6 text-center">{icon}</div>
      {!collapsed && <div className="text-sm text-gray-700">{label}</div>}
    </div>
  );
}

function viewTitle(v) {
  switch (v) {
    case 'dashboard': return 'Dashboard';
    case 'add-student': return 'Add Student';
    case 'manage-students': return 'Manage Students';
    case 'student-profile': return 'Student Profile';
    case 'teachers': return 'Teachers';
    case 'expenses': return 'Expenses';
    case 'reports': return 'Reports';
    default: return '';
  }
}

function DashboardView({ data, totalIncome, totalExpense, onQuickOpen }) {
  const recentIncomes = [...data.incomes].slice(-5).reverse();
  const recentExpenses = [...data.expenses].slice(-5).reverse();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Students" value={data.students.length} />
          <StatCard label="Teachers" value={data.teachers.length} />
          <StatCard label="Balance" value={`$${(totalIncome - totalExpense).toFixed(2)}`} />
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Recent Income</h3>
          {recentIncomes.length === 0 ? <div className="text-sm text-gray-500">No income yet</div> : (
            <ul className="space-y-2 text-sm">
              {recentIncomes.map(r => (
                <li key={r.id} className="flex justify-between">
                  <div>{r.description || 'Tuition'} — {r.studentId ? data.students.find(s => s.id === r.studentId)?.name : ''}</div>
                  <div>${Number(r.amount).toFixed(2)} • {new Date(r.date).toLocaleDateString()}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Recent Expenses</h3>
          {recentExpenses.length === 0 ? <div className="text-sm text-gray-500">No expenses yet</div> : (
            <ul className="space-y-2 text-sm">
              {recentExpenses.map(e => (
                <li key={e.id} className="flex justify-between">
                  <div>{e.title}</div>
                  <div>${Number(e.amount).toFixed(2)} • {new Date(e.date).toLocaleDateString()}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white p-4 rounded shadow">
          <h4 className="font-semibold mb-2">Quick actions</h4>
          <div className="flex flex-col gap-2">
            <button className="px-3 py-2 bg-teal-600 text-white rounded" onClick={() => onQuickOpen(data.students[0])} disabled={data.students.length === 0}>Open most recent student</button>
            <button className="px-3 py-2 border rounded" onClick={() => alert('Exporting CSV not implemented in demo')}>Export CSV</button>
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h4 className="font-semibold mb-2">Summary</h4>
          <div className="text-sm text-gray-600">Total income: <strong>${totalIncome.toFixed(2)}</strong></div>
          <div className="text-sm text-gray-600">Total expenses: <strong>${totalExpense.toFixed(2)}</strong></div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white p-4 rounded shadow flex items-center justify-between">
      <div>
        <div className="text-sm text-gray-500">{label}</div>
        <div className="text-2xl font-semibold text-teal-700">{value}</div>
      </div>
      <div className="text-3xl opacity-40">•</div>
    </div>
  );
}

function AddStudentForm({ onSave, onCancel }) {
  const [name, setName] = useState("");
  const [parent, setParent] = useState("");
  const [phone, setPhone] = useState("");
  const [grade, setGrade] = useState("");
  const [className, setClassName] = useState("");
  const [siblings, setSiblings] = useState([]);

  function addSibling() {
    setSiblings(s => [...s, { name: '', parent: '', phone: '', grade: '', className: '' }]);
  }

  function updateSibling(idx, key, val) {
    setSiblings(s => s.map((x, i) => i === idx ? { ...x, [key]: val } : x));
  }

  function save() {
    if (!name) { alert('Student name required'); return; }
    onSave({ name, parent, phone, grade, className, siblings });
    setName(''); setParent(''); setPhone(''); setGrade(''); setClassName(''); setSiblings([]);
  }

  return (
    <div className="bg-white p-6 rounded shadow max-w-3xl">
      <h3 className="font-semibold text-lg mb-3">Add Student</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input placeholder="Student full name" value={name} onChange={e => setName(e.target.value)} className="p-2 border rounded" />
        <input placeholder="Parent name" value={parent} onChange={e => setParent(e.target.value)} className="p-2 border rounded" />
        <input placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} className="p-2 border rounded" />
        <input placeholder="Grade" value={grade} onChange={e => setGrade(e.target.value)} className="p-2 border rounded" />
        <input placeholder="Class" value={className} onChange={e => setClassName(e.target.value)} className="p-2 border rounded" />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <strong>Sibling(s)</strong>
          <button onClick={addSibling} className="px-2 py-1 border rounded text-sm">Add sibling</button>
        </div>
        <div className="space-y-2 mt-2">
          {siblings.map((s, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-5 gap-2 p-2 border rounded">
              <input placeholder="Name" value={s.name} onChange={e => updateSibling(i, 'name', e.target.value)} className="p-1 border rounded" />
              <input placeholder="Parent" value={s.parent} onChange={e => updateSibling(i, 'parent', e.target.value)} className="p-1 border rounded" />
              <input placeholder="Phone" value={s.phone} onChange={e => updateSibling(i, 'phone', e.target.value)} className="p-1 border rounded" />
              <input placeholder="Grade" value={s.grade} onChange={e => updateSibling(i, 'grade', e.target.value)} className="p-1 border rounded" />
              <input placeholder="Class" value={s.className} onChange={e => updateSibling(i, 'className', e.target.value)} className="p-1 border rounded" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button onClick={save} className="px-4 py-2 bg-teal-600 text-white rounded">Save</button>
        <button onClick={onCancel} className="px-4 py-2 border rounded">Cancel</button>
      </div>
    </div>
  );
}

function ManageStudentsView({ students, search, setSearch, onView, onAddPayment, onEditPayment, onDeletePayment }) {
  const filtered = students.filter(s => !search || (s.name && s.name.toLowerCase().includes(search.toLowerCase())));
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <input placeholder="Search students" value={search} onChange={e => setSearch(e.target.value)} className="p-2 border rounded flex-1" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map(s => (
          <div key={s.id} className="bg-white p-3 rounded shadow">
            <div className="flex justify-between">
              <div>
                <div className="font-semibold">{s.name}</div>
                <div className="text-sm text-gray-500">{s.parent} • {s.phone}</div>
                <div className="text-xs text-gray-400">{s.grade} • {s.className}</div>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => onView(s)} className="px-3 py-1 border rounded text-sm">View</button>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-600">Payments: {(s.payments || []).length}</div>
          </div>
        ))}

        {filtered.length === 0 && <div className="text-sm text-gray-500">No students found.</div>}
      </div>
    </div>
  );
}

function StudentProfile({ student, onBack, onSave, onAddPayment, onEditPayment, onDeletePayment }) {
  const [editing, setEditing] = useState({ ...student });
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0,10));
  const [payNote, setPayNote] = useState('Tuition');

  useEffect(() => { setEditing({ ...student }); }, [student]);

  function saveProfile() { onSave(editing); alert('Saved'); }

  function addPayment() {
    if (!payAmount) { alert('Amount required'); return; }
    const payment = { id: new Date().getTime().toString(), amount: Number(payAmount), date: payDate, note: payNote, description: payNote };
    onAddPayment(payment);
    setPayAmount(''); setPayNote('Tuition');
  }

  return (
    <div className="bg-white p-6 rounded shadow max-w-3xl">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-lg">{student.name}</h3>
          <div className="text-sm text-gray-500">Created: {new Date(student.createdAt).toLocaleString()}</div>
        </div>
        <div>
          <button onClick={onBack} className="px-3 py-1 border rounded">Back</button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <input value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})} className="p-2 border rounded" />
        <input value={editing.parent} onChange={e => setEditing({...editing, parent: e.target.value})} className="p-2 border rounded" />
        <input value={editing.phone} onChange={e => setEditing({...editing, phone: e.target.value})} className="p-2 border rounded" />
        <input value={editing.grade} onChange={e => setEditing({...editing, grade: e.target.value})} className="p-2 border rounded" />
        <input value={editing.className} onChange={e => setEditing({...editing, className: e.target.value})} className="p-2 border rounded" />
      </div>

      <div className="mt-4">
        <h4 className="font-semibold">Record payment</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2">
          <input placeholder="Amount" value={payAmount} onChange={e => setPayAmount(e.target.value)} className="p-2 border rounded" />
          <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className="p-2 border rounded" />
          <input placeholder="Note" value={payNote} onChange={e => setPayNote(e.target.value)} className="p-2 border rounded" />
          <button onClick={addPayment} className="px-3 py-2 bg-teal-600 text-white rounded">Add payment</button>
        </div>
      </div>

      <div className="mt-4">
        <h4 className="font-semibold">Payment history</h4>
        <ul className="mt-2 space-y-2 text-sm">
          {(student.payments || []).map(p => (
            <li key={p.id} className="flex justify-between items-center border p-2 rounded">
              <div>
                <div>{p.note || p.description} — ${Number(p.amount).toFixed(2)}</div>
                <div className="text-xs text-gray-400">{new Date(p.date).toLocaleDateString()}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onEditPayment(p.id)} className="px-2 py-1 border rounded text-sm">Edit</button>
                <button onClick={() => onDeletePayment(p.id)} className="px-2 py-1 border rounded text-sm">Delete</button>
              </div>
            </li>
          ))}
          {(!student.payments || student.payments.length === 0) && <div className="text-gray-500">No payments yet</div>}
        </ul>
      </div>

      <div className="mt-4 flex gap-2">
        <button onClick={saveProfile} className="px-4 py-2 bg-green-600 text-white rounded">Save changes</button>
      </div>
    </div>
  );
}

function TeachersView({ teachers, onAdd, onOpenPayments, onMarkAttendance }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('Male');
  const [className, setClassName] = useState('');
  const [salary, setSalary] = useState('');

  function add() {
    if (!name) { alert('Name required'); return; }
    onAdd({ name, phone, gender, className, salary: Number(salary || 0) });
    setName(''); setPhone(''); setClassName(''); setSalary('');
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white p-4 rounded shadow">
        <h4 className="font-semibold mb-2">Add Teacher</h4>
        <input placeholder="Full name" value={name} onChange={e => setName(e.target.value)} className="p-2 border rounded w-full mb-2" />
        <input placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} className="p-2 border rounded w-full mb-2" />
        <select value={gender} onChange={e => setGender(e.target.value)} className="p-2 border rounded w-full mb-2"><option>Male</option><option>Female</option></select>
        <input placeholder="Class teaching" value={className} onChange={e => setClassName(e.target.value)} className="p-2 border rounded w-full mb-2" />
        <input placeholder="Salary (per month)" value={salary} onChange={e => setSalary(e.target.value)} className="p-2 border rounded w-full mb-2" />
        <div className="flex gap-2">
          <button onClick={add} className="px-3 py-2 bg-teal-600 text-white rounded">Add teacher</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h4 className="font-semibold mb-2">Teachers</h4>
        <div className="space-y-2">
          {teachers.length === 0 && <div className="text-gray-500">No teachers yet.</div>}
          {teachers.map(t => (
            <div key={t.id} className="flex items-center justify-between p-2 border rounded">
              <div>
                <div className="font-semibold">{t.name}</div>
                <div className="text-xs text-gray-400">{t.className} • {t.gender}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => onOpenPayments(t)} className="px-2 py-1 border rounded text-sm">Payments</button>
                <button onClick={() => {
                  const d = new Date().toISOString().slice(0,10);
                  const present = confirm(`Mark ${t.name} present today (${d})?`);
                  onMarkAttendance(t.id, d, present);
                }} className="px-2 py-1 border rounded text-sm">Attendance</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExpensesView({ expenses, onAdd }) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [note, setNote] = useState('');

  function add() {
    if (!title || !amount) { alert('Title and amount required'); return; }
    onAdd({ title, amount: Number(amount), date, note });
    setTitle(''); setAmount(''); setNote('');
  }

  return (
    <div>
      <div className="bg-white p-4 rounded shadow mb-4">
        <h4 className="font-semibold mb-2">Add expense</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="p-2 border rounded" />
          <input placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} className="p-2 border rounded" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="p-2 border rounded" />
          <input placeholder="Note" value={note} onChange={e => setNote(e.target.value)} className="p-2 border rounded" />
        </div>
        <div className="mt-2"><button onClick={add} className="px-3 py-2 bg-red-600 text-white rounded">Add expense</button></div>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h4 className="font-semibold mb-2">All expenses</h4>
        <ul className="space-y-2 text-sm">
          {expenses.map(e => (
            <li key={e.id} className="flex justify-between border p-2 rounded">
              <div>
                <div className="font-semibold">{e.title}</div>
                <div className="text-gray-500 text-xs">{e.note}</div>
              </div>
              <div>${Number(e.amount).toFixed(2)} • {new Date(e.date).toLocaleDateString()}</div>
            </li>
          ))}
          {expenses.length === 0 && <div className="text-gray-500">No expenses recorded.</div>}
        </ul>
      </div>
    </div>
  );
}

function ReportsView({ data, monthlyReport }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7));

  function downloadPDF() {
    alert('PDF export feature is available after installing jspdf: npm install jspdf');
    return;
    /* Uncomment after installing jspdf
    try {
      // @ts-ignore - jspdf is optional
      import('jspdf').then(module => {
        const { jsPDF } = module;
        const doc = new jsPDF('p', 'pt', 'a4');
        const m = new Date(month + '-01');
        const rep = monthlyReport(month);
        doc.setFontSize(14);
        doc.text(`Monthly Statement - ${m.toLocaleString('default', { month: 'long', year: 'numeric' })}`, 40, 60);
        doc.setFontSize(11);
        doc.text(`Total students: ${rep.totalStudents}`, 40, 90);
        doc.text(`Total teachers: ${rep.totalTeachers}`, 40, 110);
        doc.text(`Total income: $${rep.totalIncome.toFixed(2)}`, 40, 130);
        doc.text(`Total expense: $${rep.totalExpense.toFixed(2)}`, 40, 150);
        doc.text('--- Incomes ---', 40, 180);
        rep.incomes.slice(0,20).forEach((inc, i) => doc.text(`${i+1}. ${inc.description || 'Tuition'} • $${Number(inc.amount).toFixed(2)} • ${new Date(inc.date).toLocaleDateString()}`, 40, 200 + i*14));
        doc.text('--- Expenses ---', 40, 420);
        rep.expenses.slice(0,20).forEach((exp, i) => doc.text(`${i+1}. ${exp.title} • $${Number(exp.amount).toFixed(2)} • ${new Date(exp.date).toLocaleDateString()}`, 40, 440 + i*14));
        doc.text('Signed by: Imam Jonayed', 40, 740);
        doc.save(`monthly-statement-${month}.pdf`);
      });
    } catch (e) {
      alert('PDF export requires jsPDF. Install with: npm install jspdf');
    }
    */
  }

  const rep = monthlyReport(month);

  return (
    <div className="bg-white p-4 rounded shadow max-w-3xl">
      <h4 className="font-semibold mb-2">Monthly Report</h4>
      <div className="flex items-center gap-2 mb-3">
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="p-2 border rounded" />
        <button onClick={downloadPDF} className="px-3 py-2 bg-teal-600 text-white rounded">Download PDF</button>
      </div>

      <div className="text-sm text-gray-700">
        <div>Total students: <strong>{rep.totalStudents}</strong></div>
        <div>Total teachers: <strong>{rep.totalTeachers}</strong></div>
        <div>Total income: <strong>${rep.totalIncome.toFixed(2)}</strong></div>
        <div>Total expense: <strong>${rep.totalExpense.toFixed(2)}</strong></div>
      </div>
    </div>
  );
}

// ---------- Modals & Helpers ----------
function ConfirmModal({ title, children, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-4 rounded shadow w-full max-w-md">
        <h4 className="font-semibold mb-2">{title}</h4>
        <div className="text-sm mb-4">{children}</div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 border rounded">Cancel</button>
          <button onClick={onConfirm} className="px-3 py-1 bg-red-600 text-white rounded">Delete</button>
        </div>
      </div>
    </div>
  );
}

function EditPaymentModal({ title, initial, onClose, onSave }) {
  const [amount, setAmount] = useState(initial?.amount || '');
  const [date, setDate] = useState(initial?.date ? new Date(initial.date).toISOString().slice(0,10) : new Date().toISOString().slice(0,10));
  const [note, setNote] = useState(initial?.note || initial?.description || '');

  function save() { onSave({ amount: Number(amount), date, note, description: note }); }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-4 rounded shadow w-full max-w-md">
        <h4 className="font-semibold mb-2">{title}</h4>
        <div className="grid grid-cols-1 gap-2">
          <input placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} className="p-2 border rounded" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="p-2 border rounded" />
          <input placeholder="Note" value={note} onChange={e => setNote(e.target.value)} className="p-2 border rounded" />
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 border rounded">Cancel</button>
          <button onClick={save} className="px-3 py-1 bg-teal-600 text-white rounded">Save</button>
        </div>
      </div>
    </div>
  );
}

function TeacherPaymentsModal({ teacher, onClose, onAdd, onEdit, onDelete }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [note, setNote] = useState('Salary');

  function addPayment() {
    if (!amount) { alert('Amount required'); return; }
    const payment = { id: new Date().getTime().toString(), amount: Number(amount), date, note, description: note };
    onAdd(payment);
    setAmount(''); setNote('Salary');
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-4 rounded shadow w-full max-w-2xl">
        <div className="flex justify-between items-start mb-4">
          <h4 className="font-semibold">Teacher Payments - {teacher?.name}</h4>
          <button onClick={onClose} className="px-3 py-1 border rounded">Close</button>
        </div>

        <div className="mb-4">
          <h5 className="font-semibold mb-2">Add Payment</h5>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} className="p-2 border rounded" />
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="p-2 border rounded" />
            <input placeholder="Note" value={note} onChange={e => setNote(e.target.value)} className="p-2 border rounded" />
            <button onClick={addPayment} className="px-3 py-2 bg-teal-600 text-white rounded">Add</button>
          </div>
        </div>

        <div>
          <h5 className="font-semibold mb-2">Payment History</h5>
          <ul className="space-y-2 text-sm max-h-64 overflow-y-auto">
            {(teacher?.payments || []).map(p => (
              <li key={p.id} className="flex justify-between items-center border p-2 rounded">
                <div>
                  <div>{p.note || p.description} — ${Number(p.amount).toFixed(2)}</div>
                  <div className="text-xs text-gray-400">{new Date(p.date).toLocaleDateString()}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onEdit(p.id)} className="px-2 py-1 border rounded text-sm">Edit</button>
                  <button onClick={() => onDelete(p.id)} className="px-2 py-1 border rounded text-sm">Delete</button>
                </div>
              </li>
            ))}
            {(!teacher?.payments || teacher.payments.length === 0) && <div className="text-gray-500">No payments yet</div>}
          </ul>
        </div>
      </div>
    </div>
  );
}

