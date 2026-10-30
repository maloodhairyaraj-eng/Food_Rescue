"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Leaf, Store, HeartHandshake, Truck, ArrowRight, ArrowLeft, Upload } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  
  // 'login' | 'role-select' | 'signup-common' | 'signup-specific'
  const [view, setView] = useState('login'); 
  const [role, setRole] = useState(null); // 'donor' | 'ngo' | 'volunteer'
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    email: '', password: '', name: '', phone: '', confirmPassword: ''
  });

  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Mock authentication and routing based on role
    setTimeout(() => {
      if (formData.email.includes('ngo')) router.push('/ngo');
      else if (formData.email.includes('donor') || formData.email.includes('rest')) router.push('/restaurant');
      else router.push('/volunteer');
    }, 800);
  };

  const handleSignupComplete = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      if (role === 'ngo') router.push('/ngo');
      else if (role === 'donor') router.push('/restaurant');
      else router.push('/volunteer');
    }, 1200);
  };

  const renderToggle = () => (
    <div className="bg-line/30 p-1 rounded-xl flex mb-8">
      <button 
        type="button"
        onClick={() => setView('login')}
        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${view === 'login' ? 'bg-paper shadow-sm text-forest' : 'text-ink-muted hover:text-charcoal'}`}
      >
        Sign In
      </button>
      <button 
        type="button"
        onClick={() => { setView('role-select'); setRole(null); }}
        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${view !== 'login' ? 'bg-paper shadow-sm text-forest' : 'text-ink-muted hover:text-charcoal'}`}
      >
        Sign up
      </button>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-ivory font-body">
      
      {/* LEFT SIDE: Brand Introduction (Split Screen Design) */}
      <div className="hidden lg:flex w-1/2 bg-forest text-paper flex-col justify-center p-16 relative overflow-hidden">
        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <Leaf className="w-10 h-10 text-sage" />
            <h1 className="text-3xl font-display font-bold tracking-tight text-paper">ZeroWaste</h1>
          </div>
          <h2 className="text-5xl font-display font-bold leading-tight mb-6">
            Good food deserves a second destination.
          </h2>
          <p className="text-lg text-sage-light mb-8">
            Connect directly with local food providers, NGOs, and volunteers to rescue surplus food. Reduce waste, create impact, and feed communities.
          </p>
          <div className="flex items-center gap-4 text-sm font-bold text-gold uppercase tracking-wider">
            <span>Rescue Food</span> ✱ <span>Reduce Waste</span> ✱ <span>Create Impact</span>
          </div>
        </div>
        
        {/* Decorative Background Elements */}
        <Leaf className="absolute -bottom-24 -right-24 w-96 h-96 text-forest-deep opacity-40 -rotate-12" />
        <div className="absolute top-1/4 -right-12 w-64 h-64 bg-sage rounded-full mix-blend-overlay blur-3xl opacity-20"></div>
      </div>

      {/* RIGHT SIDE: Authentication Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="w-full max-w-md bg-paper p-8 sm:p-10 rounded-3xl shadow-xl border border-line relative z-10">
          
          {/* Logo for mobile only */}
          <div className="flex lg:hidden items-center justify-center gap-2 mb-8">
            <Leaf className="w-8 h-8 text-forest" />
            <h1 className="text-2xl font-display font-bold text-forest">ZeroWaste</h1>
          </div>

          {/* LOGIN VIEW (Matches reference image perfectly) */}
          {view === 'login' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {renderToggle()}
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-charcoal mb-1.5">Email Address</label>
                  <input 
                    type="email" required
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 bg-paper border border-line rounded-xl focus:ring-2 focus:ring-forest outline-none transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-charcoal mb-1.5">Password</label>
                  <input 
                    type="password" required
                    value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full px-4 py-3 bg-paper border border-line rounded-xl focus:ring-2 focus:ring-forest outline-none transition-shadow"
                  />
                  <div className="flex justify-between items-center mt-2">
                    <label className="flex items-center gap-2 text-xs text-ink-muted cursor-pointer">
                      <input type="checkbox" className="accent-forest" /> Remember Me
                    </label>
                    <a href="#" className="text-xs font-bold text-forest hover:text-forest-deep">Forgot Password?</a>
                  </div>
                </div>
                
                <button type="submit" disabled={isLoading} className="w-full py-3.5 mt-4 bg-forest hover:bg-forest-deep text-paper font-bold rounded-xl transition-all shadow-sm flex items-center justify-center">
                  {isLoading ? <div className="w-5 h-5 border-2 border-paper border-t-transparent rounded-full animate-spin"></div> : 'Login'}
                </button>

                <p className="text-center text-sm text-ink-muted mt-6">
                  Don't Have Account? <button type="button" onClick={() => setView('role-select')} className="font-bold text-forest hover:underline">Signup</button>
                </p>
              </form>
            </div>
          )}

          {/* SIGNUP: STEP 1 - ROLE SELECTION */}
          {view === 'role-select' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              {renderToggle()}
              <h3 className="text-xl font-display font-bold text-forest mb-4">Select your role</h3>
              <div className="space-y-3">
                {[
                  { id: 'donor', title: 'Food Provider / Donor', desc: 'Restaurants, hotels, and caterers.', icon: Store },
                  { id: 'ngo', title: 'NGO / Charity', desc: 'Organizations that collect and distribute.', icon: HeartHandshake },
                  { id: 'volunteer', title: 'Volunteer', desc: 'Individuals delivering food.', icon: Truck },
                ].map(r => (
                  <button 
                    key={r.id}
                    onClick={() => { setRole(r.id); setView('signup-common'); }}
                    className="w-full flex items-center gap-4 p-4 border border-line rounded-xl hover:border-forest hover:bg-sage-light/30 transition-all text-left group"
                  >
                    <div className="w-12 h-12 rounded-full bg-sage-light text-forest flex items-center justify-center group-hover:bg-forest group-hover:text-paper transition-colors shrink-0">
                      <r.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-charcoal">{r.title}</h4>
                      <p className="text-xs text-ink-muted">{r.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SIGNUP: STEP 2 - COMMON DETAILS */}
          {view === 'signup-common' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <button onClick={() => setView('role-select')} className="flex items-center gap-1 text-xs font-bold text-ink-muted hover:text-forest mb-6">
                <ArrowLeft className="w-3 h-3" /> Back to roles
              </button>
              
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-display font-bold text-forest">Account Details</h3>
                <span className="text-xs font-bold bg-sage-light text-forest px-2 py-1 rounded-md uppercase">Step 1/2</span>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); setView('signup-specific'); }} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-charcoal mb-1.5">Full Name / Contact Person</label>
                  <input required type="text" className="w-full px-4 py-2.5 bg-ivory border border-line rounded-xl focus:ring-2 focus:ring-forest outline-none text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-charcoal mb-1.5">Email Address</label>
                    <input required type="email" className="w-full px-4 py-2.5 bg-ivory border border-line rounded-xl focus:ring-2 focus:ring-forest outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-charcoal mb-1.5">Phone Number</label>
                    <input required type="tel" className="w-full px-4 py-2.5 bg-ivory border border-line rounded-xl focus:ring-2 focus:ring-forest outline-none text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-charcoal mb-1.5">Password</label>
                    <input required type="password" className="w-full px-4 py-2.5 bg-ivory border border-line rounded-xl focus:ring-2 focus:ring-forest outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-charcoal mb-1.5">Confirm</label>
                    <input required type="password" className="w-full px-4 py-2.5 bg-ivory border border-line rounded-xl focus:ring-2 focus:ring-forest outline-none text-sm" />
                  </div>
                </div>
                
                <button type="submit" className="w-full py-3.5 mt-6 bg-forest hover:bg-forest-deep text-paper font-bold rounded-xl transition-all flex justify-center items-center gap-2">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* SIGNUP: STEP 3 - SPECIFIC DETAILS */}
          {view === 'signup-specific' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <button onClick={() => setView('signup-common')} className="flex items-center gap-1 text-xs font-bold text-ink-muted hover:text-forest mb-6">
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
              
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-display font-bold text-forest capitalize">
                  {role === 'donor' ? 'Provider' : role === 'ngo' ? 'NGO' : 'Volunteer'} Profile
                </h3>
                <span className="text-xs font-bold bg-sage-light text-forest px-2 py-1 rounded-md uppercase">Step 2/2</span>
              </div>

              <form onSubmit={handleSignupComplete} className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                
                {/* DONOR SPECIFIC */}
                {role === 'donor' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-charcoal mb-1.5">Business Name</label>
                      <input required type="text" className="w-full px-4 py-2.5 bg-ivory border border-line rounded-xl focus:ring-2 focus:ring-forest outline-none text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-charcoal mb-1.5">Business Category</label>
                      <select className="w-full px-4 py-2.5 bg-ivory border border-line rounded-xl focus:ring-2 focus:ring-forest outline-none text-sm">
                        <option>Restaurant</option><option>Hotel</option><option>Caterer</option><option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-charcoal mb-1.5">FSSAI / Registration Number</label>
                      <input required type="text" className="w-full px-4 py-2.5 bg-ivory border border-line rounded-xl focus:ring-2 focus:ring-forest outline-none text-sm" />
                    </div>
                  </>
                )}

                {/* NGO SPECIFIC */}
                {role === 'ngo' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-charcoal mb-1.5">Official NGO Name</label>
                      <input required type="text" className="w-full px-4 py-2.5 bg-ivory border border-line rounded-xl focus:ring-2 focus:ring-forest outline-none text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-charcoal mb-1.5">Registration Number</label>
                      <input required type="text" className="w-full px-4 py-2.5 bg-ivory border border-line rounded-xl focus:ring-2 focus:ring-forest outline-none text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-charcoal mb-1.5">Upload Verification Doc</label>
                      <div className="w-full px-4 py-3 bg-ivory border border-line border-dashed rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-sage-light/30 transition-colors">
                        <Upload className="w-4 h-4 text-ink-muted" /> <span className="text-xs text-ink-muted font-bold">Select File</span>
                      </div>
                    </div>
                  </>
                )}

                {/* VOLUNTEER SPECIFIC */}
                {role === 'volunteer' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-charcoal mb-1.5">Transportation Mode</label>
                      <select className="w-full px-4 py-2.5 bg-ivory border border-line rounded-xl focus:ring-2 focus:ring-forest outline-none text-sm">
                        <option>Two-Wheeler</option><option>Bicycle</option><option>Car</option><option>Walking</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-charcoal mb-1.5">Primary Locality / Area</label>
                      <input required type="text" className="w-full px-4 py-2.5 bg-ivory border border-line rounded-xl focus:ring-2 focus:ring-forest outline-none text-sm" />
                    </div>
                  </>
                )}

                {/* COMMON LOCATION FOR ALL */}
                <div>
                  <label className="block text-xs font-bold text-charcoal mb-1.5">Full Address</label>
                  <textarea rows="2" className="w-full px-4 py-2.5 bg-ivory border border-line rounded-xl focus:ring-2 focus:ring-forest outline-none text-sm resize-none"></textarea>
                </div>

                <div className="pt-2">
                  <label className="flex items-start gap-2 text-xs text-ink-muted cursor-pointer">
                    <input type="checkbox" required className="mt-0.5 accent-forest" /> 
                    <span>I agree to the <a href="#" className="font-bold text-forest hover:underline">Terms & Conditions</a> and <a href="#" className="font-bold text-forest hover:underline">Privacy Policy</a>.</span>
                  </label>
                </div>

                <button type="submit" disabled={isLoading} className="w-full py-3.5 mt-4 bg-terracotta-deep hover:bg-terracotta text-paper font-bold rounded-xl transition-all shadow-sm flex items-center justify-center uppercase tracking-wide">
                  {isLoading ? <div className="w-5 h-5 border-2 border-paper border-t-transparent rounded-full animate-spin"></div> : 'Create Account'}
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}