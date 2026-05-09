import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { addMinutes } from 'date-fns';

export default function FullCalendarWrapper({ events, onDateSelect, onEventClick, onDatesSet }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    setMounted(true);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Don't render until we know the screen size so initialView is correct from the start
  if (!mounted) return null;

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
        .fc-timegrid-slots tr,
        .fc-timegrid-body,
        .fc-scroller-liquid-absolute {
          touch-action: none !important;
          overscroll-behavior: none !important;
        }
        .fc-highlight {
          background: rgba(16, 185, 129, 0.15) !important;
          border: 2px dashed #10b981 !important;
        }
        .fc .fc-button-group .fc-button,
        .fc .fc-today-button {
          text-transform: capitalize !important;
        }
        .fc-timegrid-slot-label {
          font-size: 13px !important;
          font-weight: 600 !important;
          color: #374151 !important;
        }
        .fc-event-title {
          font-size: 13px !important;
          font-weight: 600 !important;
        }
        .fc-event-time {
          font-size: 12px !important;
          font-weight: 500 !important;
        }
        .fc-col-header-cell {
          font-size: 13px !important;
          font-weight: 700 !important;
          color: #111827 !important;
        }

        /* ── Mobile overrides ── */
        @media (max-width: 767px) {
          .fc .fc-toolbar {
            flex-wrap: wrap !important;
            gap: 6px !important;
          }
          .fc .fc-toolbar-title {
            font-size: 14px !important;
          }
          .fc .fc-button {
            font-size: 12px !important;
            padding: 4px 8px !important;
          }
          /* Fix time label column width so it doesn't get cut off */
          .fc .fc-timegrid-axis,
          .fc .fc-timegrid-slot-label {
            width: 70px !important;
            min-width: 70px !important;
            font-size: 11px !important;
            white-space: nowrap !important;
          }
          /* Fix col header (day name) from being cut off */
          .fc .fc-col-header-cell {
            font-size: 12px !important;
            font-weight: 700 !important;
            padding: 4px 2px !important;
          }
          .fc-event-title {
            font-size: 11px !important;
          }
          .fc-event-time {
            font-size: 10px !important;
          }
        }
      `}</style>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={isMobile ? 'timeGridDay' : 'timeGridWeek'}
        initialDate={new Date()}
        headerToolbar={isMobile ? {
          left: 'prev,next',
          center: 'title',
          right: 'today',
        } : {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        timeZone="local"
        selectable={true}
        selectMirror={true}
        longPressDelay={0}
        selectLongPressDelay={0}
        selectMinDistance={5}
        editable={false}
        dayMaxEvents={true}
        weekends={true}
        events={events}
        validRange={(nowDate) => {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const end = new Date(start);
          end.setDate(end.getDate() + 60);
          return { start, end };
        }}
        selectAllow={(selectInfo) => selectInfo.start >= today}
        select={(info) => {
          const isOverlapping = events.some((e) => {
            if (e.extendedProps?.isOwnBooking === false) {
              return new Date(info.start) < new Date(e.end) &&
                     new Date(info.end) > new Date(e.start);
            }
            return false;
          });
          if (isOverlapping) return;
          onDateSelect(info);
        }}
        dateClick={(info) => {
          if (info.date < today) return;
          onDateSelect({
            start: info.date,
            end: addMinutes(info.date, 30),
            view: info.view,
          });
        }}
        eventClick={(info) => {
          if (!info.event.extendedProps?.isOwnBooking) return;
          onEventClick(info);
        }}
        datesSet={onDatesSet}
        slotMinTime="00:00:00"
        slotMaxTime="24:00:00"
        slotDuration="00:30:00"
        snapDuration="00:30:00"
        height="auto"
        nowIndicator={true}
        allDaySlot={false}
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
        eventMinHeight={30}
        eventDisplay="block"
      />
    </>
  );
}
