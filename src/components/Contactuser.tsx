import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  Send, 
  Loader2, 
  Search, 
  MessageCircle, 
  Mail, 
  User, 
  Shield, 
  Users, 
  MapPin, 
  CheckCircle,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Star
} from 'lucide-react';
import { getContactDetails } from '../api';
import { getUserRole } from '../utils/auth';




interface Contact {
  id: number;
  name: string;
  phone: string;
  email: string;
  role: string;
  username: string;
  isOnline?: boolean;
  lastSeen?: string;
  avatar?: string;
}

interface ContactuserProps {
  users?: any[];
  setUsers?: React.Dispatch<React.SetStateAction<any[]>>;
}

// Role-based filtering function
const filterContactsByRole = (contacts: Contact[], currentUserRole: string): Contact[] => {
  console.log('🔍 Filtering contacts for role:', currentUserRole);
  console.log('📋 Available contacts:', contacts.length);
  
  switch (currentUserRole.toLowerCase()) {
    case 'fieldofficer':
      // Field Officer can see: Farmers, Managers, Owners, Field Officers
      const fieldOfficerContacts = contacts.filter(contact => {
        const role = contact.role?.toLowerCase() || '';
        return role === 'farmer' || role === 'manager' || role === 'owner' || role === 'admin' || role === 'fieldofficer' || role === 'field_officer';
      });
      console.log('👨‍💼 Field Officer can see:', fieldOfficerContacts.length, 'contacts');
      console.log('🔍 Field Officer filtered contacts:', fieldOfficerContacts.map(c => ({ name: c.name, role: c.role })));
      return fieldOfficerContacts;
      
    case 'manager':
      // Manager can see: Owners, Field Officers
      const managerContacts = contacts.filter(contact => {
        const role = contact.role?.toLowerCase() || '';
        return role === 'owner' || role === 'admin' || role === 'fieldofficer' || role === 'field_officer';
      });
      console.log('👨‍💼 Manager can see:', managerContacts.length, 'contacts');
      return managerContacts;
      
    case 'owner':
    case 'admin':
      // Owner/Admin can see: Field Officers, Managers, Farmers
      const ownerContacts = contacts.filter(contact => {
        const role = contact.role?.toLowerCase() || '';
        return role === 'fieldofficer' || role === 'field_officer' || role === 'manager' || role === 'farmer';
      });
      console.log('👑 Owner/Admin can see:', ownerContacts.length, 'contacts');
      console.log('🔍 Owner/Admin filtered contacts:', ownerContacts.map(c => ({ name: c.name, role: c.role })));
      return ownerContacts;
      
    case 'farmer':
      // Farmer can see: Field Officers, Managers
      const farmerContacts = contacts.filter(contact => {
        const role = contact.role?.toLowerCase() || '';
        return role === 'fieldofficer' || role === 'field_officer' || role === 'manager';
      });
      console.log('🌾 Farmer can see:', farmerContacts.length, 'contacts');
      return farmerContacts;
      
    default:
      // Default: show all contacts
      console.log('❓ Unknown role, showing all contacts');
      return contacts;
  }
};

// Get role-based description for header
const getRoleBasedDescription = (currentUserRole: string): string => {
  switch (currentUserRole.toLowerCase()) {
    case 'fieldofficer':
      return 'Connect with farmers, managers, owners, and other field officers in your network';
    case 'manager':
      return 'Connect with owners and field officers under your management';
    case 'owner':
    case 'admin':
      return 'Connect with field officers, managers, and farmers in your organization';
    case 'farmer':
      return 'Connect with field officers and managers for support';
    default:
      return 'Connect with your team members and send messages';
  }
};

