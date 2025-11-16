'use client';

import { useState } from 'react';
import { Calendar, Clock, MapPin, Users, Plus, X } from 'lucide-react';
import { MemoryEntry } from '@/types/memory';
import { getGoogleCalendarClient } from '@/lib/google-calendar-client';

interface MemoryToCalendarProps {
  memory: MemoryEntry;
  onEventCreated?: (eventId: string) => void;
  onClose?: () => void;
}

export default function MemoryToCalendar({
  memory,
  onEventCreated,
  onClose
}: MemoryToCalendarProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [eventDetails, setEventDetails] = useState({
    title: '',
    startTime: '',
    endTime: '',
    location: '',
    attendees: [] as string[]
  });
  const [attendeeEmail, setAttendeeEmail] = useState('');

  const calendarService = getGoogleCalendarClient();

  const handleCreateEvent = async () => {
    if (!eventDetails.title || !eventDetails.startTime || !eventDetails.endTime) {
      alert('Please fill in required fields');
      return;
    }

    try {
      setIsCreating(true);
      
      const event = await calendarService.createEvent({
        summary: eventDetails.title,
        start: {
          dateTime: eventDetails.startTime,
          timeZone: 'UTC'
        },
        end: {
          dateTime: eventDetails.endTime,
          timeZone: 'UTC'
        },
        location: eventDetails.location,
        attendees: eventDetails.attendees.map(email => ({
          email: email,
          displayName: email.split('@')[0]
        })),
        description: `Created from memory: ${memory.content.substring(0, 200)}...`
      });

      console.log('✅ Event created from memory:', event.id);
      
      if (onEventCreated) {
        onEventCreated(event.id!);
      }
      
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to create event from memory:', error);
      alert('Failed to create calendar event');
    } finally {
      setIsCreating(false);
    }
  };

  const addAttendee = () => {
    if (attendeeEmail && !eventDetails.attendees.includes(attendeeEmail)) {
      setEventDetails(prev => ({
        ...prev,
        attendees: [...prev.attendees, attendeeEmail]
      }));
      setAttendeeEmail('');
    }
  };

  const removeAttendee = (email: string) => {
    setEventDetails(prev => ({
      ...prev,
      attendees: prev.attendees.filter(attendee => attendee !== email)
    }));
  };

  const extractDateTime = (content: string) => {
    // Simple date/time extraction from memory content
    const dateRegex = /(\d{4}-\d{2}-\d{2})/g;
    const timeRegex = /(\d{1,2}:\d{2}(?::\d{2})?)/g;
    
    const dates = content.match(dateRegex);
    const times = content.match(timeRegex);
    
    if (dates && times) {
      const date = dates[0];
      const time = times[0];
      return `${date}T${time}:00`;
    }
    
    return '';
  };

  const suggestEventDetails = () => {
    const content = memory.content.toLowerCase();
    
    // Extract potential title from memory content
    let title = memory.content.substring(0, 50);
    if (title.length === 50) {
      title += '...';
    }
    
    // Extract potential date/time
    const dateTime = extractDateTime(memory.content);
    
    // Extract potential location
    const locationKeywords = ['at', 'in', 'location', 'venue', 'address'];
    let location = '';
    for (const keyword of locationKeywords) {
      const index = content.indexOf(keyword);
      if (index !== -1) {
        const afterKeyword = content.substring(index + keyword.length).trim();
        const words = afterKeyword.split(' ').slice(0, 3);
        location = words.join(' ');
        break;
      }
    }
    
    setEventDetails(prev => ({
      ...prev,
      title: title,
      startTime: dateTime || '',
      endTime: dateTime || '',
      location: location
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Calendar className="w-6 h-6 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              Create Calendar Event from Memory
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Memory Preview */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-gray-900 mb-2">Memory Content:</h4>
          <p className="text-gray-600 text-sm leading-relaxed">
            {memory.content}
          </p>
          <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
            <span>Type: {memory.type}</span>
            <span>Category: {memory.category}</span>
            <span>Created: {new Date(memory.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Event Details Form */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Event Details</h4>
            <button
              onClick={suggestEventDetails}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Auto-fill from memory
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Title *
            </label>
            <input
              type="text"
              value={eventDetails.title}
              onChange={(e) => setEventDetails(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter event title"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date & Time *
              </label>
              <input
                type="datetime-local"
                value={eventDetails.startTime}
                onChange={(e) => setEventDetails(prev => ({ ...prev, startTime: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date & Time *
              </label>
              <input
                type="datetime-local"
                value={eventDetails.endTime}
                onChange={(e) => setEventDetails(prev => ({ ...prev, endTime: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              value={eventDetails.location}
              onChange={(e) => setEventDetails(prev => ({ ...prev, location: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Event location"
            />
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Attendees
            </label>
            <div className="flex space-x-2 mb-2">
              <input
                type="email"
                value={attendeeEmail}
                onChange={(e) => setAttendeeEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addAttendee()}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter email address"
              />
              <button
                onClick={addAttendee}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
            </div>
            
            {eventDetails.attendees.length > 0 && (
              <div className="space-y-1">
                {eventDetails.attendees.map((email, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-100 rounded-lg px-3 py-2"
                  >
                    <span className="text-sm text-gray-700">{email}</span>
                    <button
                      onClick={() => removeAttendee(email)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateEvent}
            disabled={isCreating || !eventDetails.title || !eventDetails.startTime || !eventDetails.endTime}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Create Event</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
