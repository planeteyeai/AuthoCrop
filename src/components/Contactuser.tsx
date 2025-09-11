import React, { useState } from 'react';
import { Phone, Send } from 'lucide-react';

interface Contact {
  name: string;
  phone: string;
  role: 'fieldOfficer' | 'owner' | 'superadmin' | 'Agroclimatic' | 'QualityControl';
}

interface ContactuserProps {
  users: any[];
  setUsers: React.Dispatch<React.SetStateAction<any[]>>;
}

const Contactuser: React.FC<ContactuserProps> = () => {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [message, setMessage] = useState('');

  const contacts: Contact[] = [
    { name: 'Superadmin', phone: '+91 9876543210', role: 'superadmin' },
    ...Array.from({ length: 5 }, (_, i) => ({
      name: `Field Officer ${i + 1}`,
      phone: `+91 98765${(43211 + i).toString().padStart(5, '0')}`,
      role: 'fieldOfficer' as const
    })),
    ...Array.from({ length: 2 }, (_, i) => ({
      name: `Owner ${i + 1}`,
      phone: `+91 98765${(43231 + i).toString().padStart(5, '0')}`,
      role: 'owner' as const
    }))
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedContact && message) {
      console.log(`Message sent to ${selectedContact.name}: ${message}`);
      setMessage('');
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Contact Users</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Contact List */}
        <div className="space-y-6">
          {['fieldOfficer', 'owner', 'superadmin'].map((role) => (
            <section key={role}>
              <h2 className="text-xl font-semibold capitalize mb-2">{role}</h2>
              <div className="grid grid-cols-1 gap-4">
                {contacts.filter(c => c.role === role).map((contact, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedContact(contact)}
                    className="border border-gray-300 p-4 rounded hover:bg-gray-100 cursor-pointer"
                  >
                    <p className="font-medium">{contact.name}</p>
                    <a href={`tel:${contact.phone}`} className="text-blue-600 flex items-center gap-2 mt-1">
                      <Phone size={16} />
                      {contact.phone}
                    </a>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Message Form & Map */}
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded border">
            <h3 className="text-lg font-bold mb-2">Send Message</h3>
            <div className="mb-2">
              <label className="text-sm">Selected Contact:</label>
              <div className="bg-white p-2 border rounded">{selectedContact ? selectedContact.name : 'Select contact'}</div>
            </div>
            <div className="mb-2">
              <label htmlFor="message" className="text-sm">Message:</label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-2 border rounded mt-1"
                rows={4}
                placeholder="Type your message here..."
              />
            </div>
            <button
              type="submit"
              disabled={!selectedContact || !message}
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              <Send size={16} className="inline mr-1" />
              Send
            </button>
          </form>

          <div className="h-64 rounded overflow-hidden border">
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
  );
};

export default Contactuser;
