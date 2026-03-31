const API_BASE = 'http://localhost:5050';

let questions = [];
const TOTAL_FIELDS = 12; // 10 questions + email + idNumber

//DOM vars
const loadingCard    = document.getElementById('loadingCard');
const surveyForm     = document.getElementById('surveyForm');
const successCard    = document.getElementById('successCard');
const questionsList  = document.getElementById('questionsList');
const progressBar    = document.getElementById('progressBar');
const progressLabel  = document.getElementById('progressLabel');
const resetBtn       = document.getElementById('resetBtn');
const submitBtn      = document.getElementById('submitBtn');
const startOverBtn   = document.getElementById('startOverBtn');

document.addEventListener('DOMContentLoaded', loadSurvey);

//Getting questions from API
async function loadSurvey() {
  showState('loading');

  try {
    const response = await fetch(`${API_BASE}/api/questions`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) throw new Error(`Server error: ${response.status}`);

    questions = await response.json();
    renderQuestions(questions);
    showState('form');
    updateProgress();

  } catch (err) {
    console.error('[Survey] Failed to load questions:', err);
    loadingCard.innerHTML = `
      <div style="text-align:center;color:#ff5c6a;padding:20px">
        <p style="font-size:1.5rem;margin-bottom:12px">⚠</p>
        <p style="font-weight:600;margin-bottom:8px">Could not reach the API</p>
        <p style="color:#6b7080;font-size:.85rem;margin-bottom:24px">
          Make sure the C# API is running on <code>http://localhost:5050</code>
        </p>
        <button class="btn btn-submit" onclick="loadSurvey()" style="margin:0 auto">
          Retry
        </button>
      </div>`;
  }
}

//Render Questions
function renderQuestions(qs) {
  questionsList.innerHTML = '';

  qs.forEach((q, index) => {
    const block = document.createElement('div');
    block.className = 'question-block';
    block.dataset.qid = q.id;
    block.style.animationDelay = `${index * 0.05}s`;

    const reqMark = q.required ? '<span class="req">*</span>' : '';
    const inputHtml = buildInput(q);

    block.innerHTML = `
      <div class="q-number">${index + 1}</div>
      <div class="field-group" id="fg-q${q.id}">
        <label class="field-label" for="q${q.id}">
          ${escapeHtml(q.text)} ${reqMark}
        </label>
        ${inputHtml}
        ${q.type === 'number' ? `<span class="field-hint">Range: ${q.min ?? 0} – ${q.max ?? 9999}</span>` : ''}
        <span class="field-error" id="err-q${q.id}"></span>
      </div>`;

    questionsList.appendChild(block);

    //Validations and progress bar updating listeners
    const input = document.getElementById(`q${q.id}`);
    input.addEventListener('input', () => {
      validateField(input, q);
      updateProgress();
    });
    input.addEventListener('blur', () => validateField(input, q));
  });
}

function buildInput(q) {
  const base = `id="q${q.id}" name="q${q.id}" class="field-input"`;
  switch (q.type) {
    case 'number':
      return `<input type="number" ${base} min="${q.min ?? ''}" max="${q.max ?? ''}" placeholder="Enter a number" />`;
    case 'date':
      return `<input type="date" ${base} />`;
    default: // text
      return `<input type="text" ${base} placeholder="Your answer…" />`;
  }
}

//Regex for validations
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//South African ID validation without the checksum for simplicity
const ID_RE = /^\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{4}[01][89]\d$/;


//Validation
function validateField(input, questionDef = null) {
  const val = input.value.trim();
  const errEl = document.getElementById(`err-${input.id}`);
  let error = '';

  if (input.id === 'email') {
    if (!val)                   error = 'Email address is required.';
    else if (!EMAIL_RE.test(val)) error = 'Please enter a valid email address.';

  } else if (input.id === 'idNumber') {
    if (!val)                  error = 'ID number is required.';
    else if (!ID_RE.test(val)) error = 'ID must be at least 6 alphanumeric characters.';

  } else if (questionDef) {
    if (questionDef.required && !val) {
      error = 'This field is required.';
    } else if (questionDef.type === 'number' && val !== '') {
      const num = Number(val);
      if (isNaN(num))                              error = 'Please enter a valid number.';
      else if (questionDef.min != null && num < questionDef.min) error = `Minimum value is ${questionDef.min}.`;
      else if (questionDef.max != null && num > questionDef.max) error = `Maximum value is ${questionDef.max}.`;
    }
  }

  setFieldState(input, errEl, error);
  return error === '';
}

