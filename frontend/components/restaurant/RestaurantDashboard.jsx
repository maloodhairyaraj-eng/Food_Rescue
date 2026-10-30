"use client";

import React, { useState } from 'react';
import { 
  LayoutDashboard, PlusCircle, List as ListIcon, Users, PackageOpen, 
  BarChart3, Star, User as UserIcon, Settings, Bell, Leaf, Clock, 
  MapPin, CheckCircle2, ChevronRight, AlertCircle, Menu, XCircle,
  Filter, ShieldCheck, MessageSquare, Edit3, Save, X, Globe, Shield, LogOut, Trash2
} from 'lucide-react';

export default function RestaurantDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sub-navigation states
  const [donationTab, setDonationTab] = useState('All');
  const [collabTab, setCollabTab] = useState('Active');
  const [impactTab, setImpactTab] = useState('History');
  
  // Profile & Settings States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profile, setProfile] = useState({ 
    name: 'Downtown Bakery', 
    type: 'Bakery & Cafe',
    status: 'Verified Donor',
    desc: 'Artisan bakery committed to zero food waste in the community.',
    contactName: 'Elena Rodriguez',
    email: 'hello@downtownbakery.com',
    phone: '+91 98765 12345',
    address: '142 Main St, Heritage District',
    city: 'Jaipur',
    hours: '06:00 AM - 09:00 PM'
  });
  const [editForm, setEditForm] = useState(profile);

  const [notifications, setNotifications] = useState({
    collabRequests: true,
    donationUpdates: true,
    pickupNotifs: true,
    confirmations: true,
    urgentAlerts: true
  });

  // Mock Data
  const donationsList = [
    { id: 'DON-01', food: 'Vegetable Biryani', qty: '50 meals', prepared: '7:00 PM', deadline: '8:30 PM', status: 'Awaiting Pickup', ngo: 'XYZ Foundation' },
    { id: 'DON-02', food: '30 Meal Packets', qty: '30 meals', prepared: '1:00 PM', deadline: '3:00 PM', status: 'Completed', ngo: 'ABC Welfare' },
    { id: 'DON-03', food: 'Fresh Produce Assortment', qty: '15 kg', prepared: 'N/A', deadline: '9:00 PM', status: 'Matching', ngo: 'Pending' }
  ];

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'create', label: 'Create Donation', icon: PlusCircle },
    { id: 'donations', label: 'My Donations', icon: ListIcon },
    { id: 'collaborations', label: 'NGO Collaborations', icon: Users },
    { id: 'containers', label: 'Container Management', icon: PackageOpen },
    { id: 'impact', label: 'Rescue History & Impact', icon: BarChart3 },
    { id: 'ratings', label: 'Ratings & Feedback', icon: Star },
    { id: 'profile', label: 'Restaurant Profile', icon: UserIcon },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // ---------------------------------------------------------
  // SUB-VIEWS
  // ---------------------------------------------------------

  const renderDashboard = () => (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 md:pb-6">
      <section className="bg-forest rounded-3xl p-8 text-paper shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-sage-light font-bold tracking-wider text-sm mb-2 uppercase">Good Evening,</p>
          <h2 className="text-4xl font-display font-bold tracking-tight mb-2">{profile.name}</h2>
          <p className="text-lg text-sage italic font-display">Good food deserves a second destination.</p>
        </div>
        <Leaf className="absolute -bottom-10 -right-10 w-64 h-64 text-forest-deep opacity-50 -rotate-12" />
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Partners', value: '4', color: 'text-forest' },
          { label: 'Meals Rescued', value: '1,240', color: 'text-forest' },
          { label: 'Successful Collections', value: '86', color: 'text-forest' },
          { label: 'Active Donations', value: '3', color: 'text-terracotta-deep' }
        ].map((stat, i) => (
          <div key={i} className="bg-paper p-6 rounded-2xl border border-line shadow-sm text-center">
            <p className="text-[10px] md:text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">{stat.label}</p>
            <p className={`text-3xl md:text-4xl font-display font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </section>

      <section>
        <button onClick={() => setActiveTab('create')} className="w-full md:w-auto px-8 py-4 bg-terracotta-deep hover:bg-forest text-paper rounded-2xl font-bold font-display tracking-wide uppercase shadow-sm transition-colors flex items-center justify-center gap-3 text-lg">
          <PlusCircle className="w-6 h-6" /> List Surplus Food
        </button>
      </section>
    </div>
  );

  const renderCreateDonation = () => (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 md:pb-6">
      <div className="border-b border-line pb-4">
        <h2 className="text-2xl font-display font-bold text-forest uppercase">Create Food Donation</h2>
        <p className="text-sm text-ink-muted mt-1">Publish surplus food to eligible nearby partner NGOs.</p>
      </div>
      <form className="space-y-8 bg-paper p-8 rounded-2xl border border-line shadow-sm">
        <div className="space-y-4">
          <h3 className="font-bold text-charcoal border-b border-line pb-2 uppercase text-sm tracking-wider">A. Food Information</h3>
          <div>
            <label className="block text-sm font-bold text-ink-muted mb-1">Food Name</label>
            <input type="text" placeholder="e.g., 50 Assorted Sandwiches" className="w-full p-3 bg-ivory border border-line rounded-xl focus:ring-2 focus:ring-forest outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-ink-muted mb-1">Category</label>
              <select className="w-full p-3 bg-ivory border border-line rounded-xl focus:ring-2 focus:ring-forest outline-none"><option>Vegetarian</option><option>Non-Vegetarian</option><option>Vegan</option><option>Baked Goods</option></select>
            </div>
            <div>
              <label className="block text-sm font-bold text-ink-muted mb-1">Quantity</label>
              <input type="text" placeholder="e.g., 50 portions" className="w-full p-3 bg-ivory border border-line rounded-xl focus:ring-2 focus:ring-forest outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-ink-muted mb-1">Additional Notes</label>
            <textarea rows="2" placeholder="Allergens, special handling..." className="w-full p-3 bg-ivory border border-line rounded-xl focus:ring-2 focus:ring-forest outline-none resize-none"></textarea>
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="font-bold text-charcoal border-b border-line pb-2 uppercase text-sm tracking-wider">B. Preparation & Timing</h3>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm font-bold text-ink-muted mb-1">Prepared At</label><input type="time" className="w-full p-3 bg-ivory border border-line rounded-xl outline-none" /></div>
            <div><label className="block text-sm font-bold text-ink-muted mb-1">Pickup Deadline</label><input type="time" className="w-full p-3 bg-ivory border border-line rounded-xl outline-none" /></div>
            <div><label className="block text-sm font-bold text-ink-muted mb-1">Safe Until</label><input type="time" className="w-full p-3 bg-ivory border border-line rounded-xl outline-none" /></div>
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="font-bold text-charcoal border-b border-line pb-2 uppercase text-sm tracking-wider">C. Safety & Packaging</h3>
          <label className="flex items-start gap-3 p-4 bg-sage-light/30 border border-sage-light rounded-xl cursor-pointer">
            <input type="checkbox" className="mt-1 w-4 h-4 accent-forest" />
            <span className="text-sm text-charcoal"><strong>Safety Declaration:</strong> I confirm this food is suitable for donation, has been handled appropriately, and has not been served to customers.</span>
          </label>
        </div>
        <button type="button" onClick={() => setActiveTab('donations')} className="w-full py-4 bg-forest hover:bg-forest-deep text-paper font-display font-bold uppercase tracking-wider rounded-xl shadow-sm transition-colors">
          Publish Donation
        </button>
      </form>
    </div>
  );

  const renderMyDonations = () => (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-6">
      <div className="border-b border-line pb-4">
        <h2 className="text-2xl font-display font-bold text-forest uppercase">My Donations</h2>
        <p className="text-sm text-ink-muted mt-1">Manage and track your food donations.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {['All', 'Matching', 'Reserved', 'Awaiting Pickup', 'Picked Up', 'Completed'].map(tab => (
          <button 
            key={tab} onClick={() => setDonationTab(tab)}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${donationTab === tab ? 'bg-forest text-paper shadow-sm' : 'bg-ivory border border-line text-ink-muted hover:text-charcoal'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {donationsList.filter(d => donationTab === 'All' || d.status.includes(donationTab)).map((don, i) => (
          <div key={i} className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h4 className="font-display font-bold text-lg text-charcoal uppercase">Food: {don.food}</h4>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                  ${don.status === 'Completed' ? 'bg-st-fresh-bg text-st-fresh-fg' : 
                    don.status === 'Awaiting Pickup' ? 'bg-st-soon-bg text-st-soon-fg' : 
                    'bg-ivory border border-line text-ink-muted'}`}
                >
                  Status: {don.status}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                <div><p className="text-ink-muted text-xs font-bold">Quantity</p><p className="font-medium text-charcoal">{don.qty}</p></div>
                <div><p className="text-ink-muted text-xs font-bold">Prepared</p><p className="font-medium text-charcoal">{don.prepared}</p></div>
                <div><p className="text-ink-muted text-xs font-bold">Deadline</p><p className="font-medium text-charcoal flex items-center gap-1"><Clock className="w-3 h-3 text-terracotta-deep" /> {don.deadline}</p></div>
                <div><p className="text-ink-muted text-xs font-bold">Assigned NGO</p><p className="font-medium text-forest">{don.ngo}</p></div>
              </div>
            </div>
            <div className="bg-ivory px-6 py-3 border-t border-line">
              <button className="text-sm font-bold text-forest hover:text-forest-deep flex items-center gap-2">View Details <ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCollaborations = () => (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-6">
      <div className="border-b border-line pb-4">
        <h2 className="text-2xl font-display font-bold text-forest uppercase">NGO Collaborations</h2>
        <p className="text-sm text-ink-muted mt-1">Manage your food-rescue partnerships.</p>
      </div>

      <div className="flex bg-line/30 p-1 rounded-xl mb-6 max-w-sm">
        {['Active', 'Incoming Requests'].map(tab => (
          <button key={tab} onClick={() => setCollabTab(tab)} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${collabTab === tab ? 'bg-paper shadow-sm text-forest' : 'text-ink-muted hover:text-charcoal'}`}>
            {tab}
          </button>
        ))}
      </div>

      {collabTab === 'Active' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm">
            <h4 className="font-display font-bold text-lg text-charcoal mb-1 uppercase">XYZ Foundation</h4>
            <p className="text-sm text-ink-muted flex items-center gap-1 mb-4"><MapPin className="w-3 h-3" /> Jaipur</p>
            <div className="space-y-2 text-sm mb-6">
              <p className="flex justify-between"><span className="text-ink-muted font-bold">Status</span><span className="font-bold text-st-fresh-fg px-2 py-0.5 bg-st-fresh-bg rounded">ACTIVE</span></p>
              <p className="flex justify-between"><span className="text-ink-muted font-bold">Collection</span><span className="font-medium text-charcoal">Daily</span></p>
            </div>
            <div className="flex gap-3">
              <button className="flex-1 py-2 bg-ivory text-forest font-bold text-sm border border-line rounded-lg">View Details</button>
              <button className="flex-1 py-2 bg-st-error-bg/30 text-st-error-fg font-bold text-sm border border-st-error-bg/50 rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm">
            <h4 className="font-display font-bold text-lg text-charcoal mb-1 uppercase">ABC Welfare Foundation</h4>
            <span className="inline-block bg-st-soon-bg text-st-soon-fg text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider mb-4">New Request</span>
            <div className="space-y-2 text-sm mb-6">
              <p><span className="text-ink-muted font-bold">Proposed Frequency:</span> Weekly</p>
              <p><span className="text-ink-muted font-bold">Message:</span> "We'd love to partner to rescue your weekend bakery surplus."</p>
            </div>
            <div className="flex gap-3">
              <button className="flex-1 py-2 bg-ivory text-charcoal font-bold text-sm border border-line rounded-lg">View</button>
              <button className="flex-1 py-2 bg-forest text-paper font-bold text-sm rounded-lg">Accept</button>
              <button className="flex-1 py-2 bg-ivory text-st-error-fg font-bold text-sm border border-line rounded-lg">Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderContainers = () => (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-6">
      <div className="border-b border-line pb-4">
        <h2 className="text-2xl font-display font-bold text-forest uppercase">Container Management</h2>
        <p className="text-sm text-ink-muted mt-1">Monitor partner NGO container inventory stored at your location.</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm text-center">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-1">Total</p>
          <p className="text-3xl font-display font-bold text-forest">100</p>
        </div>
        <div className="bg-st-fresh-bg p-6 rounded-2xl border border-st-fresh-fg/20 shadow-sm text-center">
          <p className="text-xs font-bold text-st-fresh-fg uppercase tracking-wider mb-1">Available</p>
          <p className="text-3xl font-display font-bold text-forest">60</p>
        </div>
        <div className="bg-st-soon-bg p-6 rounded-2xl border border-st-soon-fg/20 shadow-sm text-center">
          <p className="text-xs font-bold text-st-soon-fg uppercase tracking-wider mb-1">In Circulation</p>
          <p className="text-3xl font-display font-bold text-terracotta-deep">40</p>
        </div>
      </div>

      <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-line bg-ivory"><h4 className="font-bold text-charcoal uppercase tracking-wider text-xs">Partner Container Inventory</h4></div>
        <div className="p-6">
          <h4 className="font-display font-bold text-lg text-charcoal mb-4 uppercase">XYZ Foundation</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6">
            <div><p className="text-ink-muted text-xs font-bold">Assigned</p><p className="font-medium text-charcoal">50</p></div>
            <div><p className="text-ink-muted text-xs font-bold">Clean/Available</p><p className="font-medium text-forest">30</p></div>
            <div><p className="text-ink-muted text-xs font-bold">In Circulation</p><p className="font-medium text-terracotta-deep">20</p></div>
            <div><p className="text-ink-muted text-xs font-bold">Return Schedule</p><p className="font-medium text-charcoal">31 October</p></div>
          </div>
          <button className="py-2 px-4 bg-ivory text-forest font-bold text-sm border border-line rounded-lg hover:bg-sage-light">View Details</button>
        </div>
      </div>
    </div>
  );

  const renderImpact = () => (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-6">
      <div className="border-b border-line pb-4">
        <h2 className="text-2xl font-display font-bold text-forest uppercase">Rescue History & Impact</h2>
        <p className="text-sm text-ink-muted mt-1">Track your contribution to food rescue.</p>
      </div>

      <div className="flex bg-line/30 p-1 rounded-xl mb-6 max-w-xs">
        {['History', 'Dashboard'].map(tab => (
          <button key={tab} onClick={() => setImpactTab(tab)} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${impactTab === tab ? 'bg-paper shadow-sm text-forest' : 'text-ink-muted hover:text-charcoal'}`}>
            {tab}
          </button>
        ))}
      </div>

      {impactTab === 'History' ? (
        <div className="space-y-4">
          <h3 className="font-bold text-charcoal uppercase text-xs tracking-wider">Recent Completed Donations</h3>
          <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden divide-y divide-line">
            {[1,2,3].map(i => (
              <div key={i} className="p-5 flex justify-between items-center hover:bg-ivory transition-colors">
                <div>
                  <h4 className="font-bold text-charcoal">Vegetable Biryani ({50 * i} meals)</h4>
                  <p className="text-xs text-ink-muted mt-1">Oct {30 - i} • NGO: Hope Foundation</p>
                </div>
                <span className="flex items-center gap-1 text-st-fresh-fg text-xs font-bold bg-st-fresh-bg px-2 py-1 rounded-full"><CheckCircle2 className="w-3 h-3" /> Completed</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-forest p-8 rounded-3xl text-paper space-y-6">
            <h3 className="font-display font-bold text-sage-light text-lg">Overall Impact</h3>
            <div><p className="text-sm font-bold text-sage mb-1 uppercase">Meals Rescued</p><p className="text-5xl font-display font-bold">1,240</p></div>
            <div><p className="text-sm font-bold text-sage mb-1 uppercase">Food Collected (kg)</p><p className="text-3xl font-display font-bold">620</p></div>
            <div><p className="text-sm font-bold text-sage mb-1 uppercase">Successful Rescues</p><p className="text-3xl font-display font-bold">86</p></div>
          </div>
          <div className="bg-paper p-6 rounded-3xl border border-line shadow-sm flex flex-col justify-center">
            <h3 className="font-display font-bold text-charcoal text-lg mb-4">Estimated Environmental Impact</h3>
            <div className="bg-sage-light p-6 rounded-2xl text-center">
              <Leaf className="w-8 h-8 text-forest mx-auto mb-2" />
              <p className="text-sm font-bold text-forest uppercase mb-1">CO₂e Avoided</p>
              <p className="text-4xl font-display font-bold text-forest">1,550 kg</p>
              <p className="text-[10px] text-forest/70 mt-2">*Estimates based on standard food waste emissions.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderRatings = () => (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-6">
      <div className="border-b border-line pb-4">
        <h2 className="text-2xl font-display font-bold text-forest uppercase">Ratings & Feedback</h2>
        <p className="text-sm text-ink-muted mt-1">Understand your donation performance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-forest p-8 rounded-3xl text-paper text-center flex flex-col items-center justify-center">
          <p className="text-xs font-bold text-sage-light uppercase tracking-wider mb-2">Donor Reliability</p>
          <p className="text-6xl font-display font-bold mb-2">96<span className="text-2xl text-sage">/100</span></p>
          <span className="px-3 py-1 bg-sage/30 text-paper text-[10px] font-bold uppercase rounded-full flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Verified Donor</span>
        </div>
        <div className="md:col-span-2 bg-paper p-6 rounded-3xl border border-line shadow-sm">
          <h4 className="font-bold text-charcoal uppercase tracking-wider text-xs border-b border-line pb-2 mb-4">Performance Indicators</h4>
          <div className="space-y-4">
            {[
              { label: 'Listing Accuracy', val: '98%' },
              { label: 'Food Readiness at Pickup', val: '95%' },
              { label: 'Successful Handovers', val: '99%' },
              { label: 'Cancellation Rate', val: '2%' }
            ].map((ind, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-sm text-charcoal font-bold">{ind.label}</span>
                <span className="text-sm font-display font-bold text-forest">{ind.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden mt-6">
        <div className="p-6 border-b border-line bg-ivory"><h4 className="font-bold text-charcoal uppercase tracking-wider text-xs">NGO Feedback</h4></div>
        <div className="p-6 space-y-4">
          <div className="border-b border-line pb-4 last:border-0 last:pb-0">
            <div className="flex justify-between items-start mb-2">
              <h5 className="font-bold text-charcoal uppercase">XYZ Foundation</h5>
              <div className="flex text-gold"><Star className="w-4 h-4 fill-current"/><Star className="w-4 h-4 fill-current"/><Star className="w-4 h-4 fill-current"/><Star className="w-4 h-4 fill-current"/><Star className="w-4 h-4 fill-current"/></div>
            </div>
            <p className="text-sm text-ink-muted italic">"Food is always packed perfectly in the containers and ready right on time. Great partner!"</p>
            <p className="text-[10px] text-ink-muted font-bold mt-2 uppercase">Oct 28 • Vegetable Biryani</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderProfile = () => {
    if (isEditingProfile) {
      return (
        <form onSubmit={(e) => { e.preventDefault(); setProfile(editForm); setIsEditingProfile(false); }} className="max-w-3xl mx-auto space-y-6 pb-20 md:pb-6">
          <div className="flex justify-between items-center border-b border-line pb-4">
            <h2 className="text-2xl font-display font-bold text-forest uppercase">Edit Profile</h2>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setEditForm(profile); setIsEditingProfile(false); }} className="px-4 py-2 bg-ivory text-charcoal border border-line rounded-xl font-bold text-sm flex items-center gap-2"><X className="w-4 h-4" /> Cancel</button>
              <button type="submit" className="px-4 py-2 bg-forest text-paper rounded-xl font-bold text-sm flex items-center gap-2"><Save className="w-4 h-4" /> Save</button>
            </div>
          </div>
          <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm space-y-4">
            <h3 className="font-bold text-charcoal uppercase text-xs tracking-wider border-b border-line pb-2">Business Information</h3>
            <div><label className="block text-xs font-bold text-ink-muted mb-1">Restaurant Name</label><input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full p-2.5 bg-ivory border border-line rounded-lg text-sm outline-none focus:border-forest" /></div>
            <div><label className="block text-xs font-bold text-ink-muted mb-1">Description</label><textarea rows="3" value={editForm.desc} onChange={e => setEditForm({...editForm, desc: e.target.value})} className="w-full p-2.5 bg-ivory border border-line rounded-lg text-sm outline-none focus:border-forest resize-none"></textarea></div>
          </div>
          <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm space-y-4">
            <h3 className="font-bold text-charcoal uppercase text-xs tracking-wider border-b border-line pb-2">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-bold text-ink-muted mb-1">Contact Person</label><input type="text" value={editForm.contactName} onChange={e => setEditForm({...editForm, contactName: e.target.value})} className="w-full p-2.5 bg-ivory border border-line rounded-lg text-sm outline-none focus:border-forest" /></div>
              <div><label className="block text-xs font-bold text-ink-muted mb-1">Phone</label><input type="tel" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full p-2.5 bg-ivory border border-line rounded-lg text-sm outline-none focus:border-forest" /></div>
            </div>
          </div>
          <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm space-y-4">
            <h3 className="font-bold text-charcoal uppercase text-xs tracking-wider border-b border-line pb-2">Location & Operations</h3>
            <div><label className="block text-xs font-bold text-ink-muted mb-1">Full Address</label><input type="text" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} className="w-full p-2.5 bg-ivory border border-line rounded-lg text-sm outline-none focus:border-forest" /></div>
            <div><label className="block text-xs font-bold text-ink-muted mb-1">Operating Hours</label><input type="text" value={editForm.hours} onChange={e => setEditForm({...editForm, hours: e.target.value})} className="w-full p-2.5 bg-ivory border border-line rounded-lg text-sm outline-none focus:border-forest" /></div>
          </div>
        </form>
      );
    }
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-20 md:pb-6">
        <div className="flex justify-between items-end border-b border-line pb-4">
          <div><h2 className="text-2xl font-display font-bold text-forest uppercase">Restaurant Profile</h2></div>
          <button onClick={() => { setEditForm(profile); setIsEditingProfile(true); }} className="px-4 py-2 bg-sage-light text-forest rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-sage transition-colors"><Edit3 className="w-4 h-4" /> Edit</button>
        </div>
        <div className="bg-paper p-8 rounded-2xl border border-line shadow-sm flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-forest text-paper flex items-center justify-center font-display font-bold text-2xl shrink-0">DB</div>
          <div>
            <div className="flex items-center gap-3 mb-1"><h3 className="text-2xl font-display font-bold text-charcoal uppercase">{profile.name}</h3><span className="px-2 py-1 bg-st-fresh-bg text-st-fresh-fg text-[10px] font-bold uppercase rounded-md flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> {profile.status}</span></div>
            <p className="text-sm font-bold text-forest mb-2">{profile.type}</p>
            <p className="text-sm text-ink-muted">{profile.desc}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm space-y-4">
            <h4 className="font-bold text-charcoal uppercase tracking-wider text-xs border-b border-line pb-2">Contact Information</h4>
            <div className="space-y-3 text-sm">
              <div><p className="text-ink-muted text-xs">Contact Person</p><p className="font-bold text-charcoal">{profile.contactName}</p></div>
              <div><p className="text-ink-muted text-xs">Email Address</p><p className="font-bold text-charcoal">{profile.email}</p></div>
              <div><p className="text-ink-muted text-xs">Phone Number</p><p className="font-bold text-charcoal">{profile.phone}</p></div>
            </div>
          </div>
          <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm space-y-4">
            <h4 className="font-bold text-charcoal uppercase tracking-wider text-xs border-b border-line pb-2">Location & Operations</h4>
            <div className="space-y-3 text-sm">
              <div><p className="text-ink-muted text-xs">Address</p><p className="font-bold text-charcoal">{profile.address}</p></div>
              <div><p className="text-ink-muted text-xs">City</p><p className="font-bold text-charcoal">{profile.city}</p></div>
              <div><p className="text-ink-muted text-xs">Operating Hours</p><p className="font-bold text-charcoal">{profile.hours}</p></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    const toggleNotif = (key) => setNotifications(prev => ({...prev, [key]: !prev[key]}));
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-20 md:pb-6">
        <div className="border-b border-line pb-4"><h2 className="text-2xl font-display font-bold text-forest uppercase">Settings</h2></div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm space-y-4">
              <div className="flex items-center gap-2 font-bold text-charcoal uppercase tracking-wider text-xs border-b border-line pb-2"><Globe className="w-4 h-4 text-forest" /> Account Preferences</div>
              <div className="flex justify-between items-center text-sm font-bold text-charcoal">Language<select className="bg-ivory border border-line rounded-lg px-3 py-1.5 outline-none"><option>English</option></select></div>
            </div>
            <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm space-y-4">
              <div className="flex items-center gap-2 font-bold text-charcoal uppercase tracking-wider text-xs border-b border-line pb-2"><Shield className="w-4 h-4 text-forest" /> Security</div>
              <button className="w-full text-left flex justify-between items-center py-2 text-sm font-bold text-charcoal hover:text-forest transition-colors">Change Password <ChevronRight className="w-4 h-4 text-ink-muted" /></button>
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm space-y-4">
              <div className="flex items-center gap-2 font-bold text-charcoal uppercase tracking-wider text-xs border-b border-line pb-2"><Bell className="w-4 h-4 text-forest" /> Notification Preferences</div>
              {[
                { key: 'collabRequests', label: 'NGO Collaboration Requests' },
                { key: 'donationUpdates', label: 'Donation Updates' },
                { key: 'pickupNotifs', label: 'Pickup Notifications' },
                { key: 'confirmations', label: 'Collection Confirmations' },
                { key: 'urgentAlerts', label: 'Urgent Deadline Alerts' }
              ].map(item => (
                <div key={item.key} className="flex justify-between items-center py-1">
                  <span className="text-sm text-charcoal font-bold">{item.label}</span>
                  <button onClick={() => toggleNotif(item.key)} className={`w-11 h-6 rounded-full transition-colors relative ${notifications[item.key] ? 'bg-forest' : 'bg-line'}`}>
                    <div className={`w-4 h-4 rounded-full bg-paper absolute top-1 transition-transform ${notifications[item.key] ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              ))}
            </div>
            <div className="bg-st-error-bg/30 p-6 rounded-2xl border border-st-error-bg shadow-sm space-y-4">
              <div className="flex items-center gap-2 font-bold text-st-error-fg uppercase tracking-wider text-xs border-b border-st-error-bg/50 pb-2">Account Management</div>
              <button onClick={() => window.location.href = '/'} className="w-full flex items-center gap-2 text-sm font-bold text-charcoal hover:text-st-error-fg transition-colors py-1"><LogOut className="w-4 h-4" /> Log Out</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------
  // MAIN RENDER (Mobile-First Layout)
  // ---------------------------------------------------------
  return (
    <div className="h-screen bg-ivory flex flex-col md:flex-row text-charcoal font-body overflow-hidden">
      
      {/* Mobile Header */}
      <header className="md:hidden bg-paper border-b border-line px-4 py-3 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 -ml-2 text-forest"><Menu className="w-6 h-6" /></button>
          <Leaf className="w-6 h-6 text-forest" />
          <h1 className="text-lg font-display font-bold text-forest tracking-tight">ZeroWaste</h1>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-paper border-r border-line transform transition-transform duration-300 ease-in-out flex flex-col md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 hidden md:flex items-center gap-3 border-b border-line shrink-0">
          <Leaf className="w-8 h-8 text-forest" />
          <h1 className="text-xl font-display font-bold text-forest tracking-tight">ZeroWaste</h1>
        </div>
        <div className="md:hidden p-4 flex justify-end border-b border-line shrink-0">
          <button onClick={() => setIsMobileMenuOpen(false)} className="text-ink-muted p-2"><XCircle className="w-6 h-6" /></button>
        </div>
        <div className="px-6 py-4 text-[10px] font-bold text-ink-muted uppercase tracking-wider shrink-0">Food Provider Portal</div>
        
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto pb-6">
          {sidebarItems.map((item) => (
            <button 
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-bold text-sm ${activeTab === item.id ? 'bg-sage-light text-forest shadow-sm' : 'text-ink-muted hover:bg-ivory hover:text-forest'}`}
            >
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-forest' : 'text-ink-muted shrink-0'}`} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-ivory p-4 md:p-10 relative">
        <div className="hidden md:flex justify-end items-center mb-8 gap-6">
          <button className="relative p-2 text-ink-muted hover:text-forest transition-colors">
            <Bell className="w-6 h-6" />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-terracotta-deep rounded-full border-2 border-ivory"></span>
          </button>
          <div className="flex items-center gap-3 pl-6 border-l border-line cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setActiveTab('profile')}>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-forest leading-tight">{profile.name}</p>
              <p className="text-[10px] uppercase tracking-wider text-ink-muted font-bold">{profile.type}</p>
            </div>
            <div className="w-10 h-10 bg-forest text-paper rounded-full flex items-center justify-center font-display font-bold">DB</div>
          </div>
        </div>

        {/* Tab Routing */}
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'create' && renderCreateDonation()}
        {activeTab === 'donations' && renderMyDonations()}
        {activeTab === 'collaborations' && renderCollaborations()}
        {activeTab === 'containers' && renderContainers()}
        {activeTab === 'impact' && renderImpact()}
        {activeTab === 'ratings' && renderRatings()}
        {activeTab === 'profile' && renderProfile()}
        {activeTab === 'settings' && renderSettings()}
      </main>
      
      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-paper border-t border-line pb-safe flex justify-around p-3 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
          { id: 'create', icon: PlusCircle, label: 'Donate' },
          { id: 'donations', icon: ListIcon, label: 'Manage' },
        ].map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center gap-1 p-2 min-w-[64px] ${activeTab === item.id ? 'text-forest' : 'text-ink-muted'}`}>
            <item.icon className="w-6 h-6" />
            <span className="text-[10px] font-bold">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}