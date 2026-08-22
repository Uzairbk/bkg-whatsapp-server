/**
 * BKG - Careers routes
 * ====================
 * Drop this file into the bkg-whatsapp-server repo next to server.js, then add
 * two lines to server.js (see WIRING at the bottom of this file).
 *
 * What it does
 *   GET  /api/jobs           live open roles, pulled from PayPeople, cached
 *   GET  /api/jobs/:id       one role with its full description
 *   POST /api/apply          candidate application with CV
 *
 * Why the proxy exists
 *   PayPeople's careers portal cannot be embedded (X-Frame-Options: DENY) and
 *   the browser cannot call it cross-origin. Proxying also lets us cache, and
 *   lets us drop closed roles - PayPeople's own feed still lists a job after
 *   its closing date, and clicking through shows "Job Opportunity Closed".
 *   Filtering here is what makes closed roles vanish from the website.
 *
 * No new npm dependencies. The CV arrives as base64 inside JSON, so express's
 * own body parser handles it - no multer, no busboy.
 */

'use strict';

// ---------------------------------------------------------------- config

const PP_BASE = 'https://paypeople.app/ServiceApi/api';

// The company key from PayPeople: Recruitment > Dashboard > "Jobs Feed"
// copies a link, and the ci= value in that link is this key. It is not a
// secret (the link is meant to be shared) but it lives in an env var so it
// can be rotated without a code change.
const PP_KEY = process.env.PAYPEOPLE_KEY ||
  'k1dqTY8PlCOfr1+1La8G25+FqfSP2Hi4NToe5fXAskgCuIaaw7VKVjNNtkNQ7tQd+PEHs8EvXbh65f0pod96Qs+ep4URxIy47Z9LN/PnLnXic8sfn5ZTzuY62qNMV5bf';

const PP_COMPANY_ID = process.env.PAYPEOPLE_COMPANY_ID || '8788';

// Every application lands in all three inboxes.
const HR_RECIPIENTS = [
  { email: 'HR@bkg.world',              name: 'BKG HR' },
  { email: 'hr@binkhalidgroup.com',     name: 'BKG HR' },
  { email: 'info@binkhalidgroup.com',   name: 'Bin Khalid Group' }
];

// The candidate's confirmation is sent from info@, but every reply is pushed
// to HR@bkg.world by Reply-To - so info@ never gets dragged into a thread
// even if the candidate ignores the "do not reply" line.
const CONFIRM_FROM  = { email: 'info@binkhalidgroup.com', name: 'Bin Khalid Group' };
const CONFIRM_REPLY = { email: 'HR@bkg.world',            name: 'BKG HR' };

const BREVO_KEY = process.env.BREVO_API_KEY;

const MAX_CV_BYTES  = 5 * 1024 * 1024;
const ALLOWED_EXT   = ['pdf', 'doc', 'docx'];
const JOBS_TTL_MS   = 10 * 60 * 1000;
const DETAIL_TTL_MS = 30 * 60 * 1000;

// ---------------------------------------------------------------- helpers

const cache = new Map();
function cached(key, ttl, produce) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return Promise.resolve(hit.val);
  return produce().then(val => {
    cache.set(key, { at: Date.now(), val });
    return val;
  }).catch(err => {
    // Serve stale rather than showing the visitor an error, if we have it.
    if (hit) { console.warn('[careers] serving stale cache for', key, err.message); return hit.val; }
    throw err;
  });
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ppFetch(path, options) {
  return fetch(PP_BASE + path, Object.assign({
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'bkg-website/1.0' }
  }, options || {})).then(r => {
    if (!r.ok) throw new Error('PayPeople ' + path + ' -> HTTP ' + r.status);
    return r.json();
  });
}

// A role is shown only while it is genuinely open.
function isOpen(job) {
  if (!job.IsPublished) return false;
  if (!job.DateClosed) return true;
  const close = new Date(job.DateClosed);
  if (isNaN(close)) return true;
  close.setHours(23, 59, 59, 999);        // the closing date is inclusive
  return close.getTime() >= Date.now();
}

// ---------------------------------------------------------------- PayPeople

