const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// 📌 API za geolokaciju na osnovu IP
const getLocationFromIP = async (ip) => {
  try {
    const response = await axios.get(`https://ipapi.co/${ip}/json/`);
    const { city, country_name } = response.data;
    return `${city}, ${country_name}`;
  } catch (err) {
    console.error('⚠️ Greška pri geolokaciji:', err.message);
    return 'Nepoznata lokacija';
  }
};

app.post('/submit-form', async (req, res) => {
  const { name, email, question } = req.body;

  // 📅 Lokalni srpski format: 17.07.2025 14:35:10
  const now = new Date();
  const twoDigits = (num) => num.toString().padStart(2, '0');
  const formattedTime =
    `${twoDigits(now.getDate())}.${twoDigits(now.getMonth() + 1)}.${now.getFullYear()} ` +
    `${twoDigits(now.getHours())}:${twoDigits(now.getMinutes())}:${twoDigits(now.getSeconds())}`;

  // 🌐 Dohvati IP adresu korisnika (ili uzmi iz headera ako koristiš proxy)
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.connection.remoteAddress;

  // 🌍 Lokacija po IP adresi
  const location = await getLocationFromIP(ip);

  // 🧱 Formiraj parametar: 'ime|email|pitanje|datum i vreme|lokacija'
  const paramString = `'${name}|${email}|${question}|${formattedTime}|${location}'`;
  const encodedParam = encodeURIComponent(paramString);

  const url = `https://coreapiitineris.azurewebsites.net/ADM/ADM_LogsInsert?Parametar=${encodedParam}`;

  try {
    const apiResponse = await axios.post(url);

    res.json({
      status: 'success',
      message: 'Podaci su uspešno prosleđeni sa lokacijom!',
      apiResponse: apiResponse.data
    });

  } catch (err) {
    console.error('❌ Greška pri slanju ka API-ju:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Greška pri komunikaciji sa API-jem.',
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server je aktivan na http://localhost:${PORT}`);
});
