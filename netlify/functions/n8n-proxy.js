const fetch = require('node-fetch');

// Osnovni domen vaše n8n instance
const N8N_BASE_URL = 'https://n8n.srv1000562.hstgr.cloud/webhook/';

// MAPA: Ključ rute (koji pozivate iz Webflowa) : n8n Webhook ID
const N8N_URL_MAP = {
    'data-get-1': '9fdd0663-6541-453b-b3c6-887f333cccf8',
    'data-get-2': 'd66ae0c0-ad73-4b0a-a15d-1d03f2d43877',
    'blocked-countries': 'e489dfe3-85e9-4108-a990-a268bd33d9e5',
    'data-get-3': '63bcdcc1-403a-4373-b1cb-3636bcbd4a35',
    'fare-calc': 'bdfe5076-c2ad-40b5-aeb8-1d9239c0271a',
    'email-add': 'b040e7c6-9ab7-48a2-bb8a-d66f72e63f17',
    'final-submit': '795fa58c-fd0b-4e82-afb0-8cb672136cf8',
    'email-send': '62c2a245-0c0f-4955-a8ba-26b7fd1a3653',
    'p-grid': '925c0256-c91e-4e21-a2b5-a9e74c4227aa',
};

// 1. Definicija CORS Headera
const CORS_HEADERS = {
    // Ovo dozvoljava pristup SVIM domenima. Za veću sigurnost, 
    // zamenite '*' sa 'https://airportexecutive.webflow.io'
    'Access-Control-Allow-Origin': '*', 
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept', // Dodajte sve headere koje šaljete
};


exports.handler = async (event) => {
    
    // --- RUKOVODJENJE PREFLIGHT ZAHTEVIMA (OPTIONS) ---
    // Preflight zahtev je ono što uzrokuje CORS grešku, mora se obraditi prvi.
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS, // Vraćamo samo headere
            body: JSON.stringify({ message: "CORS preflight request successful." }),
        };
    }
    // --------------------------------------------------


    // 1. Identifikacija ciljnog webhooka
    const parts = event.path.split('/');
    const targetKey = parts[parts.length - 1]; 

    const webhookId = N8N_URL_MAP[targetKey];
    
    // U slučaju nepoznate rute
    if (!webhookId) {
        return { 
            statusCode: 404, 
            headers: CORS_HEADERS, // Vraćamo CORS headere
            body: JSON.stringify({ message: `Nepoznata ciljna ruta: ${targetKey}` }) 
        };
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

    // Postavljanje header-a za prosleđivanje ka n8n
    const headers = {
        'Content-Type': 'application/json',
    };

    // 2. Server-to-Server poziv ka n8n
    try {
        const response = await fetch(finalN8nUrl, {
            method: method,
            headers: headers,
            body: (method === 'POST' || method === 'PUT') ? event.body : null, 
        });

        // 3. Vraćanje odgovora klijentu
        const data = await response.text(); 
        
        return {
            statusCode: response.status,
            body: data, 
            headers: {
                ...CORS_HEADERS, // SADA DODAJEMO CORS HEADERE
                'Content-Type': response.headers.get('content-type') || 'application/json',
            }
        };

    } catch (error) {
        console.error(`N8N Proxy Greška za ${targetKey}:`, error.message);
        return { 
            statusCode: 500, 
            headers: CORS_HEADERS, // Dodajemo CORS headere i na greške
            body: JSON.stringify({ message: `Interna serverska greška u proxyju za ${targetKey}.` }) 
        };
    }
};
