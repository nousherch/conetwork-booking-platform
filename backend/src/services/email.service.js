const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const formatTime = (date) => {
  return new Date(date).toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi',
    dateStyle: 'full',
    timeStyle: 'short',
  });
};

const sendBookingConfirmation = async (booking) => {
  if (!process.env.SMTP_USER) return;

  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'CoNetwork <noreply@conetwork.pk>',
    to: booking.client.user.email,
    subject: `✅ Booking Confirmed — ${booking.title}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #0f172a, #1e293b); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #10b981; margin: 0; font-size: 24px; letter-spacing: -0.5px;">CoNetwork</h1>
          <p style="color: #94a3b8; margin: 4px 0 0;">Meeting Room Booking System</p>
        </div>
        <div style="padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="color: #0f172a; margin-top: 0;">Booking Confirmed ✅</h2>
          <p style="color: #475569;">Hi ${booking.client.user.name}, your meeting room has been booked successfully.</p>
          
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Meeting Title</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${booking.title}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Room</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${booking.room.name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Start Time</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${formatTime(booking.startTime)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">End Time</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${formatTime(booking.endTime)}</td>
              </tr>
            </table>
          </div>
          
          <p style="color: #64748b; font-size: 14px;">A reminder will be sent 30 minutes before your meeting.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">CoNetwork — TAMC, Lahore, Pakistan</p>
        </div>
      </div>
    `,
  });
};

const sendBookingCancellation = async (booking) => {
  if (!process.env.SMTP_USER) return;

  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'CoNetwork <noreply@conetwork.pk>',
    to: booking.client.user.email,
    subject: `❌ Booking Cancelled — ${booking.title}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0f172a, #1e293b); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #10b981; margin: 0; font-size: 24px;">CoNetwork</h1>
        </div>
        <div style="padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="color: #0f172a;">Booking Cancelled</h2>
          <p style="color: #475569;">Hi ${booking.client.user.name}, your booking has been cancelled.</p>
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="color: #991b1b; margin: 0;"><strong>${booking.title}</strong> on ${formatTime(booking.startTime)} in ${booking.room.name} has been cancelled.</p>
          </div>
          <p style="color: #64748b; font-size: 14px;">If this was a mistake, please contact our team or rebook through the portal.</p>
        </div>
      </div>
    `,
  });
};

const sendBookingReminder = async (booking) => {
  if (!process.env.SMTP_USER) return;

  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'CoNetwork <noreply@conetwork.pk>',
    to: booking.client.user.email,
    subject: `⏰ Reminder: ${booking.title} starts in 30 minutes`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0f172a, #1e293b); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #10b981; margin: 0; font-size: 24px;">CoNetwork</h1>
        </div>
        <div style="padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="color: #0f172a;">⏰ Meeting Starting Soon</h2>
          <p style="color: #475569;">Hi ${booking.client.user.name}, your meeting starts in <strong>30 minutes</strong>.</p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="color: #166534; margin: 0;"><strong>${booking.title}</strong><br/>
            ${booking.room.name} · ${formatTime(booking.startTime)}</p>
          </div>
        </div>
      </div>
    `,
  });
};

const sendReminderEmails = async () => {
  const now = new Date();
  const in30mins = new Date(now.getTime() + 30 * 60 * 1000);
  const in35mins = new Date(now.getTime() + 35 * 60 * 1000);

  const bookings = await prisma.booking.findMany({
    where: {
      status: 'CONFIRMED',
      reminderSent: false,
      startTime: { gte: in30mins, lte: in35mins },
    },
    include: {
      room: { select: { name: true } },
      client: { include: { user: { select: { name: true, email: true } } } },
    },
  });

  for (const booking of bookings) {
    try {
      await sendBookingReminder(booking);
      await prisma.booking.update({
        where: { id: booking.id },
        data: { reminderSent: true },
      });
      console.log(`✅ Reminder sent for booking ${booking.id}`);
    } catch (err) {
      console.error(`❌ Reminder failed for ${booking.id}:`, err.message);
    }
  }
};

module.exports = {
  sendBookingConfirmation,
  sendBookingCancellation,
  sendReminderEmails,
};