function fetchJobs() {
  return ppFetch('/Recruitment/rc_anonymouse_career/CardViewPagination', {
    method: 'POST',
    body: JSON.stringify({ CurrentPageNo: 1, SearchText: '', RecordPerPage: 100, Key: PP_KEY })
  }).then(data => {
    const list = (data && data.ResultSet && data.ResultSet.jobOpeningList) || [];

    // PayPeople returns city ids, and the city lookup table alongside them.
    let cities = {};
    try {
      const raw = data.ResultSet.CitiesAndCountries;
      const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
      (arr || []).forEach(c => { cities[String(c.CityID)] = c.City; });
    } catch (e) { /* location just falls back to the country */ }

    return list.filter(isOpen).map(j => ({
      id:           j.UniqueID,
      title:        String(j.PostingTitle || '').trim(),
      department:   j.DepartmentName || '',
      locationType: j.JobLocationType || '',
      location:     String(j.MultiCityIds || '').split(',')
                      .map(id => cities[id.trim()]).filter(Boolean).join(', ') || j.Country || 'Lahore',
      openingDate:  j.DateOpened || null,
      closingDate:  j.DateClosed || null,
      applyUrl:     'https://paypeople.app/#/Careers/jobs?id=' + j.UniqueID + '&cid=' + PP_COMPANY_ID
    }));
  });
}

function fetchJobDetail(id) {
  return ppFetch('/Recruitment/rc_anonymous_candidate_mf/GetJobOpeningByUniqueId?UniqueId=' +
                 encodeURIComponent(id), { method: 'GET' }).then(data => {
    const rs = (data && data.ResultSet) || {};
    const j  = rs.JobOpening || {};
    return {
      id:           id,
      title:        String(j.PostingTitle || '').trim(),
      department:   j.DepartmentName || '',
      description:  j.JobDescription || '',
      requirements: j.JobRequirnments || '',      // PayPeople's own spelling
      benefits:     j.Benefits || '',
      skills:       rs.MasterSkillSets || [],
      closingDate:  j.DateClosed || null
    };
  });
}

// ---------------------------------------------------------------- email

function sendBrevo(payload) {
  if (!BREVO_KEY) return Promise.reject(new Error('BREVO_API_KEY is not set'));
  return fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(payload)
  }).then(r => r.text().then(t => {
    if (!r.ok) throw new Error('Brevo HTTP ' + r.status + ' ' + t);
    return t;
  }));
}

// The careers emails share the dark shell used by the lead and vendor emails,
// so every message BKG sends looks like it came from the same company. The
// shell lives in emailTemplates.js - never copy it, import it, or the two
// systems drift apart the moment one is edited.
const { BRAND, layout, detailCard, button } = require('./emailTemplates');

