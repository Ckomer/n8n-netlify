const fetch = require('node-fetch');

// Osnovni domen vaše n8n instance
const N8N_BASE_URL = 'https://n8n.srv1000562.hstgr.cloud/webhook/';

// MAPA: Ključ rute (koji pozivate iz Webflowa) : n8n Webhook ID
const N8N_URL_MAP = {
    // GET zahtevi
    'data-get-1': '9fdd0663-6541-453b-b3c6-887f333cccf8',
    'data-get-2': 'd66ae0c0-ad73-4b0a-a15d-1d03f2d43877',
    'blocked-countries': 'e489dfe3-85e9-4108-a990-a268bd33d9e5',
    'data-get-3': '63bcdcc1-403a-4373-b1cb-3636bcbd4a35',
    
    // POST zahtevi
    'fare-calc': 'bdfe5076-c2ad-40b5-aeb8-1d9239c0271a',
    'email-add': 'b040e7c6-9ab7-48a2-bb8a-d66f72e63f17',
    'final-submit': '795fa58c-fd0b-4e82-afb0-8cb672136cf8',
    'email-send': '62c2a245-0c0f-4955-a8ba-26b7fd1a3653',
};

exports.handler = async (event) => {
    // 1. Identifikacija ciljnog webhooka na osnovu putanje (/n8n-proxy/<KLJUČ>)
    const parts = event.path.split('/');
    const targetKey = parts[parts.length - 1]; // Poslednji deo putanje

    const webhookId = N8N_URL_MAP[targetKey];
    
    if (!webhookId) {
        return { statusCode: 404, body: JSON.stringify({ message: `Nepoznata ciljna ruta: ${targetKey}` }) };
    }

    const n8nUrl = N8N_BASE_URL + webhookId;
    const method = event.httpMethod;
    let finalN8nUrl = n8nUrl;
    
    // Rukovodjenje GET zahtevima i query parametrima
    if (method === 'GET') {
        const params = new URLSearchParams(event.queryStringParameters).toString();
        if (params) {
            finalN8nUrl = `${n8nUrl}?${params}`;
        }
    }

    // Postavljanje header-a za prosleđivanje
    const headers = {
        'Content-Type': 'application/json',
        // Opcionalno: Mogli biste dodati tajni ključ ovde za dodatnu sigurnost n8n-a
    };

    // 2. Server-to-Server poziv ka n8n
    try {
        const response = await fetch(finalN8nUrl, {
            method: method,
            headers: headers,
            // Prosleđujemo telo samo za POST/PUT zahteve
            body: (method === 'POST' || method === 'PUT') ? event.body : null, 
        });

        // 3. Vraćanje odgovora klijentu
        const data = await response.text(); 
        
        return {
            statusCode: response.status,
            // Netlify funkcija očekuje body kao string
            body: data, 
            headers: {
                'Content-Type': response.headers.get('content-type') || 'application/json',
            }
        };

    } catch (error) {
        console.error(`N8N Proxy Greška za ${targetKey}:`, error.message);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ message: `Interna serverska greška u proxyju za ${targetKey}.` }) 
        };
    }
};