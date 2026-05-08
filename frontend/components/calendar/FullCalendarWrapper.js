import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { addMinutes } from 'date-fns';

export default function FullCalendarWrapper({
  events,
  onDateSelect,
  onEventClick,
  onDatesSet,
}) {
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

        .fc-highlight {
          background: rgba(16, 185, 129, 0.15) !important;
          border: 2px dashed #10b981 !important;
        }

        .fc-day-past {
          background: #f9fafb !important;
          opacity: 0.5 !important;
          pointer-events: none !important;
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

        selectable={true}
        selectMirror={true}
        editable={false}

        longPressDelay={0}
        selectLongPressDelay={0}
        selectMinDistance={5}

        events={events}

        validRange={{ start: today }}

        select={(info) => {
          if (info.start < today) return;

          onDateSelect({
            start: info.start,
            end: info.end,
            view: info.view,
          });
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
      />
    </>
  );
}