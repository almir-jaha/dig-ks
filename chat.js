const chatDiv = document.getElementById('chat');
const userInput = document.getElementById('userInput');

userInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    e.preventDefault(); // Spreči slanje forme ako postoji
    sendMessage();
  }
});

let step = 0;
let userData = {
  name: '',
  email: '',
  question: ''
};

function appendMessage(text, sender) {
  const msgDiv = document.createElement('div');
  msgDiv.classList.add('message', sender);

  const bubble = document.createElement('div');
  bubble.classList.add('bubble');

  if (sender === 'agent') {
    const icon = document.createElement('span');
    icon.classList.add('icon');
    icon.textContent = '🤖';
    bubble.appendChild(icon);
  }

  const span = document.createElement('span');
  span.textContent = text;
  bubble.appendChild(span);

  msgDiv.appendChild(bubble);
  chatDiv.appendChild(msgDiv);
  chatDiv.scrollTop = chatDiv.scrollHeight;

  if (sender === 'agent') {
  const sound = document.getElementById('pingSound');
  if (sound) sound.play().catch(err => console.warn('Zvučna reprodukcija blokirana:', err));
}

}


function askNextStep() {
  showTyping();
  setTimeout(() => {
    hideTyping();
    switch (step) {
      case 0:
        appendMessage('Zdravo! Kako se zoveš?', 'agent');
        break;
      case 1:
        appendMessage(`Hvala, ${userData.name}! Koja je tvoja email adresa?`, 'agent');
        break;
      case 2:
        appendMessage('Koje je tvoje pitanje?', 'agent');
        break;
      case 3:
        appendMessage('Hvala! Šaljem tvoje podatke...', 'agent');
        submitData();
        break;
    }
    userInput.focus();
  }, 800);
}


function sendMessage() {
  const message = userInput.value.trim();
  if (!message) return;

  appendMessage(`Ti: ${message}`, 'user');
  userInput.value = '';

  switch (step) {
    case 0:
      userData.name = message;
      step++;
      saveToStorage();
      askNextStep();
      break;

    case 1:
      if (!validateEmail(message)) {
        appendMessage('To ne izgleda kao ispravan email. Pokušaj ponovo.', 'agent');
        return; // NE prelazi na sledeći korak dok email nije validan
      }
      userData.email = message;
      step++;
      saveToStorage();
      askNextStep();
      break;

    case 2:
      userData.question = message;
      step++;
      saveToStorage();
      askNextStep();
      break;
  }
}

function submitData() {
  showTyping();
  fetch('http://localhost:3000/submit-form', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(userData)
  })
    .then(res => res.json())
    .then(data => {
      hideTyping();
      appendMessage(data.message, 'agent');
      if (data.apiResponse) {
        appendMessage('Odgovor API-ja: ' + JSON.stringify(data.apiResponse), 'agent');
      }
    })
    .catch(err => {
      hideTyping();
      console.error(err);
      appendMessage('Došlo je do greške pri slanju podataka.', 'agent');
    });
}

function validateEmail(email) {
  // Jednostavan regex za proveru email adrese
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function resetChat() {
  clearStorage();
  chatDiv.innerHTML = '';
  step = 0;
  userData = { name: '', email: '', question: '' };
  askNextStep();
  userInput.focus();
}

function showTyping() {
  const typing = document.createElement('div');
  typing.id = 'typing';
  typing.classList.add('message', 'agent');

  const bubble = document.createElement('div');
  bubble.classList.add('bubble');
  bubble.innerHTML = '<span class="icon">🤖</span><span>Pišem<span class="dots">...</span></span>';

  typing.appendChild(bubble);
  chatDiv.appendChild(typing);
  chatDiv.scrollTop = chatDiv.scrollHeight;
}

function hideTyping() {
  const typing = document.getElementById('typing');
  if (typing) typing.remove();
}

function saveToStorage() {
  localStorage.setItem('chat_step', step.toString());
  localStorage.setItem('chat_data', JSON.stringify(userData));
  localStorage.setItem('chat_html', chatDiv.innerHTML);
}

function loadFromStorage() {
  const savedStep = localStorage.getItem('chat_step');
  const savedData = localStorage.getItem('chat_data');
  const savedHtml = localStorage.getItem('chat_html');

  if (savedStep && savedData) {
    step = parseInt(savedStep, 10);
    userData = JSON.parse(savedData);
    if (savedHtml) chatDiv.innerHTML = savedHtml;
    askNextStep();
  } else {
    askNextStep(); // nema podataka, počni normalno
  }
}

function clearStorage() {
  localStorage.removeItem('chat_step');
  localStorage.removeItem('chat_data');
  localStorage.removeItem('chat_html');
}

async function saveAsPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const messages = chatDiv.querySelectorAll('.message');
  let y = 10;
  doc.setFontSize(12);

  messages.forEach(msg => {
    const isAgent = msg.classList.contains('agent');
    const text = msg.innerText.trim();
    const lines = doc.splitTextToSize((isAgent ? 'Agent: ' : 'Ti: ') + text, 180);
    doc.text(lines, 10, y);
    y += lines.length * 7;

    if (y > 270) {
      doc.addPage();
      y = 10;
    }
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  doc.save(`chat-${timestamp}.pdf`);
}



// Početna poruka
// askNextStep();
loadFromStorage();
userInput.focus();
