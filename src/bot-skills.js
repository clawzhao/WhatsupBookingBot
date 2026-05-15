/**
 * Bot Skills — Tool functions the AI can invoke to answer customer questions
 * with live, accurate data from the business configuration.
 *
 * Each skill has:
 *   - A declaration (Gemini function_declarations schema)
 *   - A handler (async JS function that returns the data)
 */

const { loadConfig } = require('./config');
const moment = require('moment-timezone');
const coachService = require('./coachService');

// ─── Skill Handlers ──────────────────────────────────────────────────────────

const skillHandlers = {

  /**
   * List all coaches with name, status, and specialties.
   */
  get_coaches: async () => {
    const coaches = await coachService.listPublicCoaches();
    return {
      count: coaches.length,
      coaches: coaches.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status || 'available',
        specialties: c.specialties || []
      }))
    };
  },

  /**
   * Get full details for one coach: contact number, email, schedule, specialties.
   */
  get_coach_details: async ({ coach_name }) => {
    const coaches = await coachService.listPublicCoaches();
    const coach = coaches.find(c =>
      c.name.toLowerCase().includes((coach_name || '').toLowerCase()) ||
      c.id === coach_name
    );
    if (!coach) {
      return { found: false, message: `No coach found matching "${coach_name}"` };
    }
    return {
      found: true,
      id: coach.id,
      name: coach.name,
      phone: coach.phone || 'Not provided',
      email: coach.email || 'Not provided',
      status: coach.status || 'available',
      specialties: coach.specialties || [],
      weekly_availability: coach.availability || {}
    };
  },

  /**
   * Find which coaches are available on a given date.
   */
  get_available_coaches_on_date: async ({ date }) => {
    const config = loadConfig();
    const coaches = await coachService.listPublicCoaches();
    const tz = config?.restaurant?.timezone || 'UTC';
    const dayName = moment.tz(date, 'YYYY-MM-DD', tz).format('dddd');
    const available = coaches.filter(c => {
      if (c.status === 'unavailable') return false;
      const avail = c.availability || {};
      if (Object.keys(avail).length === 0) return true;
      return avail[dayName] !== false;
    });
    return {
      date,
      day_of_week: dayName,
      available_count: available.length,
      coaches: available.map(c => ({
        id: c.id,
        name: c.name,
        specialties: c.specialties || []
      }))
    };
  },

  /**
   * Get business opening hours for every day of the week.
   */
  get_opening_hours: async () => {
    const config = loadConfig();
    const hours = config?.restaurant?.openingHours || {};
    return { opening_hours: hours };
  },

  /**
   * Get all services/packages and their prices.
   */
  get_services: async () => {
    const config = loadConfig();
    const menu = config?.restaurant?.menu || [];
    return { services: menu };
  },

  /**
   * Get general business contact information.
   */
  get_business_info: async () => {
    const config = loadConfig();
    const r = config?.restaurant || {};
    return {
      name: r.name || null,
      phone: r.phone || null,
      email: r.email || null,
      address: r.address || null,
      website: r.website || null,
      timezone: r.timezone || null,
      max_party_size: r.maxPartySize || 3
    };
  },

  /**
   * Get all bookable time slots for a specific date.
   */
  get_available_slots: async ({ date }) => {
    const config = loadConfig();
    const r = config?.restaurant || {};
    const tz = r.timezone || 'UTC';
    const dayName = moment.tz(date, 'YYYY-MM-DD', tz).format('dddd');
    const dayHours = r.openingHours?.[dayName];
    if (!dayHours) {
      return { date, day_of_week: dayName, open: false, slots: [], message: `Closed on ${dayName}` };
    }
    const [oh, om] = dayHours.open.split(':').map(Number);
    const [ch, cm] = dayHours.close.split(':').map(Number);
    const startMin = oh * 60 + om;
    const endMin = ch * 60 + cm;
    const slotDuration = r.slotDuration || 60;
    const slots = [];
    for (let min = startMin; min < endMin; min += slotDuration) {
      slots.push(
        `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
      );
    }
    return { date, day_of_week: dayName, open: true, opening_time: dayHours.open, closing_time: dayHours.close, slots };
  }

};

// ─── Gemini Function Declarations (schema for the AI) ────────────────────────

const toolDeclarations = [
  {
    name: 'get_coaches',
    description:
      'Get the complete list of all coaches: their names, IDs, current status, and specialties. Use this when a customer asks how many coaches there are, who the coaches are, or what a coach specialises in.',
    parameters: { type: 'OBJECT', properties: {}, required: [] }
  },
  {
    name: 'get_coach_details',
    description:
      "Get a specific coach's contact number, email address, weekly availability schedule, and specialties. Use this when a customer asks about a particular coach by name.",
    parameters: {
      type: 'OBJECT',
      properties: {
        coach_name: {
          type: 'STRING',
          description: "The coach's name or partial name (e.g. 'Alex' or 'Coach Alex')"
        }
      },
      required: ['coach_name']
    }
  },
  {
    name: 'get_available_coaches_on_date',
    description:
      'Find out which coaches are working and available on a specific date. Use this when a customer asks who is available on a given day.',
    parameters: {
      type: 'OBJECT',
      properties: {
        date: { type: 'STRING', description: 'Date in YYYY-MM-DD format' }
      },
      required: ['date']
    }
  },
  {
    name: 'get_opening_hours',
    description:
      'Get the business opening and closing times for each day of the week. Use this when a customer asks about hours, when you open/close, or operating schedule.',
    parameters: { type: 'OBJECT', properties: {}, required: [] }
  },
  {
    name: 'get_services',
    description:
      'Get all available coaching services, packages, and their prices. Use this when a customer asks about services offered, pricing, costs, or packages.',
    parameters: { type: 'OBJECT', properties: {}, required: [] }
  },
  {
    name: 'get_business_info',
    description:
      'Get general business contact details: name, phone number, email, address, and website. Use this when a customer asks for contact information.',
    parameters: { type: 'OBJECT', properties: {}, required: [] }
  },
  {
    name: 'get_available_slots',
    description:
      'Get all available booking time slots for a specific date. Use this when a customer asks what times are available for booking on a particular day.',
    parameters: {
      type: 'OBJECT',
      properties: {
        date: { type: 'STRING', description: 'Date in YYYY-MM-DD format' }
      },
      required: ['date']
    }
  }
];

// ─── Tool Executor ────────────────────────────────────────────────────────────

async function executeTool(name, args) {
  const handler = skillHandlers[name];
  if (!handler) {
    console.warn(`[BotSkills] Unknown tool requested: ${name}`);
    return { error: `Unknown tool: ${name}` };
  }
  try {
    const result = await handler(args || {});
    console.log(`[BotSkills] Executed "${name}" args=${JSON.stringify(args || {})} -> ${JSON.stringify(result).slice(0, 120)}`);
    return result;
  } catch (err) {
    console.error(`[BotSkills] Error executing "${name}":`, err.message);
    return { error: err.message };
  }
}

module.exports = { toolDeclarations, executeTool };