// A bordered callout for things the reader must not miss. detailCard is for
// key/value pairs; this is for a sentence.
function notice(inner, accent) {
  const bar = accent || BRAND.accent;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="background:${BRAND.cardAlt};border-left:3px solid ${bar};border-radius:0 10px 10px 0;margin:20px 0;">
    <tr><td style="padding:16px 18px;font-size:13.5px;color:${BRAND.textBody};line-height:1.8;">${inner}</td></tr>
  </table>`;
}

function hrEmail(a, cvName) {
  const body = `
    <p style="font-size:14.5px;color:${BRAND.textBody};line-height:1.8;margin:0 0 6px;">
      A candidate applied through the careers page. Their CV is attached to this email.
    </p>
    ${detailCard([
      ['Applying for', esc(a.role)],
      ['Name', esc(a.name)],
      ['Email', esc(a.email)],
      ['Phone', esc(a.phone)],
      ['Experience', esc(a.experience)],
      ['Portfolio', a.portfolio ? `<a href="${esc(a.portfolio)}" style="color:${BRAND.accent};text-decoration:none;">${esc(a.portfolio)}</a>` : ''],
      ['CV attached', esc(cvName)],
      ['Received', new Date().toLocaleString('en-GB', { timeZone: 'Asia/Karachi' }) + ' PKT'],
    ])}
    ${a.message ? notice('<strong style="color:' + BRAND.textPrimary + ';">From the candidate</strong><br>'
        + '<span style="white-space:pre-wrap;">' + esc(a.message) + '</span>') : ''}
    <p style="font-size:13px;color:${BRAND.textMuted};line-height:1.7;margin:16px 0 0;">
      Reply to this email to write to the candidate directly - the reply address is theirs, not ours.
    </p>`;
  return layout(
    'New application for ' + esc(a.role) + ' - CV attached.',
    'New Application',
    'CAREERS - ' + esc(String(a.role || '').toUpperCase()),
    body
  );
}

function candidateEmail(a) {
  const firstName = (a.name || '').trim().split(' ')[0] || 'there';
  const body = `
    <p style="font-size:14.5px;color:${BRAND.textBody};line-height:1.8;margin:0 0 6px;">
      Dear ${esc(firstName)},
    </p>
    <p style="font-size:14.5px;color:${BRAND.textBody};line-height:1.8;margin:0 0 6px;">
      Thank you for applying to ${BRAND.name}. We have received your application for
      <strong style="color:${BRAND.accent};">${esc(a.role)}</strong> and your CV is now with our HR team.
    </p>
    <p style="font-size:14.5px;color:${BRAND.textBody};line-height:1.8;margin:0 0 6px;">
      Every application is reviewed. If your experience matches what the role needs, someone from HR
      will contact you directly to arrange the next step. Because we receive a high number of
      applications, we are not always able to respond to each one individually.
    </p>
    ${notice('<strong style="color:' + BRAND.textPrimary + ';">Please do not reply to this email.</strong><br>'
      + 'This address is not monitored. For any question about your application or a role, write to '
      + '<a href="mailto:HR@bkg.world" style="color:' + BRAND.accent + ';text-decoration:none;font-weight:bold;">HR@bkg.world</a>.')}
    <p style="font-size:13.5px;color:${BRAND.textBody};line-height:1.8;margin:0 0 18px;">
      While you wait, have a look at the work you would be joining.
    </p>
    ${button(BRAND.website, 'View Our Website &rarr;', BRAND.accent, BRAND.bg)}
    ${notice('<strong style="color:' + BRAND.textPrimary + ';">A note on safety.</strong><br>'
      + BRAND.name + ' never charges a fee at any stage of hiring. We will not ask you to pay for a test, '
      + 'a medical, training or a visa. If anyone asks you for money in our name, tell '
      + '<a href="mailto:HR@bkg.world" style="color:' + BRAND.accent + ';text-decoration:none;font-weight:bold;">HR@bkg.world</a>.',
      '#d9534f')}`;
  return layout(
    'We have your application for ' + esc(a.role) + '.',
    'Application Received',
    'THANK YOU FOR APPLYING',
    body
  );
}
// ---------------------------------------------------------------- PayPeople push
//
// The candidate should also land in the PayPeople ATS pipeline so HR works one
// list. PayPeople's own apply form runs reCAPTCHA v3 (their FormLoad request
// sends IsRecaptchaV3: true), so a server-to-server submission may be refused.
// This is attempted and logged, and never blocks the HR email - the email is
// the guarantee, the ATS record is the convenience.
//
// TODO: fill in once the exact submit endpoint has been captured from a live
// OPEN job. It cannot be captured while every role is past its closing date,
// because PayPeople renders "Job Opportunity Closed" instead of the form.
function pushToPayPeople(a) {
  if (!process.env.PAYPEOPLE_APPLY_PATH) return Promise.resolve({ pushed: false, reason: 'not configured' });
  return ppFetch(process.env.PAYPEOPLE_APPLY_PATH, {
    method: 'POST',
    body: JSON.stringify({
      Key: PP_KEY,
      JobOpeningUniqueId: a.jobId || '',
      FirstName: a.name, Email: a.email, MobileNo: a.phone,
      CoverLetter: a.message || '', Source: 'Website'
    })
  }).then(() => ({ pushed: true }))
    .catch(err => { console.warn('[careers] PayPeople push failed:', err.message); return { pushed: false, reason: err.message }; });
}

// ---------------------------------------------------------------- routes

function registerCareersRoutes(app, express) {

  app.get('/api/jobs', (req, res) => {
    cached('jobs', JOBS_TTL_MS, fetchJobs)
      .then(jobs => {
        res.set('Cache-Control', 'public, max-age=300');
        res.json({ ok: true, count: jobs.length, jobs });
      })
      .catch(err => {
        console.error('[careers] /api/jobs failed:', err.message);
        res.status(502).json({ ok: false, error: 'jobs_unavailable' });
      });
  });

  app.get('/api/jobs/:id', (req, res) => {
    const id = String(req.params.id || '');
    if (!/^[0-9a-f-]{16,64}$/i.test(id)) return res.status(400).json({ ok: false, error: 'bad_id' });
    cached('job:' + id, DETAIL_TTL_MS, () => fetchJobDetail(id))
      .then(job => { res.set('Cache-Control', 'public, max-age=900'); res.json(job); })
      .catch(err => {
        console.error('[careers] /api/jobs/:id failed:', err.message);
        res.status(502).json({ ok: false, error: 'job_unavailable' });
      });
  });

  // The CV arrives base64-encoded inside JSON, so it needs a bigger body limit
  // than the rest of the API. Scoped to this route only.
  const bigJson = express.json({ limit: '12mb' });

  // Rate limit, deliberately split into a check and a record.
  // Only a genuine submission counts against the allowance - a candidate who
  // mistypes their email three times must not lock themselves out. Rejected
  // and bot requests never reach the record step, and they send no email, so
  // they cost nothing worth rationing.
  const recent = new Map();               // ip -> [timestamps of real sends]
  const WINDOW = 60 * 60 * 1000;
  const MAX_PER_WINDOW = 5;

  function rateLimited(ip) {
    const now = Date.now();
    const hits = (recent.get(ip) || []).filter(t => now - t < WINDOW);
    recent.set(ip, hits);
    return hits.length >= MAX_PER_WINDOW;
  }
  function recordSend(ip) {
    const hits = recent.get(ip) || [];
    hits.push(Date.now());
    recent.set(ip, hits);
    if (recent.size > 5000) recent.clear();
  }

  app.post('/api/apply', bigJson, (req, res) => {
    const b = req.body || {};

    // Bots fill in every field they can see. This one is hidden.
    if (b.company_website) return res.json({ ok: true });

    const ip = (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
    if (rateLimited(ip)) return res.status(429).json({ ok: false, error: 'too_many' });

    const a = {
      name:       String(b.name || '').trim().slice(0, 120),
      email:      String(b.email || '').trim().slice(0, 160),
      phone:      String(b.phone || '').trim().slice(0, 40),
      role:       String(b.role || 'Open Application').trim().slice(0, 160),
      jobId:      String(b.jobId || '').trim().slice(0, 64),
      experience: String(b.experience || '').trim().slice(0, 60),
      portfolio:  String(b.portfolio || '').trim().slice(0, 300),
      message:    String(b.message || '').trim().slice(0, 4000),
      pageUrl:    String(b.pageUrl || '').trim().slice(0, 300)
    };

    if (!a.name || !a.email || !a.phone) return res.status(400).json({ ok: false, error: 'missing_fields' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a.email)) return res.status(400).json({ ok: false, error: 'bad_email' });

    const cvName = String(b.cvName || 'cv.pdf').replace(/[^\w.\- ]/g, '_').slice(0, 120);
    const ext    = (cvName.split('.').pop() || '').toLowerCase();
    const cvB64  = String(b.cv || '').replace(/^data:[^;]+;base64,/, '');
    if (!cvB64) return res.status(400).json({ ok: false, error: 'cv_required' });
    if (!ALLOWED_EXT.includes(ext)) return res.status(400).json({ ok: false, error: 'cv_type' });
    if (Buffer.byteLength(cvB64, 'base64') > MAX_CV_BYTES) return res.status(413).json({ ok: false, error: 'cv_too_large' });

    // Name the file so HR does not end up with forty files called "cv.pdf".
    const safeName = a.name.replace(/[^\w \-]/g, '').trim().replace(/\s+/g, '-') || 'candidate';
    const attachName = safeName + '-CV.' + ext;

    recordSend(ip);

    const toHR = sendBrevo({
      sender: CONFIRM_FROM,
      to: HR_RECIPIENTS,
      replyTo: { email: a.email, name: a.name },
      subject: 'New application: ' + a.role + ' - ' + a.name,
      htmlContent: hrEmail(a, attachName),
      attachment: [{ content: cvB64, name: attachName }]
    });

    const toCandidate = sendBrevo({
      sender: CONFIRM_FROM,
      to: [{ email: a.email, name: a.name }],
      replyTo: CONFIRM_REPLY,
      subject: 'We have received your application - Bin Khalid Group',
      htmlContent: candidateEmail(a)
    });

    // HR must get the CV. The candidate confirmation and the ATS push are
    // best-effort and must never fail the application.
    toHR
      .then(() => {
        res.json({ ok: true });
        Promise.allSettled([toCandidate, pushToPayPeople(a)]).then(r => {
          if (r[0].status === 'rejected') console.warn('[careers] candidate email failed:', r[0].reason && r[0].reason.message);
        });
      })
      .catch(err => {
        console.error('[careers] HR email failed:', err.message);
        res.status(502).json({ ok: false, error: 'send_failed' });
      });
  });
}

module.exports = { registerCareersRoutes };

/* ================================================================
   WIRING - two lines in server.js

     const { registerCareersRoutes } = require("./careersRoutes");
     registerCareersRoutes(app, express);

   PLACEMENT MATTERS. Put registerCareersRoutes ABOVE the existing
   `app.use(express.json());` line, like this:

     app.use(cors());
     registerCareersRoutes(app, express);     // <- here
     app.use(express.json());

   Why: the global express.json() defaults to a 100kb body limit, and a
   base64 CV is several megabytes. Registering the careers routes first
   means /api/apply is matched before the global parser ever runs, so it
   uses its own 12mb parser - and every other route keeps the safer
   100kb limit. Put it after, and every application fails with a 413.

   ENVIRONMENT VARIABLES on Render (Settings > Environment)

     BREVO_API_KEY           already set - reused
     PAYPEOPLE_KEY           optional, defaults to the key baked in above
     PAYPEOPLE_COMPANY_ID    optional, defaults to 8788
     PAYPEOPLE_APPLY_PATH    leave unset until the submit endpoint is captured

   CORS - the server already allows the site origin for the existing routes.
   Confirm the same allowlist covers /api/jobs and /api/apply.
   ================================================================ */
