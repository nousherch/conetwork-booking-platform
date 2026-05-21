"use strict";exports.id=109,exports.ids=[109],exports.modules={4109:(t,e,i)=>{i.a(t,async(t,n)=>{try{i.r(e),i.d(e,{default:()=>m});var o=i(997),a=i(6689),r=i(9870),l=i(5503),s=i(476),d=i(1103),p=i(3732),c=t([r,l,s,d]);function m({events:t,onDateSelect:e,onEventClick:i,onDatesSet:n}){let c=new Date;c.setHours(0,0,0,0);let[m,f]=(0,a.useState)(!1),[u,x]=(0,a.useState)(!1);return((0,a.useEffect)(()=>{let t=()=>f(window.innerWidth<768);return t(),x(!0),window.addEventListener("resize",t),()=>window.removeEventListener("resize",t)},[]),u)?(0,o.jsxs)(o.Fragment,{children:[o.jsx("style",{children:`
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
      `}),o.jsx(r.default,{plugins:[l.default,s.default,d.default],initialView:m?"timeGridDay":"timeGridWeek",initialDate:new Date,headerToolbar:m?{left:"prev,next",center:"title",right:"today"}:{left:"prev,next today",center:"title",right:"dayGridMonth,timeGridWeek,timeGridDay"},timeZone:"local",selectable:!0,selectMirror:!0,longPressDelay:0,selectLongPressDelay:0,selectMinDistance:5,editable:!1,dayMaxEvents:!0,weekends:!0,events:t,validRange:t=>{let e=new Date;e.setHours(0,0,0,0);let i=new Date(e);return i.setDate(i.getDate()+60),{start:e,end:i}},selectAllow:t=>t.start>=c,select:i=>{t.some(t=>t.extendedProps?.isOwnBooking===!1&&new Date(i.start)<new Date(t.end)&&new Date(i.end)>new Date(t.start))||e(i)},dateClick:t=>{t.date<c||e({start:t.date,end:(0,p.m)(t.date,30),view:t.view})},eventClick:t=>{t.event.extendedProps?.isOwnBooking&&i(t)},datesSet:n,slotMinTime:"00:00:00",slotMaxTime:"24:00:00",slotDuration:"00:30:00",snapDuration:"00:30:00",height:"auto",nowIndicator:!0,allDaySlot:!1,eventTimeFormat:{hour:"numeric",minute:"2-digit",meridiem:"short"},slotLabelFormat:{hour:"numeric",minute:"2-digit",meridiem:"short"},eventMinHeight:30,eventDisplay:"block"})]}):null}[r,l,s,d]=c.then?(await c)():c,n()}catch(t){n(t)}})}};