const Contactuser: React.FC<ContactuserProps> = () => {
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [message, setMessage] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());
  const [messageSent, setMessageSent] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch contacts from API
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getContactDetails();
        console.log('=== CONTACT DETAILS API RESPONSE ===');
        console.log('Full Response:', response);
        console.log('Response Status:', response.status);
        console.log('Response Headers:', response.headers);
        console.log('Response Data:', response.data);
        console.log('Response Data Type:', typeof response.data);
        console.log('Is Array:', Array.isArray(response.data));
        console.log('Response Data Keys:', response.data ? Object.keys(response.data) : 'No keys');
        
        let usersData = response.data;
        
        // Handle different API response formats
        if (usersData && typeof usersData === 'object') {
          console.log('Processing object response...');
          
          // If response has a 'results' property (common in paginated APIs)
          if (Array.isArray(usersData.results)) {
            console.log('Found results array:', usersData.results.length, 'items');
            usersData = usersData.results;
          }
          // If response has a 'data' property
          else if (Array.isArray(usersData.data)) {
            console.log('Found data array:', usersData.data.length, 'items');
            usersData = usersData.data;
          }
          // If response has a 'users' property
          else if (Array.isArray(usersData.users)) {
            console.log('Found users array:', usersData.users.length, 'items');
            usersData = usersData.users;
          }
          // If response has a 'contacts' property with role-based structure
          else if (usersData.contacts && typeof usersData.contacts === 'object') {
            console.log('Found contacts object:', usersData.contacts);
            console.log('Contacts object keys:', Object.keys(usersData.contacts));
            
            // Handle role-based contacts structure: {owner: {...}, field_officers: [...], farmers: [...]}
            const allContacts: any[] = [];
            
            // Process each role category
            Object.keys(usersData.contacts).forEach(roleKey => {
              const roleData = usersData.contacts[roleKey];
              console.log(`Processing ${roleKey}:`, roleData);
              
              if (Array.isArray(roleData)) {
                // If it's an array (like field_officers: [], farmers: [])
                roleData.forEach(contact => {
                  allContacts.push({
                    ...contact,
                    role: roleKey === 'field_officers' ? 'fieldofficer' : 
                          roleKey === 'farmers' ? 'farmer' : 
                          roleKey === 'managers' ? 'manager' :
                          roleKey.replace('_', '') // Convert 'field_officers' to 'fieldofficer', 'farmers' to 'farmer', 'managers' to 'manager'
                  });
                });
                console.log(`Added ${roleData.length} contacts from ${roleKey}`);
              } else if (roleData && typeof roleData === 'object' && roleData.id) {
                // If it's a single object (like owner: {...})
                allContacts.push({
                  ...roleData,
                  role: roleKey
                });
                console.log(`Added 1 contact from ${roleKey}`);
              }
            });
            
            usersData = allContacts;
            console.log(`✅ Total contacts extracted: ${allContacts.length}`);
            console.log('📋 All extracted contacts with roles:', allContacts.map(c => ({ name: c.name, role: c.role })));
          }
          // If response has a 'contact_details' property
          else if (Array.isArray(usersData.contact_details)) {
            console.log('Found contact_details array:', usersData.contact_details.length, 'items');
            usersData = usersData.contact_details;
          }
          // If it's an object with user properties, try to extract users
          else if (usersData.user_list && Array.isArray(usersData.user_list)) {
            console.log('Found user_list array:', usersData.user_list.length, 'items');
            usersData = usersData.user_list;
          }
          else {
            console.log('No recognized array property found. Available properties:', Object.keys(usersData));
            console.log('Full response object:', usersData);
          }
        }
        
        // Check if usersData is an array
        if (!Array.isArray(usersData)) {
          console.error('❌ API response is not an array after processing');
          console.error('Final usersData:', usersData);
          console.error('Type:', typeof usersData);
          setError(`Invalid data format received from server. Expected an array of users, but got: ${typeof usersData}. Please check the API response format.`);
          return;
        }
        
        console.log('✅ Successfully extracted array with', usersData.length, 'users');
        
        // Transform API data to Contact format
        const contactsData: Contact[] = usersData.map((user: any) => {
          // Debug log for role object
          if (typeof user.role === 'object') {
            console.log('Role object for user', user.username, ':', user.role);
          }
          
          return {
            id: user.id,
            name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'Unknown',
            phone: user.phone || user.phone_number || 'N/A',
            email: user.email || 'N/A',
            role: typeof user.role === 'object' ? (user.role?.name || user.role?.display_name || 'user') : (user.role || 'user'),
            username: user.username || user.name || 'unknown',
            // isOnline: Math.random() > 0.5, // Simulate online status
            lastSeen: new Date(Date.now() - Math.random() * 86400000).toLocaleTimeString(),
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.username || 'User')}&background=random&color=fff&size=128`
          };
        });
        
        console.log('Transformed contacts:', contactsData);
        
        // Apply role-based filtering
        const currentUserRole = getUserRole();
        const filteredContacts = filterContactsByRole(contactsData, currentUserRole || '');
        console.log('Current user role:', currentUserRole);
        console.log('Filtered contacts for role:', filteredContacts.length);
        
        setContacts(filteredContacts);
        setFilteredContacts(filteredContacts);
      } catch (err: any) {
        console.error('Error fetching contacts:', err);
        console.error('Error details:', err.response?.data);
        setError(`Failed to load contacts: ${err.message || 'Please try again.'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, []);

  // Filter contacts based on search and role
  useEffect(() => {
    let filtered = contacts;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by role
    if (selectedRole !== 'all') {
      filtered = filtered.filter(contact => contact.role === selectedRole);
    }

    setFilteredContacts(filtered);
  }, [contacts, searchTerm, selectedRole]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedContacts.length > 0 && message) {
      const contactNames = selectedContacts.map(c => c.name).join(', ');
      console.log(`Message sent to ${contactNames}: ${message}`);
      setMessage('');
      setMessageSent(true);
      setTimeout(() => setMessageSent(false), 3000);
    }
  };

  const toggleContactSelection = (contact: Contact) => {
    setSelectedContacts(prev => {
      const isSelected = prev.some(c => c.id === contact.id);
      if (isSelected) {
        return prev.filter(c => c.id !== contact.id);
      } else {
        return [...prev, contact];
      }
    });
  };

  const toggleSelectAllForRole = (roleContacts: Contact[]) => {
    const allSelected = roleContacts.every(contact => 
      selectedContacts.some(c => c.id === contact.id)
    );
    
    if (allSelected) {
      // Deselect all contacts in this role
      setSelectedContacts(prev => 
        prev.filter(contact => !roleContacts.some(roleContact => roleContact.id === contact.id))
      );
    } else {
      // Select all contacts in this role
      setSelectedContacts(prev => {
        const newSelections = roleContacts.filter(contact => 
          !prev.some(c => c.id === contact.id)
        );
        return [...prev, ...newSelections];
      });
    }
  };

  const toggleRoleExpansion = (role: string) => {
    const newExpanded = new Set(expandedRoles);
    if (newExpanded.has(role)) {
      newExpanded.delete(role);
    } else {
      newExpanded.add(role);
    }
    setExpandedRoles(newExpanded);
  };

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'superadmin':
        return <Shield className="w-4 h-4" />;
      case 'owner':
        return <Star className="w-4 h-4" />;
      case 'fieldofficer':
        return <User className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'superadmin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'owner':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'fieldofficer':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Group filtered contacts by role
  const contactsByRole = filteredContacts.reduce((acc, contact) => {
    const role = String(contact.role); // Ensure role is always a string
    if (!acc[role]) {
      acc[role] = [];
    }
    acc[role].push(contact);
    return acc;
  }, {} as Record<string, Contact[]>);

  const uniqueRoles = Array.from(new Set(contacts.map(c => c.role)));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700">Loading contacts...</h3>
                <p className="text-gray-500 mt-2">Fetching the latest team information</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center py-20">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Oops! Something went wrong</h3>
              <p className="text-red-600 mb-6 max-w-md mx-auto">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-colors duration-200 flex items-center gap-2 mx-auto"
              >
                <AlertCircle className="w-4 h-4" />
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Team Contacts
              </h1>
              <p className="text-gray-600 mt-2">
                {getRoleBasedDescription(getUserRole() || '')}
              </p>
            </div>
            
            {/* Stats */}
            {/* <div className="flex gap-4">
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{contacts.length}</div>
                <div className="text-sm text-gray-600">Total Contacts</div>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {contacts.filter(c => c.isOnline).length}
                </div>
                <div className="text-sm text-gray-600">Online Now</div>
              </div>
            </div> */}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Contact List */}
          <div className="xl:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-6">
              {/* Search and Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search contacts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                
                <div className="flex gap-2">
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Roles</option>
                    {uniqueRoles.map(role => (
                      <option key={role} value={role}>
                        {role.replace(/([A-Z])/g, ' $1').trim()}
                      </option>
                    ))}
                  </select>
                  
                  <button
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    className="px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    {viewMode === 'grid' ? 'List' : 'Grid'}
                  </button>
                </div>
              </div>

              {/* Contacts List */}
              <div className="space-y-6">
                {Object.keys(contactsByRole).length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No contacts found</h3>
                    <p className="text-gray-500">Try adjusting your search or filter criteria</p>
                  </div>
                ) : (
                  Object.entries(contactsByRole).map(([role, roleContacts]) => (
                    <div key={role} className="border border-gray-100 rounded-xl overflow-hidden">
                      {/* Role Header */}
                      <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4">
                        <div className="flex items-center justify-between">
                          <div 
                            className="flex items-center gap-3 cursor-pointer hover:from-gray-100 hover:to-gray-200 transition-all duration-200 flex-1"
                            onClick={() => toggleRoleExpansion(role)}
                          >
                            {getRoleIcon(role)}
                            <h3 className="text-lg font-semibold text-gray-800 capitalize">
                              {role.replace(/([A-Z])/g, ' $1').trim()}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleColor(role)}`}>
                              {roleContacts.length}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelectAllForRole(roleContacts);
                              }}
                              className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                            >
                              {roleContacts.every(contact => 
                                selectedContacts.some(c => c.id === contact.id)
                              ) ? 'Deselect All' : 'Select All'}
                            </button>
                            {expandedRoles.has(role) ? 
                              <ChevronUp className="w-5 h-5 text-gray-500 cursor-pointer" onClick={() => toggleRoleExpansion(role)} /> : 
                              <ChevronDown className="w-5 h-5 text-gray-500 cursor-pointer" onClick={() => toggleRoleExpansion(role)} />
                            }
                          </div>
                        </div>
                      </div>

                      {/* Contacts Grid */}
                      {expandedRoles.has(role) && (
                        <div className={`p-4 ${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-3'}`}>
                          {roleContacts.map((contact) => (
                            <div
                              key={contact.id}
                              onClick={() => {
                                toggleContactSelection(contact);
                              }}
                              className={`group relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                                selectedContacts.some(c => c.id === contact.id)
                                  ? 'border-blue-500 bg-blue-50 shadow-lg' 
                                  : 'border-gray-100 hover:border-blue-300 bg-white'
                              }`}
                            >
                              <div className="flex items-start gap-4">
                                {/* Avatar */}
                                <div className="relative">
                                  <img
                                    src={contact.avatar}
                                    alt={contact.name}
                                    className="w-12 h-12 rounded-full object-cover"
                                  />
                                  {/* {contact.isOnline && (
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                                  )} */}
                                </div>

                                {/* Contact Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-semibold text-gray-900 truncate">{contact.name}</h4>
                                    {/* {contact.isOnline && (
                                      <span className="text-xs text-green-600 font-medium">Online</span>
                                    )} */}
                                  </div>
                                  <p className="text-sm text-gray-600 mb-2">@{contact.username}</p>
                                  
                                  <div className="flex flex-col gap-1">
                                    {contact.phone !== 'N/A' && (
                                      <a 
                                        href={`tel:${contact.phone}`} 
                                        className="text-blue-600 hover:text-blue-800 flex items-center gap-2 text-sm transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Phone size={14} />
                      {contact.phone}
                    </a>
                                    )}
                                    {contact.email !== 'N/A' && (
                                      <a 
                                        href={`mailto:${contact.email}`}
                                        className="text-gray-600 hover:text-gray-800 flex items-center gap-2 text-sm transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Mail size={14} />
                                        {contact.email}
                                      </a>
                                    )}
                                  </div>
                                </div>

                                {/* Action Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleContactSelection(contact);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-all duration-200"
                                >
                                  <MessageCircle size={18} />
                                </button>
                              </div>
                  </div>
                ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
        </div>

        {/* Message Form & Map */}
        <div className="space-y-6">
            {/* Message Form */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <MessageCircle className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-semibold text-gray-800">Send Message</h3>
              </div>

              {selectedContacts.length > 0 ? (
                <div className="space-y-6">
                  {/* Selected Contacts */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">
                        Selected Contacts ({selectedContacts.length})
                      </h4>
                      <button
                        onClick={() => setSelectedContacts([])}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedContacts.map((contact) => (
                        <div key={contact.id} className="flex items-center gap-2 bg-white rounded-lg p-2 border">
                          <img
                            src={contact.avatar}
                            alt={contact.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{contact.name}</p>
                            <p className="text-xs text-gray-500">@{contact.username}</p>
                          </div>
                          <button
                            onClick={() => toggleContactSelection(contact)}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
            </div>

                  {/* Message Form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                        Your Message
                      </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                        className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200"
                rows={4}
                placeholder="Type your message here..."
              />
            </div>
                    
            <button
              type="submit"
                      disabled={!message.trim()}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-200 font-medium"
            >
                      <Send size={18} />
                      Send Message
            </button>
          </form>

                  {/* Success Message */}
                  {messageSent && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-800 font-medium">Message sent successfully!</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-gray-600 mb-2">Select contacts</h4>
                  <p className="text-gray-500">Choose one or more team members to start a conversation</p>
                </div>
              )}
            </div>

            {/* Map */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-800">Office Location</h3>
                </div>
              </div>
              <div className="h-64">
            <iframe
              className="w-full h-full"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3748.8576457563217!2d73.73526997775477!3d20.014488481393084!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bddedfd4b5a7651%3A0xe41740d3c662d5f4!2sPlanetEye%20Infra%20AI!5e0!3m2!1sen!2sin!4v1743748499982!5m2!1sen!2sin"
              allowFullScreen
              loading="lazy"
              style={{ border: 0 }}
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contactuser;
