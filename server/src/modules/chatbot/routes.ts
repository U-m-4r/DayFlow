/**
 * Chatbot routes — Gemini-powered HR support assistant.
 * POST /api/v1/chatbot/chat — send user message and receive AI support response.
 */
import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const chatSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  history: z.array(
    z.object({
      role: z.enum(['user', 'model']),
      parts: z.array(z.object({ text: z.string() })),
    })
  ).optional(),
});

const DAYFLOW_SYSTEM_INSTRUCTION = `
You are the Dayflow AI Support Assistant, a friendly and helpful HR platform expert for Dayflow HR Management System.
Dayflow features:
- Authentication: Sign in with email or Login ID. Demo admin is 'admin@dayflow.local', demo employee is 'employee1@dayflow.local'. Default password for all seed accounts is 'Welcome@123'.
- Time Off / Leave Requests: Go to 'Time Off', click '+ New' button, choose leave type (Paid, Sick, Unpaid), enter dates and remarks, attach doctor's note if sick leave, then submit.
- Daily Attendance: Click 'Check In' / 'Check Out' in the top header or navigate to 'Attendance' page to log working hours.
- Payroll & Salary: Go to 'Payroll' or your profile to view breakdown of salary components (Basic, HRA, Standard Allowance, Performance Bonus, LTA, PF).
- Profiles: Click avatar or 'Profile' to update personal details, bank accounts, or uploaded documents.
- HR / Admin capabilities: Admins can approve/reject leave requests, configure leave allocations, view employee salary structures, and manage company settings.

Keep responses concise, polite, clear, and focused on helping users navigate Dayflow HR System.
`.trim();

// Fallback response generator when GEMINI_API_KEY is not set or API call fails
function getFallbackReply(message: string): string {
  const q = message.toLowerCase();
  if (q.includes('login') || q.includes('credential') || q.includes('password') || q.includes('account')) {
    return "🔑 **Demo Credentials:**\n- **Admin:** `admin@dayflow.local` / Password: `Welcome@123`\n- **Employee:** `employee1@dayflow.local` / Password: `Welcome@123`\n\nYou can also sign in using your assigned Login ID (e.g. `OIAVMO20240001`).";
  }
  if (q.includes('leave') || q.includes('time off') || q.includes('vacation') || q.includes('sick')) {
    return "🌴 **Requesting Time Off:**\n1. Go to the **Time Off** tab in the top navigation.\n2. Click the **+ New** button in the upper right.\n3. Choose your leave type (Paid, Sick, or Unpaid).\n4. Select start/end dates and add optional remarks.\n5. Click **Submit Request**!";
  }
  if (q.includes('attendance') || q.includes('check in') || q.includes('check out') || q.includes('time')) {
    return "⏱️ **Attendance & Tracking:**\n- Click the green **Check In** button at the top right of your navigation bar to start your workday.\n- When finishing your work day, click **Check Out**.\n- You can view full history under the **Attendance** page.";
  }
  if (q.includes('salary') || q.includes('payroll') || q.includes('pay') || q.includes('pf')) {
    return "💼 **Payroll & Salary:**\n- Navigate to the **Payroll** tab or your **Profile** to see your monthly/yearly breakdown, basic pay, HRA, allowances, and PF deductions.";
  }
  return `Hi! 👋 I am Dayflow's AI HR Assistant. I can help you with leave applications, attendance check-in, payroll visibility, profile updates, and account credentials. How can I help you today?`;
}

router.post('/chat', async (req, res) => {
  try {
    const parseResult = chatSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: 'Invalid payload', errors: parseResult.error.flatten() });
    }

    const { message, history = [] } = parseResult.data;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.trim() === '') {
      return res.json({ reply: getFallbackReply(message), source: 'fallback' });
    }

    // Build Gemini REST API contents payload
    const contents = [
      ...history.map(item => ({
        role: item.role === 'model' ? 'model' : 'user',
        parts: item.parts,
      })),
      {
        role: 'user',
        parts: [{ text: `${DAYFLOW_SYSTEM_INSTRUCTION}\n\nUser Question: ${message}` }],
      },
    ];

    // Try Gemini API endpoints (v1beta and v1)
    const endpoints = [
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    ];

    let replyText: string | null = null;

    for (const geminiUrl of endpoints) {
      try {
        const apiResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents }),
        });

        if (apiResponse.ok) {
          const data: any = await apiResponse.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            replyText = text;
            break;
          }
        }
      } catch (err) {
        // Try next endpoint
      }
    }

    if (!replyText) {
      return res.json({ reply: getFallbackReply(message), source: 'fallback' });
    }

    return res.json({ reply: replyText, source: 'gemini' });
  } catch (error) {
    console.error('[Chatbot Error]', error);
    return res.json({ reply: getFallbackReply(req.body?.message || ''), source: 'fallback' });
  }
});

export default router;
