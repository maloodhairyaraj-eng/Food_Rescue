"use client";

import React, { useState } from 'react';
import { 
  LayoutDashboard, ClipboardList, History, User as UserIcon, Settings, 
  Bell, Leaf, Clock, MapPin, CheckCircle2, Navigation, Phone, 
  PackageOpen, XCircle, ShieldCheck, Menu, Edit3, Save, X, Globe, Shield, LogOut, Trash2, ChevronRight
} from 'lucide-react';

export default function VolunteerDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [assignmentTab, setAssignmentTab] = useState('pending'); // 'pending' | 'active' | 'completed'
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Workflow States
  const [availability, setAvailability] = useState('Available');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpType, setOtpType] = useState(null); // 'pickup' | 'delivery'
  const [otpInput, setOtpInput] = useState('');

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profile, setProfile] = useState({
    name: 'Raj Patel',
    email: 'raj.patel@example.com',
    phone: '+91 98765 43210',
    address: 'Malviya Nagar, Jaipur',
    ngo: 'Hope Foundation',
    transport: 'Two-Wheeler',
    availability: 'Weekends, 4 PM - 9 PM',
    area: 'South Jaipur',
    emergencyContact: '+91 99887 77665'
  });
  const [editForm, setEditForm] = useState(profile);

  // Settings State
  const [notifications, setNotifications] = useState({
    newAssignments: true,
    updates: true,
    deadlines: true,
    completion: true
  });

  // Mock Data
  const [pendingAssignments, setPendingAssignments] = useState([
    {
      id: 'REQ-882',
      restaurant: 'Downtown Bakery',
      restaurantAddress: '142 Main St',
      ngo: 'Hope Foundation',
      ngoAddress: '88 Care Ave',
      food: '50 Hot Meals (Assorted)',
      deadline: '8:30 PM',
      distance: '1.2 km away',
      date: 'Today'
    }
  ]);

  const [activeTask, setActiveTask] = useState(null);
  const [completedTasks, setCompletedTasks] = useState([
    { id: 'REC-101', restaurant: 'City Market', ngo: 'Hope Foundation', food: '20kg Veggies', date: 'Oct 29', status: 'Delivered' }
  ]);

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'assignments', label: 'My Assignments', icon: ClipboardList },
    { id: 'history', label: 'Rescue History', icon: History },
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Workflow Handlers
  const handleAcceptTask = (task) => {
    setActiveTask(task);
    setPendingAssignments(pendingAssignments.filter(p => p.id !== task.id));
    setAvailability('On Pickup');
    setAssignmentTab('active');
    if (activeTab === 'dashboard') setActiveTab('assignments');
  };

  const handleDeclineTask = (taskId) => {
    setPendingAssignments(pendingAssignments.filter(p => p.id !== taskId));
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    if (otpInput.length === 4) {
      if (otpType === 'pickup') {
        setAvailability('Returning');
      } else if (otpType === 'delivery') {
        const completed = { ...activeTask, date: 'Today', status: 'Delivered' };
        setCompletedTasks([completed, ...completedTasks]);
        setActiveTask(null);
        setAvailability('Available');
        setAssignmentTab('completed');
      }
      setShowOtpModal(false);
      setOtpInput('');
    }
  };

  const openOtpModal = (type) => {
    setOtpType(type);
    setShowOtpModal(true);
  };

  const handleProfileSave = (e) => {
    e.preventDefault();
    setProfile(editForm);
    setIsEditingProfile(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('accessToken');
    window.location.href = '/';
  };

  // ---------------------------------------------------------
  // 1. DASHBOARD
  // ---------------------------------------------------------
  const renderDashboard = () => (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 md:pb-6">
      <section className="bg-paper border border-line rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-forest uppercase tracking-tight">Hi, {profile.name}</h2>
          <p className="text-ink-muted text-sm mt-1">{profile.ngo} Volunteer</p>
        </div>
        <div className="flex items-center gap-3 bg-ivory p-2 rounded-xl border border-line">
          <span className="text-xs font-bold text-ink-muted uppercase">Status:</span>
          <select 
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            disabled={activeTask !== null}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold border-none outline-none appearance-none cursor-pointer
              ${availability === 'Available' ? 'bg-st-fresh-bg text-st-fresh-fg' : 
                availability === 'Offline' ? 'bg-line text-ink-muted' : 
                availability === 'On Pickup' ? 'bg-st-soon-bg text-st-soon-fg' : 'bg-blue-100 text-blue-700'
              }`}
          >
            <option value="Available">🟢 Available</option>
            <option value="On Pickup" disabled>🟠 On Pickup</option>
            <option value="Returning" disabled>🔵 Returning</option>
            <option value="Offline">⚫ Offline</option>
          </select>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3 md:gap-4">
        <div className="bg-paper p-4 md:p-6 rounded-2xl border border-line shadow-sm text-center">
          <p className="text-[10px] md:text-xs font-bold text-ink-muted uppercase tracking-wider mb-1">Pickups</p>
          <p className="text-2xl md:text-3xl font-display font-bold text-forest">{completedTasks.length + 41}</p>
        </div>
        <div className="bg-paper p-4 md:p-6 rounded-2xl border border-line shadow-sm text-center">
          <p className="text-[10px] md:text-xs font-bold text-ink-muted uppercase tracking-wider mb-1">Meals</p>
          <p className="text-2xl md:text-3xl font-display font-bold text-terracotta-deep">1,250</p>
        </div>
        <div className="bg-paper p-4 md:p-6 rounded-2xl border border-line shadow-sm text-center">
          <p className="text-[10px] md:text-xs font-bold text-ink-muted uppercase tracking-wider mb-1">Active</p>
          <p className="text-2xl md:text-3xl font-display font-bold text-forest">{activeTask ? '1' : '0'}</p>
        </div>
      </section>

      {/* Redirects to Assignments Tab based on context */}
      <button 
        onClick={() => setActiveTab('assignments')}
        className="w-full py-4 rounded-xl font-bold text-sm bg-forest text-paper shadow-sm hover:bg-forest-deep transition-colors"
      >
        Go to My Assignments →
      </button>
    </div>
  );

  // ---------------------------------------------------------
  // 2. MY ASSIGNMENTS
  // ---------------------------------------------------------
  const renderAssignments = () => (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 md:pb-6">
      <div className="border-b border-line pb-4">
        <h2 className="text-2xl font-display font-bold text-forest uppercase">My Assignments</h2>
        <p className="text-sm text-ink-muted mt-1">Manage your food rescue tasks.</p>
      </div>

      <div className="flex bg-line/30 p-1 rounded-xl mb-6">
        {['pending', 'active', 'completed'].map(tab => (
          <button 
            key={tab} onClick={() => setAssignmentTab(tab)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${assignmentTab === tab ? 'bg-paper shadow-sm text-forest' : 'text-ink-muted'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {assignmentTab === 'pending' && (
        <div className="space-y-4">
          {pendingAssignments.length === 0 ? (
             <div className="p-8 text-center text-ink-muted border border-dashed border-line rounded-2xl">No pending assignments.</div>
          ) : pendingAssignments.map(task => (
            <div key={task.id} className="bg-paper border border-line rounded-2xl shadow-sm p-5">
              <div className="flex justify-between items-start mb-3">
                <span className="bg-st-soon-bg text-st-soon-fg text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Pending Assignment</span>
                <span className="text-terracotta-deep font-bold text-sm flex items-center gap-1"><Clock className="w-4 h-4" /> {task.deadline}</span>
              </div>
              <h4 className="font-display font-bold text-lg text-charcoal">{task.restaurant}</h4>
              <p className="text-sm text-ink-muted mb-4 flex items-center gap-1">NGO: {task.ngo} • {task.food}</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleAcceptTask(task)} className="py-2.5 bg-forest text-paper rounded-xl font-bold text-sm hover:bg-forest-deep transition-colors">Accept</button>
                <button onClick={() => handleDeclineTask(task.id)} className="py-2.5 bg-ivory text-ink-muted border border-line rounded-xl font-bold text-sm hover:bg-line transition-colors">Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {assignmentTab === 'active' && (
        <div className="space-y-4">
          {!activeTask ? (
             <div className="p-8 text-center text-ink-muted border border-dashed border-line rounded-2xl">No active assignments. Accept a pending task.</div>
          ) : (
            <div className="bg-paper border border-forest rounded-2xl shadow-sm overflow-hidden">
              <div className={`p-4 text-center font-bold text-sm uppercase tracking-wider text-paper ${availability === 'On Pickup' ? 'bg-terracotta-deep' : 'bg-forest'}`}>
                {availability === 'On Pickup' ? 'Head to Restaurant' : 'Deliver to NGO'}
              </div>
              <div className="p-6 space-y-6">
                <div className="relative pl-6 space-y-6 before:absolute before:inset-0 before:ml-[11px] before:h-full before:w-0.5 before:bg-line">
                  {/* Step 1 */}
                  <div className={`relative ${availability === 'Returning' ? 'opacity-50' : ''}`}>
                    <div className={`absolute -left-9 w-6 h-6 rounded-full border-4 border-paper flex items-center justify-center ${availability === 'On Pickup' ? 'bg-terracotta' : 'bg-forest'}`}></div>
                    <p className="text-xs font-bold text-ink-muted uppercase mb-1">Pickup From</p>
                    <h4 className="font-display font-bold text-lg text-charcoal">{activeTask.restaurant}</h4>
                    <p className="text-sm text-ink-muted">{activeTask.restaurantAddress}</p>
                  </div>
                  {/* Step 2 */}
                  <div className="relative">
                    <div className={`absolute -left-9 w-6 h-6 rounded-full border-4 border-paper flex items-center justify-center ${availability === 'Returning' ? 'bg-forest' : 'bg-line'}`}></div>
                    <p className="text-xs font-bold text-ink-muted uppercase mb-1">Deliver To</p>
                    <h4 className="font-display font-bold text-lg text-charcoal">{activeTask.ngo}</h4>
                    <p className="text-sm text-ink-muted">{activeTask.ngoAddress}</p>
                  </div>
                </div>
                
                <div className="bg-ivory p-4 rounded-xl border border-line flex items-center gap-4">
                  <div className="w-12 h-12 bg-sage-light text-forest rounded-xl flex items-center justify-center shrink-0">
                    <PackageOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-charcoal">{activeTask.food}</p>
                    <p className="text-xs text-ink-muted flex items-center gap-1 mt-1"><Clock className="w-3 h-3" /> Due in {activeTask.deadline}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button className="py-3 rounded-xl font-bold text-sm bg-ivory text-forest border border-line hover:bg-sage-light flex items-center justify-center gap-2 transition-colors">
                    <Navigation className="w-4 h-4" /> Map
                  </button>
                  {availability === 'On Pickup' ? (
                    <button onClick={() => openOtpModal('pickup')} className="py-3 rounded-xl font-bold text-sm bg-terracotta-deep text-paper hover:bg-terracotta flex items-center justify-center gap-2 transition-colors shadow-sm">
                      <ShieldCheck className="w-4 h-4" /> Pickup OTP
                    </button>
                  ) : (
                    <button onClick={() => openOtpModal('delivery')} className="py-3 rounded-xl font-bold text-sm bg-forest text-paper hover:bg-forest-deep flex items-center justify-center gap-2 transition-colors shadow-sm">
                      <ShieldCheck className="w-4 h-4" /> Delivery OTP
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {assignmentTab === 'completed' && (
        <div className="space-y-4">
          {completedTasks.map(task => (
            <div key={task.id} className="bg-paper border border-line rounded-2xl shadow-sm p-5">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-display font-bold text-lg text-charcoal">{task.restaurant}</h4>
                <span className="bg-st-fresh-bg text-st-fresh-fg text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">{task.status}</span>
              </div>
              <p className="text-sm text-ink-muted mb-2">{task.food} → {task.ngo}</p>
              <p className="text-xs text-ink-muted font-bold">Date: {task.date}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ---------------------------------------------------------
  // 3. RESCUE HISTORY
  // ---------------------------------------------------------
  const renderHistory = () => (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 md:pb-6">
      <div className="border-b border-line pb-4">
        <h2 className="text-2xl font-display font-bold text-forest uppercase">Rescue History</h2>
        <p className="text-sm text-ink-muted mt-1">Your contribution to reducing food waste.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-forest p-6 rounded-2xl shadow-sm text-center text-paper">
          <p className="text-xs font-bold text-sage-light uppercase tracking-wider mb-2">Completed Pickups</p>
          <p className="text-4xl font-display font-bold">{completedTasks.length + 41}</p>
        </div>
        <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm text-center">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">Meals Delivered</p>
          <p className="text-4xl font-display font-bold text-terracotta-deep">1,250</p>
        </div>
      </div>

      <div className="space-y-4 mt-6">
        <h3 className="text-sm font-bold text-charcoal uppercase tracking-wider">Past Assignments</h3>
        {completedTasks.map(task => (
          <div key={task.id} className="bg-paper border border-line rounded-2xl shadow-sm p-5">
            <h4 className="font-display font-bold text-lg text-charcoal mb-1">{task.restaurant}</h4>
            <p className="text-sm text-charcoal mb-2">{task.food} → <span className="font-bold text-forest">{task.ngo}</span></p>
            <div className="flex justify-between items-center text-xs">
              <span className="text-ink-muted font-bold">Date: {task.date}</span>
              <span className="flex items-center gap-1 text-st-fresh-fg"><CheckCircle2 className="w-4 h-4" /> Successfully Delivered</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ---------------------------------------------------------
  // 4. PROFILE
  // ---------------------------------------------------------
  const renderProfile = () => {
    if (isEditingProfile) {
      return (
        <form onSubmit={handleProfileSave} className="max-w-3xl mx-auto space-y-6 pb-20 md:pb-6">
          <div className="flex justify-between items-center border-b border-line pb-4">
            <h2 className="text-2xl font-display font-bold text-forest uppercase">Edit Profile</h2>
            <button type="submit" className="px-4 py-2 bg-forest text-paper rounded-xl font-bold text-sm flex items-center gap-2"><Save className="w-4 h-4" /> Save</button>
          </div>
          
          <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm space-y-4">
            <h3 className="font-bold text-charcoal uppercase text-xs tracking-wider border-b border-line pb-2">Personal Information</h3>
            <div>
              <label className="block text-xs font-bold text-ink-muted mb-1">Full Name</label>
              <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full p-2.5 bg-ivory border border-line rounded-lg text-sm outline-none focus:border-forest" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1">Email</label>
                <input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full p-2.5 bg-ivory border border-line rounded-lg text-sm outline-none focus:border-forest" />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1">Phone</label>
                <input type="tel" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full p-2.5 bg-ivory border border-line rounded-lg text-sm outline-none focus:border-forest" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-muted mb-1">Address / Locality</label>
              <input type="text" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} className="w-full p-2.5 bg-ivory border border-line rounded-lg text-sm outline-none focus:border-forest" />
            </div>
          </div>

          <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm space-y-4">
            <h3 className="font-bold text-charcoal uppercase text-xs tracking-wider border-b border-line pb-2">Volunteer Information</h3>
            <div>
              <label className="block text-xs font-bold text-ink-muted mb-1">Associated NGO <span className="text-[10px] font-normal italic">(Requires approval to change)</span></label>
              <input type="text" disabled value={editForm.ngo} className="w-full p-2.5 bg-line border border-line rounded-lg text-sm text-ink-muted outline-none cursor-not-allowed" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1">Transportation Mode</label>
                <select value={editForm.transport} onChange={e => setEditForm({...editForm, transport: e.target.value})} className="w-full p-2.5 bg-ivory border border-line rounded-lg text-sm outline-none focus:border-forest">
                  <option>Two-Wheeler</option><option>Bicycle</option><option>Car</option><option>Walking</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1">Area of Operation</label>
                <input type="text" value={editForm.area} onChange={e => setEditForm({...editForm, area: e.target.value})} className="w-full p-2.5 bg-ivory border border-line rounded-lg text-sm outline-none focus:border-forest" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-muted mb-1">Preferred Availability</label>
              <input type="text" value={editForm.availability} onChange={e => setEditForm({...editForm, availability: e.target.value})} className="w-full p-2.5 bg-ivory border border-line rounded-lg text-sm outline-none focus:border-forest" />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-muted mb-1">Emergency Contact</label>
              <input type="tel" value={editForm.emergencyContact} onChange={e => setEditForm({...editForm, emergencyContact: e.target.value})} className="w-full p-2.5 bg-ivory border border-line rounded-lg text-sm outline-none focus:border-forest" />
            </div>
          </div>
        </form>
      );
    }

    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-20 md:pb-6">
        <div className="flex justify-between items-end border-b border-line pb-4">
          <div>
            <h2 className="text-2xl font-display font-bold text-forest uppercase">My Profile</h2>
            <p className="text-sm text-ink-muted mt-1">Manage your volunteer information.</p>
          </div>
          <button onClick={() => { setEditForm(profile); setIsEditingProfile(true); }} className="px-4 py-2 bg-sage-light text-forest rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-sage transition-colors">
            <Edit3 className="w-4 h-4" /> Edit
          </button>
        </div>

        <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-forest text-paper flex items-center justify-center font-display font-bold text-xl shrink-0">
            {profile.name.substring(0,2).toUpperCase()}
          </div>
          <div>
            <h3 className="text-xl font-display font-bold text-charcoal">{profile.name}</h3>
            <p className="text-sm font-bold text-forest">{profile.ngo}</p>
          </div>
        </div>

        <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm space-y-4">
          <h4 className="font-bold text-charcoal uppercase tracking-wider text-xs border-b border-line pb-2">Personal Information</h4>
          <div className="space-y-3 text-sm">
            <div><p className="text-ink-muted text-xs">Full Name</p><p className="font-bold text-charcoal">{profile.name}</p></div>
            <div><p className="text-ink-muted text-xs">Email Address</p><p className="font-bold text-charcoal">{profile.email}</p></div>
            <div><p className="text-ink-muted text-xs">Phone Number</p><p className="font-bold text-charcoal">{profile.phone}</p></div>
            <div><p className="text-ink-muted text-xs">Address / Locality</p><p className="font-bold text-charcoal">{profile.address}</p></div>
          </div>
        </div>

        <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm space-y-4">
          <h4 className="font-bold text-charcoal uppercase tracking-wider text-xs border-b border-line pb-2">Volunteer Information</h4>
          <div className="space-y-3 text-sm">
            <div><p className="text-ink-muted text-xs">Associated NGO</p><p className="font-bold text-forest">{profile.ngo}</p></div>
            <div><p className="text-ink-muted text-xs">Transportation Mode</p><p className="font-bold text-charcoal">{profile.transport}</p></div>
            <div><p className="text-ink-muted text-xs">Preferred Availability</p><p className="font-bold text-charcoal">{profile.availability}</p></div>
            <div><p className="text-ink-muted text-xs">Area of Operation</p><p className="font-bold text-charcoal">{profile.area}</p></div>
            <div><p className="text-ink-muted text-xs">Emergency Contact</p><p className="font-bold text-charcoal">{profile.emergencyContact}</p></div>
          </div>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------
  // 5. SETTINGS
  // ---------------------------------------------------------
  const renderSettings = () => {
    const toggleNotification = (key) => setNotifications(prev => ({...prev, [key]: !prev[key]}));

    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-20 md:pb-6">
        <div className="border-b border-line pb-4">
          <h2 className="text-2xl font-display font-bold text-forest uppercase">Settings</h2>
          <p className="text-sm text-ink-muted mt-1">Manage your account preferences.</p>
        </div>

        <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-bold text-charcoal uppercase tracking-wider text-xs border-b border-line pb-2"><Globe className="w-4 h-4 text-forest" /> Account Preferences</div>
          <div className="flex justify-between items-center text-sm font-bold text-charcoal">
            Language
            <select className="bg-ivory border border-line rounded-lg px-3 py-1.5 outline-none"><option>English</option><option>Hindi</option></select>
          </div>
        </div>

        <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-bold text-charcoal uppercase tracking-wider text-xs border-b border-line pb-2"><Bell className="w-4 h-4 text-forest" /> Notification Preferences</div>
          {[
            { key: 'newAssignments', label: 'New Assignments' },
            { key: 'updates', label: 'Assignment Updates' },
            { key: 'deadlines', label: 'Deadline Reminders' },
            { key: 'completion', label: 'Task Completion' }
          ].map(item => (
            <div key={item.key} className="flex justify-between items-center py-1">
              <span className="text-sm text-charcoal font-bold">{item.label}</span>
              <button onClick={() => toggleNotification(item.key)} className={`w-11 h-6 rounded-full transition-colors relative ${notifications[item.key] ? 'bg-forest' : 'bg-line'}`}>
                <div className={`w-4 h-4 rounded-full bg-paper absolute top-1 transition-transform ${notifications[item.key] ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
        </div>

        <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-bold text-charcoal uppercase tracking-wider text-xs border-b border-line pb-2"><Shield className="w-4 h-4 text-forest" /> Security</div>
          <button className="w-full text-left flex justify-between items-center py-2 text-sm font-bold text-charcoal hover:text-forest transition-colors">Change Password <ChevronRight className="w-4 h-4 text-ink-muted" /></button>
          <button className="w-full text-left flex justify-between items-center py-2 text-sm font-bold text-charcoal hover:text-forest transition-colors">Account Security <ChevronRight className="w-4 h-4 text-ink-muted" /></button>
        </div>

        <div className="bg-st-error-bg/30 p-6 rounded-2xl border border-st-error-bg shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-bold text-st-error-fg uppercase tracking-wider text-xs border-b border-st-error-bg/50 pb-2">Account Management</div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 text-sm font-bold text-charcoal hover:text-st-error-fg transition-colors py-1"><LogOut className="w-4 h-4" /> Log Out</button>
          <button className="w-full flex items-center gap-2 text-sm font-bold text-st-error-fg hover:text-red-800 transition-colors py-1"><Trash2 className="w-4 h-4" /> Delete Account</button>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------
  // MAIN RENDER (Mobile-First Layout)
  // ---------------------------------------------------------
  return (
    <div className="h-screen bg-ivory flex flex-col md:flex-row text-charcoal font-body overflow-hidden">
      
      <header className="md:hidden bg-paper border-b border-line px-4 py-3 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 -ml-2 text-forest"><Menu className="w-6 h-6" /></button>
          <Leaf className="w-6 h-6 text-forest" />
          <h1 className="text-lg font-display font-bold text-forest tracking-tight">ZeroWaste</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 rounded-full bg-st-fresh-bg border-2 border-forest"></div>
          <button className="relative text-ink-muted">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-terracotta-deep rounded-full"></span>
          </button>
        </div>
      </header>

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-paper border-r border-line transform transition-transform duration-300 ease-in-out flex flex-col md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 hidden md:flex items-center gap-3 border-b border-line shrink-0">
          <Leaf className="w-8 h-8 text-forest" />
          <h1 className="text-xl font-display font-bold text-forest tracking-tight">ZeroWaste</h1>
        </div>
        <div className="md:hidden p-4 flex justify-end border-b border-line shrink-0">
          <button onClick={() => setIsMobileMenuOpen(false)} className="text-ink-muted p-2"><XCircle className="w-6 h-6" /></button>
        </div>
        <div className="px-6 py-4 text-xs font-bold text-ink-muted uppercase tracking-wider shrink-0">Volunteer Portal</div>
        
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => (
            <button 
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-bold text-sm ${activeTab === item.id ? 'bg-sage-light text-forest shadow-sm' : 'text-ink-muted hover:bg-ivory hover:text-forest'}`}
            >
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-forest' : 'text-ink-muted'}`} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto bg-ivory p-4 md:p-10 relative">
        <div className="hidden md:flex justify-end items-center mb-8 gap-6">
          <button className="relative p-2 text-ink-muted hover:text-forest transition-colors">
            <Bell className="w-6 h-6" />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-terracotta-deep rounded-full border-2 border-ivory"></span>
          </button>
        </div>

        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'assignments' && renderAssignments()}
        {activeTab === 'history' && renderHistory()}
        {activeTab === 'profile' && renderProfile()}
        {activeTab === 'settings' && renderSettings()}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-paper border-t border-line pb-safe flex justify-around p-3 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
          { id: 'assignments', icon: ClipboardList, label: 'Tasks' },
          { id: 'history', icon: History, label: 'History' },
        ].map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center gap-1 p-2 min-w-[64px] ${activeTab === item.id ? 'text-forest' : 'text-ink-muted'}`}>
            <item.icon className="w-6 h-6" />
            <span className="text-[10px] font-bold">{item.label}</span>
          </button>
        ))}
      </nav>

      {showOtpModal && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-paper rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-line">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-display font-bold text-forest uppercase">{otpType === 'pickup' ? 'Verify Pickup' : 'Verify Delivery'}</h3>
              <button onClick={() => setShowOtpModal(false)} className="text-ink-muted hover:text-charcoal p-1"><XCircle className="w-6 h-6" /></button>
            </div>
            <p className="text-sm text-ink-muted mb-6">
              {otpType === 'pickup' ? "Ask the restaurant staff for the 4-digit handover code." : "Ask the NGO receiver for the 4-digit delivery code."}
            </p>
            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <input 
                type="text" maxLength="4" autoFocus value={otpInput} onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))} placeholder="0000"
                className="w-full text-center text-4xl font-display font-bold tracking-[1em] py-4 bg-ivory border border-line rounded-xl focus:ring-2 focus:ring-forest outline-none"
              />
              <button type="submit" disabled={otpInput.length !== 4} className="w-full py-4 rounded-xl font-bold text-white bg-forest disabled:bg-line disabled:text-ink-muted hover:bg-forest-deep transition-colors shadow-sm">
                Confirm Verification
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}