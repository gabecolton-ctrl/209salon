// site-config.js — site-wide settings.

// Where form messages go (appointment requests, referrals, careers).
// Forms are sent through FormSubmit (formsubmit.co), same as TXBio.
// The first message to a new address triggers a one-time "activate" email —
// click the link in it and every form starts delivering.
// Until this is filled in, forms tell visitors to call instead.
var FORM_EMAIL = ''; // e.g. 'hello@209salon.com'

// 209 Assistant: address of the live-AI server (tools/assistant-worker.js once
// deployed). Leave empty to answer from the site's own information only.
var ASSISTANT_ENDPOINT = '';
