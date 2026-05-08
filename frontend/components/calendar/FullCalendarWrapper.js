import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

export default function FullCalendarWrapper({ events, onDateSelect, onEventClick, onDatesSet }) {
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
      `}</style>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        selectable={true}
        selectMirror={true}
longPressDelay={0}
selectMinDistance={5}
selectLongPressDelay={0}
        editable={false}
        dayMaxEvents={true}
        weekends={true}
        events={events}
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