//states for validation
function setFieldState(input, errEl, error) {
  if (error) {
    input.classList.add('invalid');
    input.classList.remove('valid');
    if (errEl) errEl.textContent = error;
  } else if (input.value.trim() !== '') {
    input.classList.remove('invalid');
    input.classList.add('valid');
    if (errEl) errEl.textContent = '';
  } else {
    input.classList.remove('invalid', 'valid');
    if (errEl) errEl.textContent = '';
  }
}

function validateAll() {
  let valid = true;

  const emailInput    = document.getElementById('email');
  const idInput       = document.getElementById('idNumber');
  if (!validateField(emailInput))  valid = false;
  if (!validateField(idInput))     valid = false;

  questions.forEach(q => {
    const input = document.getElementById(`q${q.id}`);
    if (input && !validateField(input, q)) valid = false;
  });

  return valid;
}

//Updating the progress bar as questions are answered
function updateProgress() {
  let filled = 0;

  const emailVal = document.getElementById('email')?.value.trim();
  const idVal    = document.getElementById('idNumber')?.value.trim();
  if (emailVal) filled++;
  if (idVal)    filled++;

  questions.forEach(q => {
    const v = document.getElementById(`q${q.id}`)?.value.trim();
    if (v) filled++;
  });

  const pct = Math.round((filled / TOTAL_FIELDS) * 100);
  progressBar.style.setProperty('--pct', pct + '%');
  progressLabel.textContent = `${filled} / ${TOTAL_FIELDS} completed`;
}

//Submission to API
surveyForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateAll()) {
    //Scroll to first error
    const firstInvalid = surveyForm.querySelector('.invalid');
    firstInvalid?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting…';

  const payload = buildPayload();

  try {
    const response = await fetch(`${API_BASE}/api/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `Server error: ${response.status}`);
    }

    //Log response to console
    console.group('Survey Submission Result');
    console.log('Submitted at:', result.submittedAt);
    console.log('Status:', result.message);
    console.groupCollapsed('Full Response List');
    result.responses.forEach(r => {
      console.log(`${r.field}: ${r.value}`);
    });
    console.groupEnd();
    console.log('Raw payload sent:', payload);
    console.groupEnd();

    showState('success');

  } catch (err) {
    console.error('[Survey] Submission failed:', err);
    alert(`Submission failed: ${err.message}`);
    submitBtn.disabled = false;
    submitBtn.innerHTML = `Submit Survey <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`;
  }
});

//Build payload for submission
function buildPayload() {
  const answers = questions.map(q => ({
    questionId: q.id,
    value: document.getElementById(`q${q.id}`)?.value.trim() || null
  }));

  return {
    email:    document.getElementById('email').value.trim(),
    idNumber: document.getElementById('idNumber').value.trim(),
    answers
  };
}

//Reset button listener
resetBtn.addEventListener('click', resetSurvey);
startOverBtn.addEventListener('click', resetSurvey);

function resetSurvey() {
  document.getElementById('email').value    = '';
  document.getElementById('idNumber').value = '';
  ['email', 'idNumber'].forEach(id => {
    const input = document.getElementById(id);
    input.classList.remove('valid', 'invalid');
    const err = document.getElementById(`err-${id}`);
    if (err) err.textContent = '';
  });

  questions.forEach(q => {
    const input = document.getElementById(`q${q.id}`);
    if (input) {
      input.value = '';
      input.classList.remove('valid', 'invalid');
    }
    const err = document.getElementById(`err-q${q.id}`);
    if (err) err.textContent = '';
  });

  submitBtn.disabled = false;
  submitBtn.innerHTML = `Submit Survey <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`;

  loadSurvey();
  showState('loading');
}

//State switcher
function showState(state) {
  loadingCard.classList.add('hidden');
  surveyForm.classList.add('hidden');
  successCard.classList.add('hidden');

  if (state === 'loading') loadingCard.classList.remove('hidden');
  if (state === 'form')    surveyForm.classList.remove('hidden');
  if (state === 'success') successCard.classList.remove('hidden');
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
