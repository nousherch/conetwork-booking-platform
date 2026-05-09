import { useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

export default function FullCalendarWrapper({
  events,
  onDateSelect,
  onEventClick,
  onDatesSet,
}) {
  // Memoize midnight today so it doesn't trigger endless re-renders
  const todayMidnight = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  return (
    <>
      <style>{`
        .booked-by-other {
          opacity: 0.95 !important;
          cursor: not-allowed !important;
          background: repeating-linear-gradient(
            45deg,
            #ef4444,
            #ef4444 6px,
            #dc2626 6px,
            #dc2626 12px
          ) !important;
          border: 1.5px solid #b91c1c !important;
        }

        .fc-highlight {
          background: rgba(16, 185, 129, 0.15) !important;
          border: 2px dashed #10b981 !important;
        }

        .fc-day-past {
          background: #f9fafb !important;
          opacity: 0.5 !important;
        }
      `}</style>

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        timeZone="local"
        
        // --- SELECTION LOGIC ---
        selectable={true}
        selectMirror={true}
        editable={false}
        
        // Mobile tweaks
        longPressDelay={0}
        selectLongPressDelay={0}
        selectMinDistance={2}

        events={events}

        // --- TIME GRID SETUP ---
        nowIndicator={true}
        allDaySlot={false}
        slotMinTime="00:00:00"
        slotMaxTime="24:00:00"
        slotDuration="00:30:00"
        snapDuration="00:30:00"
        eventDisplay="block"

        eventTimeFormat={{
          hour: 'numeric',
          minute: '2-digit',
          meridiem: 'short',
        }}
        slotLabelFormat={{
          hour: 'numeric',
          minute: '2-digit',
          meridiem: 'short',
        }}

        // ✅ FIXED: Prevent selecting over existing events automatically
        selectOverlap={false}

        // ✅ FIXED: Prevent selecting past times without hiding columns visually
        selectAllow={(selectInfo) => {
          return selectInfo.start >= todayMidnight;
        }}

        // ✅ FIXED: Only use select, NOT dateClick, to avoid double-firing
        select={(info) => {
          onDateSelect({
            start: info.start,
            end: info.end,
            view: info.view,
          });
          
          // Optional: clear the highlight once they make a selection
          // info.view.calendar.unselect(); 
        }}

        eventClick={(info) => {
          if (!info.event.extendedProps?.isOwnBooking) return;
          onEventClick(info);
        }}

        datesSet={onDatesSet}
      />
    </>
  );
}