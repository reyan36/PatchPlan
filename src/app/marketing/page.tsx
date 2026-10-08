"use client";

import { useState } from "react";
import { Search, Plus, Trash2, Filter } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Login } from "@/components/auth/Login";

type Contact = {
  id: string;
  name: string;
  role: string;
  contact: string;
  status: string;
  notes: string;
};

const ROLES = ["YouTuber", "Twitch Streamer", "Animator", "Logo Designer", "Developer", "Publisher", "Sound Designer", "Other"];
const STATUSES = ["New", "Contacted", "In Talks", "Hired", "Rejected", "Completed"];

export default function MarketingPage() {
  const { user, loading } = useAuth();
  
  // In a real app, this would be fetched from Firebase
  const [contacts, setContacts] = useState<Contact[]>([
    { id: "1", name: "Markiplier", role: "YouTuber", contact: "business@example.com", status: "Contacted", notes: "Loves horror/indie games" },
    { id: "2", name: "Sarah Draws", role: "Animator", contact: "@sarahdraws (X)", status: "New", notes: "Great pixel art for UI" },
    { id: "3", name: "PixelPerfect", role: "Logo Designer", contact: "pixelperfect.dev", status: "In Talks", notes: "Quoted $500 for main logo" }
  ]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  if (loading) return <div className="p-8 text-muted-foreground animate-pulse">Loading Contacts...</div>;
  if (!user) return <Login />;

  const addContact = () => {
    setContacts([
      { id: Date.now().toString(), name: "", role: "YouTuber", contact: "", status: "New", notes: "" },
      ...contacts
    ]);
  };

  const updateContact = (id: string, field: keyof Contact, value: string) => {
    setContacts(contacts.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const deleteContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
  };

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.notes.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "All" || c.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 h-full flex flex-col pb-8">
      <header className="py-4">
        <h1 className="text-3xl font-bold tracking-tight">Studio Contacts</h1>
        <p className="text-muted-foreground">Your spreadsheet for tracking influencers, artists, developers, and partners.</p>
      </header>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex flex-1 gap-4 w-full sm:w-auto">
          {/* Text Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search contacts..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          
          {/* Role Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select 
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="appearance-none bg-card border border-border rounded-md pl-9 pr-8 py-2 text-sm focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="All">All Roles</option>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        
        <button 
          onClick={addContact}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Add Contact
        </button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden flex-grow shadow-sm">
        <div className="overflow-x-auto min-h-[500px]">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b border-border">
              <tr>
                <th className="px-4 py-3 font-medium w-[20%]">Name</th>
                <th className="px-4 py-3 font-medium w-[15%]">Role</th>
                <th className="px-4 py-3 font-medium w-[20%]">Contact (Email/Link)</th>
                <th className="px-4 py-3 font-medium w-[15%]">Status</th>
                <th className="px-4 py-3 font-medium w-[25%]">Notes</th>
                <th className="px-4 py-3 font-medium w-[5%] text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredContacts.map(contact => (
                <tr key={contact.id} className="hover:bg-muted/20 transition-colors group">
                  <td className="p-2">
                    <input 
                      type="text" 
                      value={contact.name}
                      onChange={e => updateContact(contact.id, "name", e.target.value)}
                      placeholder="Name..."
                      className="w-full bg-transparent border border-transparent hover:border-border focus:border-primary focus:bg-background px-2 py-1.5 rounded transition-all outline-none"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      value={contact.role}
                      onChange={e => updateContact(contact.id, "role", e.target.value)}
                      className="w-full bg-transparent border border-transparent hover:border-border focus:border-primary focus:bg-background px-2 py-1.5 rounded transition-all outline-none appearance-none cursor-pointer"
                    >
                      {ROLES.map(r => <option key={r} value={r} className="bg-background text-foreground">{r}</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    <input 
                      type="text" 
                      value={contact.contact}
                      onChange={e => updateContact(contact.id, "contact", e.target.value)}
                      placeholder="Email or URL..."
                      className="w-full bg-transparent border border-transparent hover:border-border focus:border-primary focus:bg-background px-2 py-1.5 rounded transition-all outline-none"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      value={contact.status}
                      onChange={e => updateContact(contact.id, "status", e.target.value)}
                      className="w-full bg-transparent border border-transparent hover:border-border focus:border-primary focus:bg-background px-2 py-1.5 rounded transition-all outline-none appearance-none cursor-pointer"
                    >
                      {STATUSES.map(s => <option key={s} value={s} className="bg-background text-foreground">{s}</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    <input 
                      type="text" 
                      value={contact.notes}
                      onChange={e => updateContact(contact.id, "notes", e.target.value)}
                      placeholder="Add notes..."
                      className="w-full bg-transparent border border-transparent hover:border-border focus:border-primary focus:bg-background px-2 py-1.5 rounded transition-all outline-none"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <button 
                      onClick={() => deleteContact(contact.id)}
                      className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 mx-auto block"
                      title="Delete Contact"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredContacts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No contacts found. Click "Add Contact" to create one!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
