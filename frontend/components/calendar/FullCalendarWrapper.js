import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { addMinutes } from 'date-fns';

export default function FullCalendarWrapper({ events, onDateSelect, onEventClick, onDatesSet }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
      `}</style>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        initialDate={new Date()}
        headerToolbar={{
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
