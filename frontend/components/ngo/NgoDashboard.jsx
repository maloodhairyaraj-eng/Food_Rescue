"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
  LayoutDashboard, Search, Truck, Users, PackageOpen, 
  BarChart3, User as UserIcon, Settings, Bell, Leaf, Clock, MapPin, CheckCircle2,
  Filter, ChevronRight, ArrowRight, Download, PlusCircle, AlertCircle,
  Edit3, Save, X, Globe, Lock, Shield, LogOut, Trash2
} from 'lucide-react';
import { api } from '../../lib/api/client';



export default function NgoDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [foodListings, setFoodListings] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pickupStatus, setPickupStatus] = useState({});
  const [selectedOffer, setSelectedOffer] = useState(null);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({});

  // Settings State
  const [notifications, setNotifications] = useState({
    newOffers: true,
    urgent: true,
    volunteer: true,
    collaborations: true
  });

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      try {
        const [profileRes, foodRes] = await Promise.all([
          api.getProfile().catch(() => ({ success: true, data: { 
            name: 'Hope Foundation', 
            type: 'Food Distribution',
            status: 'Verified',
            description: 'Dedicated to rescuing surplus food and distributing it to local shelters.',
            regNumber: 'NGO-2024-8891X',
            contactName: 'Sarah Jenkins',
            email: 'contact@hopefoundation.org',
            phone: '+91 98765 43210',
            address: '88 Care Avenue, Block C',
            city: 'Jaipur',
            hours: '08:00 AM - 08:00 PM',
            areas: 'Downtown, South District'
          }})),
          api.getFoodListings(26.9124, 75.7873, 10).catch(() => ({ success: true, data: [] }))
        ]);
        
        if (profileRes.success) {
          setProfile(profileRes.data);
          setEditForm(profileRes.data);
        }
        if (foodRes.success) setFoodListings(foodRes.data || []);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  const handleRequestPickup = async (foodListingId) => {
    setPickupStatus(prev => ({ ...prev, [foodListingId]: 'loading' }));
    try {
      const res = await api.requestPickup(foodListingId, "Available to pick up immediately.");
      if (res.success) setPickupStatus(prev => ({ ...prev, [foodListingId]: 'success' }));
    } catch (error) {
      setPickupStatus(prev => ({ ...prev, [foodListingId]: 'error' }));
      console.error(error);
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    // Placeholder for actual API update call: await api.updateProfile(editForm);
    setProfile(editForm);
    setIsEditingProfile(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('accessToken');
    window.location.href = '/';
  };

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'requests', label: 'Food Requests', icon: Search },
    { id: 'collaborations', label: 'Collaborations', icon: Users },
    { id: 'volunteers', label: 'Volunteers', icon: Truck },
    { id: 'containers', label: 'Containers', icon: PackageOpen },
    { id: 'impact', label: 'History & Impact', icon: BarChart3 },
    { id: 'profile', label: 'NGO Profile', icon: UserIcon },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // ---------------------------------------------------------
  // 1-6. EXISTING SUB-VIEWS (Dashboard, Requests, Collabs, etc)
  // ---------------------------------------------------------
  const renderDashboard = () => (
    <div className="max-w-5xl mx-auto space-y-10">
      <section className="text-center space-y-6">
        <div>
          <h2 className="text-4xl font-display font-bold text-forest uppercase tracking-tight">
            Welcome Back, {profile?.name || 'Partner'}
          </h2>
          <p className="text-lg text-ink-muted mt-2 font-display italic">Every meal deserves a purpose.</p>
        </div>
       
        <div className="flex items-center justify-center gap-4 text-sm font-bold text-terracotta-deep uppercase tracking-widest pt-4">
          <div className="h-px bg-line flex-1 max-w-[100px]"></div>
          <span>Rescue Food ✱ Reduce Waste</span>
          <div className="h-px bg-line flex-1 max-w-[100px]"></div>
        </div>
      </section>
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Partners', value: '12', color: 'text-forest' },
          { label: 'Meals Rescued', value: '840', color: 'text-forest' },
          { label: 'Available', value: '5', color: 'text-terracotta-deep' },
          { label: 'Collections Today', value: '3', color: 'text-forest' }
        ].map((stat, i) => (
          <div key={i} className="bg-paper p-6 rounded-2xl border border-line shadow-sm text-center">
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">{stat.label}</p>
            <p className={`text-4xl font-display font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </section>
    </div>
  );

  const renderFoodRequests = () => (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b border-line pb-4">
        <h2 className="text-2xl font-display font-bold text-forest uppercase">Food Requests Flow</h2>
        <button className="flex items-center gap-2 text-sm font-bold text-forest bg-sage-light px-4 py-2 rounded-lg">
          <Filter className="w-4 h-4" /> Filter Offers
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {foodListings.map((food, i) => (
          <div key={i} className="bg-paper rounded-2xl shadow-sm border border-line overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-lg font-display font-bold text-charcoal">{food.title}</h4>
                <span className="inline-flex items-center gap-1 text-xs font-bold bg-st-soon-bg text-st-soon-fg px-3 py-1 rounded-full">
                  <Clock className="w-3 h-3" /> {food.expiresIn}
                </span>
              </div>
              <div className="space-y-2 text-sm text-ink-muted mb-6">
                <p className="flex items-center gap-2"><UserIcon className="w-4 h-4 text-sage" /> {food.donor}</p>
                <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-sage" /> {food.distance}</p>
              </div>
              {!selectedOffer || selectedOffer !== food.id ? (
                <button 
                  onClick={() => setSelectedOffer(food.id)}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-forest hover:bg-forest-deep text-paper transition-all flex items-center justify-center gap-2"
                >
                  View Details & Accept <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="bg-ivory p-4 rounded-xl border border-line space-y-4">
                  <p className="text-xs font-bold text-forest uppercase">Step 2: Assign Volunteer</p>
                  <select className="w-full p-2 rounded-lg border border-line bg-paper text-sm">
                    <option>Select Available Volunteer...</option>
                    <option>Raj Patel (1.2km away)</option>
                    <option>Anita Desai (2.5km away)</option>
                  </select>
                  <button 
                    onClick={() => { handleRequestPickup(food.id); setSelectedOffer(null); }}
                    className="w-full py-2 rounded-lg font-bold text-sm bg-terracotta-deep text-paper flex items-center justify-center gap-2"
                  >
                    Confirm Assignment
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCollaborations = () => (
    <div className="flex flex-col items-center justify-center h-64 text-ink-muted bg-paper rounded-2xl border border-line border-dashed">
      <Users className="w-12 h-12 mb-4 text-line" />
      <p>Collaborations module pending backend API.</p>
    </div>
  );
  
  const renderVolunteers = () => (
    <div className="flex flex-col items-center justify-center h-64 text-ink-muted bg-paper rounded-2xl border border-line border-dashed">
      <Truck className="w-12 h-12 mb-4 text-line" />
      <p>Volunteers directory pending backend API.</p>
    </div>
  );
  
  const renderContainers = () => (
    <div className="flex flex-col items-center justify-center h-64 text-ink-muted bg-paper rounded-2xl border border-line border-dashed">
      <PackageOpen className="w-12 h-12 mb-4 text-line" />
      <p>Container tracking pending backend API.</p>
    </div>
  );
  
  const renderImpact = () => (
    <div className="flex flex-col items-center justify-center h-64 text-ink-muted bg-paper rounded-2xl border border-line border-dashed">
      <BarChart3 className="w-12 h-12 mb-4 text-line" />
      <p>Impact reporting pending verified deliveries.</p>
    </div>
  );

  // ---------------------------------------------------------
  // 7. NGO PROFILE
  // ---------------------------------------------------------
  const renderProfile = () => {
    if (!profile) return null;

    if (isEditingProfile) {
      return (
        <form onSubmit={handleProfileSave} className="max-w-4xl mx-auto space-y-6">
          <div className="flex justify-between items-center border-b border-line pb-4">
            <div>
              <h2 className="text-2xl font-display font-bold text-forest uppercase">Edit NGO Profile</h2>
              <p className="text-sm text-ink-muted">Update your organization's operational details.</p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setEditForm(profile); setIsEditingProfile(false); }} className="px-4 py-2 rounded-xl text-sm font-bold text-charcoal bg-ivory border border-line flex items-center gap-2">
                <X className="w-4 h-4" /> Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded-xl text-sm font-bold text-paper bg-forest hover:bg-forest-deep flex items-center gap-2">
                <Save className="w-4 h-4" /> Save Changes
              </button>
            </div>
          </div>

          <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm space-y-4">
            <h3 className="font-bold text-charcoal uppercase tracking-wider text-xs border-b border-line pb-2">Organization Overview</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1">Organization Name</label>
                <input required type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full p-2.5 bg-ivory border border-line rounded-lg text-sm outline-none focus:border-forest" />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1">NGO Type</label>
                <input required type="text" value={editForm.type} onChange={e => setEditForm({...editForm, type: e.target.value})} className="w-full p-2.5 bg-ivory border border-line rounded-lg text-sm outline-none focus:border-forest" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-muted mb-1">Description</label>
              <textarea rows="3" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="w-full p-2.5 bg-ivory border border-line rounded-lg text-sm outline-none focus:border-forest resize-none"></textarea>
            </div>
          </div>

          <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm space-y-4">
            <h3 className="font-bold text-charcoal uppercase tracking-wider text-xs border-b border-line pb-2">Contact & Location</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1">Primary Contact Person</label>
                <input required type="text" value={editForm.contactName} onChange={e => setEditForm({...editForm, contactName: e.target.value})} className="w-full p-2.5 bg-ivory border border-line rounded-lg text-sm outline-none focus:border-forest" />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1">Phone Number</label>
                <input required type="tel" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full p-2.5 bg-ivory border border-line rounded-lg text-sm outline-none focus:border-forest" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-ink-muted mb-1">Full Address</label>
                <input required type="text" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} className="w-full p-2.5 bg-ivory border border-line rounded-lg text-sm outline-none focus:border-forest" />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1">Operating Hours</label>
                <input type="text" value={editForm.hours} onChange={e => setEditForm({...editForm, hours: e.target.value})} className="w-full p-2.5 bg-ivory border border-line rounded-lg text-sm outline-none focus:border-forest" />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1">Areas of Operation</label>
                <input type="text" value={editForm.areas} onChange={e => setEditForm({...editForm, areas: e.target.value})} className="w-full p-2.5 bg-ivory border border-line rounded-lg text-sm outline-none focus:border-forest" />
              </div>
            </div>
          </div>
        </form>
      );
    }

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-end border-b border-line pb-4">
          <div>
            <h2 className="text-2xl font-display font-bold text-forest uppercase">NGO Profile</h2>
            <p className="text-sm text-ink-muted mt-1">Manage your organization information.</p>
          </div>
          <button onClick={() => setIsEditingProfile(true)} className="px-4 py-2 rounded-xl text-sm font-bold text-forest bg-sage-light flex items-center gap-2 hover:bg-sage transition-colors">
            <Edit3 className="w-4 h-4" /> Edit Profile
          </button>
        </div>

        {/* Overview Card */}
        <div className="bg-paper p-8 rounded-2xl border border-line shadow-sm flex items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-forest text-paper flex items-center justify-center font-display font-bold text-3xl shrink-0">
            {profile.name.substring(0,2).toUpperCase()}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-display font-bold text-charcoal">{profile.name}</h3>
              <span className="px-2.5 py-1 bg-st-fresh-bg text-st-fresh-fg text-[10px] font-bold uppercase rounded-md flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {profile.status}
              </span>
            </div>
            <p className="text-sm font-bold text-forest">{profile.type}</p>
            <p className="text-sm text-ink-muted max-w-2xl">{profile.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Information & Contact */}
          <div className="space-y-6">
            <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm space-y-4">
              <h4 className="font-bold text-charcoal uppercase tracking-wider text-xs border-b border-line pb-2">Organization Information</h4>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-ink-muted text-xs">Registration Number</p>
                  <p className="font-bold text-charcoal">{profile.regNumber}</p>
                </div>
                <div>
                  <p className="text-ink-muted text-xs">Registration Details</p>
                  <p className="font-bold text-forest cursor-pointer hover:underline">View Verified Documents</p>
                </div>
              </div>
            </div>

            <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm space-y-4">
              <h4 className="font-bold text-charcoal uppercase tracking-wider text-xs border-b border-line pb-2">Contact Information</h4>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-ink-muted text-xs">Primary Contact Person</p>
                  <p className="font-bold text-charcoal">{profile.contactName}</p>
                </div>
                <div>
                  <p className="text-ink-muted text-xs">Email Address</p>
                  <p className="font-bold text-charcoal">{profile.email}</p>
                </div>
                <div>
                  <p className="text-ink-muted text-xs">Phone Number</p>
                  <p className="font-bold text-charcoal">{profile.phone}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Location & Operations */}
          <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm space-y-4 h-fit">
            <h4 className="font-bold text-charcoal uppercase tracking-wider text-xs border-b border-line pb-2">Location & Operations</h4>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-ink-muted text-xs">Full Address</p>
                <p className="font-bold text-charcoal">{profile.address}</p>
              </div>
              <div>
                <p className="text-ink-muted text-xs">City</p>
                <p className="font-bold text-charcoal">{profile.city}</p>
              </div>
              <div>
                <p className="text-ink-muted text-xs">Operating Hours</p>
                <p className="font-bold text-charcoal flex items-center gap-1"><Clock className="w-3 h-3 text-sage" /> {profile.hours}</p>
              </div>
              <div>
                <p className="text-ink-muted text-xs">Areas of Operation</p>
                <p className="font-bold text-charcoal flex items-center gap-1"><MapPin className="w-3 h-3 text-sage" /> {profile.areas}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------
  // 8. SETTINGS
  // ---------------------------------------------------------
  const renderSettings = () => {
    const toggleNotification = (key) => setNotifications(prev => ({...prev, [key]: !prev[key]}));

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="border-b border-line pb-4">
          <h2 className="text-2xl font-display font-bold text-forest uppercase">Settings</h2>
          <p className="text-sm text-ink-muted mt-1">Manage your account preferences and notifications.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            {/* Account Preferences */}
            <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm space-y-4">
              <div className="flex items-center gap-2 font-bold text-charcoal uppercase tracking-wider text-xs border-b border-line pb-2">
                <Globe className="w-4 h-4 text-forest" /> Account Preferences
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-charcoal">Language</span>
                <select className="bg-ivory border border-line rounded-lg px-3 py-1.5 text-sm outline-none">
                  <option>English</option>
                  <option>Hindi</option>
                  <option>French</option>
                </select>
              </div>
            </div>

            {/* Security */}
            <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm space-y-4">
              <div className="flex items-center gap-2 font-bold text-charcoal uppercase tracking-wider text-xs border-b border-line pb-2">
                <Shield className="w-4 h-4 text-forest" /> Security
              </div>
              <button className="w-full text-left flex justify-between items-center py-2 text-sm font-bold text-charcoal hover:text-forest transition-colors">
                Change Password <ChevronRight className="w-4 h-4 text-ink-muted" />
              </button>
              <button className="w-full text-left flex justify-between items-center py-2 text-sm font-bold text-charcoal hover:text-forest transition-colors">
                Account Security Settings <ChevronRight className="w-4 h-4 text-ink-muted" />
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Notification Settings */}
            <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm space-y-4">
              <div className="flex items-center gap-2 font-bold text-charcoal uppercase tracking-wider text-xs border-b border-line pb-2">
                <Bell className="w-4 h-4 text-forest" /> Notification Settings
              </div>
              
              {[
                { key: 'newOffers', label: 'New Food Offers' },
                { key: 'urgent', label: 'Urgent Donations' },
                { key: 'volunteer', label: 'Volunteer Updates' },
                { key: 'collaborations', label: 'Collaboration Requests' }
              ].map(item => (
                <div key={item.key} className="flex justify-between items-center py-1">
                  <span className="text-sm text-charcoal font-bold">{item.label}</span>
                  <button 
                    onClick={() => toggleNotification(item.key)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${notifications[item.key] ? 'bg-forest' : 'bg-line'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-paper absolute top-1 transition-transform ${notifications[item.key] ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              ))}
            </div>

            {/* Danger Zone */}
            <div className="bg-st-error-bg/30 p-6 rounded-2xl border border-st-error-bg shadow-sm space-y-4">
              <div className="flex items-center gap-2 font-bold text-st-error-fg uppercase tracking-wider text-xs border-b border-st-error-bg/50 pb-2">
                <AlertCircle className="w-4 h-4" /> Danger Zone
              </div>
              <button onClick={handleLogout} className="w-full flex items-center gap-2 text-sm font-bold text-charcoal hover:text-st-error-fg transition-colors py-1">
                <LogOut className="w-4 h-4" /> Log Out
              </button>
              <button className="w-full flex items-center gap-2 text-sm font-bold text-st-error-fg hover:text-red-800 transition-colors py-1">
                <Trash2 className="w-4 h-4" /> Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------
  // MAIN RENDER
  // ---------------------------------------------------------

  return (
    <div className="h-screen bg-ivory flex flex-col text-charcoal font-body overflow-hidden">
      
      {/* Top Navigation Bar */}
      <header className="bg-paper border-b border-line px-6 py-4 flex items-center justify-between shrink-0 z-20">
        <div className="w-64 flex items-center gap-3">
          <Leaf className="w-8 h-8 text-forest" />
          <h1 className="text-xl font-display font-bold text-forest tracking-tight">ZeroWaste</h1>
        </div>
        
        <div className="flex flex-1 items-center justify-end gap-6">
          <button className="relative p-2 text-ink-muted hover:text-forest transition-colors">
            <Bell className="w-6 h-6" />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-terracotta-deep rounded-full border-2 border-paper"></span>
          </button>
          
          <div className="flex items-center gap-3 pl-6 border-l border-line cursor-pointer">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-forest leading-tight">{profile?.name || 'NGO'}</p>
              <p className="text-xs text-ink-muted">Approved Partner</p>
            </div>
            <div className="w-10 h-10 bg-forest text-paper rounded-full flex items-center justify-center font-display font-bold">
              {profile?.name ? profile.name.substring(0, 2).toUpperCase() : 'NG'}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-paper border-r border-line flex flex-col overflow-y-auto shrink-0 pb-6 z-10 hidden md:flex">
          <nav className="flex-1 px-4 pt-6 space-y-1">
            {sidebarItems.map((item) => (
              <button 
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                  activeTab === item.id 
                    ? 'bg-sage-light text-forest shadow-sm' 
                    : 'text-ink-muted hover:bg-ivory hover:text-forest'
                }`}
              >
                <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-forest' : 'text-ink-muted'}`} />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content Area Routing */}
        <main className="flex-1 overflow-y-auto bg-ivory p-6 md:p-10 relative">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'requests' && renderFoodRequests()}
          {activeTab === 'collaborations' && renderCollaborations()}
          {activeTab === 'volunteers' && renderVolunteers()}
          {activeTab === 'containers' && renderContainers()}
          {activeTab === 'impact' && renderImpact()}
          {activeTab === 'profile' && renderProfile()}
          {activeTab === 'settings' && renderSettings()}
        </main>
      </div>
    </div>
  );
}