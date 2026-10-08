"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Login } from "@/components/auth/Login";
import { IntegrationsTab } from "@/features/integrations/IntegrationsTab";
import { User, Bell, Shield, Webhook, Paintbrush } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { updateProfile, deleteUser } from "firebase/auth";
import { Modal } from "@/components/ui/Modal";

type Tab = "profile" | "appearance" | "notifications" | "security" | "integrations";

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  
  // Profile State
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Notification State
  const [sysNotif, setSysNotif] = useState(true);
  const [collabNotif, setCollabNotif] = useState(true);

  // Security State
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="py-4">
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </header>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1 space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="md:col-span-3 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const handleUpdateProfile = async () => {
    setSaving(true);
    setMessage("");
    try {
      await updateProfile(user, { displayName });
      setMessage("Profile updated successfully!");
    } catch (error) {
      setMessage("Failed to update profile.");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteUser(user);
      // User will be auto-redirected by AuthContext
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/requires-recent-login') {
        alert("For security reasons, please log out and log back in before deleting your account.");
      } else {
        alert("Failed to delete account. Try again later.");
      }
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="py-4">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and studio preferences.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Settings Sidebar */}
        <div className="md:col-span-1 flex flex-col gap-1">
          <button 
            onClick={() => setActiveTab("profile")}
            className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === "profile" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <User className="w-4 h-4" /> Profile
          </button>
          <button 
            onClick={() => setActiveTab("appearance")}
            className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === "appearance" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <Paintbrush className="w-4 h-4" /> Appearance
          </button>
          <button 
            onClick={() => setActiveTab("notifications")}
            className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === "notifications" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <Bell className="w-4 h-4" /> Notifications
          </button>
          <button 
            onClick={() => setActiveTab("security")}
            className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === "security" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <Shield className="w-4 h-4" /> Security
          </button>
          <button 
            onClick={() => setActiveTab("integrations")}
            className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === "integrations" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <Webhook className="w-4 h-4" /> Integrations
          </button>
        </div>

        {/* Settings Content */}
        <div className="md:col-span-3 space-y-6">
          
          {/* PROFILE TAB */}
          {activeTab === "profile" && (
            <section className="bg-card border border-border rounded-lg p-6 animate-in fade-in duration-300">
              <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium mb-1 text-muted-foreground">Email Address</label>
                  <input 
                    type="email" 
                    disabled 
                    value={user.email || ""} 
                    className="w-full bg-background border border-border rounded-md px-4 py-2 text-muted-foreground opacity-70 cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Your email is tied to your Firebase account.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-muted-foreground">Display Name</label>
                  <input 
                    type="text" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Studio Developer" 
                    className="w-full bg-background border border-border rounded-md px-4 py-2 focus:outline-none focus:border-muted-foreground"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={handleUpdateProfile}
                    disabled={saving}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  {message && <span className="text-sm font-medium text-primary">{message}</span>}
                </div>
              </div>
            </section>
          )}

          {/* APPEARANCE TAB */}
          {activeTab === "appearance" && (
            <section className="bg-card border border-border rounded-lg p-6 animate-in fade-in duration-300">
              <h2 className="text-lg font-semibold mb-4">Appearance</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div>
                    <h3 className="font-medium">Dark Mode</h3>
                    <p className="text-sm text-muted-foreground">Patchplan defaults to a dark aesthetic designed for gamers.</p>
                  </div>
                  <div className="bg-primary px-3 py-1 rounded text-primary-foreground text-xs font-bold">Enabled</div>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <h3 className="font-medium">Light Mode</h3>
                    <p className="text-sm text-muted-foreground">For those who prefer a brighter workspace.</p>
                  </div>
                  <div className="bg-muted px-3 py-1 rounded text-muted-foreground text-xs font-bold">Coming Soon</div>
                </div>
              </div>
            </section>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === "notifications" && (
            <section className="bg-card border border-border rounded-lg p-6 animate-in fade-in duration-300">
              <h2 className="text-lg font-semibold mb-4">Notification Preferences</h2>
              <p className="text-sm text-muted-foreground mb-6">Choose what you want to be notified about via email.</p>
              
              <div className="space-y-4">
                <label className="flex items-start justify-between cursor-pointer group">
                  <div>
                    <h3 className="font-medium group-hover:text-primary transition-colors">Patchplan Updates</h3>
                    <p className="text-sm text-muted-foreground">Receive emails about new features and software updates.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={sysNotif} 
                    onChange={(e) => setSysNotif(e.target.checked)}
                    className="mt-1 w-4 h-4 accent-primary"
                  />
                </label>
                
                <div className="w-full h-px bg-border" />
                
                <label className="flex items-start justify-between cursor-pointer group">
                  <div>
                    <h3 className="font-medium group-hover:text-primary transition-colors">Collaborator Updates</h3>
                    <p className="text-sm text-muted-foreground">Get notified when someone edits a workspace or joins your team.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={collabNotif} 
                    onChange={(e) => setCollabNotif(e.target.checked)}
                    className="mt-1 w-4 h-4 accent-primary"
                  />
                </label>
              </div>
            </section>
          )}

          {/* SECURITY TAB */}
          {activeTab === "security" && (
            <section className="bg-card border border-border rounded-lg p-6 animate-in fade-in duration-300">
              <h2 className="text-lg font-semibold text-red-500 mb-4">Danger Zone</h2>
              <div className="border border-red-500/20 bg-red-500/5 rounded-md p-4 flex flex-col items-start gap-4">
                <div>
                  <h3 className="font-medium text-red-400">Delete Account</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Permanently delete your account and remove all access to your studio data. This action is irreversible.
                  </p>
                </div>
                <button 
                  onClick={() => setShowDeleteModal(true)}
                  className="bg-red-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-600 transition-colors"
                >
                  Delete Account
                </button>
              </div>
            </section>
          )}

          {/* INTEGRATIONS TAB */}
          {activeTab === "integrations" && (
            <IntegrationsTab />
          )}

        </div>
      </div>

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Account">
        <p className="text-muted-foreground mb-6">
          Are you absolutely sure you want to delete your account? This will permanently remove your login credentials.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => setShowDeleteModal(false)}
            className="px-4 py-2 text-sm font-medium hover:text-muted-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteAccount}
            className="bg-red-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-600 transition-colors"
          >
            Yes, Delete Account
          </button>
        </div>
      </Modal>

    </div>
  );
}